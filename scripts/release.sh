#!/bin/bash
# Release new version: move unreleased-changes/ to CHANGELOG.md, tag,
# wait for the image, sign it by hardware key, and deploy it to Scaleway.
#
# Run it outside Dev Container.
#
# Use `SKIP_VERIFIER=1 ./script/release.sh` to skip waiting for verifier.

set -euo pipefail

REPO=hplush/slowreader
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Malicious dependency in Dev Container could steal the deploy key
if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
  echo "Run it outside of Dev Container" >&2
  exit 1
fi
# Fixes are cherry-picked to release branch to skip unreleased features
if [ "${1:-}" = "fix" ]; then
  BRANCH=release
else
  BRANCH=main
fi
if [ "$(git -C "$ROOT" branch --show-current)" != "$BRANCH" ]; then
  echo "Switch to $BRANCH branch" >&2
  exit 1
fi
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "Commit or stash changes first" >&2
  exit 1
fi
git -C "$ROOT" pull --ff-only

# MAJOR.DATE.PATCH
CURRENT=$(sed -n "s/^export const VERSION = '\(.*\)'$/\1/p" "$ROOT/api/index.ts")
IFS=. read -r MAJOR DATE PATCH <<< "$CURRENT"
if [ "${1:-}" = "fix" ]; then
  VERSION="$MAJOR.$DATE.$((PATCH + 1))"
elif [ -z "${1:-}" ]; then
  VERSION="$MAJOR.$(date -u +%Y%m%d).0"
else
  echo "Usage: ./scripts/release.sh [fix]" >&2
  exit 1
fi
if git -C "$ROOT" rev-parse -q --verify "refs/tags/$VERSION" > /dev/null; then
  echo "$VERSION was already released, use ./scripts/release.sh fix" >&2
  exit 1
fi

# Choose the key from allowed_signers, which ssh-agent has
ssh-add -L | grep -F "$(cut -d' ' -f3,4 "$ROOT/verifier/allowed_signers")" \
  | head -n 1 > "$WORK/key.pub" || true
if [ ! -s "$WORK/key.pub" ]; then
  echo "Add hardware key from verifier/allowed_signers to ssh-agent" >&2
  exit 1
fi

shopt -s nullglob
FEATURES=("$ROOT"/unreleased-changes/feature-*.md)
FIXES=("$ROOT"/unreleased-changes/fix-*.md)
if [ ${#FEATURES[@]} -eq 0 ] && [ ${#FIXES[@]} -eq 0 ]; then
  echo "Add changes to unreleased-changes/" >&2
  exit 1
fi
{
  echo "## $VERSION"
  for file in "${FEATURES[@]}"; do
    echo
    sed '1s/^# /### /' "$file"
  done
  if [ ${#FIXES[@]} -gt 0 ]; then
    echo
    echo "### Fixes"
    echo
    for file in "${FIXES[@]}"; do
      echo "- $(cat "$file")"
    done
  fi
} > "$WORK/changes.md"
cat "$WORK/changes.md"
read -r -p "Release $VERSION with these changes? [y/N] " ANSWER
[ "$ANSWER" = "y" ] || exit 1

{
  echo "# Change Log"
  echo
  cat "$WORK/changes.md"
  tail -n +2 "$ROOT/CHANGELOG.md"
} > "$WORK/CHANGELOG.md"
mv "$WORK/CHANGELOG.md" "$ROOT/CHANGELOG.md"
git -C "$ROOT" rm -q "${FEATURES[@]}" "${FIXES[@]}"
sed -i.bak "s/^export const VERSION = '.*'$/export const VERSION = '$VERSION'/" \
  "$ROOT/api/index.ts"
rm "$ROOT/api/index.ts.bak"
git -C "$ROOT" add CHANGELOG.md api/index.ts
# Hooks need Dev Container tools, and we change only generated text
git -C "$ROOT" commit --no-verify -m "Release $VERSION release"
git -C "$ROOT" tag -a "$VERSION" -m "$VERSION"
RELEASED=$(git -C "$ROOT" rev-parse HEAD)
if [ "$BRANCH" = "main" ]; then
  git -C "$ROOT" push --atomic origin main main:release "$VERSION"
else
  git -C "$ROOT" push --atomic origin release "$VERSION"
  # Bring changelog, version, and removed unreleased-changes/ back to main
  git -C "$ROOT" switch -q main
  git -C "$ROOT" pull -q --ff-only
  git -C "$ROOT" merge -q --no-edit release
  git -C "$ROOT" push -q origin main
fi
echo "https://github.com/$REPO/actions/workflows/release.yml?query=branch%3A$VERSION"

echo "Waiting for the image"
TOKEN=$(curl -fsS "https://ghcr.io/token?scope=repository:$REPO:pull" | jq -r .token)
DIGEST=""
until [ -n "$DIGEST" ]; do
  sleep 15
  DIGEST=$(curl -sI "https://ghcr.io/v2/$REPO/manifests/$VERSION" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.oci.image.index.v1+json" \
    | tr -d '\r' | sed -n 's/^docker-content-digest: //Ip')
done

echo "ghcr.io/$REPO@$DIGEST" > "$WORK/image.txt"
echo "Touch hardware key to sign $(cat "$WORK/image.txt")"
ssh-keygen -Y sign -n slowreader-release -f "$WORK/key.pub" "$WORK/image.txt"
echo
echo "Approve release environment with this comment:"
echo
sed '1d;$d' "$WORK/image.txt.sig" | tr -d '\n'
echo
echo

echo "Waiting for the release"
until curl -fsI "https://github.com/$REPO/releases/tag/$VERSION" > /dev/null; do
  sleep 15
done
echo "https://github.com/$REPO/releases/tag/$VERSION"

# SKIP_VERIFIER=1 for the first release, which verifier can’t check yet
if [ -z "${SKIP_VERIFIER:-}" ]; then
  echo "Waiting for the verifier, it runs every hour"
  until curl -fsS -o "$WORK/verified.json" \
    "https://gitlab.com/hplush/slowreader-verifier/-/raw/main/releases/$VERSION.json" \
    2> /dev/null; do
    sleep 60
  done
  if [ "$(jq -r .status "$WORK/verified.json")" != "verified" ]; then
    echo "Verifier: $(jq -r .reason "$WORK/verified.json")" >&2
    exit 1
  fi
  if [ "$(jq -r .image "$WORK/verified.json")" != "$(cat "$WORK/image.txt")" ]; then
    echo "Verifier checked $(jq -r .image "$WORK/verified.json")" >&2
    exit 1
  fi
fi

echo "Create 1 hour API key for deploy application:"
echo "https://console.scaleway.com/iam/api-keys"
read -rsp 'Scaleway secret key: ' SECRET
echo
API=https://api.scaleway.com/containers/v1/regions/fr-par
NAMESPACE=$(curl -fsS "$API/namespaces?name=slowreader" -H "X-Auth-Token: $SECRET" \
  | jq -r '.namespaces[0].id')
IDS=()
for NAME in app proxy; do
  ID=$(curl -fsS "$API/containers?namespace_id=$NAMESPACE&name=$NAME" \
    -H "X-Auth-Token: $SECRET" | jq -r '.containers[0].id')
  # Digest instead of tag, so production runs exactly the signed image
  jq -n --arg image "$(cat "$WORK/image.txt")" '{image: $image}' \
    | curl -fsS -X PATCH "$API/containers/$ID" -H "X-Auth-Token: $SECRET" \
      -H 'Content-Type: application/json' --data @- > /dev/null
  IDS+=("$ID")
done
for ID in "${IDS[@]}"; do
  STATUS=""
  until [ "$STATUS" = "ready" ]; do
    sleep 10
    CONTAINER=$(curl -fsS "$API/containers/$ID" -H "X-Auth-Token: $SECRET")
    STATUS=$(jq -r .status <<< "$CONTAINER")
    if [ "$STATUS" = "error" ]; then
      jq -r '"\(.name): \(.error_message)"' <<< "$CONTAINER" >&2
      exit 1
    fi
  done
done

DEPLOYED=$(curl -fsS https://slowreader.app/manifest.json | jq -r .commit)
if [ "$DEPLOYED" != "$RELEASED" ]; then
  echo "slowreader.app runs $DEPLOYED commit" >&2
  exit 1
fi
echo "Deployed. Delete API key: https://console.scaleway.com/iam/api-keys"
