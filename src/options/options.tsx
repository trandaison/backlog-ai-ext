import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './options.scss';
import { EncryptionService } from '../shared/encryption';

// Inline component để tránh module import issues
type SettingsSection = 'general' | 'features' | 'ai-keys' | 'backlog-keys' | 'export';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'gemini';
}

interface BacklogAPIKey {
  id: string;
  domain: string;
  apiKey: string;
  note: string;
  namespace?: string; // Will be populated after successful test
}

const availableModels: ModelInfo[] = [
  // OpenAI Models (Latest 2025)
  { id: 'o3', name: 'o3', description: 'Our most powerful reasoning model', provider: 'openai' },
  { id: 'o3-pro', name: 'o3 Pro', description: 'Version of o3 with more compute for better responses', provider: 'openai' },
  { id: 'o3-mini', name: 'o3 Mini', description: 'A small model alternative to o3', provider: 'openai' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Flagship GPT model for complex tasks', provider: 'openai' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Balanced for intelligence, speed, and cost', provider: 'openai' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Fastest, most cost-effective GPT-4.1 model', provider: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast, intelligent, flexible GPT model', provider: 'openai' },
  { id: 'chatgpt-4o', name: 'ChatGPT-4o', description: 'GPT-4o model used in ChatGPT', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, affordable small model for focused tasks', provider: 'openai' },
  { id: 'o4-mini', name: 'o4 Mini', description: 'Faster, more affordable reasoning model', provider: 'openai' },

  // Google Gemini Models (Latest 2025)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most advanced Gemini model with enhanced reasoning', provider: 'gemini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and efficient multimodal model', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Lightweight version optimized for speed and cost', provider: 'gemini' }
];

interface APIKeyInputProps {
  label: string;
  placeholder: string;
  hint: string;
  providerKey: string;
  onVerify: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
}

const APIKeyInput: React.FC<APIKeyInputProps> = ({ label, placeholder, hint, providerKey, onVerify }) => {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  React.useEffect(() => {
    const loadStoredKey = async () => {
      setIsLoadingKey(true);
      try {
        // Load từ popup storage format (encrypted)
        let storageKey;
        if (providerKey === 'openai') {
          storageKey = 'encryptedApiKey';
        } else if (providerKey === 'gemini') {
          storageKey = 'encryptedGeminiApiKey';
        } else {
          // Fallback cho providers khác
          storageKey = `apiKey_${providerKey}`;
        }

        const result = await chrome.storage.sync.get([storageKey]);
        const encryptedKey = result[storageKey] || '';

        let stored = '';

        if (encryptedKey && (providerKey === 'openai' || providerKey === 'gemini')) {
          try {
            // Decrypt key từ popup format
            stored = await EncryptionService.decryptApiKey(encryptedKey);
          } catch (error) {
            console.error(`Failed to decrypt ${providerKey} API key:`, error);
            stored = '';
          }
        } else if (encryptedKey) {
          stored = encryptedKey; // Plain text cho providers khác
        }

        setStoredKey(stored);
        setApiKey(stored);
      } catch (error) {
        console.error('Failed to load stored API key:', error);
      } finally {
        setIsLoadingKey(false);
      }
    };

    loadStoredKey();
  }, [providerKey]);

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setVerificationState('error');
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsVerifying(true);
    setVerificationState('idle');
    setErrorMessage('');

    try {
      const result = await onVerify(apiKey);

      if (result.success) {
        setVerificationState('success');

        // Save key using popup storage format (encrypted)
        try {
          let storageKey;
          let valueToStore;

          if (providerKey === 'openai') {
            storageKey = 'encryptedApiKey';
            valueToStore = await EncryptionService.encryptApiKey(apiKey);
          } else if (providerKey === 'gemini') {
            storageKey = 'encryptedGeminiApiKey';
            valueToStore = await EncryptionService.encryptApiKey(apiKey);
          } else {
            // Fallback cho providers khác
            storageKey = `apiKey_${providerKey}`;
            valueToStore = apiKey; // Plain text
          }

          await chrome.storage.sync.set({
            [storageKey]: valueToStore
          });
          setStoredKey(apiKey);
        } catch (error) {
          console.error('Failed to save API key:', error);
        }

        setTimeout(() => {
          setVerificationState('idle');
        }, 2000);
      } else {
        setVerificationState('error');
        setErrorMessage(result.error || 'Verification failed');
      }
    } catch (error) {
      setVerificationState('error');
      setErrorMessage('Network error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetToStoredKey = () => {
    setApiKey(storedKey);
    setVerificationState('idle');
    setErrorMessage('');
  };

  const getVerifyButtonContent = () => {
    if (isVerifying) return 'Verifying...';
    if (verificationState === 'success') return 'Verified';
    return 'Verify';
  };

  return (
    <div className="api-key-input-group">
      <label className="setting-label">{label}</label>
      <div className="api-key-input-container">
        <div className="input-with-controls">
          <div className="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="setting-input api-key-input"
              placeholder={isLoadingKey ? 'Loading...' : placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoadingKey}
            />
            <button
              type="button"
              className="input-toggle-button-inside"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide API key' : 'Show API key'}
              disabled={isLoadingKey}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button
            type="button"
            className={`verify-button ${verificationState}`}
            onClick={handleVerify}
            disabled={isVerifying || isLoadingKey}
          >
            {getVerifyButtonContent()}
          </button>
          {apiKey !== storedKey && !isLoadingKey && (
            <button
              type="button"
              className="reset-button"
              onClick={resetToStoredKey}
              title="Reset to saved key"
            >
              ↶
            </button>
          )}
        </div>
      </div>
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      <div className="hint-text">{hint.includes('http') ? (
          <span>
            {hint.split('https://')[0]}
            <a
              href={`https://${hint.split('https://')[1]}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              https://{hint.split('https://')[1]}
            </a>
          </span>
        ) : (
          hint
        )}
      </div>
    </div>
  );
};

const sidebarItems: SidebarItem[] = [
    { id: 'general', label: 'General Settings', icon: '⚙️' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'ai-keys', label: 'AI & Models', icon: '🤖' },
  { id: 'backlog-keys', label: 'Backlog API Keys', icon: '🔑' },
  { id: 'export', label: 'Export Data', icon: '📤' }
];

const OptionsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [preferredModel, setPreferredModel] = useState<string>('gpt-4.1-mini');
  const [backlogAPIKeys, setBacklogAPIKeys] = useState<BacklogAPIKey[]>([]);
  const [isLoadingBacklogKeys, setIsLoadingBacklogKeys] = useState(true);
  const [testingStates, setTestingStates] = useState<Record<string, { testing: boolean; result?: { success: boolean; namespace?: string; error?: string } }>>({});
  const [showPasswordStates, setShowPasswordStates] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState<string>('vi');
  const [userRole, setUserRole] = useState<string>('developer');
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(true);

  // Feature settings state
  const [rememberChatboxSize, setRememberChatboxSize] = useState<boolean>(true);
  const [autoOpenChatbox, setAutoOpenChatbox] = useState<boolean>(false);
  const [enterToSend, setEnterToSend] = useState<boolean>(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  // Initialize active section from URL hash
  React.useEffect(() => {
    const getInitialSection = (): SettingsSection => {
      const hash = window.location.hash.slice(1); // Remove #
      const validSections: SettingsSection[] = ['general', 'features', 'ai-keys', 'backlog-keys', 'export'];

      if (hash && validSections.includes(hash as SettingsSection)) {
        return hash as SettingsSection;
      }

      return 'general';
    };

    setActiveSection(getInitialSection());

    // Listen for hash changes (back/forward navigation)
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validSections: SettingsSection[] = ['general', 'features', 'ai-keys', 'backlog-keys', 'export'];

      if (hash && validSections.includes(hash as SettingsSection)) {
        setActiveSection(hash as SettingsSection);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load preferred model từ storage
  React.useEffect(() => {
    const loadPreferredModel = async () => {
      try {
        const result = await chrome.storage.sync.get(['preferredModel']);
        const model = result.preferredModel || 'gpt-4.1-mini';
        setPreferredModel(model);
      } catch (error) {
        console.error('Failed to load preferred model:', error);
      } finally {
        setIsLoadingProvider(false);
      }
    };

    loadPreferredModel();
  }, []);

  // Load selected models từ storage
  React.useEffect(() => {
    const loadSelectedModels = async () => {
      try {
        const result = await chrome.storage.sync.get(['selectedModels']);
        // Default models: Mới, tối ưu chi phí, thông minh, nhanh
        const defaultModels = [
          'gpt-4.1-mini',        // Balanced for intelligence, speed, and cost
          'gpt-4o-mini',         // Fast, affordable small model for focused tasks
          'o3-mini',             // Small alternative to o3 reasoning model
          'gemini-2.5-pro',      // Most advanced Gemini model with enhanced reasoning
          'gemini-2.5-flash',    // Fast and efficient multimodal model
          'gemini-2.5-flash-lite' // Lightweight version optimized for speed and cost
        ];
        const models = result.selectedModels || defaultModels;
        setSelectedModels(models);
      } catch (error) {
        console.error('Failed to load selected models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadSelectedModels();
  }, []);

  // Load general settings (language and userRole) từ storage
  React.useEffect(() => {
    const loadGeneralSettings = async () => {
      try {
        const result = await chrome.storage.sync.get(['language', 'userRole']);
        const lang = result.language || 'vi';
        const role = result.userRole || 'developer';
        setLanguage(lang);
        setUserRole(role);
      } catch (error) {
        console.error('Failed to load general settings:', error);
      } finally {
        setIsLoadingGeneral(false);
      }
    };

    loadGeneralSettings();
  }, []);

  // Load feature settings từ storage
  React.useEffect(() => {
    const loadFeatureSettings = async () => {
      setIsLoadingFeatures(true);
      try {
        const result = await chrome.storage.sync.get(['rememberChatboxSize', 'autoOpenChatbox', 'enterToSend']);

        setRememberChatboxSize(result.rememberChatboxSize !== undefined ? result.rememberChatboxSize : true);
        setAutoOpenChatbox(result.autoOpenChatbox !== undefined ? result.autoOpenChatbox : false);
        setEnterToSend(result.enterToSend !== undefined ? result.enterToSend : true);
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
      try {
        const result = await chrome.storage.sync.get(['backlogAPIKeys', 'backlogDomain', 'backlogAPIKey']);

        // Migration từ popup settings cũ
        let keys: BacklogAPIKey[] = [];

        if (result.backlogAPIKeys) {
          // Nếu đã có format mới
          keys = result.backlogAPIKeys;
        } else if (result.backlogDomain && result.backlogAPIKey) {
          // Migration từ format cũ
          keys = [{
            id: 'migrated-' + Date.now(),
            domain: result.backlogDomain,
            apiKey: result.backlogAPIKey,
            note: 'Migrated from popup settings'
          }];

          // Save format mới và xóa keys cũ
          await chrome.storage.sync.set({ backlogAPIKeys: keys });
          await chrome.storage.sync.remove(['backlogDomain', 'backlogAPIKey']);
        }

        // Nếu không có keys nào, tạo một entry trống
        if (keys.length === 0) {
          keys = [{
            id: 'default-' + Date.now(),
            domain: '',
            apiKey: '',
            note: ''
          }];
        }

        setBacklogAPIKeys(keys);

        // Initialize password visibility states for all keys
        const initialShowStates: Record<string, boolean> = {};
        keys.forEach(key => {
          initialShowStates[key.id] = false;
        });
        setShowPasswordStates(initialShowStates);
      } catch (error) {
        console.error('Failed to load Backlog API keys:', error);
      } finally {
        setIsLoadingBacklogKeys(false);
      }
    };

    loadBacklogAPIKeys();
  }, []);

  const handleProviderChange = async (provider: 'openai' | 'gemini') => {
    // This function is no longer needed, but keeping for compatibility
  };

  const handleSectionChange = (section: SettingsSection) => {
    // Add animation class to trigger re-animation
    const contentElement = document.querySelector('.options-content') as HTMLElement;
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
      await chrome.storage.sync.set({ preferredModel: modelId });
    } catch (error) {
      console.error('Failed to save preferred model:', error);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    try {
      await chrome.storage.sync.set({ language: newLanguage });
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const handleUserRoleChange = async (newRole: string) => {
    setUserRole(newRole);
    try {
      await chrome.storage.sync.set({ userRole: newRole });
    } catch (error) {
      console.error('Failed to save user role:', error);
    }
  };

  // Feature handlers
  const handleRememberChatboxSizeChange = async (enabled: boolean) => {
    setRememberChatboxSize(enabled);
    try {
      await chrome.storage.sync.set({ rememberChatboxSize: enabled });
    } catch (error) {
      console.error('Failed to save rememberChatboxSize setting:', error);
    }
  };

  const handleAutoOpenChatboxChange = async (enabled: boolean) => {
    setAutoOpenChatbox(enabled);
    try {
      await chrome.storage.sync.set({ autoOpenChatbox: enabled });
    } catch (error) {
      console.error('Failed to save autoOpenChatbox setting:', error);
    }
  };

  const handleEnterToSendChange = async (enabled: boolean) => {
    setEnterToSend(enabled);
    try {
      await chrome.storage.sync.set({ enterToSend: enabled });
    } catch (error) {
      console.error('Failed to save enterToSend setting:', error);
    }
  };

  const handleModelToggle = async (modelId: string) => {
    const newSelectedModels = selectedModels.includes(modelId)
      ? selectedModels.filter(id => id !== modelId)
      : [...selectedModels, modelId];

    setSelectedModels(newSelectedModels);

    try {
      await chrome.storage.sync.set({ selectedModels: newSelectedModels });
    } catch (error) {
      console.error('Failed to save selected models:', error);
    }
  };

  const addBacklogAPIKey = () => {
    const newKey: BacklogAPIKey = {
      id: 'key-' + Date.now(),
      domain: '',
      apiKey: '',
      note: ''
    };

    setBacklogAPIKeys([...backlogAPIKeys, newKey]);
    // Initialize password visibility state for new entry
    setShowPasswordStates(prev => ({
      ...prev,
      [newKey.id]: false
    }));
  };

  const removeBacklogAPIKey = async (id: string) => {
    const updatedKeys = backlogAPIKeys.filter(key => key.id !== id);
    setBacklogAPIKeys(updatedKeys);

    // Remove password visibility state for deleted entry
    setShowPasswordStates(prev => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });

    try {
      await chrome.storage.sync.set({ backlogAPIKeys: updatedKeys });
    } catch (error) {
      console.error('Failed to save Backlog API keys:', error);
    }
  };

  const updateBacklogAPIKey = async (id: string, field: keyof BacklogAPIKey, value: string) => {
    const updatedKeys = backlogAPIKeys.map(key =>
      key.id === id ? { ...key, [field]: value } : key
    );

    setBacklogAPIKeys(updatedKeys);

    try {
      await chrome.storage.sync.set({ backlogAPIKeys: updatedKeys });
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
    const keyEntry = backlogAPIKeys.find(key => key.id === id);
    if (!keyEntry || !keyEntry.domain || !keyEntry.apiKey) {
      return;
    }

    setTestingStates(prev => ({
      ...prev,
      [id]: { testing: true }
    }));

    try {
      // Use background service to test connection
      const response = await chrome.runtime.sendMessage({
        action: 'testBacklogConnection',
        data: {
          id: keyEntry.id,
          domain: keyEntry.domain,
          spaceName: keyEntry.domain.split('.')[0], // Extract space name from domain
          apiKey: keyEntry.apiKey
        }
      });

      if (response.success) {
        const namespace = response.data?.name || response.data?.spaceKey || 'Connected';

        // Update the namespace in the key entry
        const updatedKeys = backlogAPIKeys.map(key =>
          key.id === id ? { ...key, namespace } : key
        );

        setBacklogAPIKeys(updatedKeys);

        // Save to Chrome storage when connection is successful
        try {
          await chrome.storage.sync.set({ backlogAPIKeys: updatedKeys });
          console.log('Backlog API keys saved successfully');
        } catch (storageError) {
          console.error('Failed to save Backlog API keys:', storageError);
        }

        setTestingStates(prev => ({
          ...prev,
          [id]: { testing: false, result: { success: true, namespace } }
        }));
      } else {
        setTestingStates(prev => ({
          ...prev,
          [id]: { testing: false, result: { success: false, error: response.message || 'Connection failed' } }
        }));
      }
    } catch (error) {
      setTestingStates(prev => ({
        ...prev,
        [id]: { testing: false, result: { success: false, error: (error as Error).message } }
      }));
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-section">
            <h2>⚙️ General Settings</h2>
            <p>Configure language preferences and user profile for personalized AI assistance.</p>

            <div className="setting-item">
              <label className="setting-label">AI Response Language</label>
              <select
                className="setting-select setting-select-compact"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isLoadingGeneral}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
              <div className="setting-hint">
                Language used for AI responses and interface interactions
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Your Role</label>
              <select
                className="setting-select setting-select-compact"
                value={userRole}
                onChange={(e) => handleUserRoleChange(e.target.value)}
                disabled={isLoadingGeneral}
              >
                <option value="developer">Developer/Engineer</option>
                <option value="pm">Project Manager</option>
                <option value="qa">QA/Tester</option>
                <option value="comtor">Comtor</option>
                <option value="designer">Designer</option>
                <option value="devops">DevOps</option>
                <option value="other">Other</option>
              </select>
              <div className="setting-hint">
                AI will provide role-specific assistance and recommendations
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="settings-section">
            <h2>✨ Features</h2>
            <p>Enable or disable specific extension features to customize your experience.</p>

            <div className="setting-item">
              <label className="setting-checkbox-label">
                <input
                  type="checkbox"
                  className="setting-checkbox"
                  checked={rememberChatboxSize}
                  onChange={(e) => handleRememberChatboxSizeChange(e.target.checked)}
                  disabled={isLoadingFeatures}
                />
                <span>Remember chatbox size</span>
              </label>
              <div className="setting-hint">
                Automatically save and restore the chatbox dimensions when you resize it
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-checkbox-label">
                <input
                  type="checkbox"
                  className="setting-checkbox"
                  checked={autoOpenChatbox}
                  onChange={(e) => handleAutoOpenChatboxChange(e.target.checked)}
                  disabled={isLoadingFeatures}
                />
                <span>Auto-open chatbox on Backlog tickets</span>
              </label>
              <div className="setting-hint">
                Automatically show the AI chatbox when opening a Backlog ticket page
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-checkbox-label">
                <input
                  type="checkbox"
                  className="setting-checkbox"
                  checked={enterToSend}
                  onChange={(e) => handleEnterToSendChange(e.target.checked)}
                  disabled={isLoadingFeatures}
                />
                <span>Press Enter to send messages</span>
              </label>
              <div className="setting-hint">
                Send messages by pressing Enter key (Shift+Enter for new line)
              </div>
            </div>
          </div>
        );

      case 'ai-keys':
        return (
          <div className="settings-section">
            <h2>AI & Models</h2>
            <p>Configure your AI service providers and authentication keys.</p>

            <div className="setting-group api-keys-section">
              <div className="group-header">
                <h3>🔐 API Keys</h3>
                <p className="group-description">Configure authentication for your AI services</p>
              </div>

              <div className="api-providers">
                <div className="api-provider-card">
                  <div className="provider-header">
                    <img
                      src="https://platform.openai.com/favicon-platform.png"
                      alt="OpenAI"
                      className="provider-icon-img"
                    />
                    <span className="provider-name">OpenAI</span>
                  </div>
                  <APIKeyInput
                    label=""
                    placeholder="sk-..."
                    hint="Get your API key from https://platform.openai.com/api-keys"
                    providerKey="openai"
                    onVerify={async (apiKey) => {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      if (apiKey.startsWith('sk-') && apiKey.length > 10) {
                        return { success: true };
                      }
                      return { success: false, error: 'Invalid OpenAI API key format' };
                    }}
                  />
                </div>

                <div className="api-provider-card">
                  <div className="provider-header">
                    <img
                      src="https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg"
                      alt="Google Gemini"
                      className="provider-icon-img"
                    />
                    <span className="provider-name">Google Gemini</span>
                  </div>
                  <APIKeyInput
                    label=""
                    placeholder="AIza..."
                    hint="Get your API key from https://aistudio.google.com/app/apikey"
                    providerKey="gemini"
                    onVerify={async (apiKey) => {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      if (apiKey.startsWith('AIza') && apiKey.length > 10) {
                        return { success: true };
                      }
                      return { success: false, error: 'Invalid Gemini API key format' };
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="setting-group models-section">
              <div className="group-header">
                <h3>🎛️ Available Models</h3>
                <p className="group-description">Select which models should be available for use</p>
              </div>

              <div className="models-container">
                <div className="provider-models">
                  <div className="provider-models-header">
                    <img
                      src="https://platform.openai.com/favicon-platform.png"
                      alt="OpenAI"
                      className="provider-icon-img"
                    />
                    <span className="provider-name">OpenAI Models</span>
                  </div>
                  <div className="models-list">
                    {availableModels
                      .filter(model => model.provider === 'openai')
                      .map(model => (
                        <div key={model.id} className="model-item">
                          <label className="model-checkbox-label">
                            <input
                              type="checkbox"
                              className="model-checkbox"
                              checked={selectedModels.includes(model.id)}
                              onChange={() => handleModelToggle(model.id)}
                              disabled={isLoadingModels}
                            />
                            <div className="model-info">
                              <div className="model-name">{model.name}</div>
                              <div className="model-description">{model.description}</div>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="provider-models">
                  <div className="provider-models-header">
                    <img
                      src="https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg"
                      alt="Google Gemini"
                      className="provider-icon-img"
                    />
                    <span className="provider-name">Google Gemini Models</span>
                  </div>
                  <div className="models-list">
                    {availableModels
                      .filter(model => model.provider === 'gemini')
                      .map(model => (
                        <div key={model.id} className="model-item">
                          <label className="model-checkbox-label">
                            <input
                              type="checkbox"
                              className="model-checkbox"
                              checked={selectedModels.includes(model.id)}
                              onChange={() => handleModelToggle(model.id)}
                              disabled={isLoadingModels}
                            />
                            <div className="model-info">
                              <div className="model-name">{model.name}</div>
                              <div className="model-description">{model.description}</div>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="preferred-model-section">
                <div className="group-header">
                  <h3>⭐ Preferred Model</h3>
                  <p className="group-description">Select your default model for AI conversations</p>
                </div>
                <div className="setting-item">
                  <select
                    className="setting-select"
                    value={preferredModel}
                    onChange={(e) => handlePreferredModelChange(e.target.value)}
                    disabled={isLoadingModels}
                  >
                    {selectedModels.map(modelId => {
                      const model = availableModels.find(m => m.id === modelId);
                      return model ? (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider === 'openai' ? 'OpenAI' : 'Gemini'})
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
          <div className="settings-section">
            <h2>🔑 Backlog API Configs</h2>
            <p>Configure API keys for different Backlog domains.</p>

            {isLoadingBacklogKeys ? (
              <div className="loading">Loading Backlog API keys...</div>
            ) : (
              <div className="backlog-keys-container">
                {backlogAPIKeys.map((keyEntry) => (
                  <div key={keyEntry.id} className="backlog-key-entry">
                    <div className="entry-header">
                      <h3>Backlog Configuration</h3>
                      {backlogAPIKeys.length > 1 && (
                        <button
                          className="remove-btn"
                          onClick={() => removeBacklogAPIKey(keyEntry.id)}
                          title="Remove this configuration"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="input-row">
                      <div className="input-group full-width">
                        <label htmlFor={`domain-${keyEntry.id}`}>Domain:</label>
                        <input
                          id={`domain-${keyEntry.id}`}
                          type="text"
                          placeholder="your-space.backlog.com"
                          value={keyEntry.domain}
                          onChange={(e) => updateBacklogAPIKey(keyEntry.id, 'domain', e.target.value)}
                          onBlur={(e) => handleDomainBlur(keyEntry.id, e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="input-row">
                      <div className="input-group full-width">
                        <label htmlFor={`apikey-${keyEntry.id}`}>API Key:</label>
                        <div className="input-wrapper">
                          <input
                            id={`apikey-${keyEntry.id}`}
                            type={showPasswordStates[keyEntry.id] ? 'text' : 'password'}
                            placeholder="Your Backlog API key"
                            value={keyEntry.apiKey}
                            onChange={(e) => updateBacklogAPIKey(keyEntry.id, 'apiKey', e.target.value)}
                          />
                          <button
                            type="button"
                            className="input-toggle-button-inside"
                            onClick={() => setShowPasswordStates(prev => ({
                              ...prev,
                              [keyEntry.id]: !prev[keyEntry.id]
                            }))}
                            title={showPasswordStates[keyEntry.id] ? 'Hide API key' : 'Show API key'}
                          >
                            {showPasswordStates[keyEntry.id] ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="input-row">
                      <div className="input-group full-width">
                        <label htmlFor={`note-${keyEntry.id}`}>Note (optional):</label>
                        <input
                          id={`note-${keyEntry.id}`}
                          type="text"
                          placeholder="Description for this configuration"
                          value={keyEntry.note}
                          onChange={(e) => updateBacklogAPIKey(keyEntry.id, 'note', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="test-section">
                      <button
                        className={`test-btn ${testingStates[keyEntry.id]?.testing ? 'testing' : ''}`}
                        onClick={() => testBacklogConnection(keyEntry.id)}
                        disabled={!keyEntry.domain || !keyEntry.apiKey || testingStates[keyEntry.id]?.testing}
                      >
                        {testingStates[keyEntry.id]?.testing ? 'Testing...' : 'Test Connection'}
                      </button>

                      {testingStates[keyEntry.id]?.result && (
                        <div className={`test-result ${testingStates[keyEntry.id]?.result?.success ? 'success' : 'error'}`}>
                          {testingStates[keyEntry.id]?.result?.success ? (
                            <span>✅ Connected to namespace: <strong>{keyEntry.namespace || testingStates[keyEntry.id]?.result?.namespace}</strong></span>
                          ) : (
                            <span>❌ {testingStates[keyEntry.id]?.result?.error}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button className="add-key-btn" onClick={addBacklogAPIKey}>
                  + Add Another Backlog
                </button>
              </div>
            )}
          </div>
        );

      case 'export':
        return (
          <div className="settings-section">
            <h2>Export Data</h2>
            <p>Export your settings and chat history.</p>

            <div className="setting-group">
              <div className="group-header">
                <h3>📤 Export Options</h3>
                <p className="group-description">Export your extension data</p>
              </div>
              <div className="setting-item">
                <button className="setting-button">Export Settings</button>
              </div>
              <div className="setting-item">
                <button className="setting-button">Export Chat History</button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="settings-section">
            <h2>Settings</h2>
            <p>Select a section from the sidebar to configure.</p>
          </div>
        );
    }
  };

  return (
    <div className="options-container">
      <div className="options-header">
        <h1>Backlog AI Extension - Settings</h1>
      </div>

      <div className="options-layout">
        <div className="options-sidebar">
          <nav className="sidebar-nav">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleSectionChange(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="options-content">
          {renderContent()}
        </div>
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
