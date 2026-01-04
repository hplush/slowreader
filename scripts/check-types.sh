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

has_files_with_ext() {
  project="$1"
  ext="$2"
  shift 2
  for file in "$@"; do
    file_project=$(echo "$file" | sed 's|^\./||' | cut -d'/' -f1)
    if [ "$file_project" = "$project" ]; then
      case "$file" in
        *.$ext) return 0 ;;
      esac
    fi
  done
  return 1
}

if [ $# -eq 0 ]; then
  PROJECTS_TO_CHECK="$ALL_PROJECTS"
  FILES_PROVIDED=false
else
  PROJECTS_TO_CHECK=$(get_projects_from_files "$@")
  FILES_PROVIDED=true
fi

for project in $PROJECTS_TO_CHECK; do
  if [ "$project" = "web" ]; then
    echo "Checking web"

    if [ "$FILES_PROVIDED" = false ]; then
      ./node_modules/.bin/tsgo --noEmit -p web
      cd web/
      ./node_modules/.bin/svelte-fast-check --incremental
      cd ..
    else
      if has_files_with_ext web ts "$@"; then
        ./node_modules/.bin/tsgo --noEmit -p web
      fi
      if has_files_with_ext web svelte "$@"; then
        cd web/
        ./node_modules/.bin/svelte-fast-check --incremental
        cd ..
      fi
    fi
  else
    echo "Checking $project"
    ./node_modules/.bin/tsgo --noEmit -p "$project"
  fi
done
