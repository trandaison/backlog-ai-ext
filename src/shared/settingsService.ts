/**
 * Unified Settings Service - Centralized settings management with automatic migration
 */

import type {
  Settings,
  GeneralSettings,
  FeatureFlags,
  AiModelSettings,
  BacklogIntegration,
  MigrationStatus
} from '../types/settings.d';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../configs/settings-defaults';
import { EncryptionService } from './encryption';

export class SettingsService {
  private static instance: SettingsService;
  private settingsCache: Settings | null = null;

  private constructor() {
    // No need for encryptionService instance since using static methods
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

      // Attempt to get migrated settings
      const result = await chrome.storage.sync.get(STORAGE_KEYS.CONFIGS);
      if (result[STORAGE_KEYS.CONFIGS]) {
        this.settingsCache = result[STORAGE_KEYS.CONFIGS];
        return this.settingsCache!;
      }

      // Attempt migration if old format exists
      const migrationOccurred = await this.performMigrationIfNeeded();
      if (migrationOccurred) {
        const migratedResult = await chrome.storage.sync.get(STORAGE_KEYS.CONFIGS);
        this.settingsCache = migratedResult[STORAGE_KEYS.CONFIGS] || DEFAULT_SETTINGS;
        return this.settingsCache!;
      }

      // Return default settings
      this.settingsCache = DEFAULT_SETTINGS;
      return this.settingsCache;

    } catch (error) {
      console.error('❌ Settings load failed, using defaults:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.CONFIGS]: settings
      });

      // Update cache
      this.settingsCache = settings;

      // Verify settings were saved correctly
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
    const aiSettings = { ...settings.aiModels };

    // Decrypt API keys
    if (aiSettings.aiProviderKeys.openAi) {
      try {
        aiSettings.aiProviderKeys.openAi = await EncryptionService.decryptApiKey(
          aiSettings.aiProviderKeys.openAi
        );
      } catch (error) {
        console.warn('Failed to decrypt OpenAI key:', error);
        aiSettings.aiProviderKeys.openAi = '';
      }
    }

    if (aiSettings.aiProviderKeys.gemini) {
      try {
        aiSettings.aiProviderKeys.gemini = await EncryptionService.decryptApiKey(
          aiSettings.aiProviderKeys.gemini
        );
      } catch (error) {
        console.warn('Failed to decrypt Gemini key:', error);
        aiSettings.aiProviderKeys.gemini = '';
      }
    }

    return aiSettings;
  }

  async getBacklogs(): Promise<BacklogIntegration[]> {
    const settings = await this.getAllSettings();
    const backlogs = [...settings.backlog];

    // Decrypt API keys
    for (const backlog of backlogs) {
      if (backlog.apiKey) {
        try {
          backlog.apiKey = await EncryptionService.decryptApiKey(backlog.apiKey);
        } catch (error) {
          console.warn(`Failed to decrypt API key for ${backlog.domain}:`, error);
          backlog.apiKey = '';
        }
      }
    }

    return backlogs;
  }

  async getSidebarWidth(): Promise<number> {
    const settings = await this.getAllSettings();
    return settings.sidebarWidth;
  }

  // ===========================================
  // Section-specific updaters (with encryption)
  // ===========================================

  async updateGeneralSettings(partial: Partial<GeneralSettings>): Promise<void> {
    const settings = await this.getAllSettings();
    settings.general = { ...settings.general, ...partial };
    await this.saveAllSettings(settings);
  }

  async updateFeatureFlags(partial: Partial<FeatureFlags>): Promise<void> {
    const settings = await this.getAllSettings();
    settings.features = { ...settings.features, ...partial };
    await this.saveAllSettings(settings);
  }

  async updateAiModelSettings(partial: Partial<AiModelSettings>): Promise<void> {
    const settings = await this.getAllSettings();
    const updatedAiSettings = { ...settings.aiModels, ...partial };

    // Encrypt API keys if provided
    if (partial.aiProviderKeys?.openAi) {
      updatedAiSettings.aiProviderKeys.openAi = await EncryptionService.encryptApiKey(
        partial.aiProviderKeys.openAi
      );
    }

    if (partial.aiProviderKeys?.gemini) {
      updatedAiSettings.aiProviderKeys.gemini = await EncryptionService.encryptApiKey(
        partial.aiProviderKeys.gemini
      );
    }

    settings.aiModels = updatedAiSettings;
    await this.saveAllSettings(settings);
  }

  async updateBacklogs(configs: BacklogIntegration[]): Promise<void> {
    const settings = await this.getAllSettings();
    const encryptedConfigs = [...configs];

    // Encrypt API keys
    for (const config of encryptedConfigs) {
      if (config.apiKey) {
        config.apiKey = await EncryptionService.encryptApiKey(config.apiKey);
      }
    }

    settings.backlog = encryptedConfigs;
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
      id: `backlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      apiKey: config.apiKey ? await EncryptionService.encryptApiKey(config.apiKey) : ''
    };

    settings.backlog.push(newConfig);
    await this.saveAllSettings(settings);
    return newConfig.id;
  }

  async removeBacklog(id: string): Promise<void> {
    const settings = await this.getAllSettings();
    settings.backlog = settings.backlog.filter(config => config.id !== id);
    await this.saveAllSettings(settings);
  }

  async clearCache(): Promise<void> {
    this.settingsCache = null;
  }

  // ===========================================
  // Migration and cleanup methods
  // ===========================================

  async performMigrationIfNeeded(): Promise<boolean> {
    try {
      // Check if migration already completed for current version
      const migrationStatus = await this.getMigrationStatus();
      const currentVersion = chrome.runtime.getManifest().version;

      if (migrationStatus.isCompleted && migrationStatus.version === currentVersion) {
        console.log('Migration already completed for version:', currentVersion);
        return false;
      }

      // Check if old settings exist
      const oldSettings = await this.getAllOldFormatSettings();
      if (!this.hasOldSettings(oldSettings)) {
        // No old settings found, mark migration as completed
        await this.markMigrationCompleted(currentVersion, []);
        return false;
      }

      console.log('Starting automatic migration for version:', currentVersion);

      // Backup old settings before migration (safety measure)
      await this.createBackup(oldSettings);

      // Perform migration
      const newSettings = await this.migrateAndMergeSettings(oldSettings);

      // Save new settings
      await this.saveAllSettings(newSettings);

      // Cleanup old settings
      const cleanedKeys = await this.cleanupOldSettings();

      // Mark migration as completed
      await this.markMigrationCompleted(currentVersion, cleanedKeys);

      console.log('✅ Migration completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.recordMigrationError(error);
      throw error;
    }
  }

  private async getAllOldFormatSettings(): Promise<any> {
    // Get all potential old setting keys
    const oldKeys = [
      'encryptedApiKey', 'encryptedGeminiApiKey', 'selectedModels', 'preferredModel',
      'language', 'userRole', 'rememberChatboxSize', 'autoOpenChatbox', 'enterToSend',
      'backlogAPIKeys', 'backlogDomain', 'backlogAPIKey', 'sidebarWidth'
    ];

    return await chrome.storage.sync.get(oldKeys);
  }

  private hasOldSettings(settings: any): boolean {
    // Check if any old format keys exist
    const oldKeys = [
      'encryptedApiKey', 'language', 'userRole', 'selectedModels',
      'backlogAPIKeys', 'backlogDomain'
    ];

    return oldKeys.some(key => settings[key] !== undefined);
  }

  private async migrateAndMergeSettings(oldConfigs: any): Promise<Settings> {
    const settings: Settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    // General Settings Migration
    if (oldConfigs.language) settings.general.language = oldConfigs.language;
    if (oldConfigs.userRole) settings.general.userRole = oldConfigs.userRole;

    // Feature Flags Migration
    if (oldConfigs.rememberChatboxSize !== undefined) {
      settings.features.rememberChatboxSize = oldConfigs.rememberChatboxSize;
    }
    if (oldConfigs.autoOpenChatbox !== undefined) {
      settings.features.autoOpenChatbox = oldConfigs.autoOpenChatbox;
    }
    if (oldConfigs.enterToSend !== undefined) {
      settings.features.enterToSend = oldConfigs.enterToSend;
    }

    // AI Models Migration
    if (oldConfigs.selectedModels) {
      settings.aiModels.selectedModels = oldConfigs.selectedModels;
    }
    if (oldConfigs.preferredModel) {
      settings.aiModels.preferredModel = oldConfigs.preferredModel;
    }
    if (oldConfigs.encryptedApiKey) {
      settings.aiModels.aiProviderKeys.openAi = oldConfigs.encryptedApiKey;
    }
    if (oldConfigs.encryptedGeminiApiKey) {
      settings.aiModels.aiProviderKeys.gemini = oldConfigs.encryptedGeminiApiKey;
    }

    // Backlog Migration (multiple legacy formats)
    if (oldConfigs.backlogAPIKeys && Array.isArray(oldConfigs.backlogAPIKeys)) {
      // New multi-config format
      settings.backlog = oldConfigs.backlogAPIKeys;
    } else if (oldConfigs.backlogDomain && oldConfigs.backlogAPIKey) {
      // Single legacy format
      settings.backlog = [{
        id: `migrated-${Date.now()}`,
        domain: oldConfigs.backlogDomain,
        apiKey: oldConfigs.backlogAPIKey,
        note: 'Migrated from legacy format',
        namespace: ''
      }];
    }

    // Sidebar Width Migration
    if (oldConfigs.sidebarWidth) {
      settings.sidebarWidth = oldConfigs.sidebarWidth;
    }

    return settings;
  }

  private async cleanupOldSettings(): Promise<string[]> {
    const keysToRemove = [
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
      'aiModel', // Very old format
      'sidebarWidth' // Now part of configs
    ];

    // Remove old keys from chrome storage
    await chrome.storage.sync.remove(keysToRemove);

    console.log('🧹 Cleaned up old settings:', keysToRemove);
    return keysToRemove;
  }

  private async createBackup(oldSettings: any): Promise<void> {
    const backup = {
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
      data: oldSettings
    };

    // Store backup in local storage (not synced)
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS_BACKUP]: backup
    });

    console.log('💾 Created settings backup');
  }

  private async markMigrationCompleted(version: string, cleanedKeys: string[]): Promise<void> {
    const migrationStatus: MigrationStatus = {
      isCompleted: true,
      version,
      timestamp: Date.now(),
      migratedKeys: cleanedKeys,
      errors: []
    };

    await chrome.storage.sync.set({
      [STORAGE_KEYS.MIGRATION_STATUS]: migrationStatus
    });
  }

  private async recordMigrationError(error: any): Promise<void> {
    const migrationStatus: MigrationStatus = {
      isCompleted: false,
      version: chrome.runtime.getManifest().version,
      timestamp: Date.now(),
      migratedKeys: [],
      errors: [error.message || String(error)]
    };

    await chrome.storage.sync.set({
      [STORAGE_KEYS.MIGRATION_STATUS]: migrationStatus
    });

    console.error('❌ Migration error recorded:', error.message || String(error));
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.MIGRATION_STATUS);
    return result[STORAGE_KEYS.MIGRATION_STATUS] || {
      isCompleted: false,
      version: '',
      timestamp: 0,
      migratedKeys: [],
      errors: []
    };
  }

  async rollbackMigration(): Promise<void> {
    try {
      const backup = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS_BACKUP);
      if (backup[STORAGE_KEYS.SETTINGS_BACKUP]) {
        // Restore old format settings
        await chrome.storage.sync.set(backup[STORAGE_KEYS.SETTINGS_BACKUP].data);

        // Remove new format
        await chrome.storage.sync.remove(STORAGE_KEYS.CONFIGS);

        // Reset migration status
        await chrome.storage.sync.remove(STORAGE_KEYS.MIGRATION_STATUS);

        // Clear cache
        this.settingsCache = null;

        console.log('🔄 Migration rolled back successfully');
      } else {
        console.warn('⚠️ No backup found for rollback');
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }
}
