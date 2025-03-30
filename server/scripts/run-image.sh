#!/bin/bash
# Test real production environment with Podman or Docker

source "$(dirname "$0")/../../scripts/image-utils.sh"
build_and_run 31338 "-e DATABASE_URL=memory:// -e ASSETS=1"
