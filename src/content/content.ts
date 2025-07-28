// Content script chính để inject chatbot aside panel vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';

class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private chatbotAsideContainer: HTMLElement | null = null;
  private chatbotToggleButton: HTMLButtonElement | null = null;
  private isChatbotOpen: boolean = false;

  constructor() {
    this.ticketAnalyzer = new TicketAnalyzer();
    this.chatbotManager = new ChatbotManager();
    this.init();
  }

  private init() {
    // Use console.warn and console.error for debugging (less likely to be optimized away)
    console.warn('🚀 [DEBUG] Backlog AI Extension loaded - with DEBUG enabled');
    console.error('🔍 [DEBUG] Init method called - this is intentional error for debugging');

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
      this.injectChatbotAsidePanel();
      this.analyzeTicket();
    }
  }

  private isTicketPage(): boolean {
    // Kiểm tra URL có chứa pattern của ticket page
    const url = window.location.href;
    return /\/view\/[A-Z]+-\d+/.test(url) || url.includes('/view/');
  }

  private injectChatbotAsidePanel() {
    // Tìm container chính của Backlog
    const container = document.querySelector('#container');
    if (!container) {
      console.error('Backlog container not found');
      return;
    }

    // Tạo aside container cho chatbot panel
    this.chatbotAsideContainer = document.createElement('aside');
    this.chatbotAsideContainer.id = 'ai-ext-root';

    // Tạo nội dung bên trong chatbot aside panel
    const asideContent = document.createElement('div');
    asideContent.className = 'ai-ext-aside-content';

    // Tạo header với title và nút đóng chatbot panel
    const header = document.createElement('div');
    header.className = 'ai-ext-header';

    const title = document.createElement('h3');
    title.className = 'ai-ext-title';
    title.textContent = '🤖 AI Assistant';

    const closeButton = document.createElement('button');
    closeButton.className = 'ai-ext-close-button';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => this.closeChatbotPanel());

    header.appendChild(title);
    header.appendChild(closeButton);

    // Tạo summary button trong chatbot panel
    const summaryButton = document.createElement('button');
    summaryButton.className = 'ai-ext-summary-button';
    summaryButton.innerHTML = '📋 Summary nội dung ticket';
    summaryButton.addEventListener('click', () => this.handleTicketSummary());

    // Tạo khu vực hiển thị summary trong chatbot panel
    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'ai-ext-summary-container';
    summaryContainer.className = 'ai-ext-summary-content';

    // Tạo nội dung chatbot interaction area
    const chatbotContent = document.createElement('div');
    chatbotContent.id = 'backlog-ai-chatbot-container';
    chatbotContent.className = 'ai-ext-chatbot-content';

    asideContent.appendChild(header);
    asideContent.appendChild(summaryButton);
    asideContent.appendChild(summaryContainer);
    asideContent.appendChild(chatbotContent);
    this.chatbotAsideContainer.appendChild(asideContent);

    // Tạo toggle button để mở/đóng chatbot panel
    this.chatbotToggleButton = document.createElement('button');
    this.chatbotToggleButton.id = 'backlog-ai-toggle';

    // Tạo img element cho toggle button icon
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon.svg');
    iconImg.alt = 'AI Assistant';

    this.chatbotToggleButton.appendChild(iconImg);
    this.chatbotToggleButton.addEventListener('click', () => this.toggleChatbotPanel());

    // Thêm vào DOM
    container.appendChild(this.chatbotAsideContainer);
    document.body.appendChild(this.chatbotToggleButton);

    // Load chatbot React component vào chatbot panel
    this.loadChatbotComponent();
  }

  private toggleChatbotPanel() {
    if (this.chatbotAsideContainer) {
      const isVisible = this.chatbotAsideContainer.classList.contains('ai-ext-open');
      if (isVisible) {
        this.closeChatbotPanel();
      } else {
        this.openChatbotPanel();
      }
    }
  }

  private openChatbotPanel() {
    if (this.chatbotAsideContainer) {
      this.chatbotAsideContainer.classList.add('ai-ext-open');
      document.body.classList.add('ai-ext-sidebar-open');
      this.isChatbotOpen = true;
    }
  }

  private closeChatbotPanel() {
    if (this.chatbotAsideContainer) {
      this.chatbotAsideContainer.classList.remove('ai-ext-open');
      document.body.classList.remove('ai-ext-sidebar-open');
      this.isChatbotOpen = false;
    }
  }

  private async loadChatbotComponent() {
    const chatbotContainer = document.getElementById('backlog-ai-chatbot-container');
    if (!chatbotContainer) {
      console.error('Chatbot container not found in aside panel');
      return;
    }

    try {
      // Import và render React chatbot component vào aside panel
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

  // Public getter for ticket analyzer
  getTicketAnalyzer(): TicketAnalyzer {
    return this.ticketAnalyzer;
  }

  private async handleTicketSummary() {
    const summaryContainer = document.getElementById('ai-ext-summary-container');
    const summaryButton = document.querySelector('.ai-ext-summary-button') as HTMLButtonElement;

    if (!summaryContainer || !summaryButton) {
      console.error('Summary container or button not found');
      return;
    }

    try {
      // Disable button and show loading
      summaryButton.disabled = true;
      summaryButton.innerHTML = '⏳ Đang tạo summary...';

      // Clear previous content
      summaryContainer.innerHTML = `
        <div class="ai-ext-loading">
          <div class="ai-ext-spinner"></div>
          <p>AI đang phân tích ticket...</p>
        </div>
      `;

      // Load Backlog settings first
      const backlogSettings = await this.getBacklogSettings();
      console.warn('🔎 [DEBUG] BacklogAIInjector ~ handleTicketSummary ~ backlogSettings:', backlogSettings);
      console.warn('🔎 [DEBUG] BacklogAIInjector ~ handleTicketSummary ~ configs:', backlogSettings.configs);
      console.warn('🔎 [DEBUG] BacklogAIInjector ~ handleTicketSummary ~ current URL:', window.location.href);

      if (backlogSettings.configs && backlogSettings.configs.length > 0) {
        console.warn('🔎 [DEBUG] Updating ticketAnalyzer with settings...');
        this.ticketAnalyzer.updateBacklogSettings(backlogSettings);
      } else {
        console.error('⚠️ [DEBUG] No Backlog configs found in settings');
      }

      // Extract ticket data
      const ticketData = await this.ticketAnalyzer.extractTicketData();
      console.warn('🔎 [DEBUG] BacklogAIInjector ~ handleTicketSummary ~ ticketData:', ticketData);

      if (!ticketData || !ticketData.id) {
        throw new Error('Không thể trích xuất thông tin ticket');
      }

      // Send request to background script for AI summary
      const response = await this.requestAISummary(ticketData);

      // Display the summary
      this.displaySummary(response.summary || response.response);

    } catch (error) {
      console.error('Error getting ticket summary:', error);
      this.displayError(String(error));
    } finally {
      // Re-enable button
      summaryButton.disabled = false;
      summaryButton.innerHTML = '📋 Summary nội dung ticket';
    }
  }

  private async requestAISummary(ticketData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'requestTicketSummary',
        data: {
          ticketId: ticketData.id,
          ticketData: ticketData
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  private displaySummary(summary: string) {
    const summaryContainer = document.getElementById('ai-ext-summary-container');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="ai-ext-summary-result">
        <div class="ai-ext-summary-header">
          <span class="ai-ext-summary-icon">📋</span>
          <h4>Tóm tắt ticket</h4>
          <button class="ai-ext-clear-button" onclick="this.parentElement.parentElement.parentElement.innerHTML = ''">✕</button>
        </div>
        <div class="ai-ext-summary-content">
          ${this.formatSummaryContent(summary)}
        </div>
        <div class="ai-ext-summary-footer">
          <small>Được tạo bởi AI • ${new Date().toLocaleString('vi-VN')}</small>
        </div>
      </div>
    `;
  }

  private displayError(error: string) {
    const summaryContainer = document.getElementById('ai-ext-summary-container');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="ai-ext-summary-error">
        <div class="ai-ext-error-icon">⚠️</div>
        <div class="ai-ext-error-message">
          <strong>Lỗi khi tạo summary:</strong>
          <p>${error}</p>
        </div>
        <button class="ai-ext-retry-button" onclick="this.parentElement.parentElement.innerHTML = ''">Thử lại</button>
      </div>
    `;
  }

  private formatSummaryContent(content: string): string {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>');
  }
}

// Khởi tạo khi script load
const injector = new BacklogAIInjector();

// Expose ticket extraction function globally for background script access
(window as any).extractTicketData = async () => {
  try {
    return await injector.getTicketAnalyzer().extractTicketData();
  } catch (error) {
    console.error('Error extracting ticket data:', error);
    return null;
  }
};
