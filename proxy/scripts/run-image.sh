#!/bin/bash
# Test real production environment with Podman or Docker

source "$(dirname "$0")/../../scripts/utils.sh"
build_and_run 5284 "-e PROXY_ORIGIN=^http:\\/\\/localhost:5173$"
