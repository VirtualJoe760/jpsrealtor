const fs = require('fs');
const file = 'src/app/components/chatwidget/IntegratedChatWidget.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `        addMessage({
          role: "assistant",
          content: cleanResponse,
          context: "general",
        });`;

const newCode = `        // Retrieve listings from global store (set by Groq API)
        const chatListings = (window as any).__chatListings || null;

        addMessage({
          role: "assistant",
          content: cleanResponse,
          context: "general",
          listings: chatListings, // Attach listings from Groq API
        });

        // Clear global store after using
        if (chatListings) {
          (window as any).__chatListings = null;
          console.log(\`✅ Attached \${chatListings.length} listings to message\`);
        }`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Fix applied successfully!');
} else {
  console.log('❌ Old code not found - file may have changed');
  console.log('Searching for addMessage patterns...');
  const matches = content.match(/addMessage\(/g);
  console.log(`Found ${matches ? matches.length : 0} addMessage calls`);
}
