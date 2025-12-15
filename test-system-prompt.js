// Test to verify system prompt has dynamic dates
const { buildEnhancedSystemPrompt } = require('./src/lib/chat/system-prompt.ts');

console.log('🧪 Testing system prompt dynamic dates...\n');

const prompt = buildEnhancedSystemPrompt();

// Extract the date section
const dateSection = prompt.match(/# CURRENT DATE & TIME[\s\S]*?IMPORTANT: Use these dates/);

if (dateSection) {
  console.log('✅ Found date section:');
  console.log(dateSection[0]);
  console.log();
}

// Check for dynamic date examples
const examplesSection = prompt.match(/Examples with correct date filtering:[\s\S]*?\* "All homes in Orange"/);

if (examplesSection) {
  console.log('✅ Found examples section:');
  console.log(examplesSection[0]);
  console.log();

  // Check if dates are actually dynamic (not template literals)
  if (examplesSection[0].includes('2025-12-')) {
    console.log('✅ SUCCESS: Dynamic dates are being injected correctly!');
  } else if (examplesSection[0].includes('${')) {
    console.log('❌ FAIL: Template literals not being evaluated');
  } else {
    console.log('⚠️  WARNING: Could not verify date format');
  }
} else {
  console.log('❌ Examples section not found');
}
