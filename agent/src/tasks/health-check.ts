/**
 * Monorepo Health Check
 *
 * Runs comprehensive checks across all apps to verify
 * everything is in good shape.
 *
 * Usage: npx tsx src/tasks/health-check.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const PROMPT = `You are running a health check on the TasteLanc monorepo.

Run each check independently and report results:

## 1. Git Status
- Run: git status
- Check for uncommitted changes, untracked files
- Report the current branch

## 2. Package Dependencies
- Run: npm ls --depth=0 in root, apps/web, apps/mobile, apps/mobile-cumberland
- Flag any missing or invalid dependencies

## 3. TypeScript Compilation
- Run: cd apps/web && npx tsc --noEmit 2>&1 | tail -20
- Run: cd apps/mobile && npx tsc --noEmit 2>&1 | tail -20
- Run: cd apps/mobile-cumberland && npx tsc --noEmit 2>&1 | tail -20
- Run: cd packages/shared && npx tsc --noEmit 2>&1 | tail -20
- Report pass/fail for each

## 4. Environment Files
- Check that apps/web/.env.local exists
- Check that apps/mobile/.env exists
- Check that apps/mobile-cumberland/.env exists
- Don't read contents (secrets), just verify they exist

## 5. Build Check (Web Only)
- Run: cd apps/web && npm run build 2>&1 | tail -30
- Report if build succeeds

## 6. Supabase Migrations
- List files in supabase/migrations/
- Check if there are any pending migrations

Output a structured health report:
- ✅ Healthy checks
- ⚠️ Warnings
- ❌ Failures with details
- Overall health score (e.g., 5/6 checks passed)
`;

async function main() {
  console.log("Running monorepo health check...\n");

  for await (const message of query({
    prompt: PROMPT,
    options: {
      allowedTools: ["Read", "Glob", "Grep", "Bash"],
      permissionMode: "acceptEdits",
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        }
      }
    } else if (message.type === "result") {
      console.log(`\n✓ Health check completed`);
    }
  }
}

main().catch(console.error);
