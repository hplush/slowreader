#!/bin/bash
# Test real production environment with Podman or Docker

set -e

ERROR='\033[0;31m'
WARNING='\033[0;33m'
OK='\033[1;32m'
NC='\033[0m' # No Color

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

build_and_run() {
  BUILD_OUTPUT=$($1 build . 2>&1) || {
    echo -e "${ERROR}Build failed:${NC}\n$BUILD_OUTPUT"
    exit 1
  }
  IMAGE_ID=$(echo "$BUILD_OUTPUT" | tail -1)
  SIZE=$($1 image inspect "$IMAGE_ID" --format='{{.Size}}' | \
    awk '{printf "%d MB", $1/1024/1024}')
  echo -e "${WARNING}Image size: ${SIZE}${NC}"
  echo -e "${OK}Web server is running on http://localhost:8080${NC}"
  $1 run --rm -p 8080:8080 -e PORT=8080 -it $IMAGE_ID
}

if command_exists podman; then
  build_and_run podman
elif command_exists docker; then
  build_and_run docker
else
  echo -e "${ERROR}Install Podman or Docker${NC}"
  exit 1
fi
