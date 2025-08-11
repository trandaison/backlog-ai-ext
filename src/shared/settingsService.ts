/**
 * Unified Settings Service - Centralized settings management with fresh start approach
 */

import type {
  Settings,
  GeneralSettings,
  FeatureFlags,
  AiModelSettings,
  BacklogIntegration,
} from '../configs/settingsTypes';
import { DEFAULT_SETTINGS } from '../configs/settingsTypes';
import { EncryptionService } from './encryption';

const STORAGE_KEYS = {
  CONFIGS: 'configs',
} as const;

export class SettingsService {
  private static instance: SettingsService;
  private settingsCache: Settings | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // ===========================================
  // Core operations
  // ===========================================

  async getAllSettings(): Promise<Settings> {
    try {
      // Return cached settings if available
      if (this.settingsCache) {
        return this.settingsCache;
      }

      // Try to get current settings
      const result = await chrome.storage.sync.get(STORAGE_KEYS.CONFIGS);
      if (result[STORAGE_KEYS.CONFIGS]) {
        const settings = result[STORAGE_KEYS.CONFIGS] as Settings;
        this.settingsCache = settings;
        return settings;
      }

      // No settings found, initialize with defaults
      await this.initializeSettings();
      this.settingsCache = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('❌ Settings load failed, using defaults:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.CONFIGS]: settings,
      });

      // Update cache
      this.settingsCache = settings;

      const allSettings = await this.getAllSettings();
      console.log('✅ Settings saved successfully', allSettings);
    } catch (error) {
      console.error('❌ Settings save failed:', error);
      throw error;
    }
  }

  // ===========================================
  // Section-specific getters (with decryption)
  // ===========================================

  async getGeneralSettings(): Promise<GeneralSettings> {
    const settings = await this.getAllSettings();
    return settings.general;
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    const settings = await this.getAllSettings();
    return settings.features;
  }

  async getAiModelSettings(): Promise<AiModelSettings> {
    const settings = await this.getAllSettings();

    // Decrypt API keys
    const decryptedSettings: AiModelSettings = {
      ...settings.aiModels,
      aiProviderKeys: {
        openAi: settings.aiModels.aiProviderKeys.openAi
          ? await EncryptionService.decryptApiKey(
              settings.aiModels.aiProviderKeys.openAi
            )
          : '',
        gemini: settings.aiModels.aiProviderKeys.gemini
          ? await EncryptionService.decryptApiKey(
              settings.aiModels.aiProviderKeys.gemini
            )
          : '',
      },
    };

    return decryptedSettings;
  }

  async getBacklogs(): Promise<BacklogIntegration[]> {
    const settings = await this.getAllSettings();

    // Decrypt API keys for all backlog integrations
    const decryptedBacklogs = await Promise.all(
      settings.backlog.map(async (config) => ({
        ...config,
        apiKey: config.apiKey
          ? await EncryptionService.decryptApiKey(config.apiKey)
          : '',
      }))
    );

    return decryptedBacklogs;
  }

  async getSidebarWidth(): Promise<number> {
    const settings = await this.getAllSettings();
    return settings.sidebarWidth;
  }

  // ===========================================
  // Section-specific updaters (with encryption)
  // ===========================================

  async updateGeneralSettings(
    partial: Partial<GeneralSettings>
  ): Promise<void> {
    const settings = await this.getAllSettings();
    settings.general = { ...settings.general, ...partial };
    await this.saveAllSettings(settings);
  }

  async updateFeatureFlags(partial: Partial<FeatureFlags>): Promise<void> {
    const settings = await this.getAllSettings();
    settings.features = { ...settings.features, ...partial };
    await this.saveAllSettings(settings);
  }

  async updateAiModelSettings(
    partial: Partial<AiModelSettings>
  ): Promise<void> {
    const settings = await this.getAllSettings();

    if (partial.aiProviderKeys?.openAi) {
      partial.aiProviderKeys.openAi = await EncryptionService.encryptApiKey(
        partial.aiProviderKeys.openAi
      );
      partial.aiProviderKeys.gemini = await EncryptionService.encryptApiKey(
        partial.aiProviderKeys.gemini
      );
    }

    // Deep merge the partial settings
    settings.aiModels = {
      ...settings.aiModels,
      ...partial,
      aiProviderKeys: {
        ...settings.aiModels.aiProviderKeys,
        ...partial.aiProviderKeys,
      },
    };

    await this.saveAllSettings(settings);
  }

  async updateBacklogs(configs: BacklogIntegration[]): Promise<void> {
    const settings = await this.getAllSettings();
    const { backlog } = settings;

    // Encrypt API keys for all backlog integrations
    const encryptedBacklogs = await Promise.all(
      configs.map(async (newConfig) => {
        // Find existing config with same domain
        const existingConfig = backlog.find(
          (c) => c.domain === newConfig.domain
        );

        if (existingConfig) {
          // Update existing config
          return {
            ...existingConfig,
            ...newConfig,
            apiKey: newConfig.apiKey
              ? await EncryptionService.encryptApiKey(newConfig.apiKey)
              : existingConfig.apiKey,
          };
        } else {
          // Add new config
          return {
            ...newConfig,
            apiKey: newConfig.apiKey
              ? await EncryptionService.encryptApiKey(newConfig.apiKey)
              : '',
          };
        }
      })
    );

    settings.backlog = encryptedBacklogs;
    console.log('🔎 ~ SettingsService ~ updateBacklogs ~ settings:', {
      settings,
      configs,
      encryptedBacklogs,
    });
    await this.saveAllSettings(settings);
  }

  async updateSidebarWidth(width: number): Promise<void> {
    const settings = await this.getAllSettings();
    settings.sidebarWidth = width;
    await this.saveAllSettings(settings);
  }

  // ===========================================
  // Utility methods
  // ===========================================

  async addBacklog(config: Omit<BacklogIntegration, 'id'>): Promise<string> {
    const settings = await this.getAllSettings();

    const newConfig: BacklogIntegration = {
      ...config,
      id: `backlog-${Date.now()}`,
      apiKey: config.apiKey
        ? await EncryptionService.encryptApiKey(config.apiKey)
        : '',
    };

    settings.backlog.push(newConfig);
    await this.saveAllSettings(settings);

    return newConfig.id;
  }

  async removeBacklog(id: string): Promise<void> {
    const settings = await this.getAllSettings();
    settings.backlog = settings.backlog.filter((config) => config.id !== id);
    await this.saveAllSettings(settings);
  }

  async clearCache(): Promise<void> {
    this.settingsCache = null;
  }

  // ===========================================
  // Initialization methods
  // ===========================================

  async initializeSettings(): Promise<void> {
    try {
      // Check if new settings format exists
      const result = await chrome.storage.sync.get(STORAGE_KEYS.CONFIGS);

      if (!result[STORAGE_KEYS.CONFIGS]) {
        // Clean up any old storage keys
        await this.cleanupOldStorage();

        // Initialize with default settings
        await this.saveAllSettings(DEFAULT_SETTINGS);

        console.log('✅ Fresh settings initialized');
      } else {
        console.log('✅ Existing settings found');
      }
    } catch (error) {
      console.error('❌ Settings initialization failed:', error);
      // Fallback to defaults
      await this.saveAllSettings(DEFAULT_SETTINGS);
    }
  }

  async resetAllSettings(): Promise<void> {
    try {
      // Clear all storage
      await chrome.storage.sync.clear();

      // Reinitialize with defaults
      await this.saveAllSettings(DEFAULT_SETTINGS);

      // Clear cache
      await this.clearCache();

      console.log('✅ All settings reset to defaults');
    } catch (error) {
      console.error('❌ Settings reset failed:', error);
      throw error;
    }
  }

  private async cleanupOldStorage(): Promise<void> {
    const oldKeys = [
      // AI Settings
      'encryptedApiKey',
      'encryptedGeminiApiKey',
      'selectedModels',
      'preferredModel',
      'preferredProvider',

      // User Preferences
      'language',
      'userRole',

      // Feature Flags
      'rememberChatboxSize',
      'autoOpenChatbox',
      'enterToSend',

      // Backlog Settings (all formats)
      'backlogAPIKeys',
      'backlogDomain',
      'backlogAPIKey',
      'backlogSpaceName',

      // Other legacy keys
      'aiModel',
      'sidebarWidth',
    ];

    // Remove all old keys
    await chrome.storage.sync.remove(oldKeys);
    console.log('🧹 Old storage cleaned up');
  }
}
