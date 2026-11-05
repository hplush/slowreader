#!/bin/bash
# Ask the server to deploy VERSION and wait for app and proxy results.
# Run it inside ssh-access.sh. scripts/release.sh calls it.

set -euo pipefail

VERSION=$1
INFRA="$(cd "$(dirname "$0")/.." && pwd)"
WORK=$(mktemp -d)
trap 'ssh -o "ControlPath=$WORK/ssh" -O exit deploy 2> /dev/null; rm -rf "$WORK"' EXIT

# One connection, so hardware key needs only one touch
remote() {
  ssh -4 -o ControlMaster=auto -o "ControlPath=$WORK/ssh" -o ControlPersist=20m \
    -o "UserKnownHostsFile=$INFRA/known_hosts" -o StrictHostKeyChecking=yes \
    -o HostKeyAlias=slowreader.app "deploy@${SERVER:-slowreader.app}" "$@"
}

echo "Touch hardware key to connect" >&2
remote request "$VERSION"
echo "Requested $VERSION, waiting for the server" >&2
for _ in $(seq 120); do
  sleep 10
  remote status "$VERSION" > "$WORK/status"
  grep -qE '^slowreader-(app|proxy) wait$' "$WORK/status" || break
  echo "Still waiting: $(grep -oE '^slowreader-(app|proxy) wait' "$WORK/status" \
    | cut -d' ' -f1 | paste -sd' ' -)" >&2
done
cat "$WORK/status"
if grep -qE '^slowreader-(app|proxy) (wait|fail)$' "$WORK/status"; then
  exit 1
fi
