#!/bin/sh
# Check types separated for each project. If files was passed here
# (e.g. from nano-staged), only related projects will be checked.

set -e

# Load projects from pnpm-workspace.yaml and add scripts
ALL_PROJECTS=$(pnpm config get packages --json | grep -o '"[^"]*"' | tr -d '"' | tr '\n' ' ')
ALL_PROJECTS="$ALL_PROJECTS scripts"

# Function to determine which projects to check based on file paths
get_projects_from_files() {
  projects=""
  for file in "$@"; do
    # Remove leading ./ and extract the first directory component
    project=$(echo "$file" | sed 's|^\./||' | cut -d'/' -f1)

    # If file is in root (no directory), use scripts project
    if [ "$project" = "$file" ] || [ -z "$project" ]; then
      project="scripts"
    fi

    if echo "$ALL_PROJECTS" | grep -q "\<$project\>"; then
      if ! echo "$projects" | grep -q "\<$project\>"; then
        projects="$projects $project"
      fi
    fi
  done
  echo "$projects" | sed 's/^ //'
}

if [ $# -eq 0 ]; then
  PROJECTS_TO_CHECK="$ALL_PROJECTS"
else
  PROJECTS_TO_CHECK=$(get_projects_from_files "$@")
  if [ -z "$PROJECTS_TO_CHECK" ]; then
    echo "No valid projects found in provided files"
    exit 0
  fi
fi

for project in $PROJECTS_TO_CHECK; do
  if [ "$project" = "web" ]; then
    echo "Checking web"
    cd web/
    ./node_modules/.bin/svelte-check --workspace web
    cd ..
  else
    echo "Checking $project"
    ./node_modules/.bin/tsc --noEmit -p "$project"
  fi
done
