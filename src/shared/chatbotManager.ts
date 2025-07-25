// Manager để điều khiển chatbot
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  ticketId: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export class ChatbotManager {
  private currentSession: ChatSession | null = null;
  private chatContainer: HTMLElement | null = null;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Lắng nghe messages từ background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'aiResponse') {
        this.handleAIResponse(message.data);
      }
    });

    // Lắng nghe messages từ chatbot component
    window.addEventListener('message', (event) => {
      if (event.data.source === 'backlog-ai-chatbot') {
        this.handleChatbotMessage(event.data);
      }
    });
  }

  createChatSession(ticketId: string): ChatSession {
    this.currentSession = {
      id: this.generateSessionId(),
      ticketId,
      messages: [],
      createdAt: new Date()
    };

    return this.currentSession;
  }

  addMessage(content: string, sender: 'user' | 'ai'): ChatMessage {
    if (!this.currentSession) {
      throw new Error('No active chat session');
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      content,
      sender,
      timestamp: new Date()
    };

    this.currentSession.messages.push(message);
    this.saveChatSession();

    return message;
  }

  sendUserMessage(content: string) {
    if (!this.currentSession) {
      throw new Error('No active chat session');
    }

    // Thêm message của user
    const userMessage = this.addMessage(content, 'user');

    // Gửi đến background script để xử lý AI
    chrome.runtime.sendMessage({
      action: 'processUserMessage',
      data: {
        sessionId: this.currentSession.id,
        ticketId: this.currentSession.ticketId,
        message: content,
        conversationHistory: this.currentSession.messages
      }
    });

    // Notify chatbot component
    this.notifyChatbotComponent('messageAdded', userMessage);
  }

  private handleAIResponse(data: any) {
    if (!this.currentSession) return;

    const aiMessage = this.addMessage(data.response, 'ai');
    this.notifyChatbotComponent('messageAdded', aiMessage);
  }

  private handleChatbotMessage(data: any) {
    switch (data.action) {
      case 'sendMessage':
        this.sendUserMessage(data.message);
        break;
      case 'requestHistory':
        this.sendChatHistory();
        break;
      case 'clearChat':
        this.clearChatSession();
        break;
    }
  }

  private notifyChatbotComponent(action: string, data?: any) {
    window.postMessage({
      source: 'backlog-ai-manager',
      action,
      data
    }, '*');
  }

  private sendChatHistory() {
    if (this.currentSession) {
      this.notifyChatbotComponent('chatHistory', this.currentSession.messages);
    }
  }

  private clearChatSession() {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.saveChatSession();
      this.notifyChatbotComponent('chatCleared');
    }
  }

  private saveChatSession() {
    if (this.currentSession) {
      chrome.storage.local.set({
        [`chatSession_${this.currentSession.id}`]: this.currentSession
      });
    }
  }

  loadChatSession(sessionId: string): Promise<ChatSession | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get([`chatSession_${sessionId}`], (result) => {
        const session = result[`chatSession_${sessionId}`];
        if (session) {
          this.currentSession = session;
          resolve(session);
        } else {
          resolve(null);
        }
      });
    });
  }

  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
