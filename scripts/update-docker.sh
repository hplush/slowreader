#!/bin/bash
# Update or pin images in FROM and COPY --from= inside Dockerfile to a specific
# hash for security and having the same environment everywhere

set -e

source "$(dirname "$0")/utils.sh"

tool=$(get_container_tool)

# Read tag from comment on previous line if image has no tag
resolve_tag_from_comment() {
  local file="$1" line_num="$2" image="$3"
  if [[ "$image" == *":"* ]]; then
    echo "$image"
    return
  fi
  local prev_line_num=$((line_num - 1))
  if [[ $prev_line_num -gt 0 ]]; then
    local prev_line
    prev_line=$(sed -n "${prev_line_num}p" "$file")
    if [[ "$prev_line" =~ ^[[:space:]]*#[[:space:]]*(.+:[^@]+)([[:space:]].*)?$ ]]; then
      local comment_image="${BASH_REMATCH[1]}"
      if [[ "${comment_image%%:*}" == "$image" ]]; then
        echo -e "  ${NOTE}Using tag from comment: $comment_image${NC}" >&2
        echo "$comment_image"
        return
      fi
    fi
  fi
  echo "$image"
}

# Update image reference to latest digest
update_image_ref() {
  local file="$1" line_num="$2" image_ref="$3"

  if [[ ! "$image_ref" == *"/"* ]]; then
    return
  fi

  echo "$file:$line_num"

  local origin_image_tag="${image_ref%%@*}"
  local image_tag_part
  image_tag_part=$(resolve_tag_from_comment "$file" "$line_num" "$origin_image_tag")

  local latest_digest
  latest_digest=$(skopeo inspect "docker://$image_tag_part" --raw 2>/dev/null | sha256sum | awk '{print "sha256:" $1}')

  if [[ -z "$latest_digest" ]] || [[ "$latest_digest" == "sha256:" ]]; then
    echo -e "  ${BAD}Could not get manifest digest for $image_tag_part${NC}"
    return
  fi

  local latest_image_ref="${origin_image_tag}@${latest_digest}"
  if [[ "$image_ref" != "$latest_image_ref" ]]; then
    echo -e "  ${BAD}$image_ref${NC} → ${GOOD}$latest_image_ref${NC}"
    local escaped_image_ref escaped_latest_image_ref
    escaped_image_ref=$(printf '%s\n' "$image_ref" | sed 's:[][\\/.^$*]:\\&:g')
    escaped_latest_image_ref=$(printf '%s\n' "$latest_image_ref" | sed 's:[][\\/.^$*]:\\&:g')
    sed -i "${line_num}s#${escaped_image_ref}#${escaped_latest_image_ref}#" "$file"
  else
    echo -e "  ${NOTE}Already pinned to latest manifest digest${NC}"
  fi
}

find . -type f -name Dockerfile -print0 | while IFS= read -r -d $'\0' dockerfile; do
  grep -nE '^[[:space:]]*FROM[[:space:]]+' "$dockerfile" | grep -vE '^[[:space:]]*#[[:space:]]*FROM[[:space:]]+' | while IFS=: read -r line_num from_content; do
    ref=$(echo "$from_content" | sed -E 's/^[[:space:]]*FROM[[:space:]]+(--platform=[^[:space:]]+[[:space:]]+)?//i' | awk '{print $1}')
    update_image_ref "$dockerfile" "$line_num" "$ref"
  done

  grep -nE 'COPY[[:space:]]+--from=' "$dockerfile" | while IFS=: read -r line_num copy_content; do
    ref=$(echo "$copy_content" | sed -E 's/.*--from=([^[:space:]]+).*/\1/')
    update_image_ref "$dockerfile" "$line_num" "$ref"
  done
  echo ""

done
