// Google Analytics 4 configuration constants
export const GA4_CONFIG = {
  // GA4 Measurement Protocol endpoint
  COLLECT_ENDPOINT: 'https://www.google-analytics.com/mp/collect',

  // Event names (matching the type definition)
  EVENTS: {
    EXTENSION_INSTALL: 'extension_install' as const,
    EXTENSION_CHAT: 'extension_chat' as const,
  },

  // Request timeout in milliseconds
  REQUEST_TIMEOUT: 5000,
} as const;
