// ============================================
// ENV VARIABLES CONFIG
// API Keys werden in Netlify gesetzt
// ============================================

// Google Maps API Key aus Environment Variable
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUY6dqqjZ1pGEFVjko';

// OpenWeatherMap API Key aus Environment Variable  
export const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';

// Google Apps Script URL aus Environment Variable
export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

// Export all
export default {
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  weatherApiKey: WEATHER_API_KEY,
  appsScriptUrl: APPS_SCRIPT_URL
};
