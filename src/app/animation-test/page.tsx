"use client";

import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Animation pairs configuration (matches implementation)
const ANIMATION_PAIRS = {
  'key-turn': {
    name: 'Key Turn',
    exit: 'key-lock',
    enter: 'key-unlock',
    duration: 300,
    description: 'Key rotates to lock/unlock',
    metaphor: 'Locking up one property, unlocking another'
  },
  'french-doors': {
    name: 'French Doors',
    exit: 'doors-close',
    enter: 'doors-open',
    duration: 500,
    description: 'Double doors swing inward/outward',
    metaphor: 'Grand entrance and exit'
  },
  'blinds': {
    name: 'Venetian Blinds',
    exit: 'blinds-close',
    enter: 'blinds-open',
    duration: 400,
    description: 'Horizontal slats rotate',
    metaphor: 'Controlling light and privacy'
  },
  'garage': {
    name: 'Garage Door',
    exit: 'garage-down',
    enter: 'garage-up',
    duration: 450,
    description: 'Door rolls down/up',
    metaphor: 'Modern homes, secure storage'
  },
  'sliding-door': {
    name: 'Sliding Glass Door',
    exit: 'slide-close',
    enter: 'slide-open',
    duration: 450,
    description: 'Panel slides horizontally',
    metaphor: 'Contemporary design, indoor/outdoor'
  },
  'property-card': {
    name: 'Property Card Flip',
    exit: 'card-flip-away',
    enter: 'card-flip-to',
    duration: 600,
    description: 'Card flips to show back/front',
    metaphor: 'Browsing listings'
  },
  'shutters': {
    name: 'Window Shutters',
    exit: 'shutters-close',
    enter: 'shutters-open',
    duration: 500,
    description: 'Shutters close/open from center',
    metaphor: 'Traditional homes, classic elegance'
  },
  'curtains': {
    name: 'Curtain Draw',
    exit: 'curtains-close',
    enter: 'curtains-open',
    duration: 550,
    description: 'Curtains pull together/apart',
    metaphor: 'Theatrical reveal, staging'
  }
} as const;

type AnimationKey = keyof typeof ANIMATION_PAIRS;

// SVG graphics for each animation (matches ThemeContext implementation)
function getAnimationSVG(animationKey: AnimationKey): string {
  const svgs: Record<AnimationKey, string> = {
    'key-turn': `
      <svg viewBox="0 0 100 100" style="width: 200px; height: 200px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <g id="key" style="transform-origin: 50% 50%;">
          <circle cx="30" cy="50" r="15" fill="none" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="30" cy="50" r="8" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
          <rect x="42" y="47" width="40" height="6" rx="2" fill="white" opacity="0.9"/>
          <rect x="70" y="42" width="4" height="11" fill="white" opacity="0.9"/>
          <rect x="76" y="45" width="4" height="8" fill="white" opacity="0.9"/>
          <rect x="82" y="42" width="4" height="11" fill="white" opacity="0.9"/>
        </g>
      </svg>
    `,
    'french-doors': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 80%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <rect x="10" y="15" width="35" height="70" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="15" y="20" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <rect x="15" y="50" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <circle cx="38" cy="52" r="2" fill="white" opacity="0.9"/>
        <rect x="55" y="15" width="35" height="70" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="60" y="20" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <rect x="60" y="50" width="25" height="25" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <circle cx="62" cy="52" r="2" fill="white" opacity="0.9"/>
      </svg>
    `,
    'blinds': `
      <svg viewBox="0 0 100 100" style="width: 70%; height: 70%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        ${Array.from({ length: 12 }, (_, i) => `
          <rect x="15" y="${15 + i * 6}" width="70" height="4" rx="1" fill="white" opacity="${0.7 - i * 0.02}"/>
        `).join('')}
      </svg>
    `,
    'garage': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 70%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        ${Array.from({ length: 6 }, (_, i) => `
          <rect x="20" y="${20 + i * 11}" width="60" height="9" rx="1" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
          <line x1="25" y1="${24 + i * 11}" x2="75" y2="${24 + i * 11}" stroke="white" stroke-width="0.5" opacity="0.5"/>
        `).join('')}
        <rect x="48" y="62" width="4" height="8" rx="1" fill="white" opacity="0.9"/>
      </svg>
    `,
    'sliding-door': `
      <svg viewBox="0 0 100 100" style="width: 65%; height: 80%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <rect x="30" y="15" width="40" height="70" rx="2" fill="none" stroke="white" stroke-width="2.5" opacity="0.85"/>
        <rect x="35" y="20" width="30" height="60" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <line x1="50" y1="20" x2="50" y2="80" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <rect x="60" y="48" width="6" height="4" rx="2" fill="white" opacity="0.9"/>
      </svg>
    `,
    'property-card': `
      <svg viewBox="0 0 100 100" style="width: 300px; height: 200px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <rect x="10" y="25" width="80" height="50" rx="4" fill="none" stroke="white" stroke-width="2" opacity="0.9"/>
        <path d="M 35 45 L 50 35 L 65 45 L 65 60 L 35 60 Z" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <rect x="45" y="50" width="10" height="10" fill="white" opacity="0.7"/>
        <path d="M 32 45 L 50 32 L 68 45" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>
    `,
    'shutters': `
      <svg viewBox="0 0 100 100" style="width: 60%; height: 75%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <rect x="15" y="20" width="28" height="60" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        ${Array.from({ length: 8 }, (_, i) => `
          <line x1="18" y1="${25 + i * 7}" x2="40" y2="${25 + i * 7}" stroke="white" stroke-width="1.5" opacity="0.6"/>
        `).join('')}
        <rect x="57" y="20" width="28" height="60" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        ${Array.from({ length: 8 }, (_, i) => `
          <line x1="60" y1="${25 + i * 7}" x2="82" y2="${25 + i * 7}" stroke="white" stroke-width="1.5" opacity="0.6"/>
        `).join('')}
      </svg>
    `,
    'curtains': `
      <svg viewBox="0 0 100 100" style="width: 70%; height: 85%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <line x1="10" y1="12" x2="90" y2="12" stroke="white" stroke-width="2" opacity="0.9"/>
        <circle cx="10" cy="12" r="3" fill="white" opacity="0.9"/>
        <circle cx="90" cy="12" r="3" fill="white" opacity="0.9"/>
        <path d="M 15 15 Q 18 50, 15 85 L 40 85 Q 38 50, 40 15 Z" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
        <path d="M 20 15 Q 22 50, 20 85" stroke="white" stroke-width="1" opacity="0.5"/>
        <path d="M 30 15 Q 32 50, 30 85" stroke="white" stroke-width="1" opacity="0.5"/>
        <path d="M 60 15 Q 62 50, 60 85 L 85 85 Q 82 50, 85 15 Z" fill="none" stroke="white" stroke-width="2" opacity="0.7"/>
        <path d="M 65 15 Q 67 50, 65 85" stroke="white" stroke-width="1" opacity="0.5"/>
        <path d="M 75 15 Q 77 50, 75 85" stroke="white" stroke-width="1" opacity="0.5"/>
      </svg>
    `,
  };

  return svgs[animationKey] || '';
}

export default function TestThemeTransitionsPage() {
  const { currentTheme } = useTheme();
  const animationKeys = Object.keys(ANIMATION_PAIRS) as AnimationKey[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'exit' | 'enter'>('exit');

  const currentKey = animationKeys[currentIndex];
  const currentAnimation = ANIMATION_PAIRS[currentKey];

  const playAnimation = (animationPhase: 'exit' | 'enter') => {
    if (isPlaying) return;

    setIsPlaying(true);
    setPhase(animationPhase);

    // Get theme colors
    const lightColor = '#4f46e5';
    const darkColor = '#000000';

    // For exit: use current theme color
    // For enter: use opposite theme color
    let backgroundColor: string;
    if (animationPhase === 'exit') {
      backgroundColor = currentTheme === 'lightgradient' ? lightColor : darkColor;
    } else {
      backgroundColor = currentTheme === 'lightgradient' ? darkColor : lightColor;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background-color: ${backgroundColor};
      pointer-events: none;
    `;
    overlay.setAttribute('data-animation', currentKey);
    overlay.setAttribute('data-phase', animationPhase);

    // Add SVG graphic
    const svgHTML = getAnimationSVG(currentKey);
    if (svgHTML) {
      overlay.innerHTML = svgHTML;
    }

    document.body.appendChild(overlay);

    // Apply animation class
    const animationClass = animationPhase === 'exit'
      ? currentAnimation.exit
      : currentAnimation.enter;

    // Use requestAnimationFrame to ensure class applies after element is in DOM
    requestAnimationFrame(() => {
      overlay.classList.add(animationClass);
    });

    // Remove overlay after animation completes
    setTimeout(() => {
      overlay.remove();
      setIsPlaying(false);
    }, currentAnimation.duration);
  };

  const nextAnimation = () => {
    setCurrentIndex((prev) => (prev + 1) % animationKeys.length);
  };

  const prevAnimation = () => {
    setCurrentIndex((prev) => (prev - 1 + animationKeys.length) % animationKeys.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🎬 Theme Transition Tester
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Preview all 8 real estate-themed transition animations
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6">
          {/* Animation Info */}
          <div className="mb-8 text-center">
            <div className="inline-block bg-indigo-100 dark:bg-indigo-900 px-4 py-2 rounded-full mb-4">
              <span className="text-indigo-800 dark:text-indigo-200 font-semibold">
                {currentIndex + 1} / {animationKeys.length}
              </span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {currentAnimation.name}
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {currentAnimation.description}
            </p>

            <p className="text-sm italic text-gray-500 dark:text-gray-500">
              💡 Metaphor: {currentAnimation.metaphor}
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {currentAnimation.duration}ms
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Duration</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {currentAnimation.exit}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Exit Class</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {currentAnimation.enter}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Enter Class</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {currentKey}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Key</div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <button
              onClick={prevAnimation}
              disabled={isPlaying}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              ◀ Previous
            </button>

            <button
              onClick={() => playAnimation('exit')}
              disabled={isPlaying}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isPlaying && phase === 'exit' ? '⏸ Playing...' : '🚪 Play EXIT'}
            </button>

            <button
              onClick={() => playAnimation('enter')}
              disabled={isPlaying}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isPlaying && phase === 'enter' ? '⏸ Playing...' : '🚪 Play ENTER'}
            </button>

            <button
              onClick={nextAnimation}
              disabled={isPlaying}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Next ▶
            </button>
          </div>

          {/* Preview Area */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-8 min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {isPlaying ? '🎬' : '▶️'}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {isPlaying
                  ? `Playing ${phase.toUpperCase()} animation...`
                  : 'Click a button to preview the animation'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Animation List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            All Animations ({animationKeys.length})
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {animationKeys.map((key, index) => (
              <button
                key={key}
                onClick={() => setCurrentIndex(index)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  index === currentIndex
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {ANIMATION_PAIRS[key].name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Theme Indicator */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current Theme: <span className="font-semibold">{currentTheme === 'lightgradient' ? '☀️ Light' : '🌙 Dark'}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            💡 Tip: EXIT uses current theme color, ENTER uses opposite theme color
          </p>
        </div>
      </div>
    </div>
  );
}
