const fs = require('fs');
const filePath = 'F:/web-clients/joseph-sardella/jpsrealtor/src/app/admin/articles/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update the grid layout - simpler on mobile
content = content.replace(
  'className={`grid gap-8 ${showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"} transition-all`}',
  'className="grid gap-8 grid-cols-1"'
);

// Update Form Container
content = content.replace(
  '<div className={`${showPreview ? "" : "max-w-6xl mx-auto w-full"}`}>',
  '<div className={`max-w-6xl mx-auto w-full transition-all ${showPreview ? "xl:mr-[25rem]" : ""}`}>'
);

// Replace the old preview panel with new mobile-friendly version
const oldPreviewStart = '          {/* Mobile Preview Panel */}';
const oldPreviewEnd = '          )}';

const startIndex = content.indexOf(oldPreviewStart);
if (startIndex === -1) {
  console.log('Could not find preview panel start marker');
  process.exit(1);
}

// Find the matching closing bracket
let bracketCount = 0;
let inPreview = false;
let endIndex = -1;

for (let i = startIndex; i < content.length; i++) {
  if (content.substring(i, i + 2) === '{/') {
    inPreview = true;
  }
  if (content[i] === '{' && inPreview) bracketCount++;
  if (content[i] === '}' && inPreview) {
    bracketCount--;
    if (bracketCount === 0) {
      // Find the closing of the outer conditional
      const remaining = content.substring(i);
      const closeIdx = remaining.indexOf(')}');
      if (closeIdx !== -1) {
        endIndex = i + closeIdx + 2;
        break;
      }
    }
  }
}

if (endIndex === -1) {
  console.log('Could not find preview panel end');
  process.exit(1);
}

const newPreview = `          {/* Preview Panel - Full screen modal on mobile, fixed sidebar on desktop */}
          {showPreview && (
            <>
              {/* Mobile: Full Screen Modal */}
              <div className="xl:hidden fixed inset-0 bg-black/95 z-50 overflow-y-auto">
                <div className="min-h-screen p-4">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/95 py-4 z-10">
                    <h3 className={\`text-lg font-semibold \${textPrimary}\`}>Article Preview</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewKey(prev => prev + 1)}
                        className={\`px-3 py-2 text-sm \${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold\`}
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowPreview(false)}
                        className={\`px-3 py-2 text-sm \${textPrimary} rounded-lg transition-colors font-semibold \${isLight ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"}\`}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Mobile Preview Frame */}
                  <div className="relative mx-auto max-w-md">
                    <div className="w-full rounded-2xl overflow-hidden border-4 border-gray-700 shadow-2xl bg-white" style={{ minHeight: '600px' }}>
                      <iframe
                        key={previewKey}
                        src={\`/articles/preview?\${new URLSearchParams({
                          title: formData.title || 'Untitled Article',
                          excerpt: formData.excerpt || '',
                          content: formData.content || '',
                          category: formData.category,
                          imageUrl: formData.featuredImage.url || ''
                        }).toString()}\`}
                        className="w-full h-screen"
                        title="Article Preview"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop: Fixed Right Sidebar */}
              <div className="hidden xl:block fixed right-8 top-24 bottom-8 w-96 z-40">
                <div className={\`\${cardBg} \${cardBorder} rounded-xl p-6 h-full flex flex-col\`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={\`text-lg font-semibold \${textPrimary}\`}>Mobile Preview</h3>
                    <button
                      onClick={() => setPreviewKey(prev => prev + 1)}
                      className={\`px-3 py-2 text-sm \${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold\`}
                    >
                      Refresh
                    </button>
                  </div>

                  {/* iPhone-style Preview Frame */}
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <div className="relative" style={{ width: '375px', height: '667px' }}>
                      {/* iPhone Notch */}
                      <div className={\`absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 \${isLight ? "bg-gray-200" : "bg-gray-900"} rounded-b-3xl z-10\`}></div>

                      {/* Preview iframe */}
                      <div className="w-full h-full rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl bg-white">
                        <iframe
                          key={previewKey}
                          src={\`/articles/preview?\${new URLSearchParams({
                            title: formData.title || 'Untitled Article',
                            excerpt: formData.excerpt || '',
                            content: formData.content || '',
                            category: formData.category,
                            imageUrl: formData.featuredImage.url || ''
                          }).toString()}\`}
                          className="w-full h-full"
                          title="Article Preview"
                        />
                      </div>

                      {/* Home Indicator */}
                      <div className={\`absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 \${isLight ? "bg-gray-300" : "bg-gray-700"} rounded-full z-10\`}></div>
                    </div>
                  </div>

                  <p className={\`text-xs \${textMuted} text-center mt-4\`}>
                    Preview updates when you click "Refresh"
                  </p>
                </div>
              </div>
            </>
          )}`;

content = content.substring(0, startIndex) + newPreview + content.substring(endIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated preview panel for mobile and desktop');
