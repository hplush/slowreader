#!/bin/bash
# Build x86 and ARM image twice without cache, like the release does,
# and check that both builds are the same. ARM is built by emulation.

set -e
shopt -s inherit_errexit

GOOD='\033[0;32m\033[1m'
BAD='\033[0;31m\033[1m'
NOTE='\033[0;90m'
NC='\033[0m'

# Docker first, because CI publishes images built by BuildKit
if command -v docker > /dev/null; then
  TOOL=docker
else
  TOOL=podman
fi
ROOT="$(dirname "$0")/.."
PLATFORMS=linux/amd64,linux/arm64
EPOCH=$(git log -1 --format=%ct)
COMMIT=$(git rev-parse HEAD)
NAME=slowreader-reproducible
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Provenance has build time, so it is never the same and is not compared
digests() {
  if [ "$TOOL" = "podman" ]; then
    podman manifest rm "$NAME" > /dev/null 2>&1 || true
    podman build --no-cache --platform "$PLATFORMS" --manifest "$NAME" \
      --target production --build-arg COMMIT="$COMMIT" \
      --source-date-epoch "$EPOCH" --rewrite-timestamp "$ROOT" > /dev/null
    podman manifest inspect "$NAME" | grep -o '"digest": *"[^"]*"'
  else
    docker buildx build --no-cache --platform "$PLATFORMS" \
      --target production --provenance=false \
      --build-arg SOURCE_DATE_EPOCH="$EPOCH" --build-arg COMMIT="$COMMIT" \
      --metadata-file "$WORK/meta.json" \
      --output "type=oci,dest=$WORK/image.tar,rewrite-timestamp=true" \
      "$ROOT" > /dev/null
    sed -n 's/.*"containerimage.digest": *"\([^"]*\)".*/\1/p' "$WORK/meta.json"
  fi
}

echo "Building first image with $TOOL"
FIRST=$(digests)
echo "Building second image with $TOOL"
SECOND=$(digests)

if [ "$FIRST" = "$SECOND" ]; then
  echo -e "${GOOD}Builds are the same${NC}"
else
  echo -e "${BAD}Builds are different${NC}"
  echo -e "${NOTE}$FIRST${NC}"
  echo -e "${NOTE}$SECOND${NC}"
  exit 1
fi

for PLATFORM in ${PLATFORMS//,/ }; do
  EXPECTED=${PLATFORM#linux/}
  if [ "$EXPECTED" = "amd64" ]; then
    EXPECTED=x64
  fi
  if [ "$TOOL" = "docker" ]; then
    # The build is in the cache, so it only loads the image
    docker buildx build --platform "$PLATFORM" --target production \
      --provenance=false --build-arg SOURCE_DATE_EPOCH="$EPOCH" \
      --build-arg COMMIT="$COMMIT" --tag "$NAME" --load "$ROOT" > /dev/null 2>&1
  fi
  ARCH=$($TOOL run --rm --platform "$PLATFORM" \
    --entrypoint /usr/local/bin/node "$NAME" -p process.arch)
  if [ "$ARCH" = "$EXPECTED" ]; then
    echo -e "${GOOD}$PLATFORM image runs Node.js for $ARCH${NC}"
  else
    echo -e "${BAD}$PLATFORM image runs Node.js for $ARCH${NC}"
    exit 1
  fi
done
