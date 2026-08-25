#!/bin/bash
# Copy workspace packages from node_modules/ to vendor/, because Node.js
# can’t strip types inside node_modules/

set -e

cd "$(dirname "$0")/../dist"

rm -rf vendor/
mkdir vendor/

for package in node_modules/@slowreader/*; do
  name=${package##*/}
  cp -r "$(readlink -f "$package")" "vendor/$name"
  rm -rf "vendor/$name/node_modules" "vendor/$name/dist" "vendor/$name/test" \
    "vendor/$name/tsconfig.tsbuildinfo" "$package"
  ln -s "../../vendor/$name" "$package"
done
