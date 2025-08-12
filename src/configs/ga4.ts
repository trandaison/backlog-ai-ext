// Google Analytics 4 configuration
// These values will be injected at build time from environment variables

export const GA4_CREDENTIALS = {
  // Webpack will replace these constants at build time
  // @ts-ignore
  MEASUREMENT_ID: __GA4_MEASUREMENT_ID__,
  // @ts-ignore
  API_SECRET: __GA4_API_SECRET__,
} as const;

// Initialize GA4 configuration in Chrome storage
export async function initializeGA4Config(): Promise<void> {
  try {
    // Only initialize if we have valid credentials
    if (!GA4_CREDENTIALS.MEASUREMENT_ID || !GA4_CREDENTIALS.API_SECRET) {
      console.warn('⚠️ GA4 credentials not configured - analytics disabled');
      return;
    }

    // Check if config already exists
    const existing = await chrome.storage.local.get([
      'ga4_measurement_id',
      'ga4_api_secret',
    ]);

    if (!existing.ga4_measurement_id || !existing.ga4_api_secret) {
      // Store the configuration in Chrome storage
      await chrome.storage.local.set({
        ga4_measurement_id: GA4_CREDENTIALS.MEASUREMENT_ID,
        ga4_api_secret: GA4_CREDENTIALS.API_SECRET,
      });
    }
  } catch (error) {
    console.error('❌ Failed to initialize GA4 config:', error);
  }
}
