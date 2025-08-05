/**
 * Message type definitions for Chrome extension communication
 */

export type SettingsMessage = {
  action: 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'GET_SECTION' | 'UPDATE_SECTION' | 'GET_DEFAULT_SETTINGS';
  section?: 'general' | 'features' | 'aiModels' | 'backlog' | 'sidebarWidth';
  data?: any;
};

export type SettingsResponse = {
  success: boolean;
  data?: any;
  error?: string;
};
