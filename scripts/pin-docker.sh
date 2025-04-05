#!/bin/bash

set -e

source "$(dirname "$0")/utils.sh"

tool=$(get_container_tool)

find . -type f -name Dockerfile -print0 | while IFS= read -r -d $'\0' dockerfile; do
  made_change_in_file=0
  grep -nE '^[[:space:]]*FROM[[:space:]]+' "$dockerfile" | grep -vE '^[[:space:]]*#[[:space:]]*FROM[[:space:]]+' | while IFS=: read -r line_num from_content; do
    echo "$dockerfile:$line_num"
    image_ref=$(echo "$from_content" | sed -E 's/^[[:space:]]*FROM[[:space:]]+(--platform=[^[:space:]]+[[:space:]]+)?//i' | awk '{print $1}')
    if [[ -z "$image_ref" || "$image_ref" == "scratch" || "$image_ref" == *'$'* ]]; then
      if [[ "$image_ref" == *'$'* ]]; then
        echo -e "  ${WARN}Skipping FROM instruction with variable${NC}"
      elif [[ "$image_ref" == "scratch" ]]; then
        echo -e "  ${WARN}Skipping scratch${NC}"
      else
        echo -e "  ${WARN}Skipping potentially invalid FROM instruction${NC}"
      fi
      continue
    fi

    image_tag_part="${image_ref%%@*}"
    current_digest=""

    if [[ "$image_ref" == *"@sha256:"* ]]; then
      current_digest="${image_ref##*@}"
    fi

    if ! $tool pull --quiet "$image_tag_part" > /dev/null 2>&1; then
      echo -e "  ${WARN}Failed to pull $image_tag_part${NC}"
    fi

    latest_digest=$($tool image inspect "$image_tag_part" --format '{{.Digest}}' 2>/dev/null)

    if [[ -z "$latest_digest" ]]; then
      echo -e "  ${BAD}Could not get digest for $image_tag_part${NC}"
      continue
    fi

    latest_image_ref="${image_tag_part}@${latest_digest}"
    if [[ "$image_ref" != "$latest_image_ref" ]]; then
      echo -e "  ${BAD}$image_ref${NC} → ${GOOD}$latest_image_ref${NC}"
      escaped_image_ref=$(printf '%s\n' "$image_ref" | sed 's:[][\\/.^$*]:\\&:g')
      escaped_latest_image_ref=$(printf '%s\n' "$latest_image_ref" | sed 's:[][\\/.^$*]:\\&:g')

      sed -i "${line_num}s#${escaped_image_ref}#${escaped_latest_image_ref}#" "$dockerfile"

      if [[ $? -eq 0 ]]; then
        made_change_in_file=1
      fi
    else
      echo -e "  ${NOTE}Already pinned to the latest digest${NC}"
    fi
  done
  echo ""

done
