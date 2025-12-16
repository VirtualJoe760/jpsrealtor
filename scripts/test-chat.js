const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'local-logs', 'chat-records');

function getMostRecentSession() {
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(LOG_DIR, f),
      mtime: fs.statSync(path.join(LOG_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(files[0].path, 'utf8'));
}

function analyzeSession(session) {
  const results = {
    toolRounds: [],
    finalResponse: null,
    sourcesInToolRounds: false,
    sourcesInFinal: false,
    mlsSource: null,
    errors: []
  };

  let currentRound = 0;

  session.logs.forEach(log => {
    if (log.content.includes('Tool calls in round')) {
      currentRound++;
      results.toolRounds.push({
        round: currentRound,
        tools: log.metadata?.tools || []
      });
    }

    if (log.role === 'assistant') {
      const hasSources = log.content.includes('[SOURCES]');

      if (currentRound > 0 && !log.content.includes('[LISTING_CAROUSEL]')) {
        if (hasSources) {
          results.sourcesInToolRounds = true;
          results.errors.push('SOURCES found in tool round ' + currentRound);
        }
      } else {
        results.finalResponse = { content: log.content, hasSources };
        results.sourcesInFinal = hasSources;

        const sourcesMatch = log.content.match(/\[SOURCES\]([\s\S]*?)\[\/SOURCES\]/);
        if (sourcesMatch) {
          try {
            const sources = JSON.parse(sourcesMatch[1]);
            const mlsSource = sources.find(s => s.type === 'mls');
            if (mlsSource) results.mlsSource = mlsSource;
          } catch (e) {
            results.errors.push('Failed to parse SOURCES JSON');
          }
        }
      }
    }
  });

  return results;
}

console.log('\n' + '='.repeat(80));
console.log('CHAT AI TEST RESULTS');
console.log('='.repeat(80) + '\n');

const session = getMostRecentSession();
if (!session) {
  console.log('No session logs found.\n');
  process.exit(1);
}

console.log('Session: ' + session.sessionId);
console.log('Start: ' + session.startTime);
console.log('Messages: ' + session.messageCount + '\n');

const analysis = analyzeSession(session);

console.log('SOURCES POLICY VERIFICATION:\n');
console.log('Tool Rounds: ' + analysis.toolRounds.length);
analysis.toolRounds.forEach(round => {
  console.log('  Round ' + round.round + ': ' + round.tools.map(t => t.name).join(', '));
});

if (analysis.sourcesInToolRounds) {
  console.log('\nERROR: SOURCES found in tool execution rounds!');
} else {
  console.log('\nPASS: No SOURCES in tool rounds');
}

if (analysis.finalResponse) {
  if (analysis.sourcesInFinal) {
    console.log('PASS: SOURCES included in final response');
  } else {
    console.log('INFO: No SOURCES in final response');
  }
}

if (analysis.mlsSource) {
  console.log('\nMLS SOURCE DETAILS:');
  console.log('  Name: ' + analysis.mlsSource.name);
  console.log('  Abbreviation: ' + analysis.mlsSource.abbreviation);

  if (analysis.mlsSource.abbreviation === 'CRMLS') {
    console.log('  CORRECT: Using CRMLS');
  } else {
    console.log('  ERROR: Should use CRMLS, not ' + analysis.mlsSource.abbreviation);
  }
}

if (analysis.errors.length > 0) {
  console.log('\nERRORS FOUND:');
  analysis.errors.forEach(err => console.log('  - ' + err));
} else {
  console.log('\nNo errors detected');
}

console.log('\n' + '='.repeat(80) + '\n');
