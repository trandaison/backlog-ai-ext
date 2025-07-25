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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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
