#!/usr/bin/env node

/**
 * Agent Hook: Auto-sync TypeScript types when SQL migrations change
 *
 * This script runs continuously in the background via PM2 and automatically:
 * 1. Detects new or modified SQL migration files
 * 2. Calls OpenAI GPT-4o-mini to generate matching TypeScript types
 * 3. Updates packages/shared/src/types.ts
 * 4. Verifies types compile correctly
 * 5. Auto-commits the changes
 *
 * Setup: pm2 start scripts/watch-migrations.js --name taste-hooks
 */

const chokidar = require('chokidar');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const notifier = require('node-notifier');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase/migrations');
const TYPES_FILE = path.join(PROJECT_ROOT, 'packages/shared/src/types.ts');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Logging helpers
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`)
};

// Notification helper
const notify = {
  detected: (filename) => {
    notifier.notify({
      title: '🔔 Agent Hook',
      message: `Detected: ${filename}`,
      sound: false,
      timeout: 3
    });
  },
  success: (filename) => {
    notifier.notify({
      title: '✅ Types Synced',
      message: `${filename} processed successfully`,
      sound: false,
      timeout: 3
    });
  },
  error: (filename, reason) => {
    notifier.notify({
      title: '❌ Hook Error',
      message: `${filename}: ${reason}`,
      sound: true,
      timeout: 5
    });
  }
};

/**
 * Syncs TypeScript types based on a SQL migration file
 */
async function syncTypesFromMigration(migrationPath) {
  const migrationName = path.basename(migrationPath);
  log.info(`Processing migration: ${migrationName}`);

  try {
    // Read files
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    const currentTypes = fs.readFileSync(TYPES_FILE, 'utf8');

    log.info('Calling OpenAI GPT-4o-mini to generate updated types...');

    // Call OpenAI to generate updated types
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `You are a code synchronization agent. A new database migration was just created and you need to update the TypeScript types file to match.

Migration file: ${migrationName}
\`\`\`sql
${sqlContent}
\`\`\`

Current TypeScript types file:
\`\`\`typescript
${currentTypes}
\`\`\`

TASK:
1. Analyze the SQL migration for new tables, columns, or type changes
2. Update the TypeScript types to match the database schema
3. Return ONLY the complete updated types.ts file content (no explanations, no markdown code blocks)

RULES:
- Match SQL types to TypeScript: TEXT→string, INTEGER→number, UUID→string, BOOLEAN→boolean, TIMESTAMPTZ→string, NUMERIC→number
- Convert CHECK constraints to union types: CHECK (status IN ('active', 'inactive')) → status: 'active' | 'inactive'
- Convert arrays to TypeScript arrays: TEXT[] → string[]
- Keep all existing interfaces intact unless they're being modified by this migration
- Maintain the exact file structure and formatting
- Add new interfaces in alphabetical order within their section
- Do NOT remove any existing types
- If the migration doesn't affect types (e.g., just indexes or policies), return the current types unchanged`
      }]
    });

    const updatedTypes = response.choices[0].message.content.trim();

    // Remove markdown code fences if AI added them despite instructions
    const cleanedTypes = updatedTypes
      .replace(/^```typescript\n?/, '')
      .replace(/^```ts\n?/, '')
      .replace(/\n?```$/, '');

    // Write updated types
    fs.writeFileSync(TYPES_FILE, cleanedTypes);
    log.success('Types file updated');

    // Verify types compile (only check the shared package, not all workspaces)
    log.info('Running type check...');
    try {
      execSync('npm run typecheck --workspace=@tastelanc/shared', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });
      log.success('Type check passed');
      notify.success(migrationName);
    } catch (error) {
      log.error('Type check failed - manual review needed');
      log.error(error.stderr?.toString() || error.message);
      notify.error(migrationName, 'Type check failed');
      return;
    }

    // Auto-commit changes
    try {
      const status = execSync('git status --porcelain', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      });

      if (status.includes(TYPES_FILE)) {
        execSync(`git add ${TYPES_FILE}`, { cwd: PROJECT_ROOT });
        execSync(`git commit -m "Auto-sync types for ${migrationName}

🤖 Generated with Claude Code Agent Hook

Co-Authored-By: Claude <noreply@anthropic.com>"`, {
          cwd: PROJECT_ROOT,
          stdio: 'pipe'
        });
        log.success(`Changes committed: Auto-sync types for ${migrationName}`);
      } else {
        log.info('No changes to commit (types already up to date)');
      }
    } catch (error) {
      log.warn('Failed to auto-commit (this is OK if you have uncommitted changes)');
    }

  } catch (error) {
    log.error(`Failed to process migration: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

/**
 * Debounce helper to avoid processing the same file multiple times
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Main watcher
function startWatcher() {
  log.info('🔍 TasteLanc Agent Hook started');
  log.info(`📁 Watching: ${MIGRATIONS_DIR}`);
  log.info(`📝 Target: ${TYPES_FILE}`);
  log.info('');

  const debouncedSync = debounce(syncTypesFromMigration, 1000);

  const watcher = chokidar.watch(MIGRATIONS_DIR, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filepath) => {
      // Only process .sql files
      if (!filepath.endsWith('.sql')) return;

      const filename = path.basename(filepath);
      log.info(`📝 New migration detected: ${filename}`);
      notify.detected(filename);
      debouncedSync(filepath);
    })
    .on('change', (filepath) => {
      // Only process .sql files
      if (!filepath.endsWith('.sql')) return;

      const filename = path.basename(filepath);
      log.info(`📝 Migration modified: ${filename}`);
      notify.detected(filename);
      debouncedSync(filepath);
    })
    .on('error', (error) => {
      log.error(`Watcher error: ${error.message}`);
    });

  log.success('Agent hook is running. Press Ctrl+C to stop (but you should use pm2 instead!)');
}

// Start the watcher
startWatcher();
