// Content script chính để inject chatbot vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';

class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private asideContainer: HTMLElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private isOpen: boolean = false;

  constructor() {
    this.ticketAnalyzer = new TicketAnalyzer();
    this.chatbotManager = new ChatbotManager();
    this.init();
  }

  private init() {
    console.log('Backlog AI Extension loaded');

    // Load sidebar CSS
    this.loadSidebarCSS();

    // Kiểm tra xem có phải là trang ticket không
    if (this.isTicketPage()) {
      this.setupChatbot();
    }
  }

  private loadSidebarCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('sidebar-styles.css');
    document.head.appendChild(link);
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
    // Tìm container chính của Backlog
    const container = document.querySelector('#container');
    if (!container) {
      console.error('Backlog container not found');
      return;
    }

    // Tạo aside container cho chatbot
    this.asideContainer = document.createElement('aside');
    this.asideContainer.id = 'ai-ext-root';

    // Tạo nội dung bên trong aside
    const asideContent = document.createElement('div');
    asideContent.className = 'ai-ext-aside-content';

    // Tạo header với nút đóng
    const header = document.createElement('div');
    header.className = 'ai-ext-header';

    const title = document.createElement('h3');
    title.className = 'ai-ext-title';
    title.textContent = '🤖 AI Assistant';

    const closeButton = document.createElement('button');
    closeButton.className = 'ai-ext-close-button';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => this.closeChatbot());

    header.appendChild(title);
    header.appendChild(closeButton);

    // Tạo nội dung chatbot
    const chatbotContent = document.createElement('div');
    chatbotContent.id = 'backlog-ai-chatbot-container';
    chatbotContent.className = 'ai-ext-chatbot-content';

    asideContent.appendChild(header);
    asideContent.appendChild(chatbotContent);
    this.asideContainer.appendChild(asideContent);

    // Tạo toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'backlog-ai-toggle';

    // Tạo img element cho icon
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon.svg');
    iconImg.alt = 'AI Assistant';

    this.toggleButton.appendChild(iconImg);
    this.toggleButton.addEventListener('click', () => this.toggleChatbot());

    // Thêm vào DOM
    container.appendChild(this.asideContainer);
    document.body.appendChild(this.toggleButton);

    // Load chatbot React component
    this.loadChatbotComponent();
  }

  private toggleChatbot() {
    if (this.asideContainer) {
      const isVisible = this.asideContainer.classList.contains('ai-ext-open');
      if (isVisible) {
        this.closeChatbot();
      } else {
        this.openChatbot();
      }
    }
  }

  private openChatbot() {
    if (this.asideContainer) {
      this.asideContainer.classList.add('ai-ext-open');
      document.body.classList.add('ai-ext-sidebar-open');
      this.isOpen = true;
    }
  }

  private closeChatbot() {
    if (this.asideContainer) {
      this.asideContainer.classList.remove('ai-ext-open');
      document.body.classList.remove('ai-ext-sidebar-open');
      this.isOpen = false;
    }
  }

  private async loadChatbotComponent() {
    const chatbotContainer = document.getElementById('backlog-ai-chatbot-container');
    if (!chatbotContainer) {
      console.error('Chatbot container not found');
      return;
    }

    try {
      // Import và render React component
      const { default: React } = await import('react');
      const { createRoot } = await import('react-dom/client');
      const { default: ChatbotApp } = await import('../chatbot/chatbot');

      // Extract ticket data
      const ticketData = this.ticketAnalyzer.extractTicketData();

      const root = createRoot(chatbotContainer);
      root.render(React.createElement(ChatbotApp));

    } catch (error) {
      console.error('Failed to load chatbot component:', error);
      chatbotContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>⚠️ Không thể tải AI Chatbot</p>
          <p style="font-size: 12px;">Vui lòng reload trang để thử lại</p>
        </div>
      `;
    }
  }

  private async analyzeTicket() {
    try {
      // Load Backlog settings first
      const backlogSettings = await this.getBacklogSettings();
      if (backlogSettings.configs && backlogSettings.configs.length > 0) {
        this.ticketAnalyzer.updateBacklogSettings(backlogSettings);
      }

      const ticketData = await this.ticketAnalyzer.extractTicketData();

      if (ticketData.id) {
        // Send ticket data to background for analysis
        chrome.runtime.sendMessage({
          action: 'analyzeTicket',
          data: ticketData
        });
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error);
    }
  }

  private async getBacklogSettings(): Promise<{ configs: any[] }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getBacklogSettings'
      }, (response) => {
        resolve(response || { configs: [] });
      });
    });
  }
}

// Khởi tạo khi script load
new BacklogAIInjector();
