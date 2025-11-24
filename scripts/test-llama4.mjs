#!/usr/bin/env node

// Test Llama 4 Scout model
const testMessage = "show me homes in palm desert country club";

console.log("🧪 Testing Llama 4 Scout Model");
console.log("================================\n");

const startTime = Date.now();

try {
  const response = await fetch("http://localhost:3000/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: testMessage }],
      userId: "test-llama4",
      userTier: "free",
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const totalTime = Date.now() - startTime;

  console.log("✅ SUCCESS");
  console.log("================================");
  console.log("Model:", data.metadata.model);
  console.log("API Processing Time:", data.metadata.processingTime, "ms");
  console.log("Total Request Time:", totalTime, "ms");
  console.log("Iterations:", data.metadata.iterations);
  console.log("Function Calls:", data.metadata.functionCalls.length);
  console.log("\nFunctions Called:");
  data.metadata.functionCalls.forEach((call, i) => {
    console.log(`  ${i + 1}. ${call.function}()`);
  });
  console.log("\nResponse Preview:");
  console.log(data.response.substring(0, 150) + "...");
  console.log("================================\n");
} catch (error) {
  console.error("❌ ERROR:", error.message);
  process.exit(1);
}
