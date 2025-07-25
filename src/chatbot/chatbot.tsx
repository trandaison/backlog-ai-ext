import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatbotProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
}

interface BacklogSettings {
  backlogApiKey: string;
  backlogSpaceKey: string;
}

interface BacklogApiConfig {
  id: string;
  domain: string;
  spaceKey: string;
  apiKey: string;
}

interface BacklogMultiSettings {
  configs: BacklogApiConfig[];
}

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: BacklogMultiSettings;
  onSave: (settings: BacklogMultiSettings) => void;
}> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<BacklogMultiSettings>(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleAddConfig = () => {
    const newConfig: BacklogApiConfig = {
      id: Date.now().toString(),
      domain: '',
      spaceKey: '',
      apiKey: ''
    };
    setLocalSettings(prev => ({
      configs: [...prev.configs, newConfig]
    }));
  };

  const handleUpdateConfig = (id: string, field: keyof BacklogApiConfig, value: string) => {
    setLocalSettings(prev => ({
      configs: prev.configs.map(config =>
        config.id === id ? { ...config, [field]: value } : config
      )
    }));
  };

  const handleRemoveConfig = (id: string) => {
    setLocalSettings(prev => ({
      configs: prev.configs.filter(config => config.id !== id)
    }));
  };

  const validateConfig = (config: BacklogApiConfig) => {
    return config.domain && config.spaceKey && config.apiKey;
  };

  const handleSave = async () => {
    // Validate all configs
    const invalidConfigs = localSettings.configs.filter(config =>
      config.domain || config.spaceKey || config.apiKey // Has some data
    ).filter(config => !validateConfig(config));

    if (invalidConfigs.length > 0) {
      setMessage('❌ Vui lòng điền đầy đủ thông tin cho tất cả configs');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(localSettings);
      setMessage('✅ Đã lưu cài đặt thành công');
      setTimeout(() => {
        setMessage('');
        onClose();
      }, 1500);
    } catch (error) {
      setMessage('❌ Lỗi khi lưu cài đặt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '400px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>⚙️ Cài đặt Backlog API</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Backlog API Configurations:
            </label>
            <button
              onClick={handleAddConfig}
              style={{
                padding: '4px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              + Thêm
            </button>
          </div>

          {localSettings.configs.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              border: '2px dashed #ddd',
              borderRadius: '4px'
            }}>
              Chưa có cấu hình nào. Click "Thêm" để thêm Backlog API.
            </div>
          ) : (
            localSettings.configs.map((config, index) => (
              <div key={config.id} style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#666' }}>
                    Config #{index + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveConfig(config.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Domain:
                  </label>
                  <select
                    value={config.domain}
                    onChange={(e) => handleUpdateConfig(config.id, 'domain', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Chọn domain...</option>
                    <option value="backlog.com">.backlog.com</option>
                    <option value="backlog.jp">.backlog.jp</option>
                    <option value="backlogtool.com">.backlogtool.com</option>
                  </select>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Space Key:
                  </label>
                  <input
                    type="text"
                    value={config.spaceKey}
                    onChange={(e) => handleUpdateConfig(config.id, 'spaceKey', e.target.value)}
                    placeholder="your-space-key"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    API Key:
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => handleUpdateConfig(config.id, 'apiKey', e.target.value)}
                    placeholder="Nhập Backlog API key..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            ))
          )}

          <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '8px' }}>
            💡 Lấy API key từ: Backlog → Personal Settings → API
          </small>
        </div>

        {message && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            {message}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: '12px',
        backgroundColor: isUser ? '#007acc' : '#f1f3f4',
        color: isUser ? 'white' : '#333',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        <div>{message.content}</div>
        <div style={{
          fontSize: '11px',
          opacity: 0.7,
          marginTop: '4px'
        }}>
          {message.timestamp.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        padding: '8px 12px',
        borderRadius: '12px',
        backgroundColor: '#f1f3f4',
        color: '#333',
        fontSize: '14px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>AI đang trả lời</span>
          <div style={{
            display: 'flex',
            gap: '2px'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#666',
              animation: 'typing 1.5s ease-in-out infinite'
            }} />
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#666',
              animation: 'typing 1.5s ease-in-out infinite 0.2s'
            }} />
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#666',
              animation: 'typing 1.5s ease-in-out infinite 0.4s'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatbotComponent: React.FC<ChatbotProps> = ({ onSendMessage, messages }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backlogSettings, setBacklogSettings] = useState<BacklogMultiSettings>({
    configs: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    loadBacklogSettings();
  }, []);

  const loadBacklogSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(['backlogConfigs']);
      const configs = result.backlogConfigs || [];
      setBacklogSettings({ configs });
    } catch (error) {
      console.error('Error loading Backlog settings:', error);
    }
  };

  const saveBacklogSettings = async (settings: BacklogMultiSettings) => {
    try {
      await chrome.storage.sync.set({
        backlogConfigs: settings.configs
      });
      setBacklogSettings(settings);

      // Notify background script about updated settings
      chrome.runtime.sendMessage({
        action: 'updateBacklogSettings',
        data: settings
      });
    } catch (error) {
      console.error('Error saving Backlog settings:', error);
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Phân tích ticket này",
    "Đề xuất giải pháp",
    "Ước tính thời gian",
    "Rủi ro tiềm ẩn",
    "Best practices"
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'white'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#333'
            }}>
              AI Assistant
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                color: '#666',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cài đặt Backlog API"
            >
              ⚙️
            </button>
            <button
              onClick={() => {
                const container = document.getElementById('backlog-ai-chatbot-container');
                if (container) {
                  container.style.display = 'none';
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        maxHeight: '300px'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <p>👋 Xin chào! Tôi có thể giúp bạn phân tích ticket này.</p>
            <p>Hãy thử một số câu hỏi:</p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '12px'
            }}>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(question)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f8ff',
                    border: '1px solid #b3d9ff',
                    borderRadius: '16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#0066cc'
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: 'white'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Hỏi gì đó về ticket này..."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '14px',
              outline: 'none',
              resize: 'none'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: inputValue.trim() ? '#007acc' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Gửi
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={backlogSettings}
        onSave={saveBacklogSettings}
      />

      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

// Main chatbot app that handles message communication
const ChatbotApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Lắng nghe messages từ content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.source === 'backlog-ai-manager') {
        switch (event.data.action) {
          case 'messageAdded':
            setMessages(prev => [...prev, event.data.data]);
            break;
          case 'chatHistory':
            setMessages(event.data.data);
            break;
          case 'chatCleared':
            setMessages([]);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Request chat history on load
    window.postMessage({
      source: 'backlog-ai-chatbot',
      action: 'requestHistory'
    }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSendMessage = (message: string) => {
    // Gửi message đến content script
    window.postMessage({
      source: 'backlog-ai-chatbot',
      action: 'sendMessage',
      message
    }, '*');
  };

  return (
    <ChatbotComponent
      onSendMessage={handleSendMessage}
      messages={messages}
    />
  );
};

// Export component để có thể import
export { ChatbotComponent };
export default ChatbotApp;

// Initialize chatbot when the script loads
const initializeChatbot = () => {
  const container = document.getElementById('backlog-ai-chatbot-container');
  if (container) {
    const root = createRoot(container);
    root.render(<ChatbotApp />);
  }
};

// Wait for container to be available
const checkForContainer = () => {
  const container = document.getElementById('backlog-ai-chatbot-container');
  if (container) {
    initializeChatbot();
  } else {
    setTimeout(checkForContainer, 100);
  }
};

checkForContainer();
