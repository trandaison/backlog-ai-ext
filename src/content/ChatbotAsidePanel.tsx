import React, { useState, useEffect, useRef } from 'react';
import { TicketAnalyzer, TicketData } from '../shared/ticketAnalyzer';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatbotAsidePanelProps {
  ticketAnalyzer: TicketAnalyzer;
  onClose: () => void;
}

const ChatbotAsidePanel: React.FC<ChatbotAsidePanelProps> = ({ ticketAnalyzer, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load ticket data when component mounts
    loadTicketData();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicketData = async () => {
    try {
      const data = await ticketAnalyzer.extractTicketData();
      setTicketData(data);
      console.log('🎯 [ChatbotAsidePanel] Loaded ticket data:', data);
    } catch (error) {
      console.error('Error loading ticket data:', error);
    }
  };

  const handleTicketSummary = async () => {
    if (!ticketData) {
      setSummaryError('Không thể tìm thấy thông tin ticket');
      return;
    }

    try {
      setIsLoadingSummary(true);
      setSummaryError('');
      setSummaryContent('');

      console.log('🔄 [ChatbotAsidePanel] Requesting summary for ticket:', ticketData.id);

      // Request summary via postMessage to content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'SUMMARY_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ summary: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'REQUEST_SUMMARY',
          id: messageId,
          ticketId: ticketData.id,
          ticketData: ticketData
        }, '*');

        // Timeout
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for summary response'));
        }, 30000);
      });

      setSummaryContent(response.summary || response.response);
      console.log('✅ [ChatbotAsidePanel] Summary received:', response);

    } catch (error) {
      console.error('Error getting ticket summary:', error);
      setSummaryError(String(error));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSuggestionClick = (type: 'summary' | 'explain' | 'translate') => {
    console.log('🎯 [ChatbotAsidePanel] Suggestion clicked:', type);

    // Messages for each suggestion type - these will appear as user messages in chat
    const suggestionMessages = {
      summary: 'Tóm tắt nội dung',
      explain: 'Giải thích yêu cầu ticket',
      translate: 'Dịch nội dung ticket'
    };

    // Send the suggestion as a message
    handleSendMessage(suggestionMessages[type]);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      // Send message via postMessage to content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'CHAT_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ response: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'CHAT_MESSAGE',
          id: messageId,
          message: message,
          ticketData: ticketData,
          chatHistory: messages
        }, '*');

        // Timeout
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for chat response'));
        }, 30000);
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Lỗi: ${error}`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearSummary = () => {
    setSummaryContent('');
    setSummaryError('');
  };

  const formatMessageContent = (content: string): string => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>');
  };

  return (
    <div className="ai-ext-aside-content">
      {/* Header */}
      <div className="ai-ext-header">
        <h3 className="ai-ext-title">🤖 AI Assistant</h3>
        <button
          className="ai-ext-close-button"
          onClick={onClose}
          title="Đóng chatbot"
        >
          ✕
        </button>
      </div>

      {/* Ticket Info */}
      {ticketData && (
        <div className="ai-ext-ticket-info">
          <div className="ai-ext-ticket-title">
            <strong>{ticketData.id}</strong>: {ticketData.title}
          </div>
          <div className="ai-ext-ticket-meta">
            <span className="ai-ext-status">{ticketData.status}</span>
            {ticketData.assignee && (
              <span className="ai-ext-assignee">👤 {ticketData.assignee}</span>
            )}
            {ticketData.priority && (
              <span className="ai-ext-priority">⚡ {ticketData.priority}</span>
            )}
          </div>
        </div>
      )}

      {/* Chat Section */}
      <div className="ai-ext-chatbot-content">
        <div className="ai-ext-chat-header">
          <h4>💬 Chat với AI</h4>
        </div>

        {/* Messages */}
        <div className="ai-ext-messages-container">
          {messages.length === 0 ? (
            <div className="ai-ext-welcome-message">
              <p>👋 Xin chào! Tôi có thể giúp bạn phân tích ticket này.</p>
              <p>Hãy hỏi tôi bất cứ điều gì về ticket!</p>

              {/* Suggestion buttons */}
              <div className="ai-ext-suggestion-buttons">
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('summary')}
                  disabled={isTyping}
                >
                  📝 Tóm tắt nội dung
                </button>
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('explain')}
                  disabled={isTyping}
                >
                  💡 Giải thích yêu cầu ticket
                </button>
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('translate')}
                  disabled={isTyping}
                >
                  🌍 Dịch nội dung ticket
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`ai-ext-message ai-ext-message-${message.sender}`}
              >
                <div className="ai-ext-message-avatar">
                  {message.sender === 'user' ? '👤' : '🤖'}
                </div>
                <div className="ai-ext-message-content">
                  <div
                    className="ai-ext-message-text"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                  />
                  <div className="ai-ext-message-time">
                    {message.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="ai-ext-message ai-ext-message-ai">
              <div className="ai-ext-message-avatar">🤖</div>
              <div className="ai-ext-message-content">
                <div className="ai-ext-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="ai-ext-chat-input-container">
          <div className="ai-ext-chat-input-wrapper">
            <input
              type="text"
              className="ai-ext-chat-input"
              placeholder="Nhập câu hỏi về ticket..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(currentMessage);
                }
              }}
              disabled={isTyping}
            />
            <button
              className="ai-ext-send-button"
              onClick={() => handleSendMessage(currentMessage)}
              disabled={!currentMessage.trim() || isTyping}
            >
              {isTyping ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotAsidePanel;
