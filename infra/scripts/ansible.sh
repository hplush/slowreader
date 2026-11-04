#!/bin/bash
# Apply infra/playbook.yml to the server through ssh-access.sh.
# It asks admin’s sudo password from the password manager.
# Arguments go to ansible-playbook, like `--check --diff`.

set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/ssh-access.sh ansible-playbook --ask-become-pass playbook.yml "$@"
