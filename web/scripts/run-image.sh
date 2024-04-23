#!/bin/bash

ERROR='\033[0;31m'
OK='\033[1;32m'
NC='\033[0m' # No Color

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

build_and_run() {
  IMAGE_ID=$($1 build . | tail -1)
  echo -e "${OK}Web server is running on http://localhost:8080${NC}"
  $1 run --rm -p 8080:80 -e PORT=80 -it $IMAGE_ID
}

if command_exists podman; then
  build_and_run podman
elif command_exists docker; then
  build_and_run docker
else
  echo -e "${ERROR}Install Podman or Docker${NC}"
  exit 1
fi
