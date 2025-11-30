#!/bin/bash

# Setup cron job for article request polling on VPS
# Run this script ONCE on your VPS to set up automatic article generation

echo "📝 Setting up VPS cron job for Claude article writer..."

# Make check-article-requests.js executable
chmod +x /root/jpsrealtor/scripts/check-article-requests.js

# Create log directory if it doesn't exist
mkdir -p /var/log

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "check-article-requests.js"; then
  echo "⚠️  Cron job already exists. Skipping..."
else
  # Add cron job (runs every 5 minutes)
  (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/bin/node /root/jpsrealtor/scripts/check-article-requests.js >> /var/log/claude-article-writer.log 2>&1") | crontab -
  echo "✅ Cron job added successfully!"
  echo "   - Runs every 5 minutes"
  echo "   - Logs to /var/log/claude-article-writer.log"
fi

# Show current crontab
echo ""
echo "📋 Current crontab:"
crontab -l

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 To monitor logs:"
echo "   tail -f /var/log/claude-article-writer.log"
echo ""
echo "🧪 To test manually:"
echo "   node /root/jpsrealtor/scripts/check-article-requests.js"
echo ""
echo "🗑️  To remove cron job:"
echo "   crontab -e  # and delete the line with check-article-requests.js"
