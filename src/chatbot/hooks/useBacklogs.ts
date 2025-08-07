/**
 * Hook for fetching backlogs via window messaging (avoiding chrome.runtime context issues)
 */
import { useState, useEffect } from 'react';
import type { BacklogIntegration } from '../../configs/settingsTypes';

export type UseBacklogsReturn = {
  backlogs: BacklogIntegration[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useBacklogs = (shouldLoad: boolean = false): UseBacklogsReturn => {
  const [backlogs, setBacklogs] = useState<BacklogIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBacklogs = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Use postMessage to communicate with content script - same pattern as loadUserInfo
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          console.log('🔎 useBacklogs ~ responseHandler ~ event:', event);
          if (event.source !== window) return;

          if (event.data.type === 'GET_BACKLOGS_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ data: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'GET_BACKLOGS',
          id: messageId
        }, '*');

        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for backlogs response'));
        }, 10000);
      });

      if (response.success && response.data) {
        setBacklogs(response.data);
      } else {
        setError('Không thể tải danh sách backlogs. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ [useBacklogs] Failed to load backlogs:', error);
      setError(error instanceof Error ? error.message : 'Không thể tải danh sách backlogs. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };  const refetch = async (): Promise<void> => {
    await loadBacklogs();
  };

  useEffect(() => {
    if (shouldLoad) {
      loadBacklogs();
    }
  }, [shouldLoad]);

  return {
    backlogs,
    loading,
    error,
    refetch
  };
};
