# Agent Hooks - Auto-Sync Migration Types

## What This Does

Automatically generates TypeScript types when you create or modify SQL migrations. No more manual type synchronization!

**New: macOS Notifications!** You'll get desktop notifications showing:
- 🔔 When a migration is detected
- ✅ When types are synced successfully
- ❌ When there's an error (with sound alert)

## Status: ✅ Running

Check anytime: `pm2 status`

## How It Works

1. You create a migration: `supabase/migrations/20260415000000_new_table.sql`
2. Save the file
3. **Agent hook automatically:**
   - Detects the new/modified migration
   - Calls OpenAI GPT-4o-mini to analyze the SQL
   - Generates matching TypeScript interfaces
   - Updates `packages/shared/src/types.ts`
   - Runs `npm run typecheck` to verify
   - Auto-commits changes (if types compile)

**Time saved:** 15-30 minutes per migration
**Cost:** ~$0.002 per migration (~$0.05/month for typical usage)
**Storage:** Auto-rotating logs (max 20 MB total, old logs compressed)

## Commands

```bash
# View live logs (see what the hook is doing)
pm2 logs taste-hooks

# View last 50 lines
pm2 logs taste-hooks --lines 50 --nostream

# Check status
pm2 status

# Restart (after updating the script)
pm2 restart taste-hooks

# Stop temporarily
pm2 stop taste-hooks

# Start again
pm2 start taste-hooks

# Remove completely
pm2 delete taste-hooks
pm2 save
```

## Auto-Start on Boot (Optional)

To make the hook survive Mac restarts:

```bash
bash scripts/setup-pm2-autostart.sh
```

Requires password (sudo). The hook is already running now - this just makes it auto-start when you reboot.

## Example: What Gets Generated

**You create this migration:**
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY,
  status TEXT CHECK (status IN ('sent', 'pending', 'failed')),
  priority INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL
);
```

**Agent hook automatically adds to `types.ts`:**
```typescript
export interface Notification {
  id: string;
  status: 'sent' | 'pending' | 'failed' | null;
  priority: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
```

## Cost Tracking

- **OpenAI Dashboard:** https://platform.openai.com/usage
- **API Key Name:** `taste-hooks-migration-sync`
- **Location:** Configured in `ecosystem.config.js`

## Files

```
scripts/watch-migrations.js       # The hook script
ecosystem.config.js               # PM2 configuration
logs/pm2-out.log                  # Success logs
logs/pm2-error.log                # Error logs
scripts/setup-pm2-autostart.sh    # Auto-boot setup
```

## Troubleshooting

### Hook not detecting migrations

```bash
# Check if it's running
pm2 status

# Check logs for errors
pm2 logs taste-hooks --lines 100

# Restart
pm2 restart taste-hooks
```

### Types aren't being generated

1. Check OpenAI API key is valid: `echo $OPENAI_API_KEY` (in PM2 env)
2. Check logs: `pm2 logs taste-hooks`
3. Verify API usage: https://platform.openai.com/usage

### Want to disable temporarily

```bash
pm2 stop taste-hooks
```

Resume later:
```bash
pm2 start taste-hooks
```

## What You Saved

**Before agent hooks:**
1. Create SQL migration (5 min)
2. Manually create TypeScript interface (10 min)
3. Manually map SQL types to TS types (5 min)
4. Fix type errors from human mistakes (5 min)
5. Run typecheck (1 min)
6. Commit (1 min)
**Total: 27 minutes**

**With agent hooks:**
1. Create SQL migration (5 min)
2. Save file
**Total: 5 minutes**

**Time saved per migration: 22 minutes**
**With 10 migrations/month: 3.7 hours saved**

---

Built with OpenAI GPT-4o-mini • Managed by PM2 • Zero manual intervention required
