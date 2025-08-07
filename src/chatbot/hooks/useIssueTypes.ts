/**
 * Hook for fetching and managing issue types from a specific project
 */
import { useState, useEffect } from 'react';
import type { IssueType } from '../../types/createTicket.d';
import type { BacklogIntegration } from '../../configs/settingsTypes';

export type UseIssueTypesReturn = {
  issueTypes: IssueType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useIssueTypes = (
  backlog: BacklogIntegration | null,
  projectKey: string | null
): UseIssueTypesReturn => {
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssueTypes = async () => {
    if (!backlog || !projectKey || !projectKey.trim()) {
      setIssueTypes([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'FETCH_ISSUE_TYPES_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ data: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Request timeout'));
        }, 30000);

        // Send request to background script
        window.postMessage({
          type: 'FETCH_ISSUE_TYPES_REQUEST',
          id: messageId,
          backlog,
          projectKey
        }, '*');
      });

      if (response.success && Array.isArray(response.data)) {
        setIssueTypes(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching issue types:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIssueTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueTypes();
  }, [backlog, projectKey]);

  const refetch = async () => {
    await fetchIssueTypes();
  };

  return {
    issueTypes,
    loading,
    error,
    refetch
  };
};
