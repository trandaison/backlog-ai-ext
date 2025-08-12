// Google Analytics 4 service for tracking extension events
import { GA4_CONFIG } from '../configs/analytics';

export class GAService {
  // Static method to get analytics config from Chrome storage
  private static async getAnalyticsConfig(): Promise<{
    measurementId: string;
    apiSecret: string;
  }> {
    try {
      const result = await chrome.storage.local.get([
        'ga4_measurement_id',
        'ga4_api_secret',
      ]);
      return {
        measurementId: result.ga4_measurement_id || '',
        apiSecret: result.ga4_api_secret || '',
      };
    } catch (error) {
      return {
        measurementId: '',
        apiSecret: '',
      };
    }
  }

  static async collect(
    { uniqueId, event }: { uniqueId: string; event: string },
    measurement_id?: string,
    api_secret?: string
  ): Promise<void> {
    if (!uniqueId || !event) return;

    // Use provided parameters or fall back to stored config
    let finalMeasurementId = measurement_id;
    let finalApiSecret = api_secret;

    if (!finalMeasurementId || !finalApiSecret) {
      const config = await GAService.getAnalyticsConfig();
      finalMeasurementId = finalMeasurementId || config.measurementId;
      finalApiSecret = finalApiSecret || config.apiSecret;
    }

    if (!finalMeasurementId || !finalApiSecret) return;

    try {
      const url = `${
        GA4_CONFIG.COLLECT_ENDPOINT
      }?measurement_id=${encodeURIComponent(
        finalMeasurementId
      )}&api_secret=${encodeURIComponent(finalApiSecret)}`;

      const payload = {
        client_id: btoa(uniqueId),
        events: [
          {
            name: event,
            params: {
              timestamp: new Date().toISOString(),
              version: __APP_VERSION__,
            },
          },
        ],
      };

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Don't throw error to avoid breaking the main functionality
      // Analytics failures should be silent
    }
  }
}
