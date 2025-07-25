// Content script chính để inject chatbot vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';

class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private chatbotContainer: HTMLElement | null = null;

  constructor() {
    this.ticketAnalyzer = new TicketAnalyzer();
    this.chatbotManager = new ChatbotManager();
    this.init();
  }

  private init() {
    console.log('Backlog AI Extension loaded');

    // Đợi DOM load xong
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupChatbot());
    } else {
      this.setupChatbot();
    }
  }

  private setupChatbot() {
    // Kiểm tra xem có phải trang ticket không
    if (this.isTicketPage()) {
      this.injectChatbot();
      this.analyzeTicket();
    }
  }

  private isTicketPage(): boolean {
    // Kiểm tra URL có chứa pattern của ticket page
    const url = window.location.href;
    return /\/view\/[A-Z]+-\d+/.test(url) || url.includes('/view/');
  }

  private injectChatbot() {
    // Tạo container cho chatbot
    this.chatbotContainer = document.createElement('div');
    this.chatbotContainer.id = 'backlog-ai-chatbot-container';
    this.chatbotContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      height: 500px;
      z-index: 10000;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
    `;

    // Tạo toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'backlog-ai-toggle';
    toggleButton.innerHTML = '🤖 AI';
    toggleButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      z-index: 10001;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    toggleButton.addEventListener('click', () => {
      this.toggleChatbot();
    });

    // Thêm vào DOM
    document.body.appendChild(this.chatbotContainer);
    document.body.appendChild(toggleButton);

    // Load chatbot React component
    this.loadChatbotComponent();
  }

  private toggleChatbot() {
    if (this.chatbotContainer) {
      const isVisible = this.chatbotContainer.style.display !== 'none';
      this.chatbotContainer.style.display = isVisible ? 'none' : 'block';
    }
  }

  private loadChatbotComponent() {
    // Tạo script tag để load chatbot component
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('chatbot.js');
    document.head.appendChild(script);

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('chatbot.css');
    document.head.appendChild(link);
  }

  private analyzeTicket() {
    try {
      const ticketData = this.ticketAnalyzer.extractTicketData();
      console.log('Ticket data extracted:', ticketData);

      // Gửi dữ liệu ticket đến background script để xử lý AI
      chrome.runtime.sendMessage({
        action: 'analyzeTicket',
        data: ticketData
      });
    } catch (error) {
      console.error('Error analyzing ticket:', error);
    }
  }
}

// Khởi tạo khi script load
new BacklogAIInjector();
