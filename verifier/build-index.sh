#!/bin/bash
# Prepare public/ for the status page: the page, results, and index of them

# Stop on any error
set -euo pipefail

# Static hosting can’t list folders, so the page needs a list of results
mkdir -p public
# Git doesn’t keep empty folders, so they are missing before the first results
mkdir -p releases checks
# Copy the page and its icon
cp "$(dirname "$0")/index.html" "$(dirname "$0")/favicon.svg" public/
# Copy results with their signatures
cp -r releases checks public/
# Release results, newest first
RELEASES=$(find releases -name '*[0-9].json' -exec cat {} + |
  jq -s 'sort_by(.tag | split(".") | map(tonumber)) | reverse')
# Count checks and problems of every day, so the page doesn’t download all days
DAYS=$(for file in checks/*.txt; do
  # Skip the pattern itself when there are no files yet
  [ -f "$file" ] || continue
  # Day name, count of check lines, failed checks, and checks of down server
  jq -n --arg day "$(basename "$file" .txt)" \
    --argjson checks "$(grep -c '^[0-9]' "$file" || true)" \
    --argjson fails "$(grep -cE '^[0-9:]+ fail' "$file" || true)" \
    --argjson downs "$(grep -cE '^[0-9:]+ down' "$file" || true)" \
    '{day: $day, checks: $checks, fails: $fails, downs: $downs,
      problems: ($fails + $downs)}'
done | jq -s 'sort_by(.day) | reverse')
# Index for the page
jq -n --argjson releases "$RELEASES" --argjson days "$DAYS" \
  '{releases: $releases, days: $days}' > public/index.json
