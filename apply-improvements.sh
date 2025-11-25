#!/bin/bash

# Apply All Improvements Script
# Run this after stopping the dev server: npm run dev

echo "🚀 Applying improvements to jpsrealtor..."
echo ""

# Check if files are being modified
if pgrep -f "next dev" > /dev/null; then
    echo "⚠️  Warning: Next.js dev server is running!"
    echo "Please stop it first with: Ctrl+C in the terminal running 'npm run dev'"
    echo "Then run this script again."
    exit 1
fi

echo "✅ No dev server detected, proceeding..."
echo ""

# Backup files before modification
echo "📦 Creating backups..."
mkdir -p .backups
cp src/models/saved-chat.ts .backups/saved-chat.ts.backup
cp src/app/api/chat/history/route.ts .backups/chat-history-route.ts.backup
cp src/app/components/PageTransition.tsx .backups/PageTransition.tsx.backup
cp src/app/components/chatwidget/IntegratedChatWidget.tsx .backups/IntegratedChatWidget.tsx.backup
cp src/app/insights/[category]/CategoryPageClient.tsx .backups/CategoryPageClient.tsx.backup
cp src/app/insights/[category]/[slugId]/ArticlePageClient.tsx .backups/ArticlePageClient.tsx.backup
echo "✅ Backups created in .backups/"
echo ""

# 1. Add database index
echo "1️⃣  Adding database index..."
sed -i '72 a SavedChatSchema.index({ userId: 1, updatedAt: -1 }); // For recent conversations query' src/models/saved-chat.ts
echo "✅ Database index added"
echo ""

# 2. Update API with pagination (this is complex, show manual instruction)
echo "2️⃣  Chat History API pagination..."
echo "⚠️  Manual edit required for: src/app/api/chat/history/route.ts"
echo "   See: CHAT_HISTORY_API_PATCH.md for exact changes"
echo ""

# 3. Fix PageTransition spinner
echo "3️⃣  Fixing PageTransition spinner..."
echo "⚠️  Manual edit required for: src/app/components/PageTransition.tsx"
echo "   See: THEME_AND_SPINNER_UPDATES.md Section 1"
echo ""

# 4. Fix chat centering
echo "4️⃣  Fixing chat centering..."
# Line 1384: Remove pb-48
sed -i 's/className="absolute inset-0 flex items-center justify-center z-10 px-4 pb-48 md:pb-0"/className="absolute inset-0 flex items-center justify-center z-10 px-4"/' src/app/components/chatwidget/IntegratedChatWidget.tsx

# Line 1395: Change max-w-[90%] to max-w-2xl
sed -i 's/max-w-\[90%\]/max-w-2xl/' src/app/components/chatwidget/IntegratedChatWidget.tsx
echo "✅ Chat centering fixed"
echo ""

# 5-6. Theme support (complex, manual required)
echo "5️⃣  Insights theme support..."
echo "⚠️  Manual edit required for:"
echo "   - src/app/insights/[category]/CategoryPageClient.tsx"
echo "   - src/app/insights/[category]/[slugId]/ArticlePageClient.tsx"
echo "   See: THEME_AND_SPINNER_UPDATES.md Sections 2-3"
echo ""

echo "="
echo "📋 Summary:"
echo "="
echo "✅ Database index added"
echo "✅ Chat centering fixed"
echo "⚠️  3 files need manual edits (see documentation)"
echo ""
echo "📚 Documentation files:"
echo "   - CHAT_HISTORY_API_PATCH.md"
echo "   - THEME_AND_SPINNER_UPDATES.md"
echo "   - IMPLEMENTATION_SUMMARY.md"
echo ""
echo "🔄 Backups saved in: .backups/"
echo ""
echo "Next steps:"
echo "1. Review the manual changes needed"
echo "2. Test with: npm run dev"
echo "3. If issues occur, restore from .backups/"
echo ""
echo "✨ Done!"
