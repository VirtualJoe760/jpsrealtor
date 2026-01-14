// Constants for ContactViewPanel

// MapTiler API configuration
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '';
export const MAP_STYLE =
  MAPTILER_KEY && MAPTILER_KEY !== 'get_your_maptiler_key_here'
    ? `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Responsive panel width configuration
export const OPTIMAL_PANEL_WIDTH = {
  sm: 500, // Small tablets
  md: 550, // Medium tablets
  lg: 600, // Laptops
  xl: 700, // Larger laptops
  '2xl': 900, // Large desktop
};

// Panel behavior constants
export const PANEL_MIN_WIDTH = 400;
export const PANEL_MAX_WIDTH = 1200;
export const PANEL_DRAG_THRESHOLD = 5;

// Contact status options
export const CONTACT_STATUSES = [
  { value: 'uncontacted', label: 'Uncontacted', color: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500' },
  { value: 'client', label: 'Client', color: 'bg-purple-500' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-400' },
];

// Phone and email label options
export const PHONE_LABELS = ['Mobile', 'Home', 'Work', 'Other'];
export const EMAIL_LABELS = ['Personal', 'Work', 'Other'];

// Note action labels
export const NOTE_ACTION_LABELS = {
  create: 'Add Note',
  edit: 'Edit Note',
  delete: 'Delete Note',
};

// Animation durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};
