#!/bin/bash
# Common functions for testing production environments with Podman or Docker

GOOD='\033[0;32m\033[1m'
BAD='\033[0;31m\033[1m'
ERROR='\033[0;31m'
WARN='\033[0;33m'
NOTE='\033[0;90m'
NC='\033[0m'

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

get_container_tool() {
  if command_exists podman; then
    echo "podman"
  elif command_exists docker; then
    echo "docker"
  else
    echo -e "${ERROR}No Podman or Docker found${NC}" >&2
    exit 1
  fi
}

run_container() {
  local container_tool=$1
  local port=$2
  local envs=$3
  local image_id=$4

  $container_tool run --rm -p "$port:$port" -e PORT=$port $envs -it "$image_id"
}

build_and_run() {
  local port=$1
  local envs=$2

  local tool=$(get_container_tool)

  echo "Building image with $tool"
  BUILD_OUTPUT=$($tool build . 2>&1) || {
    echo -e "${ERROR}Build failed:${NC}\n$BUILD_OUTPUT"
    exit 1
  }
  IMAGE_ID=$(echo "$BUILD_OUTPUT" | tail -1)

  SIZE=$($tool image inspect "$IMAGE_ID" --format='{{.Size}}' | \
    awk '{printf "%d MB", $1/1024/1024}')
  echo -e "${WARN}Image size: ${SIZE}${NC}"

  run_container "$tool" "$port" "$envs" "$IMAGE_ID"
}
