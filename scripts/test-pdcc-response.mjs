#!/usr/bin/env node

const response = await fetch("http://localhost:3000/api/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "show me homes in Palm Desert Country Club" }],
    userId: "test-pdcc-full",
    userTier: "free"
  })
});

const data = await response.json();

console.log("✅ SUCCESS:", data.success);
console.log("\n📝 AI RESPONSE:");
console.log(data.response);
console.log("\n📊 LISTINGS COUNT:", data.listings?.length || 0);
console.log("🗺️  MAP READY:", data.listings?.every(l => l.latitude || l.Latitude) ? "YES" : "NO");
console.log("\n🔧 FUNCTION CALLS:", data.metadata?.functionCalls?.map(fc => fc.function).join(" → ") || "none");

console.log("\n🏠 FIRST 3 LISTINGS:");
(data.listings || []).slice(0, 3).forEach((l, i) => {
  console.log(`\n${i+1}. ${l.address || l.unparsedAddress}`);
  console.log(`   💰 Price: $${l.listPrice?.toLocaleString()}`);
  console.log(`   🛏️  Beds: ${l.bedsTotal || l.bedroomsTotal}, 🛁 Baths: ${l.bathroomsTotalDecimal || l.bathroomsTotalInteger}`);
  console.log(`   📐 SqFt: ${l.livingArea?.toLocaleString()}`);
  console.log(`   📍 Coords: (${l.latitude || l.Latitude}, ${l.longitude || l.Longitude})`);
});

console.log("\n⚙️  METADATA:");
console.log(`   Model: ${data.metadata?.model}`);
console.log(`   Processing Time: ${data.metadata?.processingTime}ms`);
console.log(`   Iterations: ${data.metadata?.iterations}`);
console.log(`   Tier: ${data.metadata?.tier}`);
