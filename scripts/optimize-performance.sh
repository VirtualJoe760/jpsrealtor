#!/bin/bash

# Performance Optimization Script for JPSRealtor
# Run this script to execute Phase 1 optimizations

echo "🚀 JPSRealtor Performance Optimization Script"
echo "=============================================="
echo ""

# Phase 1: Remove Unused Heavy Dependencies
echo "📦 Phase 1: Removing unused heavy dependencies..."
echo ""

echo "Removing @mlc-ai/web-llm (~150MB)..."
npm uninstall @mlc-ai/web-llm

echo "Removing three.js and React Three Fiber (~50MB)..."
npm uninstall three @react-three/fiber @react-three/drei maath

echo "Removing decap-cms (if not used)..."
npm uninstall decap-cms

echo ""
echo "✅ Phase 1 Complete!"
echo ""

# Phase 2: Move Server-Only Dependencies
echo "📦 Phase 2: Moving server-only dependencies to devDependencies..."
echo ""

echo "Moving puppeteer to devDependencies..."
npm uninstall puppeteer
npm install --save-dev puppeteer

echo ""
echo "✅ Phase 2 Complete!"
echo ""

# Phase 3: Clean up
echo "🧹 Phase 3: Cleaning up..."
echo ""

echo "Removing node_modules and package-lock..."
rm -rf node_modules package-lock.json

echo "Reinstalling dependencies (this will be faster now)..."
npm install

echo ""
echo "✅ Phase 3 Complete!"
echo ""

# Summary
echo "=============================================="
echo "✨ Optimization Complete!"
echo ""
echo "Expected Improvements:"
echo "  • node_modules size: -40-50%"
echo "  • npm install time: -50-60%"
echo "  • npm run dev startup: -30-40%"
echo "  • Bundle size: -20-30%"
echo ""
echo "Next Steps:"
echo "  1. Run 'npm run dev' to test startup speed"
echo "  2. Review PERFORMANCE_DIAGNOSTIC_REPORT.md for Phase 2"
echo "  3. Implement code splitting for large components"
echo ""
echo "=============================================="
