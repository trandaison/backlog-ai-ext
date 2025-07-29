import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EncryptionService } from '../shared/encryption';

interface BacklogApiConfig {
  id: string;
  domain: string;
  spaceName: string;
  apiKey: string;
  description?: string;
}

interface Settings {
  apiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
  backlogConfigs: BacklogApiConfig[];
  geminiApiKey?: string;
  preferredProvider?: 'openai' | 'gemini';
}

interface StoredSettings {
  encryptedApiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
  backlogConfigs?: BacklogApiConfig[];
  encryptedGeminiApiKey?: string;
  preferredProvider?: 'openai' | 'gemini';
}

const PopupApp: React.FC = () => {
  console.log('PopupApp component rendering...');

  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    userRole: 'developer',
    language: 'vi',
    aiModel: 'gpt-3.5-turbo',
    backlogConfigs: [],
    geminiApiKey: '',
    preferredProvider: 'openai'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [showBacklogSection, setShowBacklogSection] = useState(false);
  const [editingBacklogConfig, setEditingBacklogConfig] = useState<BacklogApiConfig | null>(null);
  const [showBacklogApiKey, setShowBacklogApiKey] = useState<{[key: string]: boolean}>({});

  // Load settings từ storage khi component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get([
        'encryptedApiKey',
        'encryptedGeminiApiKey',
        'preferredProvider',
        'userRole',
        'language',
        'aiModel',
        'backlogConfigs'
      ]);

      const storedSettings: StoredSettings = {
        encryptedApiKey: result.encryptedApiKey || '',
        encryptedGeminiApiKey: result.encryptedGeminiApiKey || '',
        preferredProvider: result.preferredProvider || 'openai',
        userRole: result.userRole || 'developer',
        language: result.language || 'vi',
        aiModel: result.aiModel || 'gpt-3.5-turbo',
        backlogConfigs: result.backlogConfigs || []
      };

      // Decrypt API keys if they exist
      let decryptedApiKey = '';
      let decryptedGeminiApiKey = '';

      if (storedSettings.encryptedApiKey) {
        try {
          decryptedApiKey = await EncryptionService.decryptApiKey(storedSettings.encryptedApiKey);
        } catch (error) {
          console.error('Failed to decrypt OpenAI API key:', error);
          showMessage('Lỗi khi giải mã OpenAI API key. Vui lòng nhập lại.', 'error');
        }
      }

      if (storedSettings.encryptedGeminiApiKey) {
        try {
          decryptedGeminiApiKey = await EncryptionService.decryptApiKey(storedSettings.encryptedGeminiApiKey);
        } catch (error) {
          console.error('Failed to decrypt Gemini API key:', error);
          showMessage('Lỗi khi giải mã Gemini API key. Vui lòng nhập lại.', 'error');
        }
      }

      // Migrate old Gemini models to new ones
      let migratedAiModel = storedSettings.aiModel;
      if (storedSettings.preferredProvider === 'gemini') {
        const oldGeminiModels = ['gemini-pro', 'gemini-pro-vision'];
        if (oldGeminiModels.includes(storedSettings.aiModel)) {
          migratedAiModel = 'gemini-2.5-flash'; // Default new model
          console.log(`Migrated old Gemini model ${storedSettings.aiModel} to ${migratedAiModel}`);
        }
      }

      setSettings({
        apiKey: decryptedApiKey,
        geminiApiKey: decryptedGeminiApiKey,
        preferredProvider: storedSettings.preferredProvider,
        userRole: storedSettings.userRole,
        language: storedSettings.language,
        aiModel: migratedAiModel,
        backlogConfigs: storedSettings.backlogConfigs || []
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Lỗi khi tải cài đặt', 'error');
    }
  };  const saveSettings = async () => {
    // Validate based on preferred provider
    if (settings.preferredProvider === 'openai') {
      if (!settings.apiKey.trim()) {
        showMessage('Vui lòng nhập OpenAI API key', 'error');
        return;
      }
      if (!EncryptionService.validateApiKey(settings.apiKey)) {
        showMessage('OpenAI API key không đúng định dạng. API key phải bắt đầu bằng "sk-"', 'error');
        return;
      }
    } else if (settings.preferredProvider === 'gemini') {
      if (!settings.geminiApiKey?.trim()) {
        showMessage('Vui lòng nhập Gemini API key', 'error');
        return;
      }
      // Gemini API keys start with "AI" followed by letters/numbers
      if (!settings.geminiApiKey.match(/^AI[a-zA-Z0-9_-]+$/)) {
        showMessage('Gemini API key không đúng định dạng', 'error');
        return;
      }
    }

    setIsLoading(true);
    showMessage('Đang lưu...', 'success');

    try {
      // Encrypt API keys before storing
      const dataToStore: StoredSettings = {
        encryptedApiKey: '',
        encryptedGeminiApiKey: '',
        preferredProvider: settings.preferredProvider,
        userRole: settings.userRole,
        language: settings.language,
        aiModel: settings.aiModel,
        backlogConfigs: settings.backlogConfigs
      };

      // Encrypt OpenAI API key if provided
      if (settings.apiKey.trim()) {
        dataToStore.encryptedApiKey = await EncryptionService.encryptApiKey(settings.apiKey);
      }

      // Encrypt Gemini API key if provided
      if (settings.geminiApiKey?.trim()) {
        dataToStore.encryptedGeminiApiKey = await EncryptionService.encryptApiKey(settings.geminiApiKey);
      }

      await chrome.storage.sync.set(dataToStore);

      showMessage('Đã lưu thành công!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Lỗi khi lưu cài đặt', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    // Check API key based on selected provider
    if (settings.preferredProvider === 'openai') {
      if (!settings.apiKey.trim()) {
        showMessage('Vui lòng nhập OpenAI API key trước', 'error');
        return;
      }
    } else if (settings.preferredProvider === 'gemini') {
      if (!settings.geminiApiKey?.trim()) {
        showMessage('Vui lòng nhập Gemini API key trước', 'error');
        return;
      }
    }

    setIsValidatingKey(true);
    showMessage('Đang kiểm tra kết nối...', 'success');

    try {
      if (settings.preferredProvider === 'openai') {
        // Test OpenAI connection
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          showMessage('Kết nối OpenAI thành công!', 'success');
        } else {
          showMessage('Kết nối OpenAI thất bại. Kiểm tra lại API key.', 'error');
        }
      } else if (settings.preferredProvider === 'gemini') {
        // Test Gemini connection
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${settings.geminiApiKey}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          showMessage('Kết nối Gemini thành công!', 'success');
        } else {
          showMessage('Kết nối Gemini thất bại. Kiểm tra lại API key.', 'error');
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      showMessage('Lỗi kết nối. Kiểm tra internet và API key.', 'error');
    } finally {
      setIsValidatingKey(false);
    }
  };

  const openBacklogTab = async () => {
    try {
      // Mở tab mới với trang Backlog
      await chrome.tabs.create({
        url: 'https://backlog.com',
        active: true
      });
    } catch (error) {
      console.error('Error opening Backlog tab:', error);
    }
  };

  // Backlog API Config Management
  const addBacklogConfig = () => {
    const newConfig: BacklogApiConfig = {
      id: Date.now().toString(),
      domain: 'backlog.com',
      spaceName: '',
      apiKey: '',
      description: ''
    };
    setEditingBacklogConfig(newConfig);
  };

  const editBacklogConfig = (config: BacklogApiConfig) => {
    setEditingBacklogConfig({ ...config });
  };

  const deleteBacklogConfig = (configId: string) => {
    if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      setSettings(prev => ({
        ...prev,
        backlogConfigs: prev.backlogConfigs.filter(c => c.id !== configId)
      }));
    }
  };

  const saveBacklogConfig = () => {
    if (!editingBacklogConfig) return;

    const { spaceName, apiKey, domain } = editingBacklogConfig;

    // Validate inputs
    if (!spaceName.trim() || !apiKey.trim()) {
      showMessage('Vui lòng nhập đầy đủ Space Name và API Key', 'error');
      return;
    }

    if (!EncryptionService.validateBacklogSpaceName(spaceName)) {
      showMessage('Space Name không đúng định dạng (3-30 ký tự, chỉ chữ, số và dấu gạch ngang)', 'error');
      return;
    }

    if (!EncryptionService.validateBacklogApiKey(apiKey)) {
      showMessage('Backlog API Key không đúng định dạng (20-80 ký tự, chỉ chữ và số)', 'error');
      return;
    }

    setSettings(prev => {
      const existingIndex = prev.backlogConfigs.findIndex(c => c.id === editingBacklogConfig.id);
      let newConfigs;

      if (existingIndex >= 0) {
        // Update existing
        newConfigs = [...prev.backlogConfigs];
        newConfigs[existingIndex] = editingBacklogConfig;
      } else {
        // Add new
        newConfigs = [...prev.backlogConfigs, editingBacklogConfig];
      }

      return {
        ...prev,
        backlogConfigs: newConfigs
      };
    });

    setEditingBacklogConfig(null);
    showMessage('Đã lưu cấu hình Backlog!', 'success');
  };

  const cancelEditBacklogConfig = () => {
    setEditingBacklogConfig(null);
  };

  const testBacklogConnection = async (config: BacklogApiConfig) => {
    if (!config.spaceName || !config.apiKey) {
      showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }

    // Validate before testing
    if (!EncryptionService.validateBacklogSpaceName(config.spaceName)) {
      showMessage('Space Name không hợp lệ', 'error');
      return;
    }

    if (!EncryptionService.validateBacklogApiKey(config.apiKey)) {
      showMessage('API Key không hợp lệ', 'error');
      return;
    }

    try {
      showMessage('Đang test kết nối Backlog...', 'success');

      // Use background script to test connection (avoid CORS issues)
      const testConfig = {
        ...config,
        spaceName: config.spaceName // background script expects spaceName
      };

      const response = await chrome.runtime.sendMessage({
        action: 'testBacklogConnection',
        data: testConfig
      });

      if (response.success) {
        showMessage(`✅ ${response.message}`, 'success');
      } else {
        showMessage(`❌ ${response.message}`, 'error');
      }
    } catch (error) {
      console.error('Backlog connection test failed:', error);
      showMessage('❌ Lỗi kết nối với background script.', 'error');
    }
  };

  const toggleBacklogApiKeyVisibility = (configId: string) => {
    setShowBacklogApiKey(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  // Get available models based on selected provider
  const getAvailableModels = () => {
    if (settings.preferredProvider === 'gemini') {
      return [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' }
      ];
    } else {
      return [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' }
      ];
    }
  };

  // Update model when provider changes
  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    const defaultModels = {
      openai: 'gpt-3.5-turbo',
      gemini: 'gemini-2.5-flash'
    };

    setSettings(prev => ({
      ...prev,
      preferredProvider: provider,
      aiModel: defaultModels[provider]
    }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{
          margin: '0 0 10px 0',
          fontSize: '18px',
          color: '#333'
        }}>
          🤖 Backlog AI Assistant
        </h2>
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#666'
        }}>
          AI-powered assistant for Backlog tickets
        </p>
      </div>

      {/* AI Provider Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          🤖 AI Provider:
        </label>
        <select
          value={settings.preferredProvider}
          onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'gemini')}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        >
          <option value="openai">OpenAI (GPT Models)</option>
          <option value="gemini">Google Gemini</option>
        </select>
        <small style={{ color: '#666', fontSize: '11px' }}>
          Chọn nhà cung cấp AI cho chatbot
        </small>
      </div>

      {/* OpenAI API Key - only show when OpenAI is selected */}
      {settings.preferredProvider === 'openai' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            OpenAI API Key:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                apiKey: e.target.value
              }))}
              placeholder="sk-..."
              style={{
                width: '100%',
                padding: '8px 40px 8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          <small style={{ color: '#666', fontSize: '11px' }}>
            API key sẽ được lưu trữ cục bộ và an toàn
          </small>
        </div>
      )}

      {/* Gemini API Key - only show when Gemini is selected */}
      {settings.preferredProvider === 'gemini' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Gemini API Key:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showGeminiApiKey ? 'text' : 'password'}
              value={settings.geminiApiKey || ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                geminiApiKey: e.target.value
              }))}
              placeholder="AI..."
              style={{
                width: '100%',
                padding: '8px 40px 8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showGeminiApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          <small style={{ color: '#666', fontSize: '11px' }}>
            Lấy API key từ Google AI Studio
          </small>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          AI Model:
        </label>
        <select
          value={settings.aiModel}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            aiModel: e.target.value
          }))}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        >
          {getAvailableModels().map(model => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Ngôn ngữ:
        </label>
        <select
          value={settings.language}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            language: e.target.value
          }))}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Vai trò của bạn:
        </label>
        <select
          value={settings.userRole}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            userRole: e.target.value
          }))}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        >
          <option value="developer">Developer/Engineer</option>
          <option value="pm">Project Manager</option>
          <option value="qa">QA/Testing</option>
          <option value="designer">Designer</option>
          <option value="devops">DevOps</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Backlog API Configuration Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            margin: 0
          }}>
            🔑 Backlog API Configs
          </label>
          <button
            onClick={() => setShowBacklogSection(!showBacklogSection)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#007acc'
            }}
          >
            {showBacklogSection ? '▼ Thu gọn' : '▶ Mở rộng'}
          </button>
        </div>

        {showBacklogSection && (
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <small style={{ color: '#666', fontSize: '11px' }}>
                Quản lý API keys cho các workspace Backlog
              </small>
              <button
                onClick={addBacklogConfig}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                + Thêm
              </button>
            </div>

            {/* List existing configs */}
            {settings.backlogConfigs.map((config) => (
              <div key={config.id} style={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>
                      {config.spaceName}.{config.domain}
                    </div>
                    {config.description && (
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {config.description}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      API: {config.apiKey ? '••••••••' : 'Chưa có'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => testBacklogConnection(config)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px'
                      }}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => editBacklogConfig(config)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px'
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => deleteBacklogConfig(config.id)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px'
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {settings.backlogConfigs.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '11px',
                padding: '20px 0'
              }}>
                Chưa có cấu hình nào. Click "Thêm" để bắt đầu.
              </div>
            )}
          </div>
        )}

        {/* Edit/Add Config Modal */}
        {editingBacklogConfig && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '300px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                {editingBacklogConfig.spaceName ? 'Chỉnh sửa' : 'Thêm'} Backlog Config
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Domain:
                </label>
                <select
                  value={editingBacklogConfig.domain}
                  onChange={(e) => setEditingBacklogConfig(prev => prev ? {
                    ...prev,
                    domain: e.target.value
                  } : null)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="backlog.com">backlog.com</option>
                  <option value="backlog.jp">backlog.jp</option>
                  <option value="backlogtool.com">backlogtool.com</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Space Name:
                </label>
                <input
                  type="text"
                  value={editingBacklogConfig.spaceName}
                  onChange={(e) => setEditingBacklogConfig(prev => prev ? {
                    ...prev,
                    spaceName: e.target.value
                  } : null)}
                  placeholder="your-space-name"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Personal API Key:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showBacklogApiKey[editingBacklogConfig.id] ? 'text' : 'password'}
                    value={editingBacklogConfig.apiKey}
                    onChange={(e) => setEditingBacklogConfig(prev => prev ? {
                      ...prev,
                      apiKey: e.target.value
                    } : null)}
                    placeholder="Nhập Personal API Key"
                    style={{
                      width: '100%',
                      padding: '6px 30px 6px 6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleBacklogApiKeyVisibility(editingBacklogConfig.id)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    {showBacklogApiKey[editingBacklogConfig.id] ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Mô tả (tuỳ chọn):
                </label>
                <input
                  type="text"
                  value={editingBacklogConfig.description || ''}
                  onChange={(e) => setEditingBacklogConfig(prev => prev ? {
                    ...prev,
                    description: e.target.value
                  } : null)}
                  placeholder="VD: Project ABC, Team XYZ..."
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={cancelEditBacklogConfig}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => testBacklogConnection(editingBacklogConfig)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Test
                </button>
                <button
                  onClick={saveBacklogConfig}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '15px'
      }}>
        <button
          onClick={saveSettings}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>

        <button
          onClick={testConnection}
          disabled={isValidatingKey || isLoading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isValidatingKey || isLoading) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (isValidatingKey || isLoading) ? 0.6 : 1
          }}
        >
          {isValidatingKey ? 'Đang test...' : 'Test kết nối'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '15px'
        }}>
          {message}
        </div>
      )}

      <div style={{
        borderTop: '1px solid #eee',
        paddingTop: '15px',
        marginTop: '15px'
      }}>
        <button
          onClick={openBacklogTab}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📋 Mở Backlog
        </button>
      </div>

      <div style={{
        marginTop: '15px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0' }}>
          Hướng dẫn: Mở ticket bất kỳ trên Backlog,<br/>
          click nút AI 🤖 để bắt đầu chat
        </p>
      </div>
    </div>
  );
};

// Render the popup
console.log('Popup script loaded');
const container = document.getElementById('popup-root');
console.log('Container element:', container);

if (container) {
  console.log('Creating React root...');
  const root = createRoot(container);
  console.log('Rendering PopupApp...');
  root.render(<PopupApp />);
  console.log('PopupApp rendered successfully');
} else {
  console.error('popup-root element not found!');
}
