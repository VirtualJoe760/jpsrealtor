// Test if Qwen 3-32B actually calls tools
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const tools = [
  {
    type: "function",
    function: {
      name: "queryDatabase",
      description: "Query our MLS database for properties",
      parameters: {
        type: "object",
        properties: {
          subdivision: {
            type: "string",
            description: "Subdivision name (e.g., 'Palm Desert Country Club')"
          },
          includeStats: {
            type: "boolean",
            description: "Include market statistics"
          }
        },
        required: []
      }
    }
  }
];

async function testQwen() {
  console.log("\n🧪 Testing Qwen 3-32B Tool Calling...\n");

  const messages = [
    {
      role: "system",
      content: "You are a real estate assistant. When users ask about homes, use the queryDatabase tool."
    },
    {
      role: "user",
      content: "Show me homes in Palm Desert Country Club"
    }
  ];

  console.log("📤 Sending request to Groq with Qwen 3-32B...");

  const completion = await groq.chat.completions.create({
    messages,
    model: "qwen/qwen3-32b",
    temperature: 0.3,
    max_tokens: 500,
    tools,
    tool_choice: "auto"
  });

  const response = completion.choices[0]?.message;

  console.log("\n📥 Response from Qwen:\n");
  console.log("Has tool_calls:", !!response.tool_calls);
  console.log("Tool calls count:", response.tool_calls?.length || 0);
  console.log("Has content:", !!response.content);
  console.log("Content length:", response.content?.length || 0);

  if (response.tool_calls) {
    console.log("\n✅ TOOL CALLS DETECTED:");
    response.tool_calls.forEach((tc, i) => {
      console.log(`\n  Tool ${i + 1}:`);
      console.log(`    Name: ${tc.function.name}`);
      console.log(`    Arguments: ${tc.function.arguments}`);
    });
  } else {
    console.log("\n❌ NO TOOL CALLS - Direct response:");
    console.log(`    ${response.content}`);
  }

  console.log("\n" + "=".repeat(60));
}

testQwen().catch(console.error);
