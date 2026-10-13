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
# Release results, newest first, and names of days with site checks
find releases -name '*[0-9].json' -exec cat {} + | jq -s \
  --args '{
    releases: sort_by(.tag | split(".") | map(tonumber)) | reverse,
    days: $ARGS.positional | sort | reverse
  }' \
  $(find checks -name '*.txt' -exec basename {} .txt \;) > public/index.json
