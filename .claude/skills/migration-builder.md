---
name: migration-builder
description: Create safe Supabase database migrations with RLS policies
---

# Build Database Migration

Create a Supabase migration following TasteLanc's patterns.

## Steps

1. **Create migration file**:

   ```bash
   npx supabase migration new <description>
   ```

2. **Write SQL** with these requirements:
   - Add a comment at the top explaining what the migration does
   - Include RLS policies for ALL new tables
   - Add appropriate indexes
   - Use `IF NOT EXISTS` where possible for safety
   - Include `ON DELETE CASCADE` for foreign keys where appropriate

## RLS Policy Template

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Users can read own data"
  ON new_table FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert
CREATE POLICY "Users can insert own data"
  ON new_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update own data
CREATE POLICY "Users can update own data"
  ON new_table FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow authenticated users to delete own data
CREATE POLICY "Users can delete own data"
  ON new_table FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access"
  ON new_table FOR ALL
  USING (auth.role() = 'service_role');
```

## Push Migration

```bash
npx supabase db push --db-url "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

## Safety

- NEVER use DROP TABLE without explicit user confirmation
- NEVER modify auth schema tables directly
- Always test with a SELECT query first to verify the migration applied
- Document any destructive operations in the migration comment
