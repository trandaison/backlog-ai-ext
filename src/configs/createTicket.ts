/**
 * Create Ticket feature constants and configurations
 */
import type { Priority } from '../types/createTicket.d';

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', displayName: 'Vietnamese' },
  { code: 'en', name: 'English', displayName: 'English' },
  { code: 'ja', name: '日本語', displayName: 'Japanese' },
] as const;

export const DEFAULT_LANGUAGE = 'vi';

export const CREATE_TICKET_COMMAND_PREFIX = '/create-ticket';

// Priority options (hardcoded as per requirements)
export const PRIORITY_OPTIONS: Priority[] = [
  {
    id: 2,
    name: "High"
  },
  {
    id: 3,
    name: "Normal"
  },
  {
    id: 4,
    name: "Low"
  }
];

// Default values for ticket creation
export const DEFAULT_TICKET_VALUES = {
  issueTypeId: null, // Will be set after fetching issue types
  priorityId: 3,     // Normal priority as default
} as const;
