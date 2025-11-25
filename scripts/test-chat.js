// Test script to send a chat message and capture the response
const fs = require('fs');
const path = require('path');

const TEST_MESSAGE = "show me homes in palm desert country club";
const API_URL = "http://localhost:3001/api/chat/stream";
const OUTPUT_DIR = path.join(__dirname, '../local-logs/chat-records');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `test-chat-${Date.now()}.json`);

async function testChat() {
  console.log('🧪 Testing chat with message:', TEST_MESSAGE);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: TEST_MESSAGE
          }
        ],
        userId: 'test-user-' + Date.now(),
        userTier: 'free'
      })
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ Response received');
    console.log('📊 Response preview:', {
      responseLength: data.response?.length || 0,
      hasToolCalls: !!data.toolCalls,
      toolCallCount: data.toolCalls?.length || 0,
      firstToolCall: data.toolCalls?.[0]?.function?.name || 'none'
    });

    // Save full response to file
    const outputData = {
      timestamp: new Date().toISOString(),
      testMessage: TEST_MESSAGE,
      response: data,
      metadata: {
        userId: 'test-user',
        apiUrl: API_URL,
      }
    };

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
    console.log('💾 Full response saved to:', OUTPUT_FILE);

    // Print key findings
    console.log('\n📋 Analysis:');
    console.log('Response text:', data.response?.substring(0, 200) + '...');

    if (data.toolCalls && data.toolCalls.length > 0) {
      console.log('\n🔧 Tool calls detected:');
      data.toolCalls.forEach((call, i) => {
        console.log(`  ${i + 1}. ${call.function.name}`);
        console.log(`     Arguments:`, JSON.stringify(call.function.arguments, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ Error testing chat:', error.message);
    process.exit(1);
  }
}

testChat();
