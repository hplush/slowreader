#!/bin/bash
# Build image twice without cache and check that both builds are the same

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
EPOCH=$(git log -1 --format=%ct)
ID_FILE=$(mktemp)
trap 'rm -f "$ID_FILE"' EXIT

layers() {
  if [ "$TOOL" = "podman" ]; then
    podman build --no-cache --iidfile "$ID_FILE" \
      --source-date-epoch "$EPOCH" --rewrite-timestamp "$ROOT" > /dev/null
  else
    docker buildx build --no-cache --iidfile "$ID_FILE" \
      --build-arg SOURCE_DATE_EPOCH="$EPOCH" \
      --output type=docker,rewrite-timestamp=true "$ROOT" > /dev/null
  fi
  $TOOL image inspect "$(cat "$ID_FILE")" --format='{{json .RootFS.Layers}}'
}

echo "Building first image with $TOOL"
FIRST=$(layers)
echo "Building second image with $TOOL"
SECOND=$(layers)

SIZE=$($TOOL image inspect "$(cat "$ID_FILE")" --format='{{.Size}}' | \
  awk '{printf "%d MB", $1/1024/1024}')
echo -e "${NOTE}Image size: ${SIZE}${NC}"

if [ "$FIRST" = "$SECOND" ]; then
  echo -e "${GOOD}Builds are the same${NC}"
else
  echo -e "${BAD}Builds are different${NC}"
  echo -e "${NOTE}$FIRST${NC}"
  echo -e "${NOTE}$SECOND${NC}"
  exit 1
fi
