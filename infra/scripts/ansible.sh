#!/bin/bash
# Apply infra/playbook.yml to the server through ssh-access.sh.
# Arguments go to ansible-playbook, like `--check --diff`.

set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/ssh-access.sh ansible-playbook playbook.yml "$@"
