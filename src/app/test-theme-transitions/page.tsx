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
