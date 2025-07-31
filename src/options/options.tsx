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
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'features', label: 'Features', icon: '🎯' },
  { id: 'ai-keys', label: 'AI Provider Settings', icon: '🔧' },
  { id: 'backlog-keys', label: 'Backlog API Keys', icon: '🔑' },
  { id: 'export', label: 'Export Data', icon: '📤' }
];

const OptionsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [preferredModel, setPreferredModel] = useState<string>('gpt-4.1-mini');

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

  const handleProviderChange = async (provider: 'openai' | 'gemini') => {
    // This function is no longer needed, but keeping for compatibility
  };

  const handleSectionChange = (section: SettingsSection) => {
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

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-section">
            <h2>General Settings</h2>
            <p>Configure general extension preferences and behavior.</p>

            <div className="setting-group">
              <div className="group-header">
                <h3>🌐 Language & Region</h3>
                <p className="group-description">Set your preferred language and regional settings</p>
              </div>
              <div className="setting-item">
                <label className="setting-label">Interface Language</label>
                <select className="setting-select">
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="settings-section">
            <h2>Features</h2>
            <p>Enable or disable specific extension features.</p>

            <div className="setting-group">
              <div className="group-header">
                <h3>🎯 AI Features</h3>
                <p className="group-description">Control AI-powered functionality</p>
              </div>
              <div className="setting-item">
                <label className="setting-checkbox-label">
                  <input type="checkbox" className="setting-checkbox" defaultChecked />
                  <span>Auto-analyze tickets when opened</span>
                </label>
              </div>
              <div className="setting-item">
                <label className="setting-checkbox-label">
                  <input type="checkbox" className="setting-checkbox" defaultChecked />
                  <span>Show AI suggestions in chat</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'ai-keys':
        return (
          <div className="settings-section">
            <h2>AI Provider Settings</h2>
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
            <h2>Backlog API Keys</h2>
            <p>Configure API keys for different Backlog domains.</p>

            <div className="setting-group">
              <div className="group-header">
                <h3>🔑 Domain API Keys</h3>
                <p className="group-description">Add API keys for your Backlog domains</p>
              </div>
              <div className="setting-item">
                <label className="setting-label">Backlog Domain</label>
                <input
                  type="text"
                  className="setting-input"
                  placeholder="your-space.backlog.com"
                />
              </div>
              <div className="setting-item">
                <label className="setting-label">API Key</label>
                <input
                  type="password"
                  className="setting-input"
                  placeholder="Enter your Backlog API key"
                />
              </div>
            </div>
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
