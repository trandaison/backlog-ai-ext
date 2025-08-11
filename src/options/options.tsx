import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './options.scss';
import { availableModels, defaultModelId } from '../configs';
import { settingsClient } from '../shared/settingsClient';
import type { BacklogIntegration } from '../configs/settingsTypes';
import { APIKeyInput } from "./components/APIKeyInput";
import InputPassword from "./components/InputPassword";
import { downloadJson, generateDownloadFilename } from "../shared/downloadUtils";

// Inline component để tránh module import issues
type SettingsSection =
  | 'general'
  | 'features'
  | 'ai-keys'
  | 'backlog-keys'
  | 'export';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

// Use BacklogIntegration from settingsTypes instead of local interface
type BacklogAPIKey = BacklogIntegration;

const sidebarItems: SidebarItem[] = [
  { id: 'general', label: 'General Settings', icon: '⚙️' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'ai-keys', label: 'AI & Models', icon: '🤖' },
  { id: 'backlog-keys', label: 'Backlog API Keys', icon: '🔑' },
  { id: 'export', label: 'Export Data', icon: '📤' },
];

const OptionsPage: React.FC = () => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('general');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [preferredModel, setPreferredModel] = useState<string>(defaultModelId);
  const [openAIApiKey, setOpenAIApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [backlogAPIKeys, setBacklogAPIKeys] = useState<BacklogAPIKey[]>([]);
  const [isLoadingBacklogKeys, setIsLoadingBacklogKeys] = useState(true);
  const [testingStates, setTestingStates] = useState<
    Record<
      string,
      {
        testing: boolean;
        result?: { success: boolean; namespace?: string; error?: string };
      }
    >
  >({});
  const [language, setLanguage] = useState<string>('vi');
  const [userRole, setUserRole] = useState<string>('developer');
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(true);

  // Feature settings state
  const [rememberChatboxSize, setRememberChatboxSize] = useState<boolean>(true);
  const [autoOpenChatbox, setAutoOpenChatbox] = useState<boolean>(false);
  const [enterToSend, setEnterToSend] = useState<boolean>(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  // Import/Export state
  const [exportConfigs, setExportConfigs] = useState<boolean>(true);
  const [exportChatHistory, setExportChatHistory] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null); // Cache file content

  // Initialize active section from URL hash
  React.useEffect(() => {
    const getInitialSection = (): SettingsSection => {
      const hash = window.location.hash.slice(1); // Remove #
      const validSections: SettingsSection[] = [
        'general',
        'features',
        'ai-keys',
        'backlog-keys',
        'export',
      ];

      if (hash && validSections.includes(hash as SettingsSection)) {
        return hash as SettingsSection;
      }

      return 'general';
    };

    setActiveSection(getInitialSection());

    // Listen for hash changes (back/forward navigation)
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validSections: SettingsSection[] = [
        'general',
        'features',
        'ai-keys',
        'backlog-keys',
        'export',
      ];

      if (hash && validSections.includes(hash as SettingsSection)) {
        setActiveSection(hash as SettingsSection);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load preferred model from settings service
  React.useEffect(() => {
    const loadPreferredModel = async () => {
      try {
        const aiSettings = await settingsClient.getAiModelSettings();
        const model = aiSettings.preferredModel || defaultModelId;
        setPreferredModel(model);
        setOpenAIApiKey(aiSettings.aiProviderKeys.openAi);
        setGeminiApiKey(aiSettings.aiProviderKeys.gemini);
      } catch (error) {
        console.error('Failed to load preferred model:', error);
      }
    };

    loadPreferredModel();
  }, []);

  // Load selected models from settings service
  React.useEffect(() => {
    const loadSelectedModels = async () => {
      try {
        const aiSettings = await settingsClient.getAiModelSettings();
        // Default models: Mới, tối ưu chi phí, thông minh, nhanh
        const defaultModels = [
          defaultModelId, // Primary default model
          'gpt-4o-mini', // Fast, affordable small model for focused tasks
          'o3-mini', // Small alternative to o3 reasoning model
          'gemini-2.5-pro', // Most advanced Gemini model with enhanced reasoning
          'gemini-2.5-flash-lite', // Lightweight version optimized for speed and cost
        ];

        let models = aiSettings.selectedModels;

        // If no models are selected, use defaults and save them to storage
        if (models.length === 0) {
          models = defaultModels;
          try {
            // Save default models to storage for consistency across the app
            await settingsClient.updateAiModelSettings({
              selectedModels: defaultModels
            });
            console.log('✅ [Options] Saved default models to storage:', defaultModels);
          } catch (error) {
            console.error('❌ [Options] Failed to save default models:', error);
          }
        }

        setSelectedModels(models);
      } catch (error) {
        console.error('Failed to load selected models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadSelectedModels();
  }, []);

  // Load general settings from settings service
  React.useEffect(() => {
    const loadGeneralSettings = async () => {
      try {
        const generalSettings = await settingsClient.getGeneralSettings();
        setLanguage(generalSettings.language);
        setUserRole(generalSettings.userRole);
      } catch (error) {
        console.error('Failed to load general settings:', error);
      } finally {
        setIsLoadingGeneral(false);
      }
    };

    loadGeneralSettings();
  }, []);

  // Load feature settings from settings service
  React.useEffect(() => {
    const loadFeatureSettings = async () => {
      setIsLoadingFeatures(true);
      try {
        const featureSettings = await settingsClient.getFeatureFlags();

        setRememberChatboxSize(featureSettings.rememberChatboxSize ?? true);
        setAutoOpenChatbox(featureSettings.autoOpenChatbox);
        setEnterToSend(featureSettings.enterToSend);
      } catch (error) {
        console.error('Failed to load feature settings:', error);
      } finally {
        setIsLoadingFeatures(false);
      }
    };

    loadFeatureSettings();
  }, []);

  // Load Backlog API keys từ storage
  React.useEffect(() => {
    const loadBacklogAPIKeys = async () => {
      setIsLoadingBacklogKeys(true);
      try {
        const backlogKeys = await settingsClient.getBacklogs();
        setBacklogAPIKeys(backlogKeys);
      } catch (error) {
        console.error('Failed to load Backlog API keys:', error);
      } finally {
        setIsLoadingBacklogKeys(false);
      }
    };

    loadBacklogAPIKeys();
  }, []);

  const handleSectionChange = (section: SettingsSection) => {
    // Add animation class to trigger re-animation
    const contentElement = document.querySelector(
      '.options-content'
    ) as HTMLElement;
    if (contentElement) {
      contentElement.classList.remove('content-transition');
      void contentElement.offsetWidth; // Force reflow
      contentElement.classList.add('content-transition');
    }

    setActiveSection(section);
    // Update URL hash without page reload
    window.history.pushState(null, '', `#${section}`);
  };

  const handlePreferredModelChange = async (modelId: string) => {
    setPreferredModel(modelId);
    try {
      await settingsClient.updateAiModelSettings({
        preferredModel: modelId
      });
    } catch (error) {
      console.error('Failed to save preferred model:', error);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    try {
      await settingsClient.updateGeneralSettings({ language: newLanguage });
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const handleUserRoleChange = async (newRole: string) => {
    setUserRole(newRole);
    try {
      await settingsClient.updateGeneralSettings({ userRole: newRole });
    } catch (error) {
      console.error('Failed to save user role:', error);
    }
  };

  // Feature handlers
  const handleRememberChatboxSizeChange = async (enabled: boolean) => {
    setRememberChatboxSize(enabled);
    try {
      await settingsClient.updateFeatureFlags({ rememberChatboxSize: enabled });
    } catch (error) {
      console.error('Failed to save rememberChatboxSize setting:', error);
    }
  };

  const handleAutoOpenChatboxChange = async (enabled: boolean) => {
    setAutoOpenChatbox(enabled);
    try {
      await settingsClient.updateFeatureFlags({ autoOpenChatbox: enabled });
    } catch (error) {
      console.error('Failed to save autoOpenChatbox setting:', error);
    }
  };

  const handleEnterToSendChange = async (enabled: boolean) => {
    setEnterToSend(enabled);
    try {
      await settingsClient.updateFeatureFlags({ enterToSend: enabled });
    } catch (error) {
      console.error('Failed to save enterToSend setting:', error);
    }
  };

  const handleModelToggle = async (modelId: string) => {
    const newSelectedModels = selectedModels.includes(modelId)
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId];

    setSelectedModels(newSelectedModels);

    try {
      await settingsClient.updateAiModelSettings({ selectedModels: newSelectedModels });
    } catch (error) {
      console.error('Failed to save selected models:', error);
    }
  };

  // Export/Import functions
  const handleExportData = async () => {
    if (!exportConfigs && !exportChatHistory) return;

    setIsExporting(true);
    try {
      const exportData: any = {
        exportedAt: new Date().toISOString(),
        extensionVersion: __APP_VERSION__,
      };

      if (exportConfigs) {
        exportData.configs = await settingsClient.getAllSettings();
      }

      if (exportChatHistory) {
        // Export chat history from local storage, excluding sidebar width
        const chatData = await chrome.storage.local.get();
        const { 'ai-ext-sidebar-width': _, ...filteredChatData } = chatData;
        exportData.chatData = filteredChatData;
      }

      // Clean undefined values
      const cleanedData = JSON.parse(
        JSON.stringify(exportData, (key, value) =>
          value === undefined ? null : value
        )
      );
      const filename = generateDownloadFilename(`backlog-ai-ext_data_${__APP_VERSION__}`, 'json');
      downloadJson(cleanedData, filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/json') {
      alert('Please select a valid JSON file');
      setImportFile(null);
      setFileContent(null);
      return;
    }

    setImportFile(file);

    // Cache file content for import
    try {
      const text = await file.text();
      setFileContent(text); // Cache the content
      console.log('📄 [Import] File loaded successfully');
    } catch (error) {
      console.error('❌ [Import] File reading error:', error);
      setFileContent(null);
    }
  };

  const handleImportData = async () => {
    if (!importFile || !fileContent) return;

    const confirmed = confirm(
      'Import will merge data with existing settings. This action may overwrite current configurations. Continue?'
    );
    if (!confirmed) return;

    setIsImporting(true);
    try {
      // Use cached file content instead of reading again
      const importData = JSON.parse(fileContent);

      // Validate import data structure
      if (!importData.exportedAt || !importData.extensionVersion) {
        // TODO: Verify signature
        throw new Error('Invalid import file format');
      }

      // Import configurations if present
      if (importData.configs) {
        await settingsClient.saveAllSettings(importData.configs);
      }

      // Import chat history if present
      if (importData.chatData) {
        await chrome.storage.local.set(importData.chatData);
      }

      alert(
        'Import completed successfully! Please refresh the page to see changes.'
      );

      // Reset import state
      setImportFile(null);
      setFileContent(null);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + (error as Error).message);

      // Reset state on error
      setImportFile(null);
      setFileContent(null);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } finally {
      setIsImporting(false);
    }
  };

  const addBacklogAPIKey = () => {
    const newKey: BacklogAPIKey = {
      id: 'key-' + Date.now(),
      domain: '',
      apiKey: '',
      note: '',
      namespace: ''
    };

    setBacklogAPIKeys([...backlogAPIKeys, newKey]);
  };

  const removeBacklogAPIKey = async (id: string) => {
    const updatedKeys = backlogAPIKeys.filter((key) => key.id !== id);
    setBacklogAPIKeys(updatedKeys);

    try {
      await settingsClient.updateBacklogs(updatedKeys);
    } catch (error) {
      console.error('Failed to save Backlog API keys:', error);
    }
  };

  const updateBacklogAPIKey = async (
    id: string,
    field: keyof BacklogAPIKey,
    value: string
  ) => {
    const updatedKeys = backlogAPIKeys.map((key) =>
      key.id === id ? { ...key, [field]: value } : key
    );

    setBacklogAPIKeys(updatedKeys);

    try {
      await settingsClient.updateBacklogs(updatedKeys);
    } catch (error) {
      console.error('Failed to save Backlog API keys:', error);
    }
  };

  const normalizeDomain = (domain: string): string => {
    if (!domain.trim()) return '';

    let normalized = domain.trim();

    // Remove protocol (http:// or https://)
    normalized = normalized.replace(/^https?:\/\//, '');

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');

    // Remove any path (everything after the domain)
    const domainOnly = normalized.split('/')[0];

    return domainOnly;
  };

  const handleDomainBlur = async (id: string, currentValue: string) => {
    const normalizedDomain = normalizeDomain(currentValue);

    if (normalizedDomain !== currentValue) {
      await updateBacklogAPIKey(id, 'domain', normalizedDomain);
    }
  };

  const testBacklogConnection = async (id: string) => {
    const keyEntry = backlogAPIKeys.find((key) => key.id === id);
    if (!keyEntry || !keyEntry.domain || !keyEntry.apiKey) {
      return;
    }

    setTestingStates((prev) => ({
      ...prev,
      [id]: { testing: true },
    }));

    try {
      // Use background service to test connection
      const response = await chrome.runtime.sendMessage({
        action: 'testBacklogConnection',
        data: {
          id: keyEntry.id,
          domain: keyEntry.domain,
          spaceName: keyEntry.domain.split('.')[0], // Extract space name from domain
          apiKey: keyEntry.apiKey,
        },
      });

      if (response.success) {
        const namespace =
          response.data?.name || response.data?.spaceKey || 'Connected';

        // Update the namespace in the key entry
        const updatedKeys = backlogAPIKeys.map((key) =>
          key.id === id ? { ...key, namespace } : key
        );

        setBacklogAPIKeys(updatedKeys);

        // Save to Chrome storage when connection is successful
        try {
          await settingsClient.updateBacklogs(updatedKeys);
          console.log('Backlog API keys saved successfully');
        } catch (storageError) {
          console.error('Failed to save Backlog API keys:', storageError);
        }

        setTestingStates((prev) => ({
          ...prev,
          [id]: { testing: false, result: { success: true, namespace } },
        }));
      } else {
        setTestingStates((prev) => ({
          ...prev,
          [id]: {
            testing: false,
            result: {
              success: false,
              error: response.message || 'Connection failed',
            },
          },
        }));
      }
    } catch (error) {
      setTestingStates((prev) => ({
        ...prev,
        [id]: {
          testing: false,
          result: { success: false, error: (error as Error).message },
        },
      }));
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className='settings-section'>
            <h2>⚙️ General Settings</h2>
            <p>
              Configure language preferences and user profile for personalized
              AI assistance.
            </p>

            <div className='setting-item'>
              <label className='setting-label'>AI Response Language</label>
              <select
                className='setting-select setting-select-compact'
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isLoadingGeneral}
              >
                <option value='vi'>Tiếng Việt</option>
                <option value='en'>English</option>
                <option value='ja'>日本語</option>
              </select>
              <div className='setting-hint'>
                Language used for AI responses and interface interactions
              </div>
            </div>

            <div className='setting-item'>
              <label className='setting-label'>Your Role</label>
              <select
                className='setting-select setting-select-compact'
                value={userRole}
                onChange={(e) => handleUserRoleChange(e.target.value)}
                disabled={isLoadingGeneral}
              >
                <option value='developer'>Developer/Engineer</option>
                <option value='pm'>Project Manager</option>
                <option value='qa'>QA/Tester</option>
                <option value='comtor'>Comtor</option>
                <option value='designer'>Designer</option>
                <option value='devops'>DevOps</option>
                <option value='other'>Other</option>
              </select>
              <div className='setting-hint'>
                AI will provide role-specific assistance and recommendations
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className='settings-section'>
            <h2>✨ Features</h2>
            <p>
              Enable or disable specific extension features to customize your
              experience.
            </p>

            <div className='setting-item'>
              <label className='setting-checkbox-label'>
                <input
                  type='checkbox'
                  className='setting-checkbox'
                  checked={rememberChatboxSize}
                  onChange={(e) =>
                    handleRememberChatboxSizeChange(e.target.checked)
                  }
                  disabled={isLoadingFeatures}
                />
                <span>Remember chatbox size</span>
              </label>
              <div className='setting-hint'>
                Automatically save and restore the chatbox dimensions when you
                resize it
              </div>
            </div>

            <div className='setting-item'>
              <label className='setting-checkbox-label'>
                <input
                  type='checkbox'
                  className='setting-checkbox'
                  checked={autoOpenChatbox}
                  onChange={(e) =>
                    handleAutoOpenChatboxChange(e.target.checked)
                  }
                  disabled={isLoadingFeatures}
                />
                <span>Auto-open chatbox on Backlog tickets</span>
              </label>
              <div className='setting-hint'>
                Automatically show the AI chatbox when opening a Backlog ticket
                page
              </div>
            </div>

            <div className='setting-item'>
              <label className='setting-checkbox-label'>
                <input
                  type='checkbox'
                  className='setting-checkbox'
                  checked={enterToSend}
                  onChange={(e) => handleEnterToSendChange(e.target.checked)}
                  disabled={isLoadingFeatures}
                />
                <span>Press Enter to send messages</span>
              </label>
              <div className='setting-hint'>
                Send messages by pressing Enter key (Shift+Enter for new line)
              </div>
            </div>
          </div>
        );

      case 'ai-keys':
        return (
          <div className='settings-section'>
            <h2>AI & Models</h2>
            <p>Configure your AI service providers and authentication keys.</p>

            <div className='setting-group api-keys-section'>
              <div className='group-header'>
                <h3>🔐 API Keys</h3>
                <p className='group-description'>
                  Configure authentication for your AI services
                </p>
              </div>

              <div className='api-providers'>
                <div className='api-provider-card'>
                  <div className='provider-header'>
                    <img
                      src='https://platform.openai.com/favicon-platform.png'
                      alt='OpenAI'
                      className='provider-icon-img'
                    />
                    <span className='provider-name'>OpenAI</span>
                  </div>
                  <APIKeyInput
                    label=''
                    placeholder='sk-...'
                    hint='Get your API key from https://platform.openai.com/api-keys'
                    value={openAIApiKey}
                    onVerify={async (apiKey) => {
                      await new Promise((resolve) => setTimeout(resolve, 1500));
                      if (apiKey.startsWith('sk-') && apiKey.length > 10) {
                        return { success: true };
                      }
                      return {
                        success: false,
                        error: 'Invalid OpenAI API key format',
                      };
                    }}
                    onSave={async (apiKey) => {
                      try {
                        await settingsClient.updateAiModelSettings({
                          aiProviderKeys: { openAi: apiKey }
                        });
                      } catch (error) {
                        console.error('Failed to save OpenAI API key:', error);
                      }
                    }}
                  />
                </div>

                <div className='api-provider-card'>
                  <div className='provider-header'>
                    <img
                      src='https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg'
                      alt='Google Gemini'
                      className='provider-icon-img'
                    />
                    <span className='provider-name'>Google Gemini</span>
                  </div>
                  <APIKeyInput
                    label=''
                    placeholder='AIza...'
                    hint='Get your API key from https://aistudio.google.com/app/apikey'
                    value={geminiApiKey}
                    onVerify={async (apiKey) => {
                      await new Promise((resolve) => setTimeout(resolve, 1500));
                      if (apiKey.startsWith('AIza') && apiKey.length > 10) {
                        return { success: true };
                      }
                      return {
                        success: false,
                        error: 'Invalid Gemini API key format',
                      };
                    }}
                    onSave={async (apiKey) => {
                      try {
                        await settingsClient.updateAiModelSettings({
                          aiProviderKeys: { gemini: apiKey }
                        });
                      } catch (error) {
                        console.error('Failed to save Gemini API key:', error);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className='setting-group models-section'>
              <div className='group-header'>
                <h3>🎛️ Available Models</h3>
                <p className='group-description'>
                  Select which models should be available for use
                </p>
              </div>

              <div className='models-container'>
                <div className='provider-models'>
                  <div className='provider-models-header'>
                    <img
                      src='https://platform.openai.com/favicon-platform.png'
                      alt='OpenAI'
                      className='provider-icon-img'
                    />
                    <span className='provider-name'>OpenAI Models</span>
                  </div>
                  <div className='models-list'>
                    {availableModels
                      .filter((model) => model.provider === 'openai')
                      .map((model) => (
                        <div key={model.id} className='model-item'>
                          <label className='model-checkbox-label'>
                            <input
                              type='checkbox'
                              className='model-checkbox'
                              checked={selectedModels.includes(model.id)}
                              onChange={() => handleModelToggle(model.id)}
                              disabled={isLoadingModels}
                            />
                            <div className='model-info'>
                              <div className='model-name'>{model.name}</div>
                              <div className='model-description'>
                                {model.description}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>

                <div className='provider-models'>
                  <div className='provider-models-header'>
                    <img
                      src='https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg'
                      alt='Google Gemini'
                      className='provider-icon-img'
                    />
                    <span className='provider-name'>Google Gemini Models</span>
                  </div>
                  <div className='models-list'>
                    {availableModels
                      .filter((model) => model.provider === 'gemini')
                      .map((model) => (
                        <div key={model.id} className='model-item'>
                          <label className='model-checkbox-label'>
                            <input
                              type='checkbox'
                              className='model-checkbox'
                              checked={selectedModels.includes(model.id)}
                              onChange={() => handleModelToggle(model.id)}
                              disabled={isLoadingModels}
                            />
                            <div className='model-info'>
                              <div className='model-name'>{model.name}</div>
                              <div className='model-description'>
                                {model.description}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className='preferred-model-section'>
                <div className='group-header'>
                  <h3>⭐ Preferred Model</h3>
                  <p className='group-description'>
                    Select your default model for AI conversations
                  </p>
                </div>
                <div className='setting-item'>
                  <select
                    className='setting-select'
                    value={preferredModel}
                    onChange={(e) => handlePreferredModelChange(e.target.value)}
                    disabled={isLoadingModels}
                  >
                    {selectedModels.map((modelId) => {
                      const model = availableModels.find(
                        (m) => m.id === modelId
                      );
                      return model ? (
                        <option key={model.id} value={model.id}>
                          {model.name} (
                          {model.provider === 'openai' ? 'OpenAI' : 'Gemini'})
                        </option>
                      ) : null;
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'backlog-keys':
        return (
          <div className='settings-section'>
            <h2>🔑 Backlog API Configs</h2>
            <p>Configure API keys for different Backlog domains.</p>

            {isLoadingBacklogKeys ? (
              <div className='loading'>Loading Backlog API keys...</div>
            ) : (
              <div className='backlog-keys-container'>
                {backlogAPIKeys.map((keyEntry) => (
                  <div key={keyEntry.id} className='backlog-key-entry'>
                    <div className='entry-header'>
                      <h3>Backlog Configuration</h3>
                      {backlogAPIKeys.length > 1 && (
                        <button
                          className='remove-btn'
                          onClick={() => removeBacklogAPIKey(keyEntry.id)}
                          title='Remove this configuration'
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className='input-row'>
                      <div className='input-group full-width'>
                        <label htmlFor={`domain-${keyEntry.id}`}>Domain:</label>
                        <input
                          id={`domain-${keyEntry.id}`}
                          type='text'
                          placeholder='your-space.backlog.com'
                          value={keyEntry.domain}
                          onChange={(e) =>
                            updateBacklogAPIKey(
                              keyEntry.id,
                              'domain',
                              e.target.value
                            )
                          }
                          onBlur={(e) =>
                            handleDomainBlur(keyEntry.id, e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className='input-row'>
                      <div className='input-group full-width'>
                        <label htmlFor={`apikey-${keyEntry.id}`}>
                          API Key:
                        </label>

                        <InputPassword
                          placeholder='Your Backlog API key'
                          value={keyEntry.apiKey}
                          onChange={(e) =>
                            updateBacklogAPIKey(
                              keyEntry.id,
                              'apiKey',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className='input-row'>
                      <div className='input-group full-width'>
                        <label htmlFor={`note-${keyEntry.id}`}>
                          Note (optional):
                        </label>
                        <input
                          id={`note-${keyEntry.id}`}
                          type='text'
                          placeholder='Description for this configuration'
                          value={keyEntry.note}
                          onChange={(e) =>
                            updateBacklogAPIKey(
                              keyEntry.id,
                              'note',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className='test-section'>
                      <button
                        className={`test-btn ${
                          testingStates[keyEntry.id]?.testing ? 'testing' : ''
                        }`}
                        onClick={() => testBacklogConnection(keyEntry.id)}
                        disabled={
                          !keyEntry.domain ||
                          !keyEntry.apiKey ||
                          testingStates[keyEntry.id]?.testing
                        }
                      >
                        {testingStates[keyEntry.id]?.testing
                          ? 'Testing...'
                          : 'Save'}
                      </button>

                      {testingStates[keyEntry.id]?.result && (
                        <div
                          className={`test-result ${
                            testingStates[keyEntry.id]?.result?.success
                              ? 'success'
                              : 'error'
                          }`}
                        >
                          {testingStates[keyEntry.id]?.result?.success ? (
                            <span>
                              ✅ Connected to namespace:{' '}
                              <strong>
                                {keyEntry.namespace ||
                                  testingStates[keyEntry.id]?.result?.namespace}
                              </strong>
                            </span>
                          ) : (
                            <span>
                              ❌ {testingStates[keyEntry.id]?.result?.error}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button className='add-key-btn' onClick={addBacklogAPIKey}>
                  + Add Another Backlog
                </button>
              </div>
            )}
          </div>
        );

      case 'export':
        return (
          <div className='settings-section'>
            <h2>📤 Import/Export Data</h2>
            <p>Backup and restore your extension settings and chat history.</p>

            {/* Export Section */}
            <div className='setting-group export-section'>
              <div className='group-header'>
                <h3>📤 Export Data</h3>
                <p className='group-description'>
                  Create a backup of your extension data
                </p>
              </div>

              <div className='setting-item'>
                <label className='setting-checkbox-label'>
                  <input
                    type='checkbox'
                    className='setting-checkbox'
                    checked={exportConfigs}
                    onChange={(e) => setExportConfigs(e.target.checked)}
                    disabled={isExporting}
                  />
                  <span>Export configurations</span>
                </label>
                <div className='setting-hint'>
                  Include general settings, features, your selected AI models (
                  {selectedModels.length} models), and Backlog API keys
                </div>
              </div>

              <div className='setting-item'>
                <label className='setting-checkbox-label'>
                  <input
                    type='checkbox'
                    className='setting-checkbox'
                    checked={exportChatHistory}
                    onChange={(e) => setExportChatHistory(e.target.checked)}
                    disabled={isExporting}
                  />
                  <span>Export chat history</span>
                </label>
                <div className='setting-hint'>
                  Include all saved chat conversations and ticket analysis
                </div>
              </div>

              <div className='setting-item'>
                <button
                  className='setting-button'
                  onClick={handleExportData}
                  disabled={
                    isExporting || (!exportConfigs && !exportChatHistory)
                  }
                >
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className='setting-group import-section'>
              <div className='group-header'>
                <h3>📥 Import Data</h3>
                <p className='group-description'>
                  Import previously exported extension data
                </p>
              </div>

              <div className='setting-item'>
                <label className='setting-label'>Select Import File</label>
                <input
                  type='file'
                  accept='.json'
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className='setting-input'
                />
                <div className='setting-hint'>
                  Select a JSON file exported from this extension
                </div>
              </div>

              {importFile && (
                <>
                  <div className='setting-item'>
                    <div className='import-file-info'>
                      <span>Selected: {importFile.name}</span>
                      <span className='file-size'>
                        ({(importFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className='setting-item'>
                <button
                  className='setting-button setting-button-warning'
                  onClick={handleImportData}
                  disabled={isImporting || !importFile}
                >
                  {isImporting ? 'Importing...' : 'Import Data'}
                </button>
                {importFile && (
                  <div className='setting-hint import-warning'>
                    ⚠️ This will merge with existing data. Create a backup
                    first!
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className='settings-section'>
            <h2>Settings</h2>
            <p>Select a section from the sidebar to configure.</p>
          </div>
        );
    }
  };

  return (
    <div className='options-container'>
      <div className='options-header'>
        <h1>Backlog AI Extension - Settings</h1>
      </div>

      <div className='options-layout'>
        <div className='options-sidebar'>
          <nav className='sidebar-nav'>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${
                  activeSection === item.id ? 'active' : ''
                }`}
                onClick={() => handleSectionChange(item.id)}
              >
                <span className='sidebar-icon'>{item.icon}</span>
                <span className='sidebar-label'>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className='sidebar-version-info'>
            <div className='version-line'>
              <span className='version-label'>Version:</span>
              <span className='version-value'>
                v
                {typeof __APP_VERSION__ !== 'undefined'
                  ? __APP_VERSION__
                  : '1.0.0'}
              </span>
            </div>
            {typeof __COMMIT_ID__ !== 'undefined' &&
              __COMMIT_ID__ !== 'unknown' && (
                <div className='commit-line'>
                  <span className='commit-label'>Build:</span>
                  <span className='commit-value'>{__COMMIT_ID__}</span>
                </div>
              )}
          </div>
        </div>

        <div className='options-content'>{renderContent()}</div>
      </div>
    </div>
  );
};

console.log('Options page loading...');
console.log('React:', React);
console.log('ReactDOM:', ReactDOM);

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.log('Root created:', root);

  root.render(
    <React.StrictMode>
      <OptionsPage />
    </React.StrictMode>
  );
  console.log('React component rendered');
} else {
  console.error('Root element not found!');
}
