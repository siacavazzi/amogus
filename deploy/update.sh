#!/bin/bash
# Quick update script for Among Us game
# Run this after pushing code changes

set -e

APP_DIR="/opt/amogus"
APP_USER="amogus"

echo "🎮 Updating Among Us Party Game..."

cd $APP_DIR

# Pull latest code if using git
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    sudo -u $APP_USER git pull
fi

# Rebuild frontend
echo "🔨 Building React frontend..."
cd $APP_DIR/client
sudo -u $APP_USER npm install
sudo -u $APP_USER npm run build

# Restart application
echo "🔄 Restarting application..."
systemctl restart amogus

# Wait for startup
sleep 3

# Check status
echo ""
echo "✅ Update complete!"
systemctl status amogus --no-pager | head -20
