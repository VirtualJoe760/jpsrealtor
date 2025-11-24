// Theme initialization script - MUST run before React hydration
// This prevents theme flash by setting theme immediately on page load

(function() {
  'use strict';

  // Default theme for new users
  const DEFAULT_THEME = 'lightgradient';

  // Get theme from localStorage or use default
  function getTheme() {
    try {
      const savedTheme = localStorage.getItem('site-theme');
      if (savedTheme && (savedTheme === 'blackspace' || savedTheme === 'lightgradient')) {
        return savedTheme;
      }
    } catch (e) {
      console.error('Error reading theme:', e);
    }
    return DEFAULT_THEME;
  }

  // Theme color configurations
  const themes = {
    lightgradient: {
      bg: '#ffffff',
      text: '#000000',
      bodyClass: 'theme-lightgradient',
    },
    blackspace: {
      bg: '#000000',
      text: '#ffffff',
      bodyClass: 'theme-blackspace',
    },
  };

  // Apply theme immediately
  const theme = getTheme();
  const themeConfig = themes[theme];

  // Set body class
  if (document.body) {
    document.body.className = themeConfig.bodyClass;
  }

  // Set meta theme-color for mobile browsers
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', themeConfig.bg);

  // Set initial background color to prevent flash
  document.documentElement.style.backgroundColor = themeConfig.bg;
  document.body.style.backgroundColor = themeConfig.bg;
  document.body.style.color = themeConfig.text;

  // Store theme for React to read
  window.__INITIAL_THEME__ = theme;
})();
