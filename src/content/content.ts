// Content script chính để inject chatbot aside panel vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';
import { ChatMessage } from '../shared/chatStorageService';

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

    // Setup message listeners
    this.setupChromeMessageListeners();

    // Load sidebar CSS
    this.loadSidebarCSS();

    // Kiểm tra xem có phải là trang ticket không
    if (this.isTicketPage()) {
      this.setupChatbot();
    }
  }

  private setupChromeMessageListeners(): void {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SIDEBAR_WIDTH_UPDATE':
          this.handleSidebarWidthUpdate(message.width);
          sendResponse({ success: true });
          break;
      }
      return true;
    });
  }

  private handleSidebarWidthUpdate(width: number): void {
    try {
      // Forward width update to React component via postMessage
      window.postMessage({
        type: 'SIDEBAR_WIDTH_UPDATE',
        width: width
      }, '*');

      // Also update our content script width management
      this.handleSidebarWidthChange(width);

      console.log('🔧 [Content] Received width update from background:', width);
    } catch (error) {
      console.error('❌ [Content] Error handling width update:', error);
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
    return new Promise(async (resolve, reject) => {
      const messageId = Date.now() + Math.random();

      // Load saved width before creating component
      let savedWidth = null;
      try {
        const result = await chrome.storage.local.get(['ai-ext-sidebar-width']);
        savedWidth = result['ai-ext-sidebar-width'];
        console.log('🔄 [ContentScript] Loaded saved width for component:', savedWidth);
      } catch (error) {
        console.log('❌ [ContentScript] Could not load saved width:', error);
      }

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'COMPONENT_CREATED' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);

          if (event.data.success) {
            console.log('✅ [ContentScript] Component created successfully in main world');

            // Send saved width to component immediately after creation
            if (savedWidth) {
              setTimeout(() => {
                window.postMessage({
                  type: 'SIDEBAR_WIDTH_UPDATE',
                  width: savedWidth
                }, '*');
                console.log('📤 [ContentScript] Sent saved width to component:', savedWidth);
              }, 100);
            }

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
          initialWidth: savedWidth // Pass saved width as initial prop
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

        case 'SIDEBAR_WIDTH_CHANGED':
          this.handleSidebarWidthChange(event.data.width);
          break;

        case 'SAVE_SIDEBAR_WIDTH':
          this.handleSaveWidth(event.data.width);
          break;

        case 'REQUEST_TICKET_DATA':
          this.handleTicketDataRequest(event.data.id);
          break;

        case 'CHAT_MESSAGE':
          // Handle new context data structure
          this.handleChatMessage(event.data.data, event.data.id);
          break;

        case 'REQUEST_SUMMARY':
          this.handleSummaryRequest(event.data.ticketData, event.data.id);
          break;

        case 'GET_USER_INFO':
          this.handleGetUserInfo(event.data.id);
          break;

        case 'CHAT_STORAGE_LOAD':
          this.handleChatStorageLoad(event.data.id, event.data.ticketKey);
          break;

        case 'CHAT_STORAGE_SAVE':
          this.handleChatStorageSave(event.data.id, event.data.ticketKey || event.data.data?.ticketId, event.data.data);
          break;

        case 'CHAT_STORAGE_CLEAR':
          this.handleChatStorageClear(event.data.id, event.data.ticketKey);
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

  private async handleChatMessage(contextData: any, messageId: string): Promise<void> {
    try {
      console.log('🔄 [Content] Processing chat message with full context:', {
        messageLength: contextData.message?.length || 0,
        messageType: contextData.messageType,
        hasTicketData: !!contextData.ticketData,
        chatHistoryLength: contextData.chatHistory?.length || 0,
        hasUserInfo: !!contextData.userInfo
      });

      // Extract current ticket data if not provided in context
      const finalTicketData = contextData.ticketData || await this.ticketAnalyzer.extractTicketData();

      // Prepare full context for background script
      const fullContextData = {
        message: contextData.message,
        messageType: contextData.messageType || 'user',
        ticketData: finalTicketData,
        chatHistory: contextData.chatHistory || [],
        userInfo: contextData.userInfo,
        ticketId: finalTicketData?.id || finalTicketData?.key,
        timestamp: contextData.timestamp || new Date().toISOString()
      };

      console.log('📤 [Content] Sending to background:', {
        action: 'processUserMessage',
        messageType: fullContextData.messageType,
        hasTicketData: !!fullContextData.ticketData,
        chatHistoryLength: fullContextData.chatHistory.length
      });

      // Send to background script with full context
      const response = await chrome.runtime.sendMessage({
        action: 'processUserMessage',
        data: fullContextData
      });

      console.log('📨 [Content] Background response:', response);

      window.postMessage({
        type: 'CHAT_RESPONSE',
        id: messageId,
        success: response.success,
        data: response.success ? response.response : null,
        error: response.success ? null : response.error
      }, '*');
    } catch (error) {
      console.error('❌ [Content] Error handling chat message:', error);
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

  private async handleGetUserInfo(messageId: string): Promise<void> {
    try {
      console.log('🔍 [Content] Handling get user info request');

      // Request user info via background script
      const response = await chrome.runtime.sendMessage({
        action: 'getCurrentUser'
      });

      console.log('🔍 [Content] User info response:', response);

      window.postMessage({
        type: 'USER_INFO_RESPONSE',
        id: messageId,
        success: response.success,
        data: response.success ? response.data : null,
        error: response.success ? null : response.error
      }, '*');
    } catch (error) {
      console.error('Error getting user info:', error);
      window.postMessage({
        type: 'USER_INFO_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async handleChatStorageLoad(messageId: string, ticketKey: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get([`chat-history-${ticketKey}`]);
      const historyData = result[`chat-history-${ticketKey}`];
      
      // Extract messages array from the ChatHistoryData structure
      const messages = historyData?.messages || [];
      
      window.postMessage({
        type: 'CHAT_STORAGE_LOAD_RESPONSE',
        id: messageId,
        success: true,
        data: messages
      }, '*');
    } catch (error) {
      console.error('Error loading chat history:', error);
      window.postMessage({
        type: 'CHAT_STORAGE_LOAD_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async handleChatStorageSave(messageId: string, ticketKey: string, saveData: any): Promise<void> {
    try {
      // Construct ChatHistoryData structure
      const historyData = {
        ticketId: saveData.ticketId || ticketKey,
        ticketUrl: window.location.href,
        messages: (saveData.messages || []).slice(-100), // Keep only recent 100 messages
        lastUpdated: new Date().toISOString(),
        userInfo: saveData.userInfo,
        ticketInfo: {
          title: (saveData.ticketData?.title || '').slice(0, 200),
          status: saveData.ticketData?.status || '',
          assignee: (saveData.ticketData?.assignee || '').slice(0, 100)
        }
      };
      
      await chrome.storage.local.set({
        [`chat-history-${ticketKey}`]: historyData
      });
      
      window.postMessage({
        type: 'CHAT_STORAGE_SAVE_RESPONSE',
        id: messageId,
        success: true
      }, '*');
    } catch (error) {
      console.error('Error saving chat history:', error);
      window.postMessage({
        type: 'CHAT_STORAGE_SAVE_RESPONSE',
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async handleChatStorageClear(messageId: string, ticketKey?: string): Promise<void> {
    try {
      if (ticketKey) {
        await chrome.storage.local.remove([`chat-history-${ticketKey}`]);
      } else {
        const result = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(result).filter(key => key.startsWith('chat-history-'));
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
      }
      
      window.postMessage({
        type: 'CHAT_STORAGE_CLEAR_RESPONSE',
        id: messageId,
        success: true
      }, '*');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      window.postMessage({
        type: 'CHAT_STORAGE_CLEAR_RESPONSE',
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

  private handleSidebarWidthChange(width: number): void {
    try {
      // Update CSS custom property for dynamic width
      document.documentElement.style.setProperty('--ai-ext-sidebar-width', `${width}px`);

      // Update chatbot container width if it exists
      if (this.chatbotAsideContainer) {
        this.chatbotAsideContainer.style.width = `${width}px`;
        this.chatbotAsideContainer.style.right = this.isChatbotOpen ? '0' : `${-width}px`;
      }

      console.log('🔧 [Content] Sidebar width updated to:', width);
    } catch (error) {
      console.error('❌ [Content] Error updating sidebar width:', error);
    }
  }

  private async handleSaveWidth(width: number): Promise<void> {
    try {
      console.log('💾 [Content] Saving width to storage:', width);
      await chrome.storage.local.set({ 'ai-ext-sidebar-width': width });
      console.log('✅ [Content] Width saved successfully');

      // Also update width immediately
      this.handleSidebarWidthChange(width);

      // Broadcast width change to other tabs
      chrome.runtime.sendMessage({
        action: 'sidebarWidthChanged',
        width: width
      }).catch(() => {
        // Ignore errors if background script is not available
      });
    } catch (error) {
      console.error('❌ [Content] Could not save width:', error);
    }
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
