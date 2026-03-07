/**
 * Cross-App Sync Check
 *
 * Verifies that shared types, constants, and configurations
 * are consistent across all apps in the monorepo.
 *
 * Usage: npx tsx src/tasks/sync-check.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const PROMPT = `You are checking cross-app consistency in the TasteLanc monorepo.

Perform these checks:

## 1. Shared Package Exports
- Read packages/shared/src/index.ts
- For each export, verify it's actually imported somewhere in apps/web, apps/mobile, or apps/mobile-cumberland
- Flag any unused exports

## 2. Duplicate Type Definitions
- Search for TypeScript type/interface definitions in apps/web/types/ or apps/web/lib/
- Check if any of these duplicate what's in packages/shared/
- Flag types that should be moved to shared

## 3. Supabase Configuration
- Compare Supabase URL and key usage across apps
- Verify all apps point to the same Supabase project
- Check that database type definitions are consistent

## 4. Dependency Versions
- Read package.json from each app
- Compare versions of shared dependencies (react, react-native, @supabase/supabase-js, etc.)
- Flag version mismatches that could cause issues

## 5. Environment Variables
- Check .env files across apps for consistency
- Verify shared API keys match

Output a structured report with:
- ✅ Checks that passed
- ⚠️ Warnings (potential issues)
- ❌ Errors (definite problems that need fixing)
`;

async function main() {
  console.log("Running cross-app sync check...\n");

  for await (const message of query({
    prompt: PROMPT,
    options: {
      allowedTools: ["Read", "Glob", "Grep"],
      permissionMode: "dontAsk",
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        }
      }
    } else if (message.type === "result") {
      console.log(`\n✓ Sync check completed`);
    }
  }
}

main().catch(console.error);
