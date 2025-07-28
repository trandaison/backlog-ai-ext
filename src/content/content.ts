// Content script chính để inject chatbot aside panel vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';

class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private chatbotAsideContainer: HTMLElement | null = null;
  private chatbotToggleButton: HTMLButtonElement | null = null;
  private isChatbotOpen: boolean = false;
  private reactRoot: any = null; // React root for cleanup

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
    this.chatbotAsideContainer.id = 'ai-ext-chatbot-aside';
    this.chatbotAsideContainer.className = 'ai-ext-root';

    // Tạo toggle button để mở/đóng chatbot panel
    this.chatbotToggleButton = document.createElement('button');
    this.chatbotToggleButton.className = 'backlog-ai-toggle';

    // Tạo img element cho toggle button icon
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon.svg');
    iconImg.alt = 'AI Assistant';

    this.chatbotToggleButton.appendChild(iconImg);
    this.chatbotToggleButton.addEventListener('click', () => this.toggleChatbotPanel());

    // Thêm vào DOM
    container.appendChild(this.chatbotAsideContainer);
    document.body.appendChild(this.chatbotToggleButton);

    // Load React chatbot component vào chatbot panel
    this.loadReactChatbotComponent();
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

  private async loadReactChatbotComponent() {
    if (!this.chatbotAsideContainer) {
      console.error('Chatbot container not found');
      return;
    }

    try {
      // Load Backlog settings first
      const backlogSettings = await this.getBacklogSettings();
      if (backlogSettings.configs && backlogSettings.configs.length > 0) {
        this.ticketAnalyzer.updateBacklogSettings(backlogSettings);
      }

      // Load React and ChatbotAsidePanel from main world
      await this.loadChatbotAsidePanelScript();

      // Use postMessage to create component in main world
      await this.createComponentInMainWorld();

      console.log('✅ [ContentScript] React ChatbotAsidePanel loaded successfully');

    } catch (error) {
      console.error('Failed to load React chatbot component:', error);
      // Fallback UI
      this.chatbotAsideContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>⚠️ Không thể tải AI Chatbot</p>
          <p style="font-size: 12px;">Vui lòng reload trang để thử lại</p>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px;">
            🔄 Reload trang
          </button>
        </div>
      `;
    }
  }

  private async loadChatbotAsidePanelScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded using postMessage communication
      this.checkComponentsReady().then(resolve).catch(() => {

        // Set up message listener for component loading
        const messageHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'REACT_COMPONENTS_LOADED') {
            console.log('🎯 [ContentScript] Received components loaded message');
            window.removeEventListener('message', messageHandler);

            // Small delay then check components
            setTimeout(() => {
              this.checkComponentsReady().then(resolve).catch(reject);
            }, 100);
          }
        };

        window.addEventListener('message', messageHandler);

        // Inject scripts into main world using chrome.scripting API
        this.injectMainWorldScripts().then(() => {
          console.log('🔧 [ContentScript] Scripts injected to main world');
        }).catch((error) => {
          console.error('❌ [ContentScript] Failed to inject scripts:', error);
          window.removeEventListener('message', messageHandler);
          reject(error);
        });

        // Fallback timeout
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Timeout waiting for React components to load'));
        }, 15000);
      });
    });
  }

  private async injectMainWorldScripts(): Promise<void> {
    // Create script elements and inject them into main world
    const injectScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(src);
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));

        // Insert into head to run in main world
        (document.head || document.documentElement).appendChild(script);
      });
    };

    // Load vendors first, then components
    await injectScript('vendors.js');
    await injectScript('chatbot-aside-panel.js');
  }

  private async checkComponentsReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use postMessage to check if components are available in main world
      const messageId = Date.now() + Math.random();

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'COMPONENTS_CHECK_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);

          if (event.data.available) {
            console.log('✅ [ContentScript] Components are ready in main world');
            resolve();
          } else {
            reject(new Error('Components not available in main world'));
          }
        }
      };

      window.addEventListener('message', responseHandler);

      // Send check message to main world
      window.postMessage({
        type: 'CHECK_COMPONENTS',
        id: messageId
      }, '*');

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('Timeout checking components'));
      }, 5000);
    });
  }

  private async createComponentInMainWorld(): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now() + Math.random();

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'COMPONENT_CREATED' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);

          if (event.data.success) {
            console.log('✅ [ContentScript] Component created successfully in main world');
            // Set up ongoing message handlers for component interactions
            this.setupComponentMessageHandlers();
            resolve();
          } else {
            reject(new Error(`Failed to create component: ${event.data.error}`));
          }
        }
      };

      window.addEventListener('message', responseHandler);

      // Send create component message to main world
      const containerId = this.chatbotAsideContainer?.id || 'ai-ext-chatbot-aside';

      console.log('🔧 [ContentScript] Creating component with container ID:', containerId);

      window.postMessage({
        type: 'CREATE_COMPONENT',
        id: messageId,
        containerId,
        props: {
          // Don't pass functions - handle via separate messages
          // We'll set up message handlers for component interactions
        }
      }, '*');

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('Timeout creating component'));
      }, 5000);
    });
  }

  private setupComponentMessageHandlers(): void {
    // Listen for component events
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      switch (event.data.type) {
        case 'CHATBOT_CLOSE':
          this.closeChatbotPanel();
          break;

        case 'REQUEST_TICKET_DATA':
          this.handleTicketDataRequest(event.data.id);
          break;

        case 'CHAT_MESSAGE':
          this.handleChatMessage(event.data.message, event.data.id, event.data.ticketData, event.data.chatHistory);
          break;

        case 'REQUEST_SUMMARY':
          this.handleSummaryRequest(event.data.ticketData, event.data.id);
          break;
      }
    });
  }

  private async handleTicketDataRequest(messageId: string): Promise<void> {
    try {
      const ticketData = await this.ticketAnalyzer.extractTicketData();
      window.postMessage({
        type: 'TICKET_DATA_RESPONSE',
        id: messageId,
        success: true,
        data: ticketData
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'TICKET_DATA_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async handleChatMessage(message: string, messageId: string, ticketData?: any, chatHistory?: any[]): Promise<void> {
    try {
      // Get ticket data if not provided
      const finalTicketData = ticketData || await this.ticketAnalyzer.extractTicketData();

      // Handle chat messages via background script
      const response = await chrome.runtime.sendMessage({
        action: 'processUserMessage',
        data: {
          message,
          ticketId: finalTicketData?.id,
          conversationHistory: chatHistory || []
        }
      });

      window.postMessage({
        type: 'CHAT_RESPONSE',
        id: messageId,
        success: response.success,
        data: response.success ? response.response : null,
        error: response.success ? null : response.error
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'CHAT_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async handleSummaryRequest(ticketData: any, messageId: string): Promise<void> {
    try {
      // Handle summary request via background script
      const response = await chrome.runtime.sendMessage({
        action: 'requestTicketSummary',
        data: {
          ticketId: ticketData.id,
          ticketData: ticketData
        }
      });

      window.postMessage({
        type: 'SUMMARY_RESPONSE',
        id: messageId,
        success: response.success,
        data: response.success ? response.summary : null,
        error: response.success ? null : response.error
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'SUMMARY_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async waitForGlobals(maxAttempts = 10, delay = 200): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkGlobals = () => {
        attempts++;
        console.log(`🔍 [ContentScript] Checking globals (attempt ${attempts}/${maxAttempts})`);

        // Try to access globals in different ways
        let React, ReactDOM, ChatbotAsidePanel;

        try {
          React = (window as any).React;
          ReactDOM = (window as any).ReactDOM;
          ChatbotAsidePanel = (window as any).ChatbotAsidePanel;
        } catch (error) {
          console.warn('🔍 [ContentScript] Error accessing window globals:', error);
        }

        // Also try accessing through document or other means
        if (!React) {
          try {
            React = (document as any).React || (globalThis as any).React;
          } catch (e) {}
        }

        if (!ReactDOM) {
          try {
            ReactDOM = (document as any).ReactDOM || (globalThis as any).ReactDOM;
          } catch (e) {}
        }

        if (!ChatbotAsidePanel) {
          try {
            ChatbotAsidePanel = (document as any).ChatbotAsidePanel || (globalThis as any).ChatbotAsidePanel;
          } catch (e) {}
        }

        console.log('🔍 [ContentScript] Globals check:', {
          React: !!React,
          ReactDOM: !!ReactDOM,
          ChatbotAsidePanel: !!ChatbotAsidePanel,
          windowKeys: Object.keys(window).filter(k => k.includes('React')).slice(0, 5)
        });

        if (React && ReactDOM && ChatbotAsidePanel) {
          console.log('✅ [ContentScript] All globals found!');
          // Store them for later use
          this.reactGlobals = { React, ReactDOM, ChatbotAsidePanel };
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('❌ [ContentScript] Failed to find globals. Window keys:', Object.keys(window).slice(0, 20));
          reject(new Error(`Globals not available after ${maxAttempts} attempts. React: ${!!React}, ReactDOM: ${!!ReactDOM}, ChatbotAsidePanel: ${!!ChatbotAsidePanel}`));
        } else {
          setTimeout(checkGlobals, delay);
        }
      };

      checkGlobals();
    });
  }

  private reactGlobals: any = {};

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

  // Cleanup method when extension is disabled/removed
  public cleanup() {
    if (this.reactRoot) {
      try {
        this.reactRoot.unmount();
        this.reactRoot = null;
      } catch (error) {
        console.error('Error unmounting React component:', error);
      }
    }

    if (this.chatbotAsideContainer) {
      this.chatbotAsideContainer.remove();
      this.chatbotAsideContainer = null;
    }

    if (this.chatbotToggleButton) {
      this.chatbotToggleButton.remove();
      this.chatbotToggleButton = null;
    }

    document.body.classList.remove('ai-ext-sidebar-open');
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

// Expose cleanup function for extension lifecycle
(window as any).cleanupBacklogAI = () => {
  try {
    injector.cleanup();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  injector.cleanup();
});
