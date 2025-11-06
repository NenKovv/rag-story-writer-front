// Environment configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8001',
  WS_BASE_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8001',
  // Task polling configuration
  POLLING_INTERVAL: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '2000'),
  MAX_POLLING_ATTEMPTS: parseInt(import.meta.env.VITE_MAX_POLLING_ATTEMPTS || '30'),
  // WebSocket configuration
  WS_RECONNECT_ATTEMPTS: parseInt(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS || '5'),
  WS_RECONNECT_DELAY: parseInt(import.meta.env.VITE_WS_RECONNECT_DELAY || '3000'),
} as const;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;