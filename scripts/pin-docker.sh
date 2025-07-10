#!/bin/bash
# Update or pin base image in FROM inside Dockerfile to a specific hash
# for security and having the same environment everywhere

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
    origin_image_tag="$image_tag_part"

    # If we has no tag in FROM
    if [[ "$image_tag_part" != *":"* ]]; then
      prev_line_num=$((line_num - 1))
      if [[ $prev_line_num -gt 0 ]]; then
        prev_line=$(sed -n "${prev_line_num}p" "$dockerfile")
        # Check that FROM’s prev line is a comment with a tag and same repo
        if [[ "$prev_line" =~ ^[[:space:]]*#[[:space:]]*(.+:[^@]+)([[:space:]].*)?$ ]]; then
          comment_image="${BASH_REMATCH[1]}"
          comment_repo="${comment_image%%:*}"
          current_repo="${image_tag_part}"
          if [[ "$comment_repo" == "$current_repo" ]]; then
            image_tag_part="$comment_image"
            echo -e "  ${NOTE}Using tag from comment: $image_tag_part${NC}"
          fi
        fi
      fi
    fi

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

    latest_image_ref="${origin_image_tag}@${latest_digest}"
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
