#!/bin/bash
# Check that slowreader.app sends users files from a verified release

# Stop on any unexpected error, the next hourly run will try again
set -euo pipefail

# Production web client
SITE=https://slowreader.app
# Last commit with verifier code, so anyone can read the code behind the result
VERIFIER=$(git -C "$(dirname "$0")" log -1 --format=%H -- check-releases.sh check-site.sh allowed_signers .gitlab-ci.yml)

# Folder for results inside the current folder
mkdir -p checks
# One results file per day
LOG="checks/$(date -u +%F).txt"
# Time for the result line
TIME=$(date -u +%T)
# Folder for temporary files
WORK=$(mktemp -d)
# Remove temporary files on exit
trap 'rm -rf "$WORK"' EXIT
# Skip loops over empty folders
shopt -s nullglob

# Previous days are finished, so put their results to the append-only log
for DAY in checks/*.txt; do
  # Skip today and already signed days
  [ "$DAY" = "$LOG" ] || [ -f "$DAY.sigstore.json" ] ||
    cosign sign-blob --yes --key "$COSIGN_KEY" --bundle "$DAY.sigstore.json" "$DAY" > /dev/null
done

# Mark which verifier code wrote the next lines
[ "$(grep '^verifier ' "$LOG" 2> /dev/null | tail -n 1)" = "verifier $VERIFIER" ] || echo "verifier $VERIFIER" >> "$LOG"

# Write the problem to today’s results
fail() {
  echo "$TIME fail $1" >> "$LOG"
  exit 1
}

# Down server has nothing to verify, so report it separately from failed checks
if ! curl -fsS --retry 3 --max-time 30 -o /dev/null "$SITE/health"; then
  # Separated line type for monitoring downtime
  echo "$TIME down" >> "$LOG"
  # Mark the CI job as failed
  exit 1
fi

# Hashes of JS and HTML files, which the server sends now
curl -fsS --retry 3 "$SITE/manifest.json" -o "$WORK/manifest.json"
# Commit of the deployed web client
COMMIT=$(jq -r .commit "$WORK/manifest.json")
# Tag of our release with this commit, tags end with digit unlike signatures
RELEASE=$(jq -r --arg commit "$COMMIT" 'select(.commit == $commit) | .tag' releases/*[0-9].json < /dev/null | head -n 1)
# Production must run only released code
[ -n "$RELEASE" ] || fail "commit $COMMIT is not released"
# Release must pass the rebuild
jq -e '.status == "verified"' "releases/$RELEASE.json" > /dev/null || fail "$RELEASE is not verified"
# Deployed manifest must be the same as in the rebuilt image
jq -e --slurpfile site "$WORK/manifest.json" '.manifest == $site[0]' "releases/$RELEASE.json" > /dev/null ||
  fail "manifest differs from $RELEASE"

# Every file from the manifest with its hash
jq -r '.integrity | to_entries[] | "\(.key) \(.value)"' "$WORK/manifest.json" |
  while read -r URL EXPECTED; do
    # Check the file by its own address
    echo "$URL $EXPECTED"
    # Users open pages like / or /welcome, which server could send different from the file
    PAGE=$(sed -e 's|^/app\.html$|/welcome|' -e 's|index\.html$||' -e 's|\(.\)/$|\1|' <<< "$URL")
    # Check the page address too
    [ "$PAGE" = "$URL" ] || echo "$PAGE $EXPECTED"
  done > "$WORK/expected.txt"

# One curl reuses the connection, a new connection per file made hourly CI job slow
ARGS=()
NUMBER=0
while read -r URL EXPECTED; do
  NUMBER=$((NUMBER + 1))
  ARGS+=(-o "$WORK/$NUMBER" "$SITE$URL")
done < "$WORK/expected.txt"
curl -fsS --retry 3 --parallel "${ARGS[@]}"

# Server must send the same content
NUMBER=0
while read -r URL EXPECTED; do
  NUMBER=$((NUMBER + 1))
  [ "sha256-$(openssl dgst -sha256 -binary < "$WORK/$NUMBER" | base64)" = "$EXPECTED" ] ||
    fail "$URL differs"
done < "$WORK/expected.txt"

# Short line if nothing changed since the previous successful check
if cmp -s "$WORK/manifest.json" checks/last.json; then
  echo "$TIME same" >> "$LOG"
else
  # Full line for a new deploy
  echo "$TIME ok $RELEASE $COMMIT" >> "$LOG"
  # Remember the manifest for the next check
  cp "$WORK/manifest.json" checks/last.json
fi
