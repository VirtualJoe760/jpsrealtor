'use client';

import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';

/**
 * Renders a generated per-agent legal document (markdown) with the same look as
 * the platform's hardcoded Terms/Privacy pages. Styling is applied via explicit
 * component overrides so we don't depend on a Tailwind typography plugin.
 */
export default function AgentLegalDoc({ markdown }: { title?: string; markdown: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const headTone = isLight ? 'text-gray-900' : 'text-white';
  const bodyTone = isLight ? 'text-gray-700' : 'text-gray-300';
  const linkTone = isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300';
  const ruleTone = isLight ? 'border-gray-200' : 'border-gray-700';

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex flex-col py-8">
        <div className="flex flex-col items-center justify-center flex-grow px-6 py-12">
          <div className={`max-w-5xl w-full shadow-2xl p-8 md:p-12 rounded-2xl border ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            <div className={bodyTone}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className={`text-4xl font-bold mb-6 ${headTone}`}>{children}</h1>,
                  h2: ({ children }) => <h2 className={`text-2xl font-bold mt-8 mb-4 ${headTone}`}>{children}</h2>,
                  h3: ({ children }) => <h3 className={`text-lg font-semibold mt-4 mb-2 ${headTone}`}>{children}</h3>,
                  p: ({ children }) => <p className="leading-relaxed mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 mb-3">{children}</ul>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  a: ({ href, children }) => <a href={href} className={`underline ${linkTone}`}>{children}</a>,
                  strong: ({ children }) => <strong className={headTone}>{children}</strong>,
                  em: ({ children }) => <em className="opacity-80">{children}</em>,
                  hr: () => <hr className={`my-8 ${ruleTone}`} />,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
