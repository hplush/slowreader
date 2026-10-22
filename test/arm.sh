#!/bin/bash
# Build ARM image by emulation and check that it runs Node.js for ARM

set -e
shopt -s inherit_errexit

GOOD='\033[0;32m\033[1m'
BAD='\033[0;31m\033[1m'
NC='\033[0m'

# Docker first, because CI publishes images built by BuildKit
if command -v docker > /dev/null; then
  TOOL=docker
else
  TOOL=podman
fi
ROOT="$(dirname "$0")/.."
ID_FILE=$(mktemp)
trap 'rm -f "$ID_FILE"' EXIT

echo "Building ARM image with $TOOL"
if [ "$TOOL" = "podman" ]; then
  podman build --platform linux/arm64 --iidfile "$ID_FILE" "$ROOT" > /dev/null
else
  docker buildx build --platform linux/arm64 --iidfile "$ID_FILE" \
    --output type=docker "$ROOT" > /dev/null
fi

ARCH=$($TOOL run --rm --platform linux/arm64 --entrypoint /usr/local/bin/node \
  "$(cat "$ID_FILE")" -p process.arch)
if [ "$ARCH" = "arm64" ]; then
  echo -e "${GOOD}ARM image works${NC}"
else
  echo -e "${BAD}ARM image runs Node.js for $ARCH${NC}"
  exit 1
fi
