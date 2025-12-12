#!/bin/bash

# Load Testing Script for Query API
# Simple bash-based load testing using curl and Apache Bench (ab)
#
# Usage:
#   ./load-test.sh [base_url] [concurrent_users] [total_requests]
#
# Example:
#   ./load-test.sh http://localhost:3000 10 100

BASE_URL="${1:-http://localhost:3000}"
CONCURRENT="${2:-10}"
TOTAL="${3:-100}"

echo "🚀 Query API Load Testing"
echo "   Base URL: $BASE_URL"
echo "   Concurrent users: $CONCURRENT"
echo "   Total requests: $TOTAL"
echo ""

# Check if ab (Apache Bench) is installed
if ! command -v ab &> /dev/null; then
    echo "⚠️  Apache Bench (ab) not found. Installing recommendations:"
    echo "   macOS: brew install httpd"
    echo "   Ubuntu: sudo apt-get install apache2-utils"
    echo "   Windows: Download from https://www.apachelounge.com/download/"
    echo ""
    echo "Falling back to curl-based testing..."

    # Fallback: Simple curl-based test
    echo "Running simple curl test..."
    START=$(date +%s%N)

    for i in $(seq 1 $TOTAL); do
        curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
            "$BASE_URL/api/query?city=Orange&includeStats=true" &

        # Limit concurrency
        if [ $(( $i % $CONCURRENT )) -eq 0 ]; then
            wait
        fi
    done
    wait

    END=$(date +%s%N)
    DURATION=$(( ($END - $START) / 1000000 ))
    RPS=$(( $TOTAL * 1000 / $DURATION ))

    echo ""
    echo "✅ Test complete!"
    echo "   Total time: ${DURATION}ms"
    echo "   Requests/sec: $RPS"

    exit 0
fi

# Test scenarios
declare -a SCENARIOS=(
    "/api/query?city=Orange&includeStats=true"
    "/api/query?city=Palm+Desert&minBeds=3&maxPrice=800000&includeStats=true"
    "/api/query?city=La+Quinta&compareWith=Palm+Desert&compareIsCity=true&includeStats=true"
    "/api/query?city=Orange&includeClosedStats=true&yearsBack=5"
)

declare -a SCENARIO_NAMES=(
    "Simple City Query"
    "Complex Filter Query"
    "Comparison Query"
    "Closed Listings Query"
)

# Run tests for each scenario
for i in "${!SCENARIOS[@]}"; do
    echo "============================================"
    echo "🧪 Testing: ${SCENARIO_NAMES[$i]}"
    echo "============================================"

    URL="${BASE_URL}${SCENARIOS[$i]}"

    # Run Apache Bench
    ab -n $TOTAL -c $CONCURRENT -q "$URL" 2>&1 | grep -E '(Requests per second|Time per request|Percentage of the requests)'

    echo ""
    sleep 1
done

echo "============================================"
echo "✅ All tests complete!"
echo "============================================"
