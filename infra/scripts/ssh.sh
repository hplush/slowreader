#!/bin/bash
# Connect to the server as admin through ssh-access.sh. Without arguments
# it opens a shell, with arguments it runs them on the server.
#
# Usage: ./infra/scripts/ssh.sh [COMMAND…]
# Use SERVER=IP before DNS points to the server.

set -euo pipefail

INFRA="$(cd "$(dirname "$0")/.." && pwd)"
exec "$INFRA/scripts/ssh-access.sh" ssh -4 \
  -o "UserKnownHostsFile=$INFRA/known_hosts" -o StrictHostKeyChecking=yes \
  -o HostKeyAlias=slowreader.app "ai@${SERVER:-slowreader.app}" "$@"
