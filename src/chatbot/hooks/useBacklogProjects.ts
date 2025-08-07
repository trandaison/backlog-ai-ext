/**
 * Hook for fetching and managing backlog projects
 */
import { useState, useEffect } from 'react';
import type { Project } from '../../types/createTicket.d';
import type { BacklogIntegration } from '../../configs/settingsTypes';

export type UseBacklogProjectsReturn = {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useBacklogProjects = (
  backlog: BacklogIntegration | null
): UseBacklogProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!backlog) {
      setProjects([]);
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

          if (event.data.type === 'FETCH_BACKLOG_PROJECTS_RESPONSE' && event.data.id === messageId) {
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
          type: 'FETCH_BACKLOG_PROJECTS',
          id: messageId,
          backlog,
        }, '*');

        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for projects response'));
        }, 10000);
      });

      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setError('Failed to fetch projects. Please try again.');
        setProjects([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [backlog]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects
  };
};
