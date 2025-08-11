// Content script chính để inject chatbot aside panel vào trang Backlog
import { TicketAnalyzer } from '../shared/ticketAnalyzer';
import { ChatbotManager } from '../shared/chatbotManager';
import {
  TicketURLMonitor,
  TicketChangeEvent,
} from '../shared/ticketURLMonitor';
import { availableModels } from '../configs';
import { ISSUE_URL_REGEX } from '../configs/backlog';

// Class quản lý comment enhancer
class CommentEnhancer {
  private observer: MutationObserver | null = null;
  private isInitialized: boolean = false;
  private initTimeout: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;

    // Inject buttons cho comments hiện tại với delay
    this.scheduleInitialInjection();

    // Theo dõi comments mới
    this.observeCommentList();

    this.isInitialized = true;
    console.log('✅ [CommentEnhancer] Initialized');
  }

  private scheduleInitialInjection(): void {
    // Clear any existing timeout
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }

    // Schedule initial injection with delay to ensure comments are loaded
    this.initTimeout = window.setTimeout(() => {
      this.injectAllCommentButtons();

      // If no comments found, try again after a longer delay
      const commentItems = document.querySelectorAll('.comment-item');
      if (commentItems.length === 0) {
        console.log(
          '⚠️ [CommentEnhancer] No comments found, retrying in 2 seconds...'
        );
        setTimeout(() => {
          this.injectAllCommentButtons();
        }, 2000);
      }
    }, 1000); // Wait 1 second for initial load
  }

  private injectChatButton(commentItem: HTMLElement): void {
    // Tránh inject trùng lặp
    if (commentItem.querySelector('.ai-ext-comment-chat-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ai-ext-comment-chat-btn';
    btn.title = 'Chat với AI về comment này';

    // Tạo icon
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon.svg');
    iconImg.alt = 'AI Chat';

    btn.appendChild(iconImg);

    // Thêm event listeners
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openAIChatboxWithContext(commentItem);
    });

    // Thêm hover events để highlight comment container
    btn.addEventListener('mouseenter', (event) => {
      this.highlightCommentContainer(commentItem);
    });

    btn.addEventListener('mouseleave', (event) => {
      this.unhighlightCommentContainer(commentItem);
    });

    commentItem.appendChild(btn);
  }

  private highlightCommentContainer(commentItem: HTMLElement): void {
    // Tìm comment container (có thể là commentItem hoặc parent element)
    const commentContainer =
      commentItem.closest('.js_comment-container') || commentItem;
    if (commentContainer) {
      commentContainer.classList.add('ai-ext-highlight-comment-container');
    }
  }

  private unhighlightCommentContainer(commentItem: HTMLElement): void {
    // Tìm comment container và xóa class highlight
    const commentContainer =
      commentItem.closest('.js_comment-container') || commentItem;
    if (commentContainer) {
      commentContainer.classList.remove('ai-ext-highlight-comment-container');
    }
  }

  private injectAllCommentButtons(): void {
    const commentItems = document.querySelectorAll('.comment-item');
    commentItems.forEach((item) => {
      this.injectChatButton(item as HTMLElement);
    });
    console.log(
      `✅ [CommentEnhancer] Injected buttons for ${commentItems.length} comments`
    );
  }

  private observeCommentList(): void {
    const commentList = document.querySelector('.comment-list__items');
    if (!commentList) {
      console.warn(
        '⚠️ [CommentEnhancer] Comment list not found, will retry later'
      );
      // Retry after a delay
      setTimeout(() => this.observeCommentList(), 2000);
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.matches('.comment-item')) {
            this.injectChatButton(node);
          }
        });
      });
    });

    this.observer.observe(commentList, {
      childList: true,
      subtree: false,
    });

    console.log('✅ [CommentEnhancer] Observer started');
  }

  private openAIChatboxWithContext(commentItem: HTMLElement): void {
    try {
      // Extract comment data
      const commentData = this.extractCommentData(commentItem);

      if (!commentData) {
        console.warn('⚠️ [CommentEnhancer] Could not extract comment data');
        return;
      }

      console.log(
        '📝 [CommentEnhancer] Opening chatbox with comment:',
        commentData
      );

      // Mở chatbot panel trước
      window.postMessage(
        {
          type: 'OPEN_CHATBOT_PANEL',
        },
        '*'
      );

      // Gửi message để load comment context và focus textarea
      window.postMessage(
        {
          type: 'LOAD_COMMENT_CONTEXT',
          data: commentData,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [CommentEnhancer] Error opening chatbox:', error);
    }
  }

  private extractCommentData(commentItem: HTMLElement): any {
    try {
      // Extract comment text
      const commentText =
        commentItem.querySelector('.comment-item__text')?.textContent?.trim() ||
        '';

      // Extract comment author
      const authorElement = commentItem.querySelector('.comment-item__author');
      const author = authorElement?.textContent?.trim() || '';

      // Extract comment date
      const dateElement = commentItem.querySelector('.comment-item__date');
      const date = dateElement?.textContent?.trim() || '';

      // Extract comment ID (if available)
      const commentId =
        commentItem.dataset.id || commentItem.getAttribute('data-id') || '';

      // Extract comment URL (if available)
      const commentLink = commentItem.querySelector(
        'a[href*="/view/"]'
      ) as HTMLAnchorElement;
      const commentUrl = commentLink?.href || '';

      return {
        id: commentId,
        text: commentText,
        author: author,
        date: date,
        url: commentUrl,
        element: commentItem.outerHTML, // Include HTML for context
      };
    } catch (error) {
      console.error(
        '❌ [CommentEnhancer] Error extracting comment data:',
        error
      );
      return null;
    }
  }

  public destroy(): void {
    // Clear timeout
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove injected buttons
    const buttons = document.querySelectorAll('.ai-ext-comment-chat-btn');
    buttons.forEach((btn) => btn.remove());

    this.isInitialized = false;
    console.log('✅ [CommentEnhancer] Destroyed');
  }
}

class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private chatbotAsideContainer: HTMLElement | null = null;
  private chatbotToggleButton: HTMLButtonElement | null = null;
  private isChatbotOpen: boolean = false;
  private reactRoot: any = null; // React root for cleanup
  private ticketMonitor: TicketURLMonitor | null = null;
  private currentTicketId: string | null = null;
  private commentEnhancer: CommentEnhancer | null = null;

  constructor() {
    this.ticketAnalyzer = new TicketAnalyzer();
    this.chatbotManager = new ChatbotManager();
    this.init();
  }

  private init() {
    // Setup message listeners
    this.setupChromeMessageListeners();

    // Load sidebar CSS
    this.loadSidebarCSS();

    // Initialize ticket URL monitoring
    this.initializeTicketMonitoring();

    // Kiểm tra xem có phải là trang ticket không
    if (this.isTicketPage()) {
      this.setupChatbot();
      this.setupCommentEnhancer();
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

  private setupCommentEnhancer(): void {
    try {
      this.commentEnhancer = new CommentEnhancer();
    } catch (error) {
      console.error('❌ [Content] Error setting up comment enhancer:', error);
    }
  }

  private handleSidebarWidthUpdate(width: number): void {
    try {
      // Forward width update to React component via postMessage
      window.postMessage(
        {
          type: 'SIDEBAR_WIDTH_UPDATE',
          width: width,
        },
        '*'
      );

      // Also update our content script width management
      this.handleSidebarWidthChange(width);
    } catch (error) {
      console.error('❌ [Content] Error handling width update:', error);
    }
  }

  private initializeTicketMonitoring(): void {
    try {
      this.ticketMonitor = new TicketURLMonitor();

      // Lấy ticket ID hiện tại
      this.currentTicketId = this.ticketMonitor.getCurrentTicketId();

      // Theo dõi thay đổi ticket
      this.ticketMonitor.subscribe((event: TicketChangeEvent) => {
        this.handleTicketChange(event);
      });
    } catch (error) {
      console.error(
        '❌ [Content] Error initializing ticket monitoring:',
        error
      );
    }
  }

  private handleTicketChange(event: TicketChangeEvent): void {
    const oldTicketId = this.currentTicketId;
    this.currentTicketId = event.newTicketId;

    // Chỉ xử lý nếu thực sự có thay đổi ticket ID
    if (oldTicketId !== event.newTicketId) {
      console.log(
        `📋 [Content] Switching from ticket ${oldTicketId} to ${event.newTicketId}`
      );

      // Gửi message đến ChatbotAsidePanel để reset chat context
      this.notifyTicketChange(event);

      // Nếu chatbot đang hiển thị, có thể show loading state
      if (this.isChatbotOpen) {
        this.showTicketTransitionState();
      }
    }
  }

  private notifyTicketChange(event: TicketChangeEvent): void {
    // Gửi message đến React component trong main world
    window.postMessage(
      {
        type: 'TICKET_CHANGE',
        oldTicketId: event.oldTicketId,
        newTicketId: event.newTicketId,
        url: event.url,
        timestamp: Date.now(),
      },
      '*'
    );
  }

  private showTicketTransitionState(): void {
    // Optional: Hiển thị loading state khi đang chuyển đổi ticket
    if (this.chatbotAsideContainer) {
      const existingOverlay = this.chatbotAsideContainer.querySelector(
        '.ticket-transition-overlay'
      );
      if (!existingOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'ticket-transition-overlay';
        overlay.innerHTML = `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          ">
            <div style="text-align: center;">
              <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="30px" height="30px" viewBox="0 0 30 30" class="lds-ring">
                    <circle cx="15" cy="15" fill="none" r="13" stroke="#b7b7b7" stroke-width="2" stroke-linecap="round" transform="rotate(216.567 15 15)">
                        <animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 15 15;320 15 15;720 15 15" keyTimes="0;0.5;1" dur="1s" begin="0s" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dasharray" calcMode="linear" values="0 80; 70 80; 00 80" keyTimes="0;0.5;1" dur="1" begin="0s" repeatCount="indefinite"/>
                    </circle>
                </svg>
                <p style="
                  margin: 16px 0;
                  font0-size: 12px;
                  color: #666;
                ">Đang tải thông tin ticket...</p>
              </div>
            </div>
          </div>
        `;

        this.chatbotAsideContainer.appendChild(overlay);

        // Tự động ẩn overlay sau 2 giây
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 2000);
      }
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

      // Check if auto-open feature is enabled
      this.checkAutoOpenFeature();
    }
  }

  private async checkAutoOpenFeature() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SECTION',
        section: 'features',
      });

      if (response.success) {
        const autoOpenEnabled = response.data.autoOpenChatbox || false;

        if (autoOpenEnabled && !this.isChatbotOpen) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            this.openChatbotPanel();
          }, 500);
        }
      } else {
        console.error('Failed to get feature flags:', response.error);
      }
    } catch (error) {
      console.error('Failed to check auto-open feature:', error);
    }
  }

  private isTicketPage(): boolean {
    // Kiểm tra URL có chứa pattern của ticket page
    const url = window.location.href;
    return ISSUE_URL_REGEX.test(url) || url.includes('/view/');
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
    this.chatbotToggleButton.addEventListener('click', () =>
      this.toggleChatbotPanel()
    );

    // Thêm vào DOM
    container.appendChild(this.chatbotAsideContainer);
    document.body.appendChild(this.chatbotToggleButton);

    // Load React chatbot component vào chatbot panel
    this.loadReactChatbotComponent();
  }

  private toggleChatbotPanel() {
    if (this.chatbotAsideContainer) {
      const isVisible =
        this.chatbotAsideContainer.classList.contains('ai-ext-open');
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
      // if (backlogSettings.configs && backlogSettings.configs.length > 0) {
      //   this.ticketAnalyzer.updateBacklogSettings(backlogSettings);
      // }

      // Load React and ChatbotAsidePanel from main world
      await this.loadChatbotAsidePanelScript();

      // Use postMessage to create component in main world
      await this.createComponentInMainWorld();
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
      this.checkComponentsReady()
        .then(resolve)
        .catch(() => {
          // Set up message listener for component loading
          const messageHandler = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data.type === 'REACT_COMPONENTS_LOADED') {
              window.removeEventListener('message', messageHandler);

              // Small delay then check components
              setTimeout(() => {
                this.checkComponentsReady().then(resolve).catch(reject);
              }, 100);
            }
          };

          window.addEventListener('message', messageHandler);

          // Inject scripts into main world using chrome.scripting API
          this.injectMainWorldScripts().catch((error) => {
            console.error(
              '❌ [ContentScript] Failed to inject scripts:',
              error
            );
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

        if (
          event.data.type === 'COMPONENTS_CHECK_RESPONSE' &&
          event.data.id === messageId
        ) {
          window.removeEventListener('message', responseHandler);

          if (event.data.available) {
            resolve();
          } else {
            reject(new Error('Components not available in main world'));
          }
        }
      };

      window.addEventListener('message', responseHandler);

      // Send check message to main world
      window.postMessage(
        {
          type: 'CHECK_COMPONENTS',
          id: messageId,
        },
        '*'
      );

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

      // Load saved width before creating component (if feature is enabled)
      let savedWidth = null;
      try {
        // Check if remember chatbox size feature is enabled
        const featureResult = await chrome.storage.sync.get([
          'rememberChatboxSize',
        ]);
        const rememberSizeEnabled =
          featureResult.rememberChatboxSize !== undefined
            ? featureResult.rememberChatboxSize
            : true;

        if (rememberSizeEnabled) {
          const result = await chrome.storage.local.get([
            'ai-ext-sidebar-width',
          ]);
          savedWidth = result['ai-ext-sidebar-width'];
        }
      } catch (error) {
        console.log('❌ [ContentScript] Could not load saved width:', error);
      }

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (
          event.data.type === 'COMPONENT_CREATED' &&
          event.data.id === messageId
        ) {
          window.removeEventListener('message', responseHandler);

          if (event.data.success) {
            // Send saved width to component immediately after creation
            if (savedWidth) {
              setTimeout(() => {
                window.postMessage(
                  {
                    type: 'SIDEBAR_WIDTH_UPDATE',
                    width: savedWidth,
                  },
                  '*'
                );
              }, 100);
            }

            // Set up ongoing message handlers for component interactions
            this.setupComponentMessageHandlers();
            resolve();
          } else {
            reject(
              new Error(`Failed to create component: ${event.data.error}`)
            );
          }
        }
      };

      window.addEventListener('message', responseHandler);

      // Send create component message to main world
      const containerId =
        this.chatbotAsideContainer?.id || 'ai-ext-chatbot-aside';

      window.postMessage(
        {
          type: 'CREATE_COMPONENT',
          id: messageId,
          containerId,
          props: {
            // Don't pass functions - handle via separate messages
            // We'll set up message handlers for component interactions
            initialWidth: savedWidth, // Pass saved width as initial prop
          },
        },
        '*'
      );

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('Timeout creating component'));
      }, 5000);
    });
  }

  private setupComponentMessageHandlers(): void {
    console.log('🔧 [Content] Setting up component message handlers');

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

        case 'OPEN_OPTIONS_PAGE':
          this.handleOpenOptionsPage();
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
          this.handleChatStorageSave(
            event.data.id,
            event.data.ticketKey || event.data.data?.ticketId,
            event.data.data
          );
          break;

        case 'CHAT_STORAGE_CLEAR':
          this.handleChatStorageClear(event.data.id, event.data.ticketKey);
          break;

        case 'GET_MODEL_SETTINGS':
          this.handleGetModelSettings(event.data.id);
          break;

        case 'GET_FEATURE_FLAGS':
          this.handleGetFeatureFlags(event.data.id);
          break;

        case 'BROADCAST_WIDTH_CHANGE':
          this.handleBroadcastWidthChange(event.data.width);
          break;

        case 'GET_SAVED_WIDTH':
          this.handleGetSavedWidth(event.data.id);
          break;

        case 'UPDATE_PREFERRED_MODEL':
          this.handleUpdatePreferredModel(event.data.modelId);
          break;

        case 'GET_BACKLOGS':
          this.handleGetBacklogs(event.data.id);
          break;

        case 'FETCH_BACKLOG_PROJECTS':
          this.handleFetchBacklogProjects(event.data.backlog, event.data.id);
          break;

        case 'FETCH_ISSUE_TYPES_REQUEST':
          this.handleFetchIssueTypes(
            event.data.backlog,
            event.data.projectKey,
            event.data.id
          );
          break;

        case 'OPEN_CHATBOX_WITH_COMMENT':
          this.handleOpenChatboxWithComment(event.data.data);
          break;

        case 'OPEN_CHATBOT_PANEL':
          this.openChatbotPanel();
          break;

        case 'LOAD_COMMENT_CONTEXT':
          this.handleLoadCommentContext(event.data.data);
          break;

        case 'GET_COMMENT_CONTEXT':
          this.handleGetCommentContext(event.data.data, event.data.id);
          break;
      }
    });
  }

  private async handleTicketDataRequest(messageId: string): Promise<void> {
    try {
      const ticketData = await this.ticketAnalyzer.extractTicketData();
      window.postMessage(
        {
          type: 'TICKET_DATA_RESPONSE',
          id: messageId,
          success: true,
          data: ticketData,
        },
        '*'
      );
    } catch (error) {
      window.postMessage(
        {
          type: 'TICKET_DATA_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleChatMessage(
    contextData: any,
    messageId: string
  ): Promise<void> {
    try {
      // Extract current ticket data if not provided in context
      const finalTicketData =
        contextData.ticketData ||
        (await this.ticketAnalyzer.extractTicketData());

      // Prepare full context for background script
      const fullContextData = {
        message: contextData.message,
        messageType: contextData.messageType || 'user',
        ticketData: finalTicketData,
        chatHistory: contextData.chatHistory || [],
        userInfo: contextData.userInfo,
        currentModel: contextData.currentModel, // Include selected model from chatbot
        ticketId: finalTicketData?.id || finalTicketData?.key,
        ticketUrl: window.location.href, // Add current URL for background script
        timestamp: contextData.timestamp || new Date().toISOString(),
        attachments: contextData.attachments || [], // Include file attachments
        commentContext: contextData.commentContext, // Include comment context
      };

      console.log('📤 [Content] Sending to background:', {
        action: 'processUserMessage',
        messageType: fullContextData.messageType,
        hasTicketData: !!fullContextData.ticketData,
        chatHistoryLength: fullContextData.chatHistory.length,
        hasCommentContext: !!fullContextData.commentContext,
        commentContext: fullContextData.commentContext,
      });

      // Send to background script with full context
      const response = await chrome.runtime.sendMessage({
        action: 'processUserMessage',
        data: fullContextData,
      });

      console.log('📨 [Content] Background response:', response);

      window.postMessage(
        {
          type: 'CHAT_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.response : null,
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error handling chat message:', error);
      window.postMessage(
        {
          type: 'CHAT_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleSummaryRequest(
    ticketData: any,
    messageId: string
  ): Promise<void> {
    try {
      // Handle summary request via background script
      const response = await chrome.runtime.sendMessage({
        action: 'requestTicketSummary',
        data: {
          ticketId: ticketData.id,
          ticketData: ticketData,
        },
      });

      window.postMessage(
        {
          type: 'SUMMARY_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.summary : null,
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      window.postMessage(
        {
          type: 'SUMMARY_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleGetUserInfo(messageId: string): Promise<void> {
    try {
      // Request user info via background script
      const response = await chrome.runtime.sendMessage({
        action: 'getCurrentUser',
      });

      window.postMessage(
        {
          type: 'USER_INFO_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : null,
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('Error getting user info:', error);
      window.postMessage(
        {
          type: 'USER_INFO_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleGetBacklogs(messageId: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getBacklogSettings',
      });

      window.postMessage(
        {
          type: 'GET_BACKLOGS_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : [],
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error getting backlogs:', error);
      window.postMessage(
        {
          type: 'GET_BACKLOGS_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleFetchBacklogProjects(
    backlog: any,
    messageId: string
  ): Promise<void> {
    console.log(
      '🔎 ~ BacklogAIInjector ~ handleFetchBacklogProjects ~ backlog:',
      { backlog, messageId }
    );
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchBacklogProjects',
        data: backlog,
      });

      window.postMessage(
        {
          type: 'FETCH_BACKLOG_PROJECTS_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : [],
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error fetching backlog projects:', error);
      window.postMessage(
        {
          type: 'FETCH_BACKLOG_PROJECTS_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleFetchIssueTypes(
    backlog: any,
    projectKey: string,
    messageId: string
  ): Promise<void> {
    console.log('🔎 ~ BacklogAIInjector ~ handleFetchIssueTypes ~ backlog:', {
      backlog,
      projectKey,
      messageId,
    });
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchIssueTypes',
        data: { ...backlog, projectKey },
      });

      window.postMessage(
        {
          type: 'FETCH_ISSUE_TYPES_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : [],
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error fetching issue types:', error);
      window.postMessage(
        {
          type: 'FETCH_ISSUE_TYPES_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleChatStorageLoad(
    messageId: string,
    ticketKey: string
  ): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        `chat-history-${ticketKey}`,
      ]);
      const historyData = result[`chat-history-${ticketKey}`];

      // Extract messages array from the ChatHistoryData structure
      const messages = historyData?.messages || [];

      window.postMessage(
        {
          type: 'CHAT_STORAGE_LOAD_RESPONSE',
          id: messageId,
          success: true,
          data: messages,
        },
        '*'
      );
    } catch (error) {
      console.error('Error loading chat history:', error);
      window.postMessage(
        {
          type: 'CHAT_STORAGE_LOAD_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleChatStorageSave(
    messageId: string,
    ticketKey: string,
    saveData: any
  ): Promise<void> {
    try {
      // Construct ChatHistoryData structure
      const historyData = {
        ticketId: saveData.ticketId || ticketKey,
        ticketUrl: window.location.href,
        messages: (saveData.messages || []).slice(-100).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp).toISOString(), // Convert any other type to ISO string
        })), // Keep only recent 100 messages and normalize timestamps as ISO strings
        lastUpdated: new Date().toISOString(),
        userInfo: saveData.userInfo,
        ticketInfo: {
          title: (saveData.ticketData?.title || '').slice(0, 200),
          status: saveData.ticketData?.status || '',
          assignee: (saveData.ticketData?.assignee || '').slice(0, 100),
        },
      };

      await chrome.storage.local.set({
        [`chat-history-${ticketKey}`]: historyData,
      });

      window.postMessage(
        {
          type: 'CHAT_STORAGE_SAVE_RESPONSE',
          id: messageId,
          success: true,
        },
        '*'
      );
    } catch (error) {
      console.error('Error saving chat history:', error);
      window.postMessage(
        {
          type: 'CHAT_STORAGE_SAVE_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleChatStorageClear(
    messageId: string,
    ticketKey?: string
  ): Promise<void> {
    try {
      if (ticketKey) {
        await chrome.storage.local.remove([`chat-history-${ticketKey}`]);
      } else {
        const result = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(result).filter((key) =>
          key.startsWith('chat-history-')
        );
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
      }

      window.postMessage(
        {
          type: 'CHAT_STORAGE_CLEAR_RESPONSE',
          id: messageId,
          success: true,
        },
        '*'
      );
    } catch (error) {
      console.error('Error clearing chat history:', error);
      window.postMessage(
        {
          type: 'CHAT_STORAGE_CLEAR_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleGetModelSettings(messageId?: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SECTION',
        section: 'aiModels',
      });

      if (response.success) {
        window.postMessage(
          {
            type: 'MODEL_SETTINGS_RESPONSE',
            id: messageId,
            success: true,
            data: {
              selectedModels: response.data.selectedModels || [],
              preferredModel:
                response.data.preferredModel || 'gemini-2.5-flash',
            },
          },
          '*'
        );
      } else {
        throw new Error(response.error || 'Failed to get AI model settings');
      }
    } catch (error) {
      console.error('Error getting model settings:', error);
      window.postMessage(
        {
          type: 'MODEL_SETTINGS_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleUpdatePreferredModel(modelId: string): Promise<void> {
    try {
      // Use statically imported availableModels to determine provider
      const selectedModel = availableModels.find(
        (model) => model.id === modelId
      );
      const preferredProvider = selectedModel?.provider || 'openai';

      await chrome.storage.sync.set({
        preferredModel: modelId,
        preferredProvider: preferredProvider,
      });

      window.postMessage(
        {
          type: 'PREFERRED_MODEL_UPDATED',
          success: true,
          modelId: modelId,
          provider: preferredProvider,
        },
        '*'
      );
    } catch (error) {
      console.error('Error updating preferred model:', error);
      window.postMessage(
        {
          type: 'PREFERRED_MODEL_UPDATED',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async waitForGlobals(maxAttempts = 10, delay = 200): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkGlobals = () => {
        attempts++;
        console.log(
          `🔍 [ContentScript] Checking globals (attempt ${attempts}/${maxAttempts})`
        );

        // Try to access globals in different ways
        let React, ReactDOM, ChatbotAsidePanel;

        try {
          React = (window as any).React;
          ReactDOM = (window as any).ReactDOM;
          ChatbotAsidePanel = (window as any).ChatbotAsidePanel;
        } catch (error) {
          console.warn(
            '🔍 [ContentScript] Error accessing window globals:',
            error
          );
        }

        // Also try accessing through document or other means
        if (!React) {
          try {
            React = (document as any).React || (globalThis as any).React;
          } catch (e) {}
        }

        if (!ReactDOM) {
          try {
            ReactDOM =
              (document as any).ReactDOM || (globalThis as any).ReactDOM;
          } catch (e) {}
        }

        if (!ChatbotAsidePanel) {
          try {
            ChatbotAsidePanel =
              (document as any).ChatbotAsidePanel ||
              (globalThis as any).ChatbotAsidePanel;
          } catch (e) {}
        }

        if (React && ReactDOM && ChatbotAsidePanel) {
          // Store them for later use
          this.reactGlobals = { React, ReactDOM, ChatbotAsidePanel };
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error(
            '❌ [ContentScript] Failed to find globals. Window keys:',
            Object.keys(window).slice(0, 20)
          );
          reject(
            new Error(
              `Globals not available after ${maxAttempts} attempts. React: ${!!React}, ReactDOM: ${!!ReactDOM}, ChatbotAsidePanel: ${!!ChatbotAsidePanel}`
            )
          );
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
      // if (backlogSettings.configs && backlogSettings.configs.length > 0) {
      //   this.ticketAnalyzer.updateBacklogSettings(backlogSettings);
      // }

      const ticketData = await this.ticketAnalyzer.extractTicketData();

      if (ticketData.id) {
        // Send ticket data to background for analysis
        chrome.runtime.sendMessage({
          action: 'analyzeTicket',
          data: ticketData,
        });
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error);
    }
  }

  private async getBacklogSettings(): Promise<{ configs: any[] }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'getBacklogSettings',
        },
        (response) => {
          resolve(response || { configs: [] });
        }
      );
    });
  }

  // Public getter for ticket analyzer
  getTicketAnalyzer(): TicketAnalyzer {
    return this.ticketAnalyzer;
  }

  // Cleanup method when extension is disabled/removed
  public cleanup() {
    // Cleanup comment enhancer
    if (this.commentEnhancer) {
      try {
        this.commentEnhancer.destroy();
        this.commentEnhancer = null;
      } catch (error) {
        console.error('Error disposing comment enhancer:', error);
      }
    }

    // Cleanup ticket monitor
    if (this.ticketMonitor) {
      try {
        this.ticketMonitor.destroy();
        this.ticketMonitor = null;
      } catch (error) {
        console.error('Error disposing ticket monitor:', error);
      }
    }

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
      document.documentElement.style.setProperty(
        '--ai-ext-sidebar-width',
        `${width}px`
      );

      // Update chatbot container width if it exists
      if (this.chatbotAsideContainer) {
        this.chatbotAsideContainer.style.width = `${width}px`;
        // Don't manually set right position - let CSS handle it via .ai-ext-open class
      }
    } catch (error) {
      console.error('❌ [Content] Error updating sidebar width:', error);
    }
  }

  private async handleSaveWidth(width: number): Promise<void> {
    try {
      console.log('💾 [Content] Saving width to storage:', width);

      // Check if remember chatbox size feature is enabled
      const featureResult = await chrome.storage.sync.get([
        'rememberChatboxSize',
      ]);
      const rememberSizeEnabled =
        featureResult.rememberChatboxSize !== undefined
          ? featureResult.rememberChatboxSize
          : true;

      if (rememberSizeEnabled) {
        await chrome.storage.local.set({ 'ai-ext-sidebar-width': width });
      } else {
        console.log('📝 [Content] Width saving disabled by user setting');
      }

      // Always update width immediately regardless of save preference
      this.handleSidebarWidthChange(width);

      // Broadcast width change to other tabs
      chrome.runtime
        .sendMessage({
          action: 'sidebarWidthChanged',
          width: width,
        })
        .catch(() => {
          // Ignore errors if background script is not available
        });
    } catch (error) {
      console.error('❌ [Content] Could not save width:', error);
    }
  }

  private handleOpenChatboxWithComment(commentData: any): void {
    try {
      console.log(
        '📝 [Content] Opening chatbox with comment data:',
        commentData
      );

      // Gửi comment data đến chatbot component
      window.postMessage(
        {
          type: 'COMMENT_CONTEXT_LOADED',
          data: commentData,
        },
        '*'
      );
    } catch (error) {
      console.error(
        '❌ [Content] Error handling open chatbox with comment:',
        error
      );
    }
  }

  private handleOpenOptionsPage(): void {
    try {
      // Send message to background script to open options page
      chrome.runtime
        .sendMessage({
          action: 'openOptionsPage',
        })
        .catch((error) => {
          console.error(
            '❌ [Content] Error sending openOptionsPage message:',
            error
          );
        });
    } catch (error) {
      console.error('❌ [Content] Error handling open options page:', error);
    }
  }

  private handleLoadCommentContext(commentData: any): void {
    try {
      console.log('📝 [Content] Loading comment context:', commentData);

      // Gửi comment data đến chatbot component để hiển thị và focus textarea
      window.postMessage(
        {
          type: 'COMMENT_CONTEXT_LOADED',
          data: commentData,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error handling load comment context:', error);
    }
  }

  private async handleGetCommentContext(
    commentData: any,
    messageId: string
  ): Promise<void> {
    try {
      console.log('📝 [Content] Getting comment context:', commentData);

      // Call background script to get comment context from API
      const response = await chrome.runtime.sendMessage({
        action: 'getCommentContext',
        data: commentData,
      });

      console.log(
        '📨 [Content] Background response for comment context:',
        response
      );

      window.postMessage(
        {
          type: 'COMMENT_CONTEXT_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : null,
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error handling get comment context:', error);
      window.postMessage(
        {
          type: 'COMMENT_CONTEXT_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleGetFeatureFlags(messageId: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SECTION',
        section: 'features',
      });

      window.postMessage(
        {
          type: 'FEATURE_FLAGS_RESPONSE',
          id: messageId,
          success: response.success,
          data: response.success ? response.data : null,
          error: response.success ? null : response.error,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error getting feature flags:', error);
      window.postMessage(
        {
          type: 'FEATURE_FLAGS_RESPONSE',
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*'
      );
    }
  }

  private async handleBroadcastWidthChange(width: number): Promise<void> {
    try {
      // Broadcast width change to other tabs via background script
      chrome.runtime.sendMessage({
        action: 'sidebarWidthChanged',
        width: width,
      }).catch(() => {
        // Ignore errors if background script is not available
      });
    } catch (error) {
      console.error('❌ [Content] Error broadcasting width change:', error);
    }
  }

  private async handleGetSavedWidth(messageId: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['ai-ext-sidebar-width']);
      const savedWidth = result['ai-ext-sidebar-width'] || null;

      window.postMessage(
        {
          type: 'SAVED_WIDTH_RESPONSE',
          id: messageId,
          width: savedWidth,
        },
        '*'
      );
    } catch (error) {
      console.error('❌ [Content] Error getting saved width:', error);
      window.postMessage(
        {
          type: 'SAVED_WIDTH_RESPONSE',
          id: messageId,
          width: null,
        },
        '*'
      );
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
