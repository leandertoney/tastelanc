#!/bin/bash
# Prevents accidentally editing the wrong mobile app's files
# Blocks edits to mobile-cumberland when working on mobile and vice versa

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block edits to protected files
PROTECTED_FILES=(".env.local" ".env" "package-lock.json")
BASENAME=$(basename "$FILE_PATH")
for protected in "${PROTECTED_FILES[@]}"; do
  if [[ "$BASENAME" == "$protected" ]]; then
    echo "BLOCKED: Editing $BASENAME directly. Use environment variable management instead." >&2
    exit 2
  fi
done

exit 0
