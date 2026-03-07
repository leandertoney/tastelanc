#!/bin/bash
# Auto-formats files after Claude edits them
# Runs prettier on supported file types

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format supported file types
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.scss|*.md)
    if command -v npx &> /dev/null; then
      npx prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
    ;;
esac

exit 0
