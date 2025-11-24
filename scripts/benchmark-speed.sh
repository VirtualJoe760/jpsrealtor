#!/bin/bash
# Speed benchmark test

echo "Running 5 speed tests..."
echo "================================"

for i in {1..5}; do
  echo "Test $i:"
  curl -s -X POST http://localhost:3000/api/chat/stream \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"show me homes in palm desert country club"}],"userId":"speed-test","userTier":"free"}' \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('  Processing Time:', d['metadata']['processingTime'], 'ms'); print('  Iterations:', d['metadata']['iterations'])"
  echo ""
  sleep 1
done

echo "================================"
echo "Benchmark complete!"
