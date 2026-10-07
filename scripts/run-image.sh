#!/bin/bash
# Build production image and run it with Podman or Docker.
# Pass app or proxy role. Without role it runs self-hosted mode.

ERROR='\033[0;31m'
WARN='\033[0;33m'
NC='\033[0m'

if command -v podman > /dev/null; then
  TOOL=podman
else
  TOOL=docker
fi

SERVER=(-e DATABASE_URL=memory:// -e WEB_ORIGIN=http://localhost:2553)
if [ "$1" = "app" ]; then
  ENVS=(-e ROLE=app "${SERVER[@]}")
elif [ "$1" = "proxy" ]; then
  ENVS=(-e ROLE=proxy -e 'PROXY_ORIGIN=^http:\/\/localhost:5173$')
else
  ENVS=("${SERVER[@]}" -e 'PROXY_ORIGIN=^http:\/\/localhost:2553$')
fi

ID_FILE=$(mktemp)
trap 'rm -f "$ID_FILE"' EXIT

echo "Building image with $TOOL"
OUTPUT=$($TOOL build --iidfile "$ID_FILE" "$(dirname "$0")/.." 2>&1) || {
  echo -e "${ERROR}Build failed:${NC}\n$OUTPUT"
  exit 1
}
ID=$(cat "$ID_FILE")

SIZE=$($TOOL image inspect "$ID" --format='{{.Size}}' | \
  awk '{printf "%d MB", $1/1024/1024}')
echo -e "${WARN}Image size: ${SIZE}${NC}"

$TOOL run --rm -p 2553:2553 "${ENVS[@]}" -it "$ID"
