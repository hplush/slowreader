#!/bin/sh
# A wrapper over svelte-check to call it from root

set -e

cd web/
./node_modules/.bin/svelte-check --tsgo --incremental
cd ..
