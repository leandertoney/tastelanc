/**
 * Restaurant Categorization Agent
 *
 * Uses Claude to analyze and categorize restaurants in the database.
 * Wraps the existing categorization script with agent oversight.
 *
 * Usage: npx tsx src/tasks/categorize-restaurants.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const PROMPT = `You are running the restaurant categorization pipeline for TasteLanc.

## Steps

1. **Check prerequisites**:
   - Verify apps/web/.env.local exists and has ANTHROPIC_API_KEY set (don't print the key)
   - Verify apps/web/.env.local has SUPABASE_SERVICE_ROLE_KEY set

2. **Check current state**:
   - Run a quick database query to see how many restaurants need categorization:
     PGPASSWORD='LTMackin!23' psql "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "SELECT COUNT(*) as uncategorized FROM restaurants WHERE cuisine_type IS NULL OR cuisine_type = '';"

3. **Run categorization**:
   - cd apps/web
   - DOTENV_CONFIG_PATH=.env.local npx tsx scripts/categorize-restaurants.ts
   - Monitor output for errors

4. **Verify results**:
   - Query database to confirm categorization was applied
   - Report how many restaurants were categorized

5. **Report**: Summary of what was done and any issues encountered
`;

async function main() {
  console.log("Starting restaurant categorization...\n");

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
      console.log(`\n✓ Categorization completed`);
    }
  }
}

main().catch(console.error);
