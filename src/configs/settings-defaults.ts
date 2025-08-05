/**
 * Default settings values and configuration constants
 */

import type { Settings } from '../types/settings.d';

export const DEFAULT_SETTINGS: Settings = {
  general: {
    language: 'vi',
    userRole: 'developer'
  },
  features: {
    rememberChatboxSize: true,
    autoOpenChatbox: false,
    enterToSend: true
  },
  aiModels: {
    selectedModels: [],
    preferredModel: null,
    aiProviderKeys: {
      openAi: '',
      gemini: ''
    }
  },
  backlog: [],
  sidebarWidth: 400
};

// Storage keys
export const STORAGE_KEYS = {
  CONFIGS: 'configs',
  MIGRATION_STATUS: 'migration_status',
  SETTINGS_BACKUP: 'settings_backup'
} as const;
