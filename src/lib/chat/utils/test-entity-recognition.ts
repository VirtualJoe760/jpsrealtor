// src/lib/chat/utils/test-entity-recognition.ts
// Quick test of entity recognition

import { identifyEntityType } from './entity-recognition';

const testQueries = [
  "Does PDCC allow short term rentals?",
  "What's the HOA fee for 82223 Vandenberg?",
  "Show me homes in Palm Desert under $500k",
  "Tell me about PGA West",
  "Is 12345 Main Street pet friendly?",
  "Can I rent out my property in Trilogy?",
  "What are homes going for in La Quinta?",
];

console.log("=== Entity Recognition Tests ===\n");

(async () => {
  for (const query of testQueries) {
    const result = await identifyEntityType(query);
    console.log(`Query: "${query}"`);
    console.log(`Type: ${result.type} | Value: "${result.value}" | Confidence: ${result.confidence.toFixed(2)}`);
    console.log("---");
  }
})();
