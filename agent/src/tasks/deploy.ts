/**
 * Deployment Readiness Check & Deploy
 *
 * Validates the monorepo is ready for deployment and
 * optionally triggers the deployment.
 *
 * Usage:
 *   npx tsx src/tasks/deploy.ts              # Check readiness only
 *   npx tsx src/tasks/deploy.ts --execute    # Check and deploy
 *   npx tsx src/tasks/deploy.ts --app mobile # Target specific app
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const args = process.argv.slice(2);
const shouldExecute = args.includes("--execute");
const appIndex = args.indexOf("--app");
const targetApp = appIndex !== -1 ? args[appIndex + 1] : "all";

const PROMPT = `You are the deployment agent for the TasteLanc monorepo.

Target: ${targetApp}
Execute deployment: ${shouldExecute ? "YES" : "NO (dry run only)"}

## Pre-Deployment Checks

1. **Git status**: Ensure working directory is clean (all changes committed)
2. **Branch**: Verify we're on an appropriate branch for deployment
3. **Type check**: Run TypeScript compiler in all affected apps
4. **Lint**: Run linter in all affected apps
5. **Build**: Run production build for web app

## App-Specific Checks

### If deploying web (apps/web):
- Verify netlify.toml is valid
- Run: cd apps/web && npm run build
- Check for any build warnings

### If deploying TasteLanc mobile (apps/mobile):
- Verify app.json has correct bundleIdentifier: com.tastelanc.app
- Verify eas.json has correct projectId: 18a9e6d1-1240-4875-b38f-67edc5b50bdd
- Check for any native dependency changes that would require a new build vs OTA

### If deploying TasteCumberland mobile (apps/mobile-cumberland):
- Verify app.json has correct bundleIdentifier: com.tastelanc.cumberland
- Verify eas.json has correct projectId: 0e0abbe1-3518-4669-bb7a-46a1d0d63b68
- Check for any native dependency changes that would require a new build vs OTA

## Report

Output a deployment readiness report:
- ✅ Ready to deploy
- ❌ NOT ready — list blockers

${shouldExecute ? `
## Execute Deployment

If all checks pass:
- Web: Git push triggers Netlify auto-deploy
- TasteLanc: cd apps/mobile && eas update --branch production
- TasteCumberland: cd apps/mobile-cumberland && eas update --branch production

CRITICAL: Only deploy the targeted app(s). NEVER deploy both mobile apps unless explicitly targeting "all".
` : "Do NOT execute any deployment commands. This is a dry run only."}
`;

async function main() {
  console.log(
    `Deployment ${shouldExecute ? "execution" : "readiness check"} for: ${targetApp}\n`
  );

  for await (const message of query({
    prompt: PROMPT,
    options: {
      allowedTools: ["Read", "Glob", "Grep", "Bash"],
      permissionMode: shouldExecute ? "acceptEdits" : "dontAsk",
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        }
      }
    } else if (message.type === "result") {
      console.log(`\n✓ Deployment check completed`);
    }
  }
}

main().catch(console.error);
