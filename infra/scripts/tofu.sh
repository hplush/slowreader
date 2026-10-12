#!/bin/bash
# Run OpenTofu with Scaleway keys and state passphrase asked on every run,
# so they never get to the disk, shell history, or the shell’s environment.

set -euo pipefail

echo "Create 1 hour API key for tofu application:"
echo "https://console.scaleway.com/iam/api-keys"
read -rp 'Scaleway access key: ' ACCESS
read -rsp 'Scaleway secret key: ' SECRET
echo
read -rsp 'State passphrase: ' PASSPHRASE
echo

export SCW_ACCESS_KEY=$ACCESS SCW_SECRET_KEY=$SECRET \
  AWS_ACCESS_KEY_ID=$ACCESS AWS_SECRET_ACCESS_KEY=$SECRET \
  TF_VAR_state_passphrase=$PASSPHRASE

cd "$(dirname "$0")/.."
tofu init -input=false > /dev/null
exec tofu "$@"
