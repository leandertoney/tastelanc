#!/bin/bash
# Prevents accidental deployments to the wrong app or environment
# Blocks dangerous deployment commands without confirmation

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block OTA updates that don't specify the correct directory
if echo "$COMMAND" | grep -q "eas update"; then
  # Make sure we're in the right directory
  if echo "$COMMAND" | grep -q "apps/mobile-cumberland" && echo "$COMMAND" | grep -q "tastelanc"; then
    echo "BLOCKED: Possible cross-app deployment. You appear to be deploying TasteLanc from the Cumberland directory or vice versa." >&2
    exit 2
  fi
fi

# Block force pushes to main
if echo "$COMMAND" | grep -qE "git push.*--force.*main|git push.*-f.*main"; then
  echo "BLOCKED: Force push to main is not allowed. Use a feature branch and PR instead." >&2
  exit 2
fi

# Block destructive git operations
if echo "$COMMAND" | grep -qE "git reset --hard|git clean -fd"; then
  echo "BLOCKED: Destructive git operation detected. Please confirm with the user before proceeding." >&2
  exit 2
fi

# Warn about production database operations
if echo "$COMMAND" | grep -qE "DELETE FROM|DROP TABLE|TRUNCATE|ALTER TABLE.*DROP"; then
  echo "WARNING: Destructive database operation detected. Ensure you have a backup." >&2
  # Don't block, just warn (exit 0 with stderr)
fi

exit 0
