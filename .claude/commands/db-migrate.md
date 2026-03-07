---
name: db-migrate
description: Create and push a Supabase database migration
---

# Database Migration

Create and push a Supabase migration safely.

## Steps

1. **Create migration file**:
   ```bash
   npx supabase migration new $ARGUMENTS
   ```
   This creates a new file in `supabase/migrations/`

2. **Write the SQL**: Edit the newly created migration file with the required SQL

3. **Review the migration**: Read back the migration file and verify:
   - No destructive operations without explicit user approval
   - RLS policies are included for new tables
   - Indexes are added for frequently queried columns
   - Down migration steps are documented in comments

4. **Push the migration**:
   ```bash
   npx supabase db push --db-url "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
   ```

5. **Verify**: Run a quick query to confirm the migration applied

## Safety
- Always review SQL before pushing
- Never DROP tables without explicit user confirmation
- Include RLS policies for ALL new tables
- Document the migration purpose in a SQL comment at the top
