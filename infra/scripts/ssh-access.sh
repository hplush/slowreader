#!/bin/bash
# Check that Hetzner Cloud Firewall allows SSH from the current IPv4 and run
# the command. If IPv4 changed since the last run, ask to update the rule.
# Messages go to stderr, so the command’s output can be piped.
#
# Usage: ./infra/scripts/ssh-access.sh COMMAND ARGS…
# Use SERVER=IP before DNS points to the server.

set -euo pipefail

FIREWALL=https://console.hetzner.com/projects/16666548/firewalls
SERVER=${SERVER:-slowreader.app}
SAVED="$(dirname "$0")/../.ssh-ip"

BOLD='\033[1m'
YELLOW='\033[33m'
RESET='\033[0m'

ssh_answers() {
  [ -n "$(ssh-keyscan -4 -T 3 "$SERVER" 2> /dev/null)" ]
}

# Google DNS answers with our IP even if our server or DNS is broken
IP=$(dig -4 +short TXT o-o.myaddr.l.google.com @ns1.google.com | tr -d '"')
PREVIOUS=$(cat "$SAVED" 2> /dev/null || true)

if [ "$IP" != "$PREVIOUS" ] || ! ssh_answers; then
  printf "$BOLD%s$RESET\n" "Replace IP in 22/tcp rule of ssh firewall by:" >&2
  printf "$YELLOW%s$RESET\n" "$IP/32" >&2
  printf "$YELLOW%s$RESET\n" "$FIREWALL" >&2
  until ssh_answers; do
    sleep 3
  done
  echo "$IP" > "$SAVED"
fi

"$@"
