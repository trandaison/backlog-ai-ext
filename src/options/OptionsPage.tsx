import React, { useState } from 'react';

type SettingsSection = 'general' | 'features' | 'ai-keys' | 'backlog-keys' | 'export';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

interface APIKeyInputProps {
  label: string;
  placeholder: string;
  hint: string;
  providerKey: string; // Unique key for this provider (e.g., 'openai', 'gemini')
  onVerify: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
}

const APIKeyInput: React.FC<APIKeyInputProps> = ({ label, placeholder, hint, providerKey, onVerify }) => {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState(''); // Key stored in settings
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Load stored key on component mount
  React.useEffect(() => {
    const loadStoredKey = async () => {
      try {
        const result = await chrome.storage.sync.get([`apiKey_${providerKey}`]);
        const stored = result[`apiKey_${providerKey}`] || '';
        setStoredKey(stored);
        setApiKey(stored); // Initialize input with stored key
      } catch (error) {
        console.error('Failed to load stored API key:', error);
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

        // Save new key to storage
        try {
          await chrome.storage.sync.set({
            [`apiKey_${providerKey}`]: apiKey
          });
          setStoredKey(apiKey); // Update stored key state
        } catch (error) {
          console.error('Failed to save API key:', error);
        }

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setVerificationState('idle');
        }, 2000);
      } else {
        setVerificationState('error');
        setErrorMessage(result.error || 'Verification failed');
        // Keep the invalid input value, don't save to storage
      }
    } catch (error) {
      setVerificationState('error');
      setErrorMessage('Network error occurred');
      // Keep the invalid input value, don't save to storage
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset to stored key (for page reload simulation)
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
              placeholder={placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="input-toggle-button-inside"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide API key' : 'Show API key'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button
            type="button"
            className={`verify-button ${verificationState}`}
            onClick={handleVerify}
            disabled={isVerifying}
          >
            {getVerifyButtonContent()}
          </button>
          {apiKey !== storedKey && (
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
      <div className="hint-text">
        {hint.includes('http') ? (
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

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-section">
            <h2>General Settings</h2>
            <p>Configure general extension preferences.</p>
            <div className="setting-item">
              <label className="setting-label">
                <input type="checkbox" className="setting-checkbox" />
                Enable extension notifications
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input type="checkbox" className="setting-checkbox" />
                Auto-save chat history
              </label>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="settings-section">
            <h2>Feature Settings</h2>
            <p>Enable or disable specific features.</p>
            <div className="setting-item">
              <label className="setting-label">
                <input type="checkbox" className="setting-checkbox" />
                Enable AI ticket analysis
              </label>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                <input type="checkbox" className="setting-checkbox" />
                Show suggestion buttons
              </label>
            </div>
          </div>
        );

      case 'ai-keys':
        return (
          <div className="settings-section">
            <h2>AI Provider Settings</h2>
            <p>Configure your AI service providers and authentication keys.</p>

            {/* Model Selection Section */}
            <div className="setting-group model-selection">
              <div className="group-header">
                <h3>🎯 Default Provider</h3>
                <p className="group-description">Select your preferred AI service</p>
              </div>
              <div className="setting-item">
                <select className="setting-select">
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
            </div>

            {/* API Keys Section */}
            <div className="setting-group api-keys-section">
              <div className="group-header">
                <h3>🔐 API Keys</h3>
                <p className="group-description">Configure authentication for your AI services</p>
              </div>

              <div className="api-providers">
                <div className="api-provider-card">
                  <div className="provider-header">
                    <span className="provider-icon">🤖</span>
                    <span className="provider-name">OpenAI</span>
                  </div>
                  <APIKeyInput
                    label=""
                    placeholder="sk-..."
                    hint="Get your API key from https://platform.openai.com/api-keys"
                    providerKey="openai"
                    onVerify={async (apiKey) => {
                      // Simulate API verification
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
                    <span className="provider-icon">💎</span>
                    <span className="provider-name">Google Gemini</span>
                  </div>
                  <APIKeyInput
                    label=""
                    placeholder="AIza..."
                    hint="Get your API key from https://aistudio.google.com/app/apikey"
                    providerKey="gemini"
                    onVerify={async (apiKey) => {
                      // Simulate API verification
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
          </div>
        );

      case 'backlog-keys':
        return (
          <div className="settings-section">
            <h2>Backlog API Keys</h2>
            <p>Configure your Backlog API credentials for enhanced features.</p>
            <div className="setting-item">
              <label className="setting-label">Backlog Space URL</label>
              <input type="text" className="setting-input" placeholder="https://your-space.backlog.com" />
            </div>
            <div className="setting-item">
              <label className="setting-label">API Key</label>
              <input type="password" className="setting-input" placeholder="Enter your Backlog API key" />
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="settings-section">
            <h2>Export Data</h2>
            <p>Export your extension data and settings.</p>
            <div className="export-options">
              <button className="export-button">
                📋 Export Chat History
              </button>
              <button className="export-button">
                ⚙️ Export Settings
              </button>
              <button className="export-button">
                📦 Export All Data
              </button>
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="options-container">
      <div className="options-header">
        <h1>Backlog AI Extension - Settings</h1>
      </div>

      <div className="options-layout">
        {/* Sidebar */}
        <div className="options-sidebar">
          <nav className="sidebar-nav">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="options-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;

// Explicit named export để ensure module recognition
export { OptionsPage };
