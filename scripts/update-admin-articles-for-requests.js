const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/articles/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new state variables after existing ones
const stateAddition = `  const [claudeCategory, setClaudeCategory] = useState<"articles" | "market-insights" | "real-estate-tips">("articles");
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());`;

content = content.replace(
  /const \[isLaunchingClaude, setIsLaunchingClaude\] = useState\(false\);/,
  `const [isLaunchingClaude, setIsLaunchingClaude] = useState(false);\n${stateAddition}`
);

// 2. Add notification polling useEffect after other useEffects
const pollingEffect = `
  // Poll for new draft articles every 30 seconds
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(\`/api/articles/check-new-drafts?lastChecked=\${lastChecked}\`);
        const data = await response.json();

        if (data.newDrafts && data.newDrafts.length > 0) {
          data.newDrafts.forEach((draft: any) => {
            // Show toast notification
            alert(\`✨ New Draft Article Ready!\\n\\nTitle: \${draft.title}\\nCategory: \${draft.category}\\n\\nClick OK to view it.\`);
          });

          // Update last checked timestamp
          setLastChecked(new Date().toISOString());

          // Refresh articles list
          fetchArticles();
        }
      } catch (error) {
        console.error('Error checking for new drafts:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [status, lastChecked]);
`;

content = content.replace(
  /useEffect\(\(\) => \{[\s\S]*?fetchStats\(\);[\s\S]*?\}, \[status, page, filterCategory, filterStatus, filterYear, filterMonth\]\);/,
  `$&\n${pollingEffect}`
);

// 3. Replace handleLaunchClaude function
const newHandleLaunchClaude = `  const handleLaunchClaude = async () => {
    if (!claudePrompt.trim()) {
      alert("Please enter instructions for Claude");
      return;
    }

    setIsLaunchingClaude(true);

    try {
      const response = await fetch("/api/vps/request-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: claudePrompt,
          category: claudeCategory,
          keywords: [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(\`Article request submitted successfully!\\n\\nRequest ID: \${data.requestId}\\n\\nClaude will write the article and push it to GitHub as a draft. You'll get a notification when it's ready (usually 2-5 minutes).\`);
        setShowClaudeModal(false);
        setClaudePrompt("");
      } else {
        alert(\`Failed to submit article request: \${data.error}\`);
      }
    } catch (error) {
      console.error("Request error:", error);
      alert("Failed to submit article request");
    } finally {
      setIsLaunchingClaude(false);
    }
  };`;

content = content.replace(
  /const handleLaunchClaude = async \(\) => \{[\s\S]*?\n  \};/,
  newHandleLaunchClaude
);

// 4. Add category selector to modal
const categorySelector = `
            <div className="mb-6">
              <label className={\`block text-sm font-semibold \${textSecondary} mb-2\`}>
                Category
              </label>
              <select
                value={claudeCategory}
                onChange={(e) => setClaudeCategory(e.target.value as any)}
                className={\`w-full px-4 py-3 \${bgSecondary} \${border} rounded-lg \${textPrimary} focus:outline-none focus:border-purple-500\`}
              >
                <option value="articles">Articles</option>
                <option value="market-insights">Market Insights</option>
                <option value="real-estate-tips">Real Estate Tips</option>
              </select>
            </div>`;

content = content.replace(
  /<textarea[\s\S]*?value={claudePrompt}/,
  `${categorySelector}\n\n            <textarea\n              value={claudePrompt}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated admin/articles/page.tsx successfully!');
console.log('   - Added category selector');
console.log('   - Updated handleLaunchClaude to use new API');
console.log('   - Added notification polling');
