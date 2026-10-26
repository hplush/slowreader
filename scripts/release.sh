#!/bin/bash
# Release new version: move unreleased-changes/ to CHANGELOG.md, tag,
# wait for the image, sign it by hardware key, and deploy it to Scaleway.
#
# Run it outside Dev Container.
#
# Use `SKIP_VERIFIER=1 ./scripts/release.sh` to skip waiting for verifier.
# Use `ONLY_DEPLOY=1 ./scripts/release.sh` to deploy the latest release again.

set -euo pipefail
export LC_ALL=C

REPO=hplush/slowreader
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"; printf "$RESET"' EXIT

GRAY='\033[0;90m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[31m'
BOLD='\033[0;1m'
RESET='\033[0m'

step() {
  printf "$RESET%s$GRAY\n" "$1"
}
success() {
  printf "$GREEN%s$GRAY\n" "$1"
}
action() {
  printf "$BOLD%s$GRAY\n" "$1"
}
highlight() {
  printf "$YELLOW%s$GRAY\n" "$1"
}
error() {
  printf "$RED%s$RESET\n" "$1" >&2
  exit 1
}
ask() {
  printf "$BOLD"
  read -r "${@:2}" -p "$1" ANSWER
  printf "$GRAY"
}
scaleway() {
  curl -sS --fail-with-body -o "$WORK/scaleway.json" \
    -H "X-Auth-Token: $SECRET" "$@" \
    || error "Scaleway: $(cat "$WORK/scaleway.json")"
  cat "$WORK/scaleway.json"
}

deploy() {
  # SKIP_VERIFIER=1 for the first release, which verifier can’t check yet
  if [ -z "${SKIP_VERIFIER:-}" ]; then
    step "Waiting for the verifier"
    until curl -fsS -o "$WORK/verified.json" \
      "https://gitlab.com/hplush/slowreader-verifier/-/raw/main/releases/$VERSION.json" \
      2> /dev/null; do
      sleep 60
    done
    if [ "$(jq -r .status "$WORK/verified.json")" != "verified" ]; then
      error "Verifier: $(jq -r .reason "$WORK/verified.json")"
    fi
    if [ "$(jq -r .image "$WORK/verified.json")" != "$(cat "$WORK/image.txt")" ]; then
      error "Verifier checked $(jq -r .image "$WORK/verified.json")"
    fi
    success "Verifier rebuilt the same image"
  fi

  highlight "Create 1 hour API key for deploy application:"
  highlight "https://console.scaleway.com/iam/api-keys"
  ask 'Scaleway secret key: ' -s
  SECRET=$ANSWER
  echo
  API=https://api.scaleway.com/containers/v1/regions/fr-par
  NAMESPACE=$(scaleway "$API/namespaces?name=slowreader" \
    | jq -r '.namespaces[0].id // empty')
  [ -n "$NAMESPACE" ] || error "Key has no access to slowreader namespace"
  # Name filter needs at least 4 symbols, so we can’t ask for app container
  scaleway "$API/containers?namespace_id=$NAMESPACE" > "$WORK/containers.json"
  IDS=()
  for NAME in app proxy; do
    ID=$(jq -r --arg name "$NAME" \
      '.containers[] | select(.name == $name) | .id' "$WORK/containers.json")
    [ -n "$ID" ] || error "No $NAME container"
    step "Deploying $NAME"
    # Digest instead of tag, so production runs exactly the signed image
    jq -n --arg image "$(cat "$WORK/image.txt")" '{image: $image}' \
      | scaleway -X PATCH "$API/containers/$ID" \
        -H 'Content-Type: application/json' --data @- > /dev/null
    IDS+=("$ID")
  done
  for ID in "${IDS[@]}"; do
    STATUS=""
    until [ "$STATUS" = "ready" ]; do
      sleep 10
      CONTAINER=$(scaleway "$API/containers/$ID")
      STATUS=$(jq -r .status <<< "$CONTAINER")
      if [ "$STATUS" = "error" ]; then
        error "$(jq -r '"\(.name): \(.error_message)"' <<< "$CONTAINER")"
      fi
    done
  done

  DEPLOYED=$(curl -fsS https://slowreader.app/manifest.json | jq -r .commit)
  if [ "$DEPLOYED" != "$RELEASED" ]; then
    error "slowreader.app runs $DEPLOYED commit"
  fi
  success "Deployed $VERSION"
  action "Delete API key: https://console.scaleway.com/iam/api-keys"
}

# Commands output is gray to separate it from script’s steps
printf "$GRAY"

# Malicious dependency in Dev Container could steal the deploy key
if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
  error "Run it outside of Dev Container"
fi

if [ -n "${ONLY_DEPLOY:-}" ]; then
  VERSION=$(curl -fsSI "https://github.com/$REPO/releases/latest" \
    | tr -d '\r' | sed -n 's|^location: .*/tag/||Ip')
  DOWNLOAD="https://github.com/$REPO/releases/download/$VERSION"
  curl -fsSL -o "$WORK/image.txt" "$DOWNLOAD/image.txt"
  curl -fsSL -o "$WORK/image.txt.sig" "$DOWNLOAD/image.txt.sig"
  ssh-keygen -Y verify -f "$ROOT/verifier/allowed_signers" -I release \
    -n slowreader-release -s "$WORK/image.txt.sig" < "$WORK/image.txt" \
    || error "Wrong signature of $VERSION image"
  RELEASED=$(curl -fsSL "$DOWNLOAD/manifest.json" | jq -r .commit)
  step "Deploying $VERSION"
  deploy
  exit
fi

# Fixes are cherry-picked to release branch to skip unreleased features
if [ "${1:-}" = "fix" ]; then
  BRANCH=release
else
  BRANCH=main
fi
if [ "$(git -C "$ROOT" branch --show-current)" != "$BRANCH" ]; then
  error "Switch to $BRANCH branch"
fi
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  error "Commit or stash changes first"
fi
git -C "$ROOT" pull --ff-only

# It is not a CVE database check: Node.js marks releases with security fixes,
# so a newer one in the same line means that our version has known issues
NODE=$(cat "$ROOT/.node-version")
NODE_FIX=$(curl -fsS https://nodejs.org/dist/index.json | jq -r --arg node "$NODE" '
  ($node | split(".") | map(tonumber)) as $current
  | [.[] | select(.security)
    | (.version | ltrimstr("v") | split(".") | map(tonumber)) as $version
    | select($version[0] == $current[0] and $version > $current)][0].version
  // empty')
if [ -n "$NODE_FIX" ]; then
  error "Node.js $NODE_FIX is a security release, update by pnpm update-tools"
fi
success "Node.js $NODE has no newer security release"

osv_cves() {
  local version
  for version in $2; do
    curl -fsS https://api.osv.dev/v1/query \
      -d "$(jq -n --arg purl "$1@$version" '{package: {purl: $purl}}')" \
      | jq -r '.vulns[]? | ((.aliases // []) | map(select(startswith("CVE-"))) | .[0]) // .id'
  done | sort -u
}

# Node.js has no CVE database with versions, but its changelog marks
# security fixes by CVE in every version
node_cves() {
  curl -fsS "https://raw.githubusercontent.com/nodejs/node/main/doc/changelogs/CHANGELOG_V${2%%.*}.md" \
    | awk -v old="$1" -v new="$2" '
      function number(version, parts) {
        split(version, parts, ".")
        return parts[1] * 1000000 + parts[2] * 1000 + parts[3]
      }
      /^<a id="[0-9.]+"><\/a>$/ {
        gsub(/[^0-9.]/, "")
        inside = number($0) > number(old) && number($0) <= number(new)
      }
      inside' \
    | { grep -oE 'CVE-[0-9]{4}-[0-9]+' || true; } | sort -u
}

# Staging runs main, so the new SBOM is there. Release runs outside
# Dev Container, so it must not build the SBOM by running dependencies.
touch "$WORK/deps.md"
PREVIOUS=$(git -C "$ROOT" describe --tags --abbrev=0)
if [ "$BRANCH" != "main" ]; then
  highlight "Fix release can’t find fixed CVEs, add them to unreleased-changes/"
elif ! curl -fsSL -o "$WORK/previous.json" \
  "https://github.com/$REPO/releases/download/$PREVIOUS/sbom.cdx.json"; then
  highlight "$PREVIOUS has no SBOM, add fixed CVEs to unreleased-changes/"
else
  step "Waiting for staging to deploy $(git -C "$ROOT" rev-parse --short HEAD)"
  until [ "$(curl -fsS https://dev.slowreader.app/manifest.json | jq -r .commit)" \
    = "$(git -C "$ROOT" rev-parse HEAD)" ]; do
    sleep 15
  done
  curl -fsS -o "$WORK/next.json" https://dev.slowreader.app/.well-known/sbom
  # Package, its removed versions, all new versions, and added versions
  jq -r --slurpfile next "$WORK/next.json" '
    def versions: reduce .components[] as $c ({};
      .[$c.purl | sub("@[^@]*$"; "")] += [$c.version]);
    ($next[0] | versions) as $new
    | versions | to_entries[]
    | select($new[.key] and ($new[.key] | sort) != (.value | sort))
    | [.key, (.value - $new[.key] | join(" ")), ($new[.key] | join(" ")),
      ($new[.key] - .value | join(", "))]
    | @tsv' "$WORK/previous.json" \
    | while IFS=$'\t' read -r PACKAGE OLD NEW ADDED; do
      if [ "$PACKAGE" = "pkg:generic/node" ]; then
        # Older major versions get the same fixes in their own changelog
        [ "${OLD%%.*}" = "${NEW%%.*}" ] || continue
        NAME="Node.js"
        node_cves "$OLD" "$NEW" > "$WORK/fixed.txt"
      else
        NAME="\`$(sed 's|^pkg:npm/||; s|%40|@|' <<< "$PACKAGE")\`"
        comm -23 <(osv_cves "$PACKAGE" "$OLD") <(osv_cves "$PACKAGE" "$NEW") \
          > "$WORK/fixed.txt"
      fi
      if [ -s "$WORK/fixed.txt" ]; then
        echo "Updated $NAME to ${ADDED:-$NEW} to fix $(paste -sd, - < "$WORK/fixed.txt" | sed 's/,/, /g')." \
          >> "$WORK/deps.md"
      fi
    done
  success "Found $(wc -l < "$WORK/deps.md" | tr -d ' ') dependencies with fixed CVEs"
fi

# MAJOR.DATE.PATCH
CURRENT=$(sed -n "s/^export const VERSION = '\(.*\)'$/\1/p" "$ROOT/api/index.ts")
IFS=. read -r MAJOR DATE PATCH <<< "$CURRENT"
if [ "${1:-}" = "fix" ]; then
  VERSION="$MAJOR.$DATE.$((PATCH + 1))"
elif [ -z "${1:-}" ]; then
  VERSION="$MAJOR.$(date -u +%Y%m%d).0"
else
  error "Usage: ./scripts/release.sh [fix]"
fi
if git -C "$ROOT" rev-parse -q --verify "refs/tags/$VERSION" > /dev/null; then
  error "$VERSION was already released, use ./scripts/release.sh fix"
fi

# Choose the key from allowed_signers, which ssh-agent has
ssh-add -L | grep -F -f <(grep -oE 'sk-ssh-[^ ]+ [^ ]+' "$ROOT/verifier/allowed_signers") \
  | head -n 1 > "$WORK/key.pub" || true
if [ ! -s "$WORK/key.pub" ]; then
  error "Add hardware key from verifier/allowed_signers to ssh-agent"
fi

shopt -s nullglob
FEATURES=("$ROOT"/unreleased-changes/feature-*.md)
SECURITY=("$ROOT"/unreleased-changes/security-*.md)
FIXES=("$ROOT"/unreleased-changes/fix-*.md)
if [ ${#FEATURES[@]} -eq 0 ] && [ ${#SECURITY[@]} -eq 0 ] \
  && [ ${#FIXES[@]} -eq 0 ] && [ ! -s "$WORK/deps.md" ]; then
  error "Add changes to unreleased-changes/"
fi
{
  echo "## $VERSION"
  echo
  echo "_$(date -u +%Y-%m-%d)_"
  for file in "${FEATURES[@]}"; do
    echo
    sed '1s/^# /### /' "$file"
  done
  if [ ${#SECURITY[@]} -gt 0 ] || [ -s "$WORK/deps.md" ]; then
    echo
    echo "### Security & Privacy"
    echo
    for file in "${SECURITY[@]}"; do
      echo "- $(cat "$file")"
    done
    sed 's/^/- /' "$WORK/deps.md"
  fi
  if [ ${#FIXES[@]} -gt 0 ]; then
    echo
    echo "### Fixes"
    echo
    for file in "${FIXES[@]}"; do
      echo "- $(cat "$file")"
    done
  fi
} > "$WORK/changes.md"
printf "$RESET\n"
cat "$WORK/changes.md"
echo
ask "Release $VERSION with these changes? [y/N] "
[ "$ANSWER" = "y" ] || exit 1

# The demo database must be in the format of the released code. Fixes keep
# the pinned demo, since the demo workflow builds main, which can be newer.
if [ "$BRANCH" = "main" ]; then
  DEMO=hplush/slowreader-demo
  DEMO_TOKEN=$(curl -fsS "https://ghcr.io/token?scope=repository:$DEMO:pull" \
    | jq -r .token)
  demo_digest() {
    curl -sI "https://ghcr.io/v2/$DEMO/manifests/latest" \
      -H "Authorization: Bearer $DEMO_TOKEN" \
      -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" \
      | tr -d '\r' | sed -n 's/^docker-content-digest: //Ip'
  }
  OLD_DEMO=$(demo_digest)
  [ -n "$OLD_DEMO" ] || error "Can’t load $DEMO image"
  action "Run Demo Database workflow on main branch:"
  highlight "https://github.com/$REPO/actions/workflows/demo-db.yml"
  step "Waiting for the demo image"
  NEW_DEMO=$OLD_DEMO
  until [ -n "$NEW_DEMO" ] && [ "$NEW_DEMO" != "$OLD_DEMO" ]; do
    sleep 15
    NEW_DEMO=$(demo_digest)
  done
  sed -i.bak "s|ghcr.io/$DEMO@sha256:[0-9a-f]*|ghcr.io/$DEMO@$NEW_DEMO|" \
    "$ROOT/Dockerfile"
  rm "$ROOT/Dockerfile.bak"
  git -C "$ROOT" add Dockerfile
  git -C "$ROOT" commit --no-verify -m "Update demo database"
  success "Demo database is updated"
fi

{
  echo "# Change Log"
  echo
  cat "$WORK/changes.md"
  tail -n +2 "$ROOT/CHANGELOG.md"
} > "$WORK/CHANGELOG.md"
mv "$WORK/CHANGELOG.md" "$ROOT/CHANGELOG.md"
git -C "$ROOT" rm -q "${FEATURES[@]}" "${SECURITY[@]}" "${FIXES[@]}"
sed -i.bak "s/^export const VERSION = '.*'$/export const VERSION = '$VERSION'/" \
  "$ROOT/api/index.ts"
rm "$ROOT/api/index.ts.bak"
git -C "$ROOT" add CHANGELOG.md api/index.ts
# Hooks need Dev Container tools, and we change only generated text
git -C "$ROOT" commit --no-verify -m "Release $VERSION version"
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
step "https://github.com/$REPO/actions/workflows/release.yml?query=branch%3A$VERSION"

step "Waiting for the image"
TOKEN=$(curl -fsS "https://ghcr.io/token?scope=repository:$REPO:pull" | jq -r .token)
DIGEST=""
until [ -n "$DIGEST" ]; do
  sleep 15
  DIGEST=$(curl -sI "https://ghcr.io/v2/$REPO/manifests/$VERSION" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.oci.image.index.v1+json" \
    | tr -d '\r' | sed -n 's/^docker-content-digest: //Ip')
done

success "Image is built"
echo "ghcr.io/$REPO@$DIGEST" > "$WORK/image.txt"
action "Touch hardware key to sign $(cat "$WORK/image.txt")"
ssh-keygen -Y sign -n slowreader-release -f "$WORK/key.pub" "$WORK/image.txt"
# Workflow run with approval button, or list of runs if GitHub API limits us
RUN=$(curl -fsS "https://api.github.com/repos/$REPO/actions/workflows/release.yml/runs?head_sha=$RELEASED" \
  | jq -r '.workflow_runs[0].html_url // empty' || true)
action "Approve release environment with this comment:"
highlight "${RUN:-https://github.com/$REPO/actions/workflows/release.yml?query=branch%3A$VERSION}"
printf "$YELLOW\n"
sed '1d;$d' "$WORK/image.txt.sig" | tr -d '\n'
printf "\n\n$GRAY"

step "Waiting for the release"
until curl -fsI "https://github.com/$REPO/releases/tag/$VERSION" > /dev/null; do
  sleep 15
done
success "Released https://github.com/$REPO/releases/tag/$VERSION"

deploy
