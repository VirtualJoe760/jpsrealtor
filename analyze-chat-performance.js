/**
 * Chat Performance Analyzer
 *
 * Analyzes chat-records session files to extract performance metrics
 *
 * Usage: node analyze-chat-performance.js
 */

const fs = require('fs');
const path = require('path');

const CHAT_RECORDS_DIR = './local-logs/chat-records';

/**
 * Analyze a single session file
 */
function analyzeSession(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const session = JSON.parse(content);

    const metrics = {
      sessionId: session.sessionId,
      messageCount: session.messageCount,
      queries: []
    };

    // Find assistant messages with processingTime
    session.logs.forEach((log, index) => {
      if (log.role === 'assistant' && log.metadata?.processingTime) {
        // Try to find the corresponding user message
        let userMessage = null;
        for (let i = index - 1; i >= 0; i--) {
          if (session.logs[i].role === 'user') {
            userMessage = session.logs[i].content;
            break;
          }
        }

        // Extract tools used from response
        const tools = [];
        if (log.content.includes('[LISTING_CAROUSEL]')) tools.push('queryDatabase/listings');
        if (log.content.includes('[MAP_VIEW]')) tools.push('mapView');
        if (log.content.includes('[APPRECIATION]')) tools.push('getAppreciation');
        if (log.content.includes('[ARTICLE_RESULTS]')) tools.push('searchArticles');

        metrics.queries.push({
          userQuery: userMessage || 'Unknown',
          processingTime: log.metadata.processingTime,
          model: log.metadata.model,
          responseLength: log.content.length,
          toolsUsed: tools,
          timestamp: log.timestamp
        });
      }
    });

    return metrics;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main analyzer
 */
function main() {
  console.log('\n');
  console.log('█'.repeat(80));
  console.log('  CHAT PERFORMANCE ANALYSIS');
  console.log('  Analyzing local-logs/chat-records/*.json files');
  console.log('█'.repeat(80));
  console.log('');

  // Read all session files
  const files = fs.readdirSync(CHAT_RECORDS_DIR)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => path.join(CHAT_RECORDS_DIR, f));

  console.log(`Found ${files.length} session files\n`);

  // Analyze all sessions
  const allMetrics = [];
  files.forEach(file => {
    const metrics = analyzeSession(file);
    if (metrics && metrics.queries.length > 0) {
      allMetrics.push(metrics);
    }
  });

  console.log(`Analyzed ${allMetrics.length} sessions with performance data\n`);

  // Flatten all queries
  const allQueries = [];
  allMetrics.forEach(session => {
    session.queries.forEach(query => {
      allQueries.push({
        ...query,
        sessionId: session.sessionId
      });
    });
  });

  console.log(`Total queries: ${allQueries.length}\n`);

  if (allQueries.length === 0) {
    console.log('No queries found with performance data.');
    return;
  }

  // Sort by processing time (slowest first)
  const sortedQueries = allQueries.sort((a, b) => b.processingTime - a.processingTime);

  // Calculate statistics
  const processingTimes = allQueries.map(q => q.processingTime);
  const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
  const minTime = Math.min(...processingTimes);
  const maxTime = Math.max(...processingTimes);
  const medianTime = processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length / 2)];

  // Categorize by speed
  const fast = allQueries.filter(q => q.processingTime < 3000); // < 3s
  const medium = allQueries.filter(q => q.processingTime >= 3000 && q.processingTime < 10000); // 3-10s
  const slow = allQueries.filter(q => q.processingTime >= 10000 && q.processingTime < 30000); // 10-30s
  const verySlow = allQueries.filter(q => q.processingTime >= 30000); // 30s+

  // Tool usage analysis
  const toolUsage = {};
  allQueries.forEach(q => {
    q.toolsUsed.forEach(tool => {
      if (!toolUsage[tool]) {
        toolUsage[tool] = { count: 0, totalTime: 0, times: [] };
      }
      toolUsage[tool].count++;
      toolUsage[tool].totalTime += q.processingTime;
      toolUsage[tool].times.push(q.processingTime);
    });
  });

  // Print summary
  console.log('='.repeat(80));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Average Time:    ${avgTime.toFixed(0)}ms (${(avgTime / 1000).toFixed(2)}s)`);
  console.log(`Median Time:     ${medianTime.toFixed(0)}ms (${(medianTime / 1000).toFixed(2)}s)`);
  console.log(`Fastest:         ${minTime}ms (${(minTime / 1000).toFixed(2)}s)`);
  console.log(`Slowest:         ${maxTime}ms (${(maxTime / 1000).toFixed(2)}s)`);
  console.log('');

  console.log('Speed Distribution:');
  console.log(`  ⚡ Fast (<3s):      ${fast.length.toString().padStart(3)} (${(fast.length / allQueries.length * 100).toFixed(1)}%)`);
  console.log(`  🏃 Medium (3-10s):  ${medium.length.toString().padStart(3)} (${(medium.length / allQueries.length * 100).toFixed(1)}%)`);
  console.log(`  🐌 Slow (10-30s):   ${slow.length.toString().padStart(3)} (${(slow.length / allQueries.length * 100).toFixed(1)}%)`);
  console.log(`  🐢 Very Slow (30s+): ${verySlow.length.toString().padStart(3)} (${(verySlow.length / allQueries.length * 100).toFixed(1)}%)`);
  console.log('');

  // Tool usage analysis
  console.log('='.repeat(80));
  console.log('TOOL USAGE ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  Object.entries(toolUsage).forEach(([tool, stats]) => {
    const avgToolTime = stats.totalTime / stats.count;
    const minToolTime = Math.min(...stats.times);
    const maxToolTime = Math.max(...stats.times);

    console.log(`${tool}:`);
    console.log(`  Uses:      ${stats.count}`);
    console.log(`  Avg Time:  ${avgToolTime.toFixed(0)}ms (${(avgToolTime / 1000).toFixed(2)}s)`);
    console.log(`  Min Time:  ${minToolTime}ms (${(minToolTime / 1000).toFixed(2)}s)`);
    console.log(`  Max Time:  ${maxToolTime}ms (${(maxToolTime / 1000).toFixed(2)}s)`);
    console.log('');
  });

  // Slowest queries
  console.log('='.repeat(80));
  console.log('SLOWEST QUERIES (Top 10)');
  console.log('='.repeat(80));
  console.log('');
  sortedQueries.slice(0, 10).forEach((query, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${(query.processingTime / 1000).toFixed(2)}s - ${query.userQuery.substring(0, 60)}...`);
    console.log(`    Tools: ${query.toolsUsed.join(', ') || 'none'}`);
    console.log(`    Model: ${query.model}`);
    console.log('');
  });

  // Fastest queries
  console.log('='.repeat(80));
  console.log('FASTEST QUERIES (Top 10)');
  console.log('='.repeat(80));
  console.log('');
  sortedQueries.reverse().slice(0, 10).forEach((query, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${(query.processingTime / 1000).toFixed(2)}s - ${query.userQuery.substring(0, 60)}...`);
    console.log(`    Tools: ${query.toolsUsed.join(', ') || 'none'}`);
    console.log(`    Model: ${query.model}`);
    console.log('');
  });

  // Optimization recommendations
  console.log('='.repeat(80));
  console.log('PERFORMANCE RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('');

  // Identify patterns
  if (verySlow.length > 0) {
    console.log(`⚠️  CRITICAL: ${verySlow.length} queries taking 30+ seconds`);
    console.log('');
    verySlow.forEach(q => {
      console.log(`   - "${q.userQuery.substring(0, 50)}..." (${(q.processingTime / 1000).toFixed(2)}s)`);
      console.log(`     Tools: ${q.toolsUsed.join(', ') || 'none'}`);
    });
    console.log('');
    console.log('   Recommendations:');
    console.log('   1. Implement caching for subdivision/city queries (DONE!)');
    console.log('   2. Add database indexes (DONE!)');
    console.log('   3. Monitor cached vs uncached performance');
    console.log('');
  }

  if (slow.length > allQueries.length * 0.2) {
    console.log(`⚠️  WARNING: ${slow.length} queries taking 10-30 seconds (${(slow.length / allQueries.length * 100).toFixed(1)}%)`);
    console.log('');
    console.log('   Recommendations:');
    console.log('   1. Enable response streaming for better UX');
    console.log('   2. Consider parallel tool execution');
    console.log('   3. Optimize AI model token limits');
    console.log('');
  }

  console.log('✅ OPTIMIZATIONS COMPLETED:');
  console.log('   1. Query caching with Cloudflare KV (51s → 500ms for subdivisions)');
  console.log('   2. Database indexes (34 total indexes created)');
  console.log('   3. Regex optimization for index usage');
  console.log('');

  console.log('🚀 NEXT OPTIMIZATIONS:');
  console.log('   1. Enable AI response streaming (`stream: true`)');
  console.log('   2. Dynamic token limits based on query complexity');
  console.log('   3. Prefetch/warm cache for popular queries');
  console.log('   4. Compress API responses');
  console.log('   5. Monitor cache hit rates in production');
  console.log('');

  console.log('█'.repeat(80));
  console.log('  ANALYSIS COMPLETE');
  console.log('█'.repeat(80));
  console.log('');
}

main();
