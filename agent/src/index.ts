/**
 * TasteLanc Monorepo Automation Agent
 *
 * A Claude Agent SDK-powered automation tool for managing the TasteLanc monorepo.
 * Handles cross-app sync, database operations, deployment orchestration, and more.
 *
 * Usage:
 *   npx tsx src/index.ts "your task description"
 *   npx tsx src/index.ts --task sync-check
 *   npx tsx src/index.ts --task health-check
 *   npx tsx src/index.ts --task deploy --app tastelanc
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const SYSTEM_PROMPT = `You are the TasteLanc Monorepo Automation Agent. You manage a monorepo with:

- apps/web/ — Next.js web app (shared, multi-market), deployed on Netlify
- apps/mobile/ — TasteLanc React Native app (Lancaster, PA)
- apps/mobile-cumberland/ — TasteCumberland React Native app (Cumberland County, PA)
- packages/shared/ — Shared types and constants
- supabase/ — Database migrations and config

CRITICAL RULES:
1. TasteLanc (apps/mobile/) and TasteCumberland (apps/mobile-cumberland/) are COMPLETELY SEPARATE apps
   - Different EAS projects, bundle IDs, and TestFlight listings
   - NEVER deploy one when targeting the other
2. Use service role client for database writes (RLS policies)
3. Web is deployed on Netlify, NOT Vercel
4. Always verify which app/market before taking action

Database connection:
  postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres

EAS Projects:
  - TasteLanc: slug=tastelanc, project-id=18a9e6d1-1240-4875-b38f-67edc5b50bdd
  - TasteCumberland: slug=taste-cumberland, project-id=0e0abbe1-3518-4669-bb7a-46a1d0d63b68
`;

const TASKS: Record<string, string> = {
  "sync-check": `Check that shared types and constants are in sync across all apps:
    1. Read packages/shared/src/index.ts and list all exports
    2. Search for duplicate type definitions across apps/web, apps/mobile, apps/mobile-cumberland
    3. Compare Supabase client configurations across apps
    4. Check that shared dependency versions are compatible
    5. Report any inconsistencies found`,

  "health-check": `Run a comprehensive health check on the monorepo:
    1. Check that all package.json files have valid dependencies
    2. Run TypeScript type checking in each app (npx tsc --noEmit)
    3. Verify environment variable files exist (.env.local for web, .env for mobile)
    4. Check git status for uncommitted changes
    5. Verify Supabase migrations are up to date
    6. Report overall health status`,

  deploy: `Prepare and validate a deployment:
    1. Run full type check across all apps
    2. Run linting
    3. Build the web app to verify no build errors
    4. Check git status — all changes must be committed
    5. Report deployment readiness`,

  categorize: `Run restaurant categorization:
    1. Navigate to apps/web
    2. Run: DOTENV_CONFIG_PATH=.env.local npx tsx scripts/categorize-restaurants.ts
    3. Report results`,
};

async function main() {
  const args = process.argv.slice(2);

  let prompt: string;

  // Check for --task flag
  const taskIndex = args.indexOf("--task");
  if (taskIndex !== -1 && args[taskIndex + 1]) {
    const taskName = args[taskIndex + 1];
    const taskPrompt = TASKS[taskName];
    if (!taskPrompt) {
      console.error(
        `Unknown task: ${taskName}. Available tasks: ${Object.keys(TASKS).join(", ")}`
      );
      process.exit(1);
    }
    prompt = taskPrompt;

    // Append any additional args (e.g., --app tastelanc)
    const appIndex = args.indexOf("--app");
    if (appIndex !== -1 && args[appIndex + 1]) {
      prompt += `\n\nTarget app: ${args[appIndex + 1]}`;
    }
  } else if (args.length > 0) {
    // Free-form prompt
    prompt = args.join(" ");
  } else {
    console.log("TasteLanc Monorepo Agent");
    console.log("========================");
    console.log("");
    console.log("Usage:");
    console.log('  npx tsx src/index.ts "your task description"');
    console.log("  npx tsx src/index.ts --task sync-check");
    console.log("  npx tsx src/index.ts --task health-check");
    console.log("  npx tsx src/index.ts --task deploy");
    console.log("  npx tsx src/index.ts --task categorize");
    console.log("");
    console.log(`Available tasks: ${Object.keys(TASKS).join(", ")}`);
    process.exit(0);
  }

  console.log("Starting agent...\n");

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      permissionMode: "acceptEdits",
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        } else if ("name" in block) {
          console.log(`\n[Tool: ${block.name}]`);
        }
      }
    } else if (message.type === "result") {
      console.log(`\n✓ Agent completed (${message.subtype})`);
    }
  }
}

main().catch((err) => {
  console.error("Agent error:", err);
  process.exit(1);
});
