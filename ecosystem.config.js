/**
 * PM2 Ecosystem Configuration
 * Manages always-on background processes for TasteLanc
 */

require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'taste-hooks',
      script: './scripts/watch-migrations.js',
      cwd: '/Users/leandertoney/tastelanc',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        // OpenAI API key loaded from .env file (OPENAI_API_KEY_HOOKS)
        OPENAI_API_KEY: process.env.OPENAI_API_KEY_HOOKS
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Auto-rotate logs to prevent storage growth
      max_size: '10M',           // Max 10MB per log file
      retain: 2,                 // Keep only last 2 rotated files
      compress: true             // Compress old logs
    }
  ]
};
