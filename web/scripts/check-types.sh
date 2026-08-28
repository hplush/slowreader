#!/bin/sh
# A wrapper over svelte-check to call it from root

set -e

cd web/

# `--incremental` keeps the files of the deleted components and checks them
if [ -d .svelte-check/svelte ]; then
  find .svelte-check/svelte -name '*.svelte.ts' | while read -r CACHED; do
    SOURCE=$(printf '%s' "${CACHED#.svelte-check/svelte/}" \
      | sed -e 's|^++||' -e 's|/++|/|' -e 's|\.ts$||' -e 's|\.d\.svelte$|.svelte|')
    [ -f "$SOURCE" ] || rm "$CACHED"
  done
fi

./node_modules/.bin/svelte-check --tsgo --incremental
cd ..
