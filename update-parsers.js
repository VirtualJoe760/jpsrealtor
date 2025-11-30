const fs = require('fs');

const filePath = 'F:/web-clients/joseph-sardella/jpsrealtor/src/app/api/chat/stream/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Update parseComponentData function to handle articles
const parseFunction = `function parseComponentData(responseText: string): { carousel?: any; mapView?: any } {`;
const newParseFunction = `function parseComponentData(responseText: string): { carousel?: any; mapView?: any; articles?: any } {`;

content = content.replace(parseFunction, newParseFunction);

// Find the return statement and add article parsing before it
const returnStatement = '  return components;\n}';
const returnIndex = content.lastIndexOf(returnStatement);

if (returnIndex === -1) {
  console.error('❌ Could not find return statement in parseComponentData');
  process.exit(1);
}

const articleParsing = `
  // Parse [ARTICLE_RESULTS]...[/ARTICLE_RESULTS]
  const articleMatch = responseText.match(/\\[ARTICLE_RESULTS\\]\\s*([\\s\\S]*?)\\s*\\[\\/ARTICLE_RESULTS\\]/);
  if (articleMatch) {
    try {
      const jsonStr = articleMatch[1].trim();
      components.articles = JSON.parse(jsonStr);
      console.log("[PARSE] Found article results with", components.articles?.results?.length || 0, "articles");
    } catch (e) {
      console.error("[PARSE] Failed to parse article results JSON:", e);
    }
  }

`;

content = content.slice(0, returnIndex) + articleParsing + content.slice(returnIndex);

// Update cleanResponseText to remove article markers
const cleanFunction = `  // Remove [MAP_VIEW]...[/MAP_VIEW] blocks
  cleaned = cleaned.replace(/\\[MAP_VIEW\\]\\s*[\\s\\S]*?\\s*\\[\\/MAP_VIEW\\]/g, '');`;

const articleClean = `  // Remove [MAP_VIEW]...[/MAP_VIEW] blocks
  cleaned = cleaned.replace(/\\[MAP_VIEW\\]\\s*[\\s\\S]*?\\s*\\[\\/MAP_VIEW\\]/g, '');

  // Remove [ARTICLE_RESULTS]...[/ARTICLE_RESULTS] blocks
  cleaned = cleaned.replace(/\\[ARTICLE_RESULTS\\]\\s*[\\s\\S]*?\\s*\\[\\/ARTICLE_RESULTS\\]/g, '');`;

content = content.replace(cleanFunction, articleClean);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated parseComponentData and cleanResponseText functions');
