import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface Settings {
  apiKey: string;
  aiModel: string;
  language: string;
}

const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    aiModel: 'gpt-3.5-turbo',
    language: 'vi'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getApiKey' });
      if (response.apiKey) {
        setSettings(prev => ({
          ...prev,
          apiKey: response.apiKey
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings.apiKey.trim()) {
      setStatus('Vui lòng nhập API key');
      return;
    }

    setIsLoading(true);
    setStatus('Đang lưu...');

    try {
      await chrome.runtime.sendMessage({
        action: 'saveApiKey',
        data: { apiKey: settings.apiKey }
      });

      setStatus('Đã lưu thành công!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('Lỗi khi lưu cài đặt');
      console.error('Error saving settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!settings.apiKey.trim()) {
      setStatus('Vui lòng nhập API key trước');
      return;
    }

    setIsLoading(true);
    setStatus('Đang kiểm tra kết nối...');

    try {
      // Test với một request đơn giản
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        }
      });

      if (response.ok) {
        setStatus('Kết nối thành công!');
      } else {
        setStatus('Kết nối thất bại. Kiểm tra lại API key.');
      }
    } catch (error) {
      setStatus('Lỗi kết nối. Kiểm tra internet và API key.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatus(''), 3000);
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
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
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
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          Test
        </button>
      </div>

      {status && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: status.includes('thành công') || status.includes('successful') ? '#d4edda' :
                          status.includes('Lỗi') || status.includes('thất bại') ? '#f8d7da' : '#d1ecf1',
          color: status.includes('thành công') || status.includes('successful') ? '#155724' :
                 status.includes('Lỗi') || status.includes('thất bại') ? '#721c24' : '#0c5460',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '15px'
        }}>
          {status}
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
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
