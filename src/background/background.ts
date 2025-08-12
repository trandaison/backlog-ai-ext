// Background script để xử lý AI API và communication
import ContextOptimizer from '../shared/contextOptimizer';
import { defaultModelId } from '../configs';
import { parseCommand } from '../shared/commandUtils';
import { getLanguageDisplayName } from '../shared/commandUtils';
import { SettingsService } from '../shared/settingsService';
import type { Settings } from '../configs/settingsTypes';
import type { SettingsMessage, SettingsResponse } from '../types/messages.d';
import { OpenAIService } from '../services/OpenAIService';
import { GeminiService } from '../services/GeminiService';
import { TicketData } from '../types/backlog';
import { AIService } from '../types';
import { ChatHistoryData } from '../types/chat';
import { BacklogApiService } from '../services/backlogApi';
import { TicketCreationService } from '../services/ticketCreation';
import { ISSUE_URL_REGEX } from '../configs/backlog';
import { GAService } from '../services/GAService';
import { GA4_CONFIG } from '../configs/analytics';
import { initializeGA4Config } from '../configs/ga4';

class BackgroundService {
  private openaiService: OpenAIService;
  private geminiService: GeminiService;
  private ticketDataCache: Map<string, TicketData> = new Map();
  private settingsService: SettingsService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.geminiService = new GeminiService();
    this.settingsService = SettingsService.getInstance();
    this.initializeWithMigration();
  }

  private async initializeWithMigration(): Promise<void> {
    try {
      // Initialize settings service (which will trigger migration if needed)
      const settings = await this.settingsService.getAllSettings();
      console.log('✅ Settings service initialized', settings);

      // Initialize GA4 configuration
      await initializeGA4Config();

      // Setup message listeners after migration is complete
      this.setupMessageListeners();
    } catch (error) {
      console.error(
        '❌ Settings migration failed, continuing with defaults:',
        error
      );
      // Continue with message listeners even if migration fails
      this.setupMessageListeners();
    }
  }

  // Get the current AI service based on user settings
  private async getCurrentAIService(): Promise<AIService> {
    const aiModelSettings = await this.settingsService.getAiModelSettings();
    const preferredProvider = aiModelSettings.preferredModel?.includes('gemini')
      ? 'gemini'
      : 'openai';

    if (preferredProvider === 'gemini') {
      return this.geminiService;
    } else {
      return this.openaiService;
    }
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle extension icon click to open options page
    chrome.action.onClicked.addListener(() => {
      this.handleOpenOptionsPage();
    });
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    try {
      switch (message.action) {
        // Settings handlers
        case 'GET_SETTINGS':
          await this.handleGetSettings(
            message as SettingsMessage,
            sendResponse
          );
          break;

        case 'UPDATE_SETTINGS':
          await this.handleUpdateSettings(
            message as SettingsMessage,
            sendResponse
          );
          break;

        case 'GET_SECTION':
          await this.handleGetSection(message as SettingsMessage, sendResponse);
          break;

        case 'UPDATE_SECTION':
          await this.handleUpdateSection(
            message as SettingsMessage,
            sendResponse
          );
          break;

        // Existing handlers
        case 'analyzeTicket':
          await this.handleTicketAnalysis(message.data, sendResponse);
          break;

        case 'processUserMessage':
          await this.handleUserMessage(message.data, sendResponse);
          break;

        case 'sidebarWidthChanged':
          await this.handleSidebarWidthSync(message.width, sender);
          sendResponse({ success: true });
          break;

        case 'requestTicketSummary':
          await this.handleTicketSummary(message.data, sendResponse);
          break;

        case 'chatWithAI':
          await this.handleChatWithAI(message.data, sendResponse);
          break;

        case 'saveApiKey':
          await this.saveSettings(message.data);
          sendResponse({ success: true });
          break;

        case 'getApiKey':
          const settings = await this.getSettings();
          sendResponse(settings);
          break;

        case 'updateBacklogSettings':
          await this.saveBacklogMultiSettings(message.data);
          sendResponse({ success: true });
          break;

        case 'getBacklogSettings':
          const backlogSettings = await this.getBacklogMultiSettings();
          sendResponse(backlogSettings);
          break;

        case 'testBacklogConnection':
          const testResult = await this.testBacklogConnection(message.data);
          sendResponse(testResult);
          break;

        case 'getCurrentUser':
          const currentUser = await this.getCurrentUser();
          sendResponse(currentUser);
          break;

        case 'openOptionsPage':
          this.handleOpenOptionsPage();
          sendResponse({ success: true });
          break;

        case 'trackChatEvent':
          await this.handleTrackChatEvent(message.data);
          sendResponse({ success: true });
          break;

        case 'fetchBacklogProjects':
          await this.handleFetchBacklogProjects(message.data, sendResponse);
          break;

        case 'fetchIssueTypes':
          await this.handleFetchIssueTypes(message.data, sendResponse);
          break;

        case 'getCommentContext':
          await this.handleGetCommentContext(message.data, sendResponse);
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: String(error) });
    }
  }

  private async handleTicketAnalysis(
    ticketData: TicketData,
    sendResponse: (response?: any) => void
  ) {
    try {
      // Cache ticket data only - no automatic AI analysis
      this.ticketDataCache.set(ticketData.id, ticketData);

      sendResponse({ success: true, cached: true });
    } catch (error) {
      console.error('Error caching ticket data:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async handleUserMessage(
    data: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      const {
        message,
        messageType,
        ticketData,
        chatHistory,
        userInfo,
        currentModel,
        attachments,
        commentContext,
        currentUrl,
      } = data;
      console.log('🔎 ~ BackgroundService ~ handleUserMessage ~ data:', data);

      // Get current AI service, but override preferredModel with currentModel if provided
      const settings = await this.getSettings();
      if (currentModel) {
        settings.aiModels.preferredModel = currentModel;
      }

      const aiService = await this.getCurrentAIService();

      if (!aiService) {
        throw new Error('AI service not configured');
      }

      let processedMessage = message;
      let optimizedContext: any = {
        ...data,
        commentContext: commentContext, // Pass comment context to AI service
      };

      // Check if this is a command
      const commandResult = parseCommand(message);
      if (commandResult && commandResult.command === 'translate') {
        // Extract source and target languages from the command
        const [, sourceLanguage, targetLanguage] = commandResult.matches;
        processedMessage = this.buildTranslatePrompt(
          ticketData,
          sourceLanguage,
          targetLanguage
        );
      } else if (commandResult && commandResult.command === 'create-ticket') {
        // Handle create-ticket command
        // Pattern: /^\/create-ticket\s+(\S+)\/(\S+)\s+([a-z]{2})\sissueType:(\d+)\spriority:(\d+)$/i
        // Captures: [fullMatch, backlogDomain, projectKey, language, issueTypeId, priorityId]
        const [, backlogDomain, projectKey, language, issueTypeId, priorityId] =
          commandResult.matches;
        await this.handleCreateTicketCommand(
          {
            backlogDomain,
            projectKey,
            language,
            issueTypeId: parseInt(issueTypeId, 10),
            priorityId: parseInt(priorityId, 10),
            ticketData,
            currentUrl,
          },
          sendResponse
        );
        return; // Early return to avoid normal message processing
      } else if (messageType === 'suggestion') {
        // Build context-aware prompt based on message type
        processedMessage = this.buildSuggestionPrompt(message, ticketData);
      } else {
        // For regular chat, use optimized context processing
        if (
          chatHistory &&
          Array.isArray(chatHistory) &&
          chatHistory.length > 0
        ) {
          // Prepare ChatHistoryData for optimization
          const historyData: ChatHistoryData = {
            ticketId: ticketData?.id || 'current',
            ticketUrl: data.ticketUrl || ticketData?.url || 'current-ticket',
            messages: chatHistory.map((msg: any) => ({
              id: msg.id || Date.now().toString(),
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp || new Date().toISOString(),
              tokenCount: msg.tokenCount,
              responseId: msg.responseId,
              compressed: msg.compressed,
            })),
            lastUpdated: new Date().toISOString(),
            userInfo: userInfo || {
              id: 0,
              name: 'User',
              avatar: '',
              mailAddress: '',
              userId: 'current-user',
            },
            ticketInfo: {
              title: ticketData?.title || 'Current Ticket',
              status: ticketData?.status || 'Unknown',
              assignee: ticketData?.assignee,
            },
            contextSummary: data.contextSummary,
            lastSummaryIndex: data.lastSummaryIndex,
            totalTokensUsed: data.totalTokensUsed,
          };

          // Prepare optimized context
          const optimizedResult = ContextOptimizer.prepareOptimizedContext(
            historyData,
            message,
            ticketData?.description || 'No ticket content available'
          );

          processedMessage = optimizedResult.context;
          optimizedContext = {
            ...data,
            isOptimized: true,
            estimatedTokens: optimizedResult.estimatedTokens,
            recentMessages: optimizedResult.recentMessages,
            commentContext: commentContext, // Keep comment context in optimized flow
          };
        } else {
          // For regular chat without history, include full context
          processedMessage = this.buildChatPrompt(
            message,
            ticketData,
            chatHistory
          );
        }
      }

      // Process with AI service, including attachments
      console.log(
        '🚀 [Background] Sending to AI service with attachments:',
        attachments?.length || 0
      );
      const response = await aiService.processUserMessage(
        processedMessage,
        optimizedContext,
        settings,
        attachments
      );

      sendResponse({
        success: true,
        response: response.response,
        tokensUsed: response.tokensUsed,
        responseId: response.responseId,
      });
    } catch (error) {
      console.error('❌ [Background] Error processing message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleChatWithAI(
    data: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      const { message, ticketData, chatHistory } = data;

      // Build context for AI conversation
      const context = {
        conversationHistory: chatHistory || [],
        ticketData: ticketData || null,
        currentMessage: message,
      };

      // Get user settings for personalized responses
      const settings = await this.getSettings();
      const aiService = await this.getCurrentAIService();
      const response = await aiService.processUserMessage(
        message,
        context,
        settings
      );

      sendResponse({ success: true, response });
    } catch (error) {
      console.error('Error in handleChatWithAI:', error);
      sendResponse({
        success: false,
        error: `Lỗi khi chat với AI: ${error}`,
      });
    }
  }

  private async handleTicketSummary(
    data: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      let ticketData = data.ticketData;

      // If ticket data is not provided, try to extract from active tab
      if (!ticketData) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tabs[0]?.id || !tabs[0]?.url) {
          throw new Error('No active tab found');
        }
        ticketData = await this.extractTicketDataFromActiveTab(tabs[0].id);
      }

      if (!ticketData) {
        throw new Error('Could not extract ticket data');
      }

      // Cache the ticket data
      this.ticketDataCache.set(ticketData.id, ticketData);

      // Get user settings for personalized summary
      const settings = await this.getSettings();

      // Create specialized summary prompt
      const summaryPrompt = this.buildTicketSummaryPrompt(ticketData, settings);

      const aiService = await this.getCurrentAIService();
      const summary = await aiService.processUserMessage(
        summaryPrompt,
        { ticketData },
        settings
      );

      sendResponse({
        success: true,
        summary: summary.response,
        tokensUsed: summary.tokensUsed,
      });
    } catch (error) {
      console.error('❌ [Background] Error handling ticket summary:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async extractTicketDataFromActiveTab(
    tabId: number
  ): Promise<TicketData | null> {
    try {
      // Get space info and issue key from URL first
      const spaceInfo = await this.extractSpaceInfoFromTab(tabId);
      if (!spaceInfo) {
        throw new Error('Could not extract space information from URL');
      }

      const issueKey = await this.extractIssueKeyFromTab(tabId);
      if (!issueKey) {
        throw new Error('Could not extract issue key from URL');
      }

      // Try to get ticket data via Backlog API first
      const apiData = await this.getTicketDataViaAPI(spaceInfo, issueKey);
      if (apiData) {
        return apiData;
      }

      // Fallback to DOM extraction
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // This function runs in the context of the web page
          if ((window as any).extractTicketData) {
            return (window as any).extractTicketData();
          } else {
            // Fallback: basic DOM extraction
            const titleElement = document.querySelector(
              'h1.loom-issue-title, .ticket-title, [data-test="issue-title"]'
            );
            const descriptionElement = document.querySelector(
              '.loom-issue-description, .ticket-description, [data-test="issue-description"]'
            );

            return {
              id: window.location.pathname.split('/').pop() || 'unknown',
              title: titleElement?.textContent?.trim() || 'No title found',
              description:
                descriptionElement?.textContent?.trim() ||
                'No description found',
              status: 'Unknown',
              priority: 'Unknown',
              assignee: 'Unknown',
              reporter: 'Unknown',
              dueDate: 'Unknown',
              labels: [],
              comments: [],
            };
          }
        },
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error extracting ticket data:', error);
      return null;
    }
  }

  private async extractSpaceInfoFromTab(
    tabId: number
  ): Promise<{ spaceName: string; domain: string; fullDomain: string } | null> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const url = window.location.href;
          const match = url.match(
            /https:\/\/([^.]+)\.(backlog\.com|backlog\.jp|backlogtool\.com)/
          );

          if (match) {
            return {
              spaceName: match[1],
              domain: match[2],
              fullDomain: `${match[1]}.${match[2]}`,
            };
          }

          return null;
        },
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error extracting space info:', error);
      return null;
    }
  }

  private async extractIssueKeyFromTab(tabId: number): Promise<string | null> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const url = window.location.href;
          const match = url.match(ISSUE_URL_REGEX);
          return match ? match[1] : null;
        },
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error extracting issue key:', error);
      return null;
    }
  }

  private async getTicketDataViaAPI(
    spaceInfo: { spaceName: string; domain: string },
    issueKey: string
  ): Promise<TicketData | null> {
    try {
      // Get Backlog API configuration
      const backlogSettings = await this.getBacklogMultiSettings();
      const config = this.findMatchingBacklogConfig(
        backlogSettings.data,
        spaceInfo
      );

      if (!config) {
        console.log(
          'No matching Backlog API config found, using DOM extraction'
        );
        return null;
      }

      // Call Backlog API through background script (no CORS issues)
      const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
      const apiUrl = `${baseUrl}/issues/${issueKey}?apiKey=${encodeURIComponent(
        config.apiKey
      )}`;

      console.log('Calling Backlog API:', apiUrl.replace(config.apiKey, '***'));

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const issueData = await response.json();

      // Get comments separately
      const commentsUrl = `${baseUrl}/issues/${issueKey}/comments?order=asc&apiKey=${encodeURIComponent(
        config.apiKey
      )}`;
      const commentsResponse = await fetch(commentsUrl);
      const comments = commentsResponse.ok ? await commentsResponse.json() : [];

      // Convert to our TicketData format
      return this.convertBacklogDataToTicketData(issueData, comments);
    } catch (error) {
      console.error('Error getting ticket data via API:', error);
      return null;
    }
  }

  private async getCommentDetails(
    spaceInfo: { spaceName: string; domain: string },
    issueKey: string,
    commentId: string
  ): Promise<any | null> {
    try {
      // Get Backlog API configuration
      const backlogConfig = await this.getCurrentBacklogConfig();

      if (!backlogConfig) {
        console.log('No Backlog API config found');
        return null;
      }

      // Call Backlog API to get specific comment
      const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
      const commentUrl = `${baseUrl}/issues/${issueKey}/comments/${commentId}?apiKey=${encodeURIComponent(
        backlogConfig.apiKey
      )}`;

      console.log(
        'Calling Backlog API for comment:',
        commentUrl.replace(backlogConfig.apiKey, '***')
      );

      const response = await fetch(commentUrl);
      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const commentData = await response.json();
      return commentData;
    } catch (error) {
      console.error('Error getting comment details via API:', error);
      return null;
    }
  }

  private async getPreviousComments(
    spaceInfo: { spaceName: string; domain: string },
    issueKey: string,
    maxId: string,
    count: number = 2
  ): Promise<any[] | null> {
    try {
      // Get Backlog API configuration
      const backlogConfig = await this.getCurrentBacklogConfig();

      if (!backlogConfig) {
        console.log('No Backlog API config found');
        return null;
      }

      // Call Backlog API to get previous comments
      const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
      const commentsUrl = `${baseUrl}/issues/${issueKey}/comments?apiKey=${encodeURIComponent(
        backlogConfig.apiKey
      )}&order=desc&count=${count}&maxId=${maxId}`;

      console.log(
        'Calling Backlog API for previous comments:',
        commentsUrl.replace(backlogConfig.apiKey, '***')
      );

      const response = await fetch(commentsUrl);
      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const commentsData = await response.json();
      return commentsData;
    } catch (error) {
      console.error('Error getting previous comments via API:', error);
      return null;
    }
  }

  private findMatchingBacklogConfig(
    configs: any[],
    spaceInfo: { spaceName: string; domain: string }
  ): any | null {
    return (
      configs.find(
        (config) =>
          config.domain === spaceInfo.domain &&
          config.spaceName === spaceInfo.spaceName
      ) || null
    );
  }

  private convertBacklogDataToTicketData(
    issueData: any,
    comments: any[]
  ): TicketData {
    const convertedTicketData = {
      id: issueData.issueKey || issueData.id,
      title: issueData.summary || 'No title',
      description: issueData.description || 'No description',
      status: issueData.status?.name || 'Unknown',
      priority: issueData.priority?.name || 'Unknown',
      assignee: issueData.assignee?.name || 'Unassigned',
      reporter: issueData.createdUser?.name || 'Unknown',
      dueDate: issueData.dueDate || 'No due date',
      labels: (issueData.category || []).map((cat: any) => cat.name),
      comments: comments.map((comment) => ({
        author: comment.createdUser?.name || 'Unknown',
        content: comment.content || '',
        timestamp: comment.created || '', // Map 'created' field to 'timestamp', keep ISO 8601 format
        created: comment.created || '', // Keep 'created' field as backup
      })),
      // Extended fields
      issueType: issueData.issueType?.name,
      created: issueData.created,
      updated: issueData.updated,
      estimatedHours: issueData.estimatedHours,
      actualHours: issueData.actualHours,
      parentIssueId: issueData.parentIssueId,
      customFields: issueData.customFields || [],
      attachments: issueData.attachments || [],
    };

    return convertedTicketData;
  }

  private buildTicketSummaryPrompt(
    ticketData: TicketData,
    settings?: Settings
  ): string {
    const roleContext = settings?.general.userRole
      ? this.getRoleContext(settings.general.userRole)
      : '';
    const languagePrompt = settings?.general.language
      ? this.getLanguagePrompt(settings.general.language)
      : this.getLanguagePrompt('vi');

    return `${languagePrompt}

${roleContext}

Hãy tạo một summary ngắn gọn và súc tích cho ticket Backlog sau:

**ID**: ${ticketData.id || 'Unknown'}
**Tiêu đề**: ${ticketData.title || 'No title'}
**Mô tả**: ${ticketData.description || 'No description'}
**Trạng thái**: ${ticketData.status || 'Unknown'}
**Độ ưu tiên**: ${ticketData.priority || 'Unknown'}
**Người được gán**: ${ticketData.assignee || 'Unassigned'}
**Người báo cáo**: ${ticketData.reporter || 'Unknown'}
**Hạn**: ${ticketData.dueDate || 'No due date'}
**Labels**: ${
      Array.isArray(ticketData.labels)
        ? ticketData.labels.join(', ')
        : 'No labels'
    }

${
  ticketData.comments && ticketData.comments.length > 0
    ? (() => {
        const sortedComments = this.filterEmptyComments(ticketData.comments);

        return `**Comments gần đây**:
${sortedComments
  .slice(-3)
  .map((comment) => {
    const content = comment.content || '';
    const truncatedContent =
      content.length > 100 ? content.substring(0, 100) + '...' : content;
    return `- ${comment.author}: ${truncatedContent}`;
  })
  .join('\n')}`;
      })()
    : ''
}

Hãy tóm tắt trong 3-5 câu ngắn gọn:
1. Vấn đề chính của ticket
2. Trạng thái hiện tại
3. Những điểm quan trọng cần lưu ý
4. Next steps nếu có thể xác định được`;
  }

  private filterEmptyComments(comments: any[]): any[] {
    return comments.filter((comment: any) => {
      return comment.content && comment.content.trim();
    });
  }

  private buildTranslatePrompt(
    ticketData: any,
    sourceLanguage?: string,
    targetLanguage?: string
  ): string {
    if (!ticketData) {
      const sourceDisplay = sourceLanguage
        ? getLanguageDisplayName(sourceLanguage)
        : 'ngôn ngữ nguồn';
      const targetDisplay = targetLanguage
        ? getLanguageDisplayName(targetLanguage)
        : 'tiếng Anh';
      return `Hãy dịch toàn bộ nội dung ticket từ ${sourceDisplay} sang ${targetDisplay}.`;
    }

    const sourceDisplay = sourceLanguage
      ? getLanguageDisplayName(sourceLanguage)
      : 'ngôn ngữ hiện tại';
    const targetDisplay = targetLanguage
      ? getLanguageDisplayName(targetLanguage)
      : 'tiếng Anh';

    const commentsSection =
      ticketData.comments && ticketData.comments.length > 0
        ? `\n\n**Comments**:\n${this.filterEmptyComments(ticketData.comments)
            .map(
              (comment: any, index: number) =>
                `${index + 1}. ${
                  comment.author || 'Unknown'
                }: ${comment.content.trim()}`
            )
            .join('\n')}`
        : '';

    return `Hãy dịch toàn bộ nội dung của ticket sau từ ${sourceDisplay} sang ${targetDisplay}:

**Tiêu đề**: ${ticketData.title || 'Không có tiêu đề'}
**Mô tả**: ${ticketData.description || 'Không có mô tả'}
**Trạng thái**: ${ticketData.status || 'Không rõ'}
**Độ ưu tiên**: ${ticketData.priority || 'Không rõ'}
**Người được gán**: ${ticketData.assignee || 'Chưa gán'}${commentsSection}

Bao gồm title, description, và các thông tin quan trọng khác. Giữ nguyên format và structure của nội dung.`;
  }

  // New method: Build suggestion prompt with ticket context
  private buildSuggestionPrompt(
    suggestionMessage: string,
    ticketData: any
  ): string {
    if (!ticketData) {
      return `Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng tiếng Việt:

**Yêu cầu:** ${suggestionMessage}`;
    }

    // Build ticket context
    const ticketContext = this.buildTicketContext(ticketData);

    // Map suggestion messages to detailed prompts
    let detailedPrompt = '';
    if (suggestionMessage === 'Tóm tắt nội dung') {
      detailedPrompt = `Hãy tóm tắt nội dung ticket này một cách ngắn gọn và rõ ràng. Bao gồm:
- Mục tiêu chính của ticket
- Các yêu cầu quan trọng
- Trạng thái hiện tại
- Các điểm cần lưu ý`;
    } else if (suggestionMessage === 'Giải thích yêu cầu ticket') {
      detailedPrompt = `Hãy giải thích chi tiết yêu cầu của ticket này. Bao gồm:
- Phân tích requirements
- Technical scope và complexity
- Các bước implementation được đề xuất
- Potential risks và challenges`;
    } else if (suggestionMessage === 'Dịch nội dung ticket') {
      detailedPrompt = `Hãy dịch toàn bộ nội dung ticket sang tiếng Anh một cách chuyên nghiệp, giữ nguyên technical terms và format.`;
    } else {
      detailedPrompt = suggestionMessage;
    }

    return `Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời yêu cầu sau bằng tiếng Việt, dựa trên thông tin ticket:

${ticketContext}

**Yêu cầu:** ${detailedPrompt}

Hãy respond bằng tiếng Việt. Giữ technical terms bằng tiếng Anh khi cần thiết.

Bạn đang tương tác với một Developer/Engineer. Hãy focus vào:
- Technical implementation details
- Code architecture và design patterns
- Performance và optimization
- Security considerations
- Development best practices`;
  }

  // New method: Build chat prompt with full context
  private buildChatPrompt(
    userMessage: string,
    ticketData: any,
    chatHistory: any[]
  ): string {
    if (!ticketData) {
      return `Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng tiếng Việt:

**Câu hỏi:** ${userMessage}`;
    }

    // Build ticket context
    const ticketContext = this.buildTicketContext(ticketData);

    // Build chat history context (last 10 messages to avoid token limit)
    const recentHistory = chatHistory.slice(-10);
    const historyContext =
      recentHistory.length > 0
        ? `\n\n**Lịch sử cuộc trò chuyện:**\n${recentHistory
            .map(
              (msg: any, index: number) =>
                `${index + 1}. ${msg.sender === 'user' ? 'User' : 'AI'}: ${
                  msg.content
                }`
            )
            .join('\n')}`
        : '';

    return `Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng tiếng Việt, dựa trên thông tin ticket và lịch sử cuộc trò chuyện:

${ticketContext}${historyContext}

**Câu hỏi hiện tại:** ${userMessage}

Hãy respond bằng tiếng Việt. Giữ technical terms bằng tiếng Anh khi cần thiết.

Bạn đang tương tác với một Developer/Engineer. Hãy focus vào:
- Technical implementation details
- Code architecture và design patterns
- Performance và optimization
- Security considerations
- Development best practices`;
  }

  // Helper method: Build ticket context
  private buildTicketContext(ticketData: any): string {
    const sortedComments = this.filterEmptyComments(ticketData.comments || []);

    const commentsSection =
      sortedComments.length > 0
        ? `\n\n**Comments (theo thời gian):**\n${sortedComments
            .map(
              (comment: any, index: number) =>
                `${index + 1}. ${
                  comment.author || 'Unknown'
                }: ${comment.content.trim()}`
            )
            .join('\n')}`
        : '';

    return `**Thông tin ticket hiện tại:**
- ID: ${ticketData.id || ticketData.key || 'Không rõ'}
- Tiêu đề: ${ticketData.title || 'Không có tiêu đề'}
- Trạng thái: ${ticketData.status || 'Không rõ'}
- Độ ưu tiên: ${ticketData.priority || 'Không rõ'}
- Người được gán: ${ticketData.assignee || 'Chưa gán'}
- Mô tả: ${ticketData.description || 'Không có mô tả'}${commentsSection}`;
  }

  private async getSettings(): Promise<Settings> {
    try {
      // Use SettingsService to get all settings
      return await this.settingsService.getAllSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      // Return default settings
      return {
        general: { language: 'vi', userRole: 'developer' },
        features: {
          rememberChatboxSize: true,
          autoOpenChatbox: false,
          enterToSend: true,
        },
        aiModels: {
          selectedModels: [defaultModelId],
          preferredModel: defaultModelId,
          aiProviderKeys: { openAi: '', gemini: '' },
        },
        backlog: [],
        sidebarWidth: 400,
      };
    }
  }

  private async saveSettings(settings: Settings) {
    try {
      // Use SettingsService to save settings
      await this.settingsService.saveAllSettings(settings);
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Settings save failed:', error);
    }
  }

  private async getBacklogMultiSettings(): Promise<SettingsResponse> {
    try {
      const data = await this.settingsService.getBacklogs();
      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('Error getting Backlog multi settings:', error);
      return {
        success: false,
        error: 'Failed to get Backlog settings',
      };
    }
  }

  private async saveBacklogMultiSettings(settings: { configs: any[] }) {
    try {
      await chrome.storage.sync.set({
        backlogConfigs: settings.configs,
      });
    } catch (error) {
      console.error('Error saving Backlog multi settings:', error);
      throw error;
    }
  }

  private async testBacklogConnection(config: {
    id: string;
    domain: string;
    spaceName: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Handle both old format (spaceName + domain) and new format (full domain)
      let baseUrl: string;
      let spaceName: string;

      if (config.domain && config.domain.includes('.')) {
        // New format: domain is "nals.backlogtool.com"
        const domainParts = config.domain.split('.');
        spaceName = domainParts[0];
        const baseDomain = domainParts.slice(1).join('.');
        baseUrl = `https://${config.domain}`;
      } else {
        // Old format: spaceName + domain separately
        spaceName = config.spaceName;
        baseUrl = `https://${config.spaceName}.${config.domain}`;
      }

      const apiUrl = `${baseUrl}/api/v2/space?apiKey=${encodeURIComponent(
        config.apiKey
      )}`;

      console.log('Testing Backlog connection:', baseUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const spaceInfo = await response.json();
        console.log('Backlog connection successful:', spaceInfo);
        return {
          success: true,
          message: `Kết nối thành công! Space: ${spaceInfo.name || spaceName}`,
          data: spaceInfo,
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'API Key không hợp lệ hoặc không có quyền truy cập',
        };
      } else if (response.status === 404) {
        return {
          success: false,
          message: 'Domain không tồn tại hoặc không thể truy cập',
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Kết nối thất bại: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }
    } catch (error) {
      console.error('Backlog connection test failed:', error);
      return {
        success: false,
        message: 'Lỗi kết nối. Kiểm tra internet và thông tin cấu hình.',
      };
    }
  }

  private async getCurrentBacklogConfig() {
    // Get space info from current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id || !tabs[0]?.url) {
      throw new Error('No active tab found');
    }

    const spaceInfo = await this.extractSpaceInfoFromTab(tabs[0].id);
    if (!spaceInfo) {
      throw new Error('Could not extract space information from URL');
    }

    // Get Backlog API configuration
    const backlogSettings = await this.settingsService.getBacklogs();
    return backlogSettings.find(
      ({ domain }) => domain === spaceInfo.fullDomain
    );
  }

  private async getCurrentUser(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const backlogConfig = await this.getCurrentBacklogConfig();

      if (!backlogConfig) {
        return {
          success: false,
          error: 'No matching Backlog API config found',
        };
      }

      // Call Backlog API to get current user
      const baseUrl = `https://${backlogConfig.domain}/api/v2`;
      const apiUrl = `${baseUrl}/users/myself?apiKey=${encodeURIComponent(
        backlogConfig.apiKey
      )}`;

      console.log(
        'Getting current user from Backlog API:',
        apiUrl.replace(backlogConfig.apiKey, '***')
      );

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const userData = await response.json();
      console.log('Current user data:', userData);

      return {
        success: true,
        data: {
          id: userData.id,
          name: userData.name,
          avatar: userData.nulabAccount?.iconUrl || '', // Access correct avatar path
          mailAddress: userData.mailAddress,
          userId: userData.userId,
          nulabAccount: userData.nulabAccount, // Include full nulabAccount for debugging
        },
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  private getRoleContext(userRole: string): string {
    const roleContexts = {
      developer: `
Bạn đang tương tác với một Developer/Engineer. Hãy focus vào:
- Technical implementation details
- Code architecture và design patterns
- Performance và optimization
- Security considerations
- Development best practices`,
      pm: `
Bạn đang tương tác với một Project Manager. Hãy focus vào:
- Project timeline và milestones
- Resource planning và allocation
- Risk assessment và mitigation
- Stakeholder communication
- Delivery estimation`,
      qa: `
Bạn đang tương tác với một QA/Testing specialist. Hãy focus vào:
- Test cases và test scenarios
- Quality assurance processes
- Bug reproduction steps
- Testing strategies
- Quality metrics`,
      designer: `
Bạn đang tương tác với một Designer. Hãy focus vào:
- User experience và user interface
- Design consistency và guidelines
- Accessibility considerations
- Visual design elements
- User journey optimization`,
      devops: `
Bạn đang tương tác với một DevOps engineer. Hãy focus vào:
- Infrastructure và deployment
- CI/CD pipeline optimization
- Monitoring và alerting
- System reliability
- Performance tuning`,
      other: `
Bạn đang tương tác với một team member. Hãy cung cấp:
- General overview và context
- Clear explanations
- Actionable insights
- Collaborative recommendations`,
    };

    return (
      roleContexts[userRole as keyof typeof roleContexts] || roleContexts.other
    );
  }

  private getLanguagePrompt(language: string): string {
    const languagePrompts = {
      vi: `Hãy respond bằng tiếng Việt. Giữ technical terms bằng tiếng Anh khi cần thiết.`,
      en: `Please respond in English with clear and professional language.`,
      ja: `日本語で回答してください。技術用語は適切に使用してください。`,
    };

    return (
      languagePrompts[language as keyof typeof languagePrompts] ||
      languagePrompts.vi
    );
  }

  private async handleSidebarWidthSync(
    width: number,
    sender: chrome.runtime.MessageSender
  ): Promise<void> {
    try {
      // Get all tabs to sync width
      const tabs = await chrome.tabs.query({});

      // Send width update to all other tabs
      const promises = tabs.map(async (tab) => {
        if (tab.id && tab.id !== sender.tab?.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SIDEBAR_WIDTH_UPDATE',
              width: width,
            });
          } catch (error) {
            // Ignore errors for tabs without content script
            console.log(`Tab ${tab.id} does not have content script loaded`);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('❌ [Background] Error syncing sidebar width:', error);
    }
  }

  private handleOpenOptionsPage(): void {
    try {
      // Open options page in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html'),
        active: true,
      });
    } catch (error) {
      console.error('❌ [Background] Error opening options page:', error);
    }
  }

  // ===========================================
  // Settings Message Handlers
  // ===========================================

  private async handleGetSettings(
    message: SettingsMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const settings = await this.settingsService.getAllSettings();
      const response: SettingsResponse = {
        success: true,
        data: settings,
      };
      sendResponse(response);
    } catch (error) {
      console.error('❌ [Settings] Failed to get settings:', error);
      const response: SettingsResponse = {
        success: false,
        error: 'Failed to load settings',
      };
      sendResponse(response);
    }
  }

  private async handleUpdateSettings(
    message: SettingsMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      if (message.data) {
        await this.settingsService.saveAllSettings(message.data);
        const response: SettingsResponse = {
          success: true,
        };
        sendResponse(response);
      } else {
        throw new Error('No settings data provided');
      }
    } catch (error) {
      console.error('❌ [Settings] Failed to update settings:', error);
      const response: SettingsResponse = {
        success: false,
        error: 'Failed to save settings',
      };
      sendResponse(response);
    }
  }

  private async handleGetSection(
    message: SettingsMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      let sectionData: any;

      switch (message.section) {
        case 'general':
          sectionData = await this.settingsService.getGeneralSettings();
          break;
        case 'features':
          sectionData = await this.settingsService.getFeatureFlags();
          break;
        case 'aiModels':
          sectionData = await this.settingsService.getAiModelSettings();
          break;
        case 'backlog':
          sectionData = await this.settingsService.getBacklogs();
          break;
        default:
          throw new Error(`Unknown section: ${message.section}`);
      }

      const response: SettingsResponse = {
        success: true,
        data: sectionData,
      };
      sendResponse(response);
    } catch (error) {
      console.error(
        `❌ [Settings] Failed to get section ${message.section}:`,
        error
      );
      const response: SettingsResponse = {
        success: false,
        error: `Failed to load ${message.section} settings`,
      };
      sendResponse(response);
    }
  }

  private async handleUpdateSection(
    message: SettingsMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      if (!message.data) {
        throw new Error('No section data provided');
      }

      switch (message.section) {
        case 'general':
          await this.settingsService.updateGeneralSettings(message.data);
          break;
        case 'features':
          await this.settingsService.updateFeatureFlags(message.data);
          break;
        case 'aiModels':
          await this.settingsService.updateAiModelSettings(message.data);
          break;
        case 'backlog':
          await this.settingsService.updateBacklogs(message.data);
          break;
        default:
          throw new Error(`Unknown section: ${message.section}`);
      }

      const response: SettingsResponse = {
        success: true,
      };
      sendResponse(response);
    } catch (error) {
      console.error(
        `❌ [Settings] Failed to update section ${message.section}:`,
        error
      );
      const response: SettingsResponse = {
        success: false,
        error: `Failed to save ${message.section} settings`,
      };
      sendResponse(response);
    }
  }

  // ===========================================
  // Create Ticket Feature Handlers
  // ===========================================

  private async handleFetchBacklogProjects(
    data: any,
    sendResponse: (response?: any) => void
  ) {
    try {
      const { domain, apiKey } = data;

      if (!domain || !apiKey) {
        throw new Error('Missing domain or API key');
      }

      console.log('📋 [Background] Fetching projects for domain:', domain);

      const projects = await BacklogApiService.fetchProjects(domain, apiKey);

      console.log('✅ [Background] Fetched projects:', projects.length);

      sendResponse({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error('❌ [Background] Failed to fetch projects:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleFetchIssueTypes(
    data: any,
    sendResponse: (response?: any) => void
  ) {
    console.log('🔎 ~ BackgroundService ~ handleFetchIssueTypes ~ data:', data);
    try {
      const { domain, apiKey, projectKey } = data;

      if (!domain || !apiKey || !projectKey) {
        throw new Error('Missing domain, API key, or project key');
      }

      console.log(
        '📋 [Background] Fetching issue types for project:',
        projectKey
      );

      const issueTypes = await BacklogApiService.fetchIssueTypes(
        domain,
        apiKey,
        projectKey
      );

      console.log('✅ [Background] Fetched issue types:', issueTypes.length);

      sendResponse({
        success: true,
        data: issueTypes,
      });
    } catch (error) {
      console.error('❌ [Background] Failed to fetch issue types:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleGetCommentContext(
    data: {
      spaceInfo: { spaceName: string; domain: string };
      issueKey: string;
      commentId: string;
    },
    sendResponse: (response?: any) => void
  ) {
    try {
      const { spaceInfo, issueKey, commentId } = data;

      // Get the selected comment details
      const commentDetails = await this.getCommentDetails(
        spaceInfo,
        issueKey,
        commentId
      );

      if (!commentDetails) {
        sendResponse({
          success: false,
          error: 'Failed to get comment details',
        });
        return;
      }

      // Get previous comments (2 comments before the selected one)
      const previousComments = await this.getPreviousComments(
        spaceInfo,
        issueKey,
        commentId,
        2
      );

      // Prepare context data
      const contextData = {
        selectedComment: commentDetails,
        previousComments: previousComments || [],
        issueKey: issueKey,
        commentId: commentId,
      };

      console.log('✅ [Background] Comment context prepared:', {
        selectedCommentId: commentId,
        previousCommentsCount: previousComments?.length || 0,
      });

      sendResponse({ success: true, data: contextData });
    } catch (error) {
      console.error('❌ [Background] Failed to get comment context:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async handleCreateTicketCommand(
    {
      backlogDomain,
      projectKey,
      language,
      issueTypeId,
      priorityId,
      ticketData,
      currentUrl,
    }: {
      backlogDomain: string;
      projectKey: string;
      language: string;
      issueTypeId: number | string;
      priorityId: number | string;
      ticketData: any;
      currentUrl: string;
    },
    sendResponse: (response?: any) => void
  ) {
    try {
      console.log('🎫 [Background] Processing create-ticket command:', {
        backlogDomain,
        projectKey,
        language,
      });

      // Get AI service for generating ticket content
      const aiService = await this.getCurrentAIService();
      if (!aiService) {
        throw new Error('AI service not configured');
      }

      // Build AI prompt for ticket creation
      const prompt = this.buildCreateTicketPrompt(
        ticketData,
        language,
        currentUrl
      );

      // Get AI-generated ticket data
      const settings = await this.settingsService.getAllSettings();
      const aiResult = await aiService.processUserMessage(
        prompt,
        ticketData,
        settings
      );
      const aiResponse = aiResult.response;

      // Parse AI response as JSON
      let aiTicketData;
      try {
        // Try to extract JSON from AI response
        const jsonMatch = aiResponse
          .replace('```json\n', '')
          .replace('\n```', '')
          .match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiTicketData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', aiResponse);
        throw new Error('AI response is not valid JSON format');
      }

      // Get backlogs to find the appropriate one for the project
      const backlogs = await this.settingsService.getBacklogs();
      if (backlogs.length === 0) {
        throw new Error(
          'No backlog configurations found. Please configure backlogs in settings.'
        );
      }

      const selectedBacklog = backlogs.find((b) => b.domain === backlogDomain);

      if (!selectedBacklog) {
        throw new Error(`Backlog not found for domain: ${backlogDomain}`);
      }

      // Verify project exists
      const project = await BacklogApiService.getProjectByKey(
        selectedBacklog.domain,
        selectedBacklog.apiKey,
        projectKey
      );

      if (!project) {
        throw new Error(
          `Project "${projectKey}" not found in backlog "${selectedBacklog.domain}"`
        );
      }

      // Create the ticket
      const result = await TicketCreationService.createTicketFromAI(
        selectedBacklog,
        projectKey,
        {
          ...aiTicketData,
          issueTypeId,
          priorityId,
        }
      );

      // Generate success message
      const successMessage = TicketCreationService.generateSuccessMessage(
        result.ticket,
        result.ticketUrl
      );

      // Send success response with the created ticket info
      sendResponse({
        success: true,
        response: successMessage,
        tokensUsed: aiResult.tokensUsed,
        responseId: aiResult.responseId,
      });
    } catch (error) {
      console.error('❌ [Background] Failed to create ticket:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      sendResponse({
        success: false,
        response: {
          message: `❌ Lỗi tạo ticket: ${errorMessage}`,
          sender: 'ai',
        },
      });
    }
  }

  private buildCreateTicketPrompt(
    ticketData: any,
    targetLanguage: string,
    sourceTicketUrl = '#'
  ): string {
    const languageMap: Record<string, string> = {
      vi: 'tiếng Việt',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      zh: '中文',
      th: 'ไทย',
      id: 'Bahasa Indonesia',
      ms: 'Bahasa Melayu',
      tl: 'Filipino',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
      pt: 'Português',
      it: 'Italiano',
      ru: 'Русский',
    };

    const languageName = languageMap[targetLanguage] || 'English';

    const aiLebel = `Generated by AI - [Backlog AI Assistant](https://github.com/trandaison/backlog-ai-ext).
Source ticket: ${sourceTicketUrl}`;

    return `Dựa trên thông tin ticket dưới đây:

**Thông tin ticket gốc:**
  - summary: ${ticketData.title},
  - description: ${ticketData.description}

---

**Yêu cầu:**
1. Dịch thông tin của ticket để tạo ticket mới bằng ngôn ngữ ${languageName}
2. Thêm nội dung AI label ("${aiLebel}") vào cuối description bằng ngôn ngữ ${languageName}, phân cách với phần nội dung chính bằng "---".
3. Giữ nguyên template và format của \`description\`, giữ nguyên các URL và các từ khóa chuyên ngành (hoặc có thể sử dụng tiếng anh).

**Phản hồi dưới dạng JSON với format:**
{
  "summary": "Tiêu đề ticket bằng ${languageName}",
  "description": "Mô tả chi tiết bằng ${languageName}",
}

Chỉ trả về JSON, không thêm text khác.`;
  }

  private async handleTrackChatEvent(data: { uniqueId: string }): Promise<void> {
    try {
      await GAService.collect({
        uniqueId: data.uniqueId,
        event: GA4_CONFIG.EVENTS.EXTENSION_CHAT,
      });
    } catch (error) {
      // Silent failure - don't break the main functionality
    }
  }
}

// Khởi tạo background service
new BackgroundService();
