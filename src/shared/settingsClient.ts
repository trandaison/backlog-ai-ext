/**
 * Settings Client - Message-based communication with background script for settings operations
 */

import type {
  Settings,
  GeneralSettings,
  FeatureFlags,
  AiModelSettings,
  BacklogIntegration,
  UpdateAiModelSettings
} from '../configs/settingsTypes';
import type { SettingsMessage, SettingsResponse } from '../types/messages.d';

export class SettingsClient {

  // ===========================================
  // Core settings operations
  // ===========================================

  async getAllSettings(): Promise<Settings> {
    const message: SettingsMessage = {
      action: 'GET_SETTINGS'
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get settings');
    }

    return response.data;
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    const message: SettingsMessage = {
      action: 'UPDATE_SETTINGS',
      data: settings
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to save settings');
    }
  }

  // ===========================================
  // Section-specific operations
  // ===========================================

  async getGeneralSettings(): Promise<GeneralSettings> {
    const message: SettingsMessage = {
      action: 'GET_SECTION',
      section: 'general'
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get general settings');
    }

    return response.data;
  }

  async updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<void> {
    const message: SettingsMessage = {
      action: 'UPDATE_SECTION',
      section: 'general',
      data: settings
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update general settings');
    }
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    const message: SettingsMessage = {
      action: 'GET_SECTION',
      section: 'features'
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get feature flags');
    }

    return response.data;
  }

  async updateFeatureFlags(settings: Partial<FeatureFlags>): Promise<void> {
    const message: SettingsMessage = {
      action: 'UPDATE_SECTION',
      section: 'features',
      data: settings
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update feature flags');
    }
  }

  async getAiModelSettings(): Promise<AiModelSettings> {
    const message: SettingsMessage = {
      action: 'GET_SECTION',
      section: 'aiModels'
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get AI model settings');
    }

    return response.data;
  }

  async updateAiModelSettings(settings: UpdateAiModelSettings): Promise<void> {
    const message: SettingsMessage = {
      action: 'UPDATE_SECTION',
      section: 'aiModels',
      data: settings
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update AI model settings');
    }
  }

  async getBacklogs(): Promise<BacklogIntegration[]> {
    const message: SettingsMessage = {
      action: 'GET_SECTION',
      section: 'backlog'
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get backlog settings');
    }

    return response.data;
  }

  async updateBacklogs(backlogs: BacklogIntegration[]): Promise<void> {
    const message: SettingsMessage = {
      action: 'UPDATE_SECTION',
      section: 'backlog',
      data: backlogs
    };

    const response = await this.sendMessage(message);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update backlog settings');
    }
  }

  // ===========================================
  // Utility methods
  // ===========================================

  async getSidebarWidth(): Promise<number> {
    const settings = await this.getAllSettings();
    return settings.sidebarWidth;
  }

  async updateSidebarWidth(width: number): Promise<void> {
    const settings = await this.getAllSettings();
    settings.sidebarWidth = width;
    await this.saveAllSettings(settings);
  }

  // ===========================================
  // Legacy compatibility methods
  // ===========================================

  async getSelectedModels(): Promise<string[]> {
    const aiModelSettings = await this.getAiModelSettings();
    return aiModelSettings.selectedModels;
  }

  async setSelectedModels(models: string[]): Promise<void> {
    await this.updateAiModelSettings({ selectedModels: models });
  }

  async getPreferredModel(): Promise<string | null> {
    const aiModelSettings = await this.getAiModelSettings();
    return aiModelSettings.preferredModel;
  }

  async setPreferredModel(model: string): Promise<void> {
    await this.updateAiModelSettings({ preferredModel: model });
  }

  async getLanguage(): Promise<string> {
    const generalSettings = await this.getGeneralSettings();
    return generalSettings.language;
  }

  async setLanguage(language: string): Promise<void> {
    await this.updateGeneralSettings({ language });
  }

  async getUserRole(): Promise<string> {
    const generalSettings = await this.getGeneralSettings();
    return generalSettings.userRole;
  }

  async setUserRole(userRole: string): Promise<void> {
    await this.updateGeneralSettings({ userRole });
  }

  // ===========================================
  // Private communication method
  // ===========================================

  private async sendMessage(message: SettingsMessage): Promise<SettingsResponse> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: SettingsResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Export singleton instance
export const settingsClient = new SettingsClient();
