#!/bin/bash
# Test real production environment with Podman or Docker

source "$(dirname "$0")/build-nginx-config.sh"
source "$(dirname "$0")/../../scripts/utils.sh"
build_and_run 8080
