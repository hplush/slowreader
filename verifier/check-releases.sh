#!/bin/bash
# Rebuild every new GitHub Release and check that we get the same image

# Stop on any unexpected error, the next hourly run will try again
set -euo pipefail

# Repository with the source code and releases
REPO=hplush/slowreader
# Registry where the release workflow pushes images
IMAGE=ghcr.io/hplush/slowreader
# Last commit with verifier code, so anyone can read the code behind the result

VERIFIER=$(git -C "$(dirname "$0")" log -1 --format=%H -- check-releases.sh check-site.sh allowed_signers .gitlab-ci.yml)
# Folder for results inside the current folder
mkdir -p releases
# Folder for temporary files
WORK=$(mktemp -d)
# Remove temporary files on exit
trap 'rm -rf "$WORK"' EXIT

# Add release data to the result from stdin and put its signature to the append-only log
save() {
  # Result with tag, image, commit, and verifier version
  jq --arg tag "$TAG" --arg image "$IMAGE@$DIGEST" --arg commit "$COMMIT" --arg verifier "$VERIFIER" \
    '{tag: $tag, image: $image, commit: $commit, verifier: $verifier} + .' > "releases/$TAG.json"
  # Public Rekor log keeps signatures forever, so nobody can change the result
  cosign sign-blob --yes --key "$COSIGN_KEY" \
    --bundle "releases/$TAG.sigstore.json" "releases/$TAG.json" > /dev/null
  # Attempts counter is not needed anymore
  rm -f "releases/$TAG.tries"
}

# Save the release as broken with the reason
broken() {
  # Result with the reason
  jq -n --arg reason "$1" '{status: "broken", reason: $reason}' | save
}

# Go through recent releases
for TAG in $(gh release list --repo "$REPO" --json tagName --jq '.[].tagName'); do
  # Skip already checked releases
  [ -f "releases/$TAG.json" ] && continue
  # Unknown until we read the release
  DIGEST=unknown
  # Unknown until we verify CI provenance
  COMMIT=unknown
  # Count attempts, because regular errors stop the script before saving
  echo >> "releases/$TAG.tries"
  # 3 failed hourly runs mean the release itself is the problem, not the network
  if [ "$(wc -l < "releases/$TAG.tries")" -gt 3 ]; then
    broken "verification fails 3 times"
    continue
  fi

  # Image name with digest and its signature from the release
  gh release download "$TAG" --repo "$REPO" --pattern 'image.txt*' --dir "$WORK" --clobber
  # Image digest
  DIGEST=$(cut -d@ -f2 "$WORK/image.txt")
  # Maintainer’s hardware key signature proves that a human approved the image
  if ! ssh-keygen -Y verify -f "$(dirname "$0")/allowed_signers" -I release -n slowreader-release \
    -s "$WORK/image.txt.sig" < "$WORK/image.txt" > /dev/null 2>&1; then
    broken "no maintainer signature"
    continue
  fi
  # GitHub signature proves that our release workflow built it from this tag
  gh attestation verify "oci://$IMAGE@$DIGEST" --repo "$REPO" \
    --source-ref "refs/tags/$TAG" \
    --signer-workflow "$REPO/.github/workflows/release.yml" \
    --format json > "$WORK/attestation.json"
  # Commit, which GitHub checked out for the workflow
  COMMIT=$(jq -r '.[0].verificationResult.signature.certificate.sourceRepositoryDigest' "$WORK/attestation.json")
  # Commit, which BuildKit wrote to provenance and replay will build
  SOURCE=$(docker buildx imagetools inspect "$IMAGE@$DIGEST" --format '{{json .Provenance}}' \
    | jq -r .SLSA.buildDefinition.externalParameters.configSource.digest.sha1)
  # Provenance must not point to another source code
  if [ "$SOURCE" != "$COMMIT" ]; then
    broken "provenance has $SOURCE commit"
    continue
  fi

  # Image index has image and provenance, we need only the image
  PLATFORM=$(docker buildx imagetools inspect --raw "$IMAGE@$DIGEST" \
    | jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest')
  # Config digest covers all files and settings of the image
  CONFIG=$(docker buildx imagetools inspect --raw "$IMAGE@$PLATFORM" | jq -r .config.digest)
  # Rebuild the image from the same commit, base images, and build arguments
  docker buildx replay build "$IMAGE@$DIGEST" --progress quiet \
    --output "type=oci,dest=$WORK/replay.tar,rewrite-timestamp=true"
  # Clean the previous release’s rebuild
  rm -rf "$WORK/replay" && mkdir "$WORK/replay"
  # Unpack the rebuilt image
  tar -xf "$WORK/replay.tar" -C "$WORK/replay"
  # Rebuilt image manifest
  REBUILT=$(jq -r '.manifests[0].digest' "$WORK/replay/index.json")
  # Rebuilt image must have the same files and settings
  if [ "$(jq -r .config.digest "$WORK/replay/blobs/sha256/${REBUILT#sha256:}")" != "$CONFIG" ]; then
    broken "rebuild gives a different image"
    continue
  fi

  # Create container without running it to take files from the image
  CONTAINER=$(docker create "$IMAGE@$DIGEST")
  # Hashes of web client files for check-site.sh
  docker cp "$CONTAINER:/var/www/manifest.json" "$WORK/manifest.json"
  # Remove the container
  docker rm "$CONTAINER" > /dev/null
  # All checks passed, save manifest to check the website
  jq '{status: "verified", manifest: .}' "$WORK/manifest.json" | save
done
