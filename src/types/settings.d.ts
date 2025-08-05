/**
 * Settings storage type definitions
 */

export type GeneralSettings = {
  language: string;          // 'vi' | 'en' | 'ja' | etc.
  userRole: string;          // 'developer' | 'pm' | 'qa' | etc.
};

export type FeatureFlags = {
  rememberChatboxSize: boolean | null;
  autoOpenChatbox: boolean;
  enterToSend: boolean;
};

export type AiModelSettings = {
  selectedModels: string[];       // Array of enabled model IDs
  preferredModel: string | null;  // Default model to use
  aiProviderKeys: {
    openAi: string;              // Encrypted API key
    gemini: string;              // Encrypted API key
  };
};

export type BacklogIntegration = {
  id: string;                    // Unique identifier
  domain: string;                // e.g. "nals.backlogtool.com"
  apiKey: string;                // Encrypted API key
  note: string;                  // User description
  namespace: string;             // Populated after connection test
};

export type Settings = {
  general: GeneralSettings;
  features: FeatureFlags;
  aiModels: AiModelSettings;
  backlog: BacklogIntegration[];
  sidebarWidth: number;
};

export type MigrationStatus = {
  isCompleted: boolean;
  version: string;
  timestamp: number;
  migratedKeys: string[];
  errors: string[];
};
