# TasteLanc Monorepo Agent

Automation agent powered by the Claude Agent SDK for managing the TasteLanc monorepo.

## Setup

```bash
cd agent
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Available Tasks

### Free-form prompt

```bash
npx tsx src/index.ts "your task description here"
```

### Built-in tasks

| Task           | Description                                              | Command                |
| -------------- | -------------------------------------------------------- | ---------------------- |
| `sync-check`   | Verify shared types/constants are consistent across apps | `npm run sync-check`   |
| `health-check` | Run comprehensive monorepo health check                  | `npm run health-check` |
| `deploy`       | Validate deployment readiness                            | `npm run deploy`       |
| `categorize`   | Run restaurant categorization pipeline                   | `npm run categorize`   |

### Deploy with execution

```bash
npx tsx src/tasks/deploy.ts --execute --app mobile
npx tsx src/tasks/deploy.ts --execute --app mobile-cumberland
npx tsx src/tasks/deploy.ts --execute --app web
```

## How It Works

Each task is a pre-configured prompt that runs inside the Claude Agent SDK with appropriate tool permissions:

- **Read-only tasks** (sync-check): Only get `Read`, `Glob`, `Grep` tools
- **Build/test tasks** (health-check, deploy): Get `Bash` access for running commands
- **Write tasks** (categorize): Get full tool access including file editing

The agent runs autonomously — it reads your codebase, executes commands, and reports results without requiring interactive input.
