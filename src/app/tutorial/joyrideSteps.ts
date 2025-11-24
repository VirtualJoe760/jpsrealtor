// src/app/tutorial/joyrideSteps.ts
// Joyride tutorial step definitions for all major pages

import { Step } from 'react-joyride';

export type TutorialPage = 'map' | 'cma' | 'listing' | 'subdivision' | 'dashboard' | 'chat';

// ============================================================================
// MAP PAGE TUTORIAL
// ============================================================================

export const mapPageSteps: Step[] = [
  {
    target: '#map-search-bar',
    content: 'Search for properties by address, city, subdivision, or MLS number. Our AI understands natural language queries.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#map-filters-panel',
    content: 'Refine your search with advanced filters including price range, beds, baths, property type, and more.',
    placement: 'right',
  },
  {
    target: '#map-favorites-sidebar',
    content: 'Access your saved properties and favorite communities here. Sign in to sync across devices.',
    placement: 'left',
  },
  {
    target: '#map-marker-cluster',
    content: 'Property markers cluster together at lower zoom levels. Click to zoom in and see individual listings.',
    placement: 'top',
  },
  {
    target: '#map-bottom-panel',
    content: 'Swipe up this panel to see detailed listing cards. Tap any property to open the full details page.',
    placement: 'top',
  },
  {
    target: '#map-listing-drawer',
    content: 'Quick view property details, photos, and key metrics. Click "View Full Details" for comprehensive analysis.',
    placement: 'left',
  },
  {
    target: '#map-cma-button',
    content: 'Generate instant Comparative Market Analysis (CMA) reports with AI-powered valuation and forecasts.',
    placement: 'top',
  },
];

// ============================================================================
// CMA PAGE TUTORIAL
// ============================================================================

export const cmaPageSteps: Step[] = [
  {
    target: '#cma-search-bar',
    content: 'Enter a property address to generate a comprehensive market analysis with comparable sales data.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#cma-sidebar',
    content: 'Access your saved CMA reports and adjust search filters. Your analysis history is preserved here.',
    placement: 'right',
  },
  {
    target: '#cma-summary-section',
    content: 'View the estimated market value, confidence score, and price range based on comparable properties.',
    placement: 'bottom',
  },
  {
    target: '#cma-analytics-section',
    content: 'Explore detailed analytics including appreciation trends, cashflow projections, and market comparisons.',
    placement: 'top',
  },
  {
    target: '#cma-forecast-risk',
    content: 'Our predictive models forecast future values (1-10 years) and assess market risk using 8 weighted factors.',
    placement: 'top',
  },
  {
    target: '#cma-comps-table',
    content: 'Review comparable properties used in the analysis. Each comp is scored for similarity and relevance.',
    placement: 'top',
  },
  {
    target: '#cma-export-button',
    content: 'Export your CMA as PDF in Full, Mini, Buyer, or Seller packet formats for professional presentations.',
    placement: 'left',
  },
];

// ============================================================================
// LISTING PAGE TUTORIAL
// ============================================================================

export const listingPageSteps: Step[] = [
  {
    target: '#listing-collage-hero',
    content: 'Browse property photos in our dynamic collage view. Click any image to open the full gallery.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#listing-key-facts',
    content: 'Quick overview of essential property details: beds, baths, square footage, lot size, and year built.',
    placement: 'bottom',
  },
  {
    target: '#listing-mortgage-calc',
    content: 'Calculate estimated monthly payments with customizable down payment, interest rate, and loan terms.',
    placement: 'top',
  },
  {
    target: '#listing-cma-analytics',
    content: 'View auto-generated market analytics including price per sqft trends and cashflow projections.',
    placement: 'top',
  },
  {
    target: '#listing-forecast-panel',
    content: 'See predicted future values based on historical appreciation and current market momentum.',
    placement: 'top',
  },
  {
    target: '#listing-risk-panel',
    content: 'Understand investment risk with our multi-factor analysis including volatility, market trends, and recommendations.',
    placement: 'top',
  },
  {
    target: '#listing-subdivision-link',
    content: 'Explore the entire subdivision/neighborhood with comprehensive market data and community insights.',
    placement: 'right',
  },
];

// ============================================================================
// SUBDIVISION PAGE TUTORIAL
// ============================================================================

export const subdivisionPageSteps: Step[] = [
  {
    target: '#subdivision-header',
    content: 'Welcome to the neighborhood overview! See comprehensive market data for the entire community.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#subdivision-stats',
    content: 'Quick statistics: total listings, average price, price per sqft, and days on market for this subdivision.',
    placement: 'bottom',
  },
  {
    target: '#subdivision-market-charts',
    content: 'Visualize price history, status breakdown, and market trends specific to this neighborhood.',
    placement: 'top',
  },
  {
    target: '#subdivision-forecast',
    content: 'Subdivision-level value forecasts showing projected appreciation based on community-wide trends.',
    placement: 'top',
  },
  {
    target: '#subdivision-risk-metrics',
    content: 'Risk assessment for the entire subdivision helps you understand neighborhood-level market stability.',
    placement: 'top',
  },
  {
    target: '#subdivision-listings',
    content: 'Browse all active listings within this subdivision. Filter and sort to find your perfect property.',
    placement: 'top',
  },
  {
    target: '#subdivision-reviews',
    content: 'Read resident reviews and community insights. Add your own if you live in or know this neighborhood.',
    placement: 'top',
  },
];

// ============================================================================
// DASHBOARD PAGE TUTORIAL
// ============================================================================

export const dashboardPageSteps: Step[] = [
  {
    target: '#dashboard-nav-tiles',
    content: 'Quick access to all major features: Map Search, CMA Generator, Chat AI, and saved properties.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#dashboard-cma-history',
    content: 'Your recent CMA reports are saved here. Click any report to view or export it as PDF.',
    placement: 'top',
  },
  {
    target: '#dashboard-insights',
    content: 'AI-generated insights based on your search history and saved properties help identify opportunities.',
    placement: 'top',
  },
  {
    target: '#dashboard-analytics',
    content: 'Track your property portfolio performance with appreciation trends and cashflow summaries.',
    placement: 'top',
  },
  {
    target: '#dashboard-favorites',
    content: 'Manage your favorite properties and communities. Set up price alerts and market change notifications.',
    placement: 'top',
  },
];

// ============================================================================
// CHAT PAGE TUTORIAL
// ============================================================================

export const chatPageSteps: Step[] = [
  {
    target: '#chat-input',
    content: 'Ask me anything about real estate! Try "show me homes in Palm Desert Country Club" or "what\'s a good cap rate?"',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#chat-mls-response',
    content: 'I can search the MLS and return property results with detailed cards, maps, and market data.',
    placement: 'top',
  },
  {
    target: '#chat-listing-carousel',
    content: 'Browse property results in a swipeable carousel. Click any listing to see full details.',
    placement: 'top',
  },
  {
    target: '#chat-cma-message',
    content: 'Request CMA reports directly in chat. I\'ll generate comprehensive analysis with charts and forecasts.',
    placement: 'top',
  },
  {
    target: '#chat-map-view',
    content: 'Toggle map view to see property locations. I can answer questions about specific neighborhoods.',
    placement: 'top',
  },
  {
    target: '#chat-filters',
    content: 'Refine your search with natural language or use quick filters. Try "under $500k" or "with a pool".',
    placement: 'top',
  },
  {
    target: '#chat-sidebar',
    content: 'Access conversation history and start new chats. Your previous searches are saved automatically.',
    placement: 'left',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tutorial steps for a specific page
 */
export function getTutorialSteps(page: TutorialPage): Step[] {
  switch (page) {
    case 'map':
      return mapPageSteps;
    case 'cma':
      return cmaPageSteps;
    case 'listing':
      return listingPageSteps;
    case 'subdivision':
      return subdivisionPageSteps;
    case 'dashboard':
      return dashboardPageSteps;
    case 'chat':
      return chatPageSteps;
    default:
      return [];
  }
}

/**
 * Get tutorial title for a specific page
 */
export function getTutorialTitle(page: TutorialPage): string {
  switch (page) {
    case 'map':
      return 'Interactive Map Search';
    case 'cma':
      return 'Comparative Market Analysis';
    case 'listing':
      return 'Property Details';
    case 'subdivision':
      return 'Neighborhood Insights';
    case 'dashboard':
      return 'Your Dashboard';
    case 'chat':
      return 'AI Real Estate Assistant';
    default:
      return 'Tutorial';
  }
}

/**
 * Check if a page has a tutorial
 */
export function hasTutorial(page: string): page is TutorialPage {
  return ['map', 'cma', 'listing', 'subdivision', 'dashboard', 'chat'].includes(page);
}
