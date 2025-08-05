/**
 * Settings Adapter - Bridge between legacy settings and new unified Settings structure
 * This allows gradual migration without breaking existing functionality
 */

import type { Settings } from '../types/settings.d';
import { SettingsService } from './settingsService';

// Legacy settings interface for backward compatibility
export type LegacySettings = {
  apiKey?: string;
  geminiApiKey?: string;
  userRole?: string;
  language?: string;
  aiModel?: string;
  preferredProvider?: 'openai' | 'gemini';
  rememberChatboxSize?: boolean;
  autoOpenChatbox?: boolean;
  enterToSend?: boolean;
};

export class SettingsAdapter {
  private static instance: SettingsAdapter;
  private settingsService: SettingsService;

  private constructor() {
    this.settingsService = SettingsService.getInstance();
  }

  public static getInstance(): SettingsAdapter {
    if (!SettingsAdapter.instance) {
      SettingsAdapter.instance = new SettingsAdapter();
    }
    return SettingsAdapter.instance;
  }

  /**
   * Get settings in legacy format for backward compatibility
   */
  async getLegacySettings(): Promise<LegacySettings> {
    try {
      const settings = await this.settingsService.getAllSettings();
      const aiSettings = await this.settingsService.getAiModelSettings();

      return {
        apiKey: aiSettings.aiProviderKeys.openAi,
        geminiApiKey: aiSettings.aiProviderKeys.gemini,
        userRole: settings.general.userRole,
        language: settings.general.language,
        aiModel: aiSettings.preferredModel || 'gpt-4o-mini',
        preferredProvider: aiSettings.aiProviderKeys.gemini ? 'gemini' : 'openai',
        rememberChatboxSize: settings.features.rememberChatboxSize || false,
        autoOpenChatbox: settings.features.autoOpenChatbox,
        enterToSend: settings.features.enterToSend
      };
    } catch (error) {
      console.error('Failed to get legacy settings:', error);
      return this.getDefaultLegacySettings();
    }
  }

  /**
   * Update settings using legacy format
   */
  async updateLegacySettings(legacySettings: Partial<LegacySettings>): Promise<void> {
    try {
      // Update general settings
      if (legacySettings.language || legacySettings.userRole) {
        await this.settingsService.updateGeneralSettings({
          ...(legacySettings.language && { language: legacySettings.language }),
          ...(legacySettings.userRole && { userRole: legacySettings.userRole })
        });
      }

      // Update AI model settings
      if (legacySettings.apiKey || legacySettings.geminiApiKey || legacySettings.aiModel || legacySettings.preferredProvider) {
        const aiSettings = await this.settingsService.getAiModelSettings();
        await this.settingsService.updateAiModelSettings({
          ...(legacySettings.aiModel && { preferredModel: legacySettings.aiModel }),
          aiProviderKeys: {
            openAi: legacySettings.apiKey || aiSettings.aiProviderKeys.openAi,
            gemini: legacySettings.geminiApiKey || aiSettings.aiProviderKeys.gemini
          }
        });
      }

      // Update feature flags
      if (legacySettings.rememberChatboxSize !== undefined ||
          legacySettings.autoOpenChatbox !== undefined ||
          legacySettings.enterToSend !== undefined) {
        await this.settingsService.updateFeatureFlags({
          ...(legacySettings.rememberChatboxSize !== undefined && { rememberChatboxSize: legacySettings.rememberChatboxSize }),
          ...(legacySettings.autoOpenChatbox !== undefined && { autoOpenChatbox: legacySettings.autoOpenChatbox }),
          ...(legacySettings.enterToSend !== undefined && { enterToSend: legacySettings.enterToSend })
        });
      }
    } catch (error) {
      console.error('Failed to update legacy settings:', error);
      throw error;
    }
  }

  /**
   * Helper methods for specific settings access
   */
  async getApiKey(): Promise<string> {
    try {
      const aiSettings = await this.settingsService.getAiModelSettings();
      return aiSettings.aiProviderKeys.openAi;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return '';
    }
  }

  async getGeminiApiKey(): Promise<string> {
    try {
      const aiSettings = await this.settingsService.getAiModelSettings();
      return aiSettings.aiProviderKeys.gemini;
    } catch (error) {
      console.error('Failed to get Gemini API key:', error);
      return '';
    }
  }

  async getLanguage(): Promise<string> {
    try {
      const settings = await this.settingsService.getAllSettings();
      return settings.general.language;
    } catch (error) {
      console.error('Failed to get language:', error);
      return 'vi';
    }
  }

  async getUserRole(): Promise<string> {
    try {
      const settings = await this.settingsService.getAllSettings();
      return settings.general.userRole;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'developer';
    }
  }

  async getAiModel(): Promise<string> {
    try {
      const aiSettings = await this.settingsService.getAiModelSettings();
      return aiSettings.preferredModel || 'gpt-4o-mini';
    } catch (error) {
      console.error('Failed to get AI model:', error);
      return 'gpt-4o-mini';
    }
  }

  async getPreferredProvider(): Promise<'openai' | 'gemini'> {
    try {
      const aiSettings = await this.settingsService.getAiModelSettings();
      return aiSettings.aiProviderKeys.gemini ? 'gemini' : 'openai';
    } catch (error) {
      console.error('Failed to get preferred provider:', error);
      return 'openai';
    }
  }

  private getDefaultLegacySettings(): LegacySettings {
    return {
      apiKey: '',
      geminiApiKey: '',
      userRole: 'developer',
      language: 'vi',
      aiModel: 'gpt-4o-mini',
      preferredProvider: 'openai',
      rememberChatboxSize: true,
      autoOpenChatbox: false,
      enterToSend: true
    };
  }
}
