#!/bin/bash
# Replace verifier scripts and CI config in GitLab repository by committed
# verifier/ from HEAD and wait for the check by the new scripts.
# Results in releases/ and checks/ stay untouched.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Malicious dependency in Dev Container could change verifier before publish
if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
  echo "Run it outside of Dev Container" >&2
  exit 1
fi

git clone -q git@gitlab.com:hplush/slowreader-verifier.git "$WORK/repo"
find "$WORK/repo" -mindepth 1 -maxdepth 1 \
  ! -name .git ! -name releases ! -name checks -exec rm -rf {} +
git -C "$ROOT" archive HEAD:verifier | tar -x -C "$WORK/repo"
rm -r "$WORK/repo/scripts"

git -C "$WORK/repo" add --all
if git -C "$WORK/repo" diff --cached --quiet; then
  echo "Verifier is already up to date"
  exit 0
fi
git -C "$WORK/repo" commit -qm "Update to slowreader $(git -C "$ROOT" rev-parse HEAD)"
git -C "$WORK/repo" push -q origin HEAD:main

echo "Waiting for the check"
API="https://gitlab.com/api/v4/projects/hplush%2Fslowreader-verifier/pipelines"
SHA=$(git -C "$WORK/repo" rev-parse HEAD)
PIPELINE=""
until [ -n "$PIPELINE" ]; do
  sleep 5
  PIPELINE=$(curl -fsS "$API?sha=$SHA" | jq -r '.[0].id // empty')
done
echo "https://gitlab.com/hplush/slowreader-verifier/-/pipelines/$PIPELINE"
STATUS=""
until [[ $STATUS =~ ^(success|failed|canceled|skipped)$ ]]; do
  sleep 15
  STATUS=$(curl -fsS "$API/$PIPELINE" | jq -r .status)
done

curl -fsS "https://gitlab.com/hplush/slowreader-verifier/-/raw/main/checks/$(date -u +%F).txt" \
  | tail -n 3 || true
[ "$STATUS" = "success" ]
