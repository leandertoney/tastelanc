#!/bin/bash

# PM2 Auto-Startup Configuration for TasteLanc Agent Hooks
# Run this script ONCE to configure PM2 to start automatically when your Mac boots

echo "🔧 Configuring PM2 to auto-start on boot..."
echo ""
echo "This will require your password (sudo access)"
echo ""

sudo env PATH=$PATH:/opt/homebrew/Cellar/node/24.1.0/bin /Users/leandertoney/.npm-global/lib/node_modules/pm2/bin/pm2 startup launchd -u leandertoney --hp /Users/leandertoney

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ PM2 auto-startup configured successfully!"
  echo "✅ Your agent hooks will now start automatically when your Mac boots"
  echo ""
  echo "Note: The hooks are already running now via PM2"
  echo "You can check status with: pm2 status"
else
  echo ""
  echo "❌ Failed to configure auto-startup"
  echo "You may need to run this script with: bash scripts/setup-pm2-autostart.sh"
fi
