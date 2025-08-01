// Background script để xử lý AI API và communication
import { TicketData } from '../shared/ticketAnalyzer';
import { EncryptionService } from '../shared/encryption';
import ContextOptimizer from '../shared/contextOptimizer';
import { availableModels, defaultModelId } from '../configs';
import type { ChatHistoryData } from '../shared/chatStorageService';

interface Settings {
  apiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
  geminiApiKey?: string;
  preferredProvider?: 'openai' | 'gemini';
}

interface StoredSettings {
  encryptedApiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
  encryptedGeminiApiKey?: string;
  preferredProvider?: 'openai' | 'gemini';
}

interface BacklogSettings {
  backlogApiKey: string;
  backlogSpaceName: string;
}

interface BacklogApiConfig {
  id: string;
  domain: string;
  spaceName: string;
  apiKey: string;
}

interface BacklogMultiSettings {
  configs: BacklogApiConfig[];
}

interface AIService {
  analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string>;
  processUserMessage(message: string, context: any, settings?: Settings): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }>;
}

class GeminiService implements AIService {
  private apiKey: string = '';
  private baseApiUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(['encryptedGeminiApiKey']);
      if (result.encryptedGeminiApiKey) {
        this.apiKey = await EncryptionService.decryptApiKey(result.encryptedGeminiApiKey);
        console.log('🔑 [Gemini] API key loaded successfully');
      }
    } catch (error) {
      console.error('❌ [Gemini] Error loading API key:', error);
    }
  }

  // Map preferred model to actual Gemini API model name
  private getGeminiModelName(preferredModel?: string): string {
    if (!preferredModel) {
      // Use default model from config and map to actual Gemini model
      const defaultModel = availableModels.find(m => m.id === defaultModelId);
      if (defaultModel?.provider === 'gemini') {
        return this.mapToGeminiAPI(defaultModelId);
      }
      return 'gemini-1.5-flash-latest'; // fallback
    }

    return this.mapToGeminiAPI(preferredModel);
  }

  private mapToGeminiAPI(modelId: string): string {
    const modelMap: Record<string, string> = {
      'gemini-2.5-pro': 'gemini-1.5-pro-latest',
      'gemini-2.5-flash': 'gemini-1.5-flash-latest',
      'gemini-2.5-flash-lite': 'gemini-1.5-flash'
    };

    return modelMap[modelId] || 'gemini-1.5-flash-latest';
  }

  private getApiUrl(model: string = 'gemini-1.5-flash-latest'): string {
    return `${this.baseApiUrl}/${model}:generateContent`;
  }

  async analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string> {
    const prompt = this.buildAnalysisPrompt(ticketData, settings);
    const result = await this.callGeminiAPI(prompt, settings);
    return result.response;
  }

  async processUserMessage(message: string, contextData: any, settings?: Settings): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    // Check if this is optimized context from ContextOptimizer
    if (contextData.isOptimized) {
      console.log('🚀 [Gemini] Using optimized context, estimated tokens:', contextData.estimatedTokens);
      const result = await this.callGeminiAPI(message, settings);
      return {
        response: result.response,
        responseId: result.responseId,
        tokensUsed: result.tokensUsed || ContextOptimizer.estimateTokenCount(result.response)
      };
    }

    // Legacy handling for non-optimized context
    const result = await this.callGeminiAPI(message, settings);
    return {
      response: result.response,
      responseId: result.responseId,
      tokensUsed: result.tokensUsed || ContextOptimizer.estimateTokenCount(result.response)
    };
  }

  private buildAnalysisPrompt(ticketData: TicketData, settings?: Settings): string {
    const language = settings?.language === 'vi' ? 'tiếng Việt' : 'English';
    const role = settings?.userRole || 'developer';

    return `Bạn là một AI assistant chuyên phân tích ticket/issue cho ${role}.
Hãy phân tích ticket sau và đưa ra nhận xét hữu ích bằng ${language}:

**Thông tin ticket:**
- ID: ${ticketData.id}
- Tiêu đề: ${ticketData.title}
- Mô tả: ${ticketData.description}
- Trạng thái: ${ticketData.status}
- Độ ưu tiên: ${ticketData.priority}
- Người được giao: ${ticketData.assignee}
- Người báo cáo: ${ticketData.reporter}
- Hạn chót: ${ticketData.dueDate}
- Nhãn: ${ticketData.labels?.join(', ')}

Hãy cung cấp:
1. Tóm tắt ngắn gọn
2. Mức độ phức tạp và ước tính thời gian
3. Các bước xử lý được đề xuất
4. Rủi ro và lưu ý cần chú ý`;
  }

  private buildChatPrompt(message: string, context: any, settings?: Settings): string {
    const language = settings?.language === 'vi' ? 'tiếng Việt' : 'English';
    const role = settings?.userRole || 'developer';

    let prompt = `Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:\n\n`;

    if (context.ticketData) {
      prompt += `**Bối cảnh ticket hiện tại:**
- ID: ${context.ticketData.id}
- Tiêu đề: ${context.ticketData.title}
- Trạng thái: ${context.ticketData.status}\n\n`;
    }

    if (context.chatHistory && context.chatHistory.length > 0) {
      prompt += `**Lịch sử chat gần đây:**\n`;
      context.chatHistory.slice(-3).forEach((msg: any) => {
        prompt += `${msg.sender}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `**Câu hỏi:** ${message}`;

    return prompt;
  }

  private async callGeminiAPI(prompt: string, settings?: Settings): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    try {
      const apiKey = settings?.geminiApiKey || this.apiKey;
      if (!apiKey) {
        return {
          response: 'Gemini API key chưa được cấu hình. Vui lòng vào popup để cài đặt.',
          tokensUsed: 0
        };
      }

      // Get the actual Gemini model name from preferred model
      const geminiModel = this.getGeminiModelName(settings?.aiModel);
      const apiUrl = this.getApiUrl(geminiModel);

      console.log('🔄 [Gemini] Calling Gemini API with preferred model:', settings?.aiModel);
      console.log('🔄 [Gemini] Using actual Gemini model:', geminiModel);
      console.log('🔧 [Gemini] Estimated input tokens:', ContextOptimizer.estimateTokenCount(prompt));

      const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased from 1024 to handle longer responses
          }
        })
      });

      console.log('🔧 [Gemini] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Gemini] API Error Response:', errorText);
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🔧 [Gemini] API Response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        hasError: !!data.error,
        hasUsageMetadata: !!data.usageMetadata
      });

      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const content = data.candidates[0].content.parts[0].text;
        const responseId = data.candidates[0].citationMetadata?.citationSources?.[0]?.endIndex?.toString() || undefined;
        const tokensUsed = data.usageMetadata?.totalTokenCount || ContextOptimizer.estimateTokenCount(content);

        console.log('✅ [Gemini] Response generated successfully');
        console.log('🔧 [Gemini] Token usage:', {
          totalTokens: tokensUsed,
          promptTokens: data.usageMetadata?.promptTokenCount,
          candidatesTokens: data.usageMetadata?.candidatesTokenCount
        });

        return {
          response: content,
          responseId,
          tokensUsed
        };
      } else {
        console.error('❌ [Gemini] Invalid API response structure:', data);
        throw new Error('Invalid Gemini API response - no content in candidates');
      }
    } catch (error) {
      console.error('❌ [Gemini] Error calling API:', error);
      throw error;
    }
  }
}

class OpenAIService implements AIService {
  private apiKey: string = '';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(['encryptedApiKey']);
      if (result.encryptedApiKey) {
        this.apiKey = await EncryptionService.decryptApiKey(result.encryptedApiKey);
      } else {
        this.apiKey = '';
      }
    } catch (error) {
      console.error('Failed to load/decrypt API key:', error);
      this.apiKey = '';
    }
  }

  private getOpenAIModel(settings?: Settings): string {
    const preferredModel = settings?.aiModel || defaultModelId;

    // Map preferred model to actual OpenAI API model name
    const modelMap: Record<string, string> = {
      'o3': 'o3',
      'o3-pro': 'o3-pro',
      'o3-mini': 'o3-mini',
      'gpt-4.1': 'gpt-4',
      'gpt-4.1-mini': 'gpt-4-turbo',
      'gpt-4.1-nano': 'gpt-3.5-turbo',
      'gpt-4o': 'gpt-4o',
      'chatgpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'o4-mini': 'gpt-4o-mini'
    };

    const mappedModel = modelMap[preferredModel] || preferredModel;

    // Ensure we only use valid OpenAI models
    const validOpenAIModels = [
      'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini',
      'o3', 'o3-pro', 'o3-mini'
    ];

    // Use default model mapping if current model is not OpenAI
    const defaultModel = availableModels.find(m => m.id === defaultModelId);
    const fallbackModel = defaultModel?.provider === 'openai'
      ? (modelMap[defaultModelId] || 'gpt-4o-mini')
      : 'gpt-4o-mini';

    return validOpenAIModels.includes(mappedModel) ? mappedModel : fallbackModel;
  }

  async analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string> {
    const apiKey = settings?.apiKey || this.apiKey;
    if (!apiKey) {
      await this.loadApiKey(); // Try to reload in case it was updated
      const fallbackApiKey = settings?.apiKey || this.apiKey;
      if (!fallbackApiKey) {
        return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
      }
    }

    const finalApiKey = settings?.apiKey || this.apiKey;
    const prompt = this.buildTicketAnalysisPrompt(ticketData, settings);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`
        },
        body: JSON.stringify({
          model: this.getOpenAIModel(settings),
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(settings)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return `Lỗi khi gọi AI API: ${error}`;
    }
  }

  async processUserMessage(message: string, contextData: any, settings?: Settings): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    const apiKey = settings?.apiKey || this.apiKey;
    if (!apiKey) {
      return {
        response: 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.',
        tokensUsed: 0
      };
    }

    // The message is already processed by BackgroundService with full context
    // Build messages array for OpenAI
    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(settings)
      },
      {
        role: 'user',
        content: message
      }
    ];

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.getOpenAIModel(settings),
          messages,
          max_tokens: 1500, // Increased from 800
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;
        const tokensUsed = data.usage?.total_tokens || ContextOptimizer.estimateTokenCount(content);
        const responseId = data.id;

        return {
          response: content,
          responseId,
          tokensUsed
        };
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return {
        response: `Lỗi khi gọi AI API: ${error}`,
        tokensUsed: 0
      };
    }
  }

  private buildTicketAnalysisPrompt(ticketData: TicketData, settings?: Settings): string {
    const roleContext = this.getRoleContext(settings?.userRole || 'developer');
    const languagePrompt = this.getLanguagePrompt(settings?.language || 'vi');

    return `${languagePrompt}

${roleContext}

Hãy phân tích ticket Backlog sau:

**ID**: ${ticketData.id || 'Unknown'}
**Tiêu đề**: ${ticketData.title || 'No title'}
**Mô tả**: ${ticketData.description || 'No description'}
**Trạng thái**: ${ticketData.status || 'Unknown'}
**Độ ưu tiên**: ${ticketData.priority || 'Unknown'}
**Người được gán**: ${ticketData.assignee || 'Unassigned'}
**Người báo cáo**: ${ticketData.reporter || 'Unknown'}
**Hạn**: ${ticketData.dueDate || 'No due date'}
**Labels**: ${Array.isArray(ticketData.labels) ? ticketData.labels.join(', ') : 'No labels'}

**Comments**:
${ticketData.comments
  .filter((comment: any) => comment.content && comment.content.trim())
  .sort((a: any, b: any) => {
    // Sort by timestamp field ascending (oldest first, newest last)
    // timestamp contains ISO 8601 format from Backlog API's 'created' field
    const timeA = new Date(a.timestamp || a.created || 0).getTime();
    const timeB = new Date(b.timestamp || b.created || 0).getTime();
    return timeA - timeB;
  })
  .map((comment: any) => {
    const content = comment.content || '';
    return `- ${comment.author} (${comment.timestamp}): ${content}`;
  }).join('\n')}

Hãy đưa ra:
1. Tóm tắt nội dung ticket
2. Phân tích mức độ phức tạp
3. Đề xuất approach để giải quyết
4. Những điểm cần chú ý
5. Timeline ước tính (nếu có thể)
`;
  }

  private buildSystemPrompt(settings?: Settings): string {
    const roleContext = this.getRoleContext(settings?.userRole || 'developer');
    const languageContext = this.getLanguagePrompt(settings?.language || 'vi');

    let systemPrompt = `${languageContext}

${roleContext}

Bạn là AI assistant chuyên hỗ trợ phân tích và thảo luận về ticket Backlog.
Bạn có thể:
- Phân tích chi tiết nội dung ticket
- Đề xuất giải pháp kỹ thuật
- Giải thích các khái niệm kỹ thuật
- Hỗ trợ communication giữa các team member
- Đưa ra estimate và timeline
- Translate và explain content

Hãy response một cách chuyên nghiệp, chi tiết và hữu ích.`;

    return systemPrompt;
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
- Collaborative recommendations`
    };

    return roleContexts[userRole as keyof typeof roleContexts] || roleContexts.other;
  }

  private getLanguagePrompt(language: string): string {
    const languagePrompts = {
      vi: `Hãy respond bằng tiếng Việt. Giữ technical terms bằng tiếng Anh khi cần thiết.`,
      en: `Please respond in English with clear and professional language.`,
      ja: `日本語で回答してください。技術用語は適切に使用してください。`
    };

    return languagePrompts[language as keyof typeof languagePrompts] || languagePrompts.vi;
  }
}

class BackgroundService {
  private openaiService: OpenAIService;
  private geminiService: GeminiService;
  private ticketDataCache: Map<string, TicketData> = new Map();

  constructor() {
    this.openaiService = new OpenAIService();
    this.geminiService = new GeminiService();
    this.setupMessageListeners();
  }

  // Get the current AI service based on user settings
  private async getCurrentAIService(): Promise<AIService> {
    const settings = await this.getSettings();

    if (settings.preferredProvider === 'gemini') {
      return this.geminiService;
    } else {
      return this.openaiService;
    }
  }

  // Helper to get safe OpenAI model name
  private getOpenAIModelName(settings?: Settings): string {
    const model = settings?.aiModel || 'gpt-3.5-turbo';
    const openAIModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];
    return openAIModels.includes(model) ? model : 'gpt-3.5-turbo';
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

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.action) {
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

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: String(error) });
    }
  }

  private async handleTicketAnalysis(ticketData: TicketData, sendResponse: (response?: any) => void) {
    try {
      // Cache ticket data only - no automatic AI analysis
      this.ticketDataCache.set(ticketData.id, ticketData);

      console.log('🎯 [Background] Ticket data cached for:', ticketData.id);
      console.log('💡 [Background] AI analysis will only run when user requests it');

      sendResponse({ success: true, cached: true });
    } catch (error) {
      console.error('Error caching ticket data:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async handleUserMessage(data: any, sendResponse: (response?: any) => void) {
    try {
      console.log('🔍 [Background] handleUserMessage received data:', data);

      const { message, messageType, ticketData, chatHistory, userInfo } = data;

      // Get current AI service
      const settings = await this.getSettings();
      const aiService = await this.getCurrentAIService();

      if (!aiService) {
        throw new Error('AI service not configured');
      }

      let processedMessage = message;
      let optimizedContext: any = data;

      // Build context-aware prompt based on message type
      if (messageType === 'suggestion') {
        processedMessage = this.buildSuggestionPrompt(message, ticketData);
      } else {
        // For regular chat, use optimized context processing
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
          console.log('🚀 [Background] Using ContextOptimizer for chat context');

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
              compressed: msg.compressed
            })),
            lastUpdated: new Date().toISOString(),
            userInfo: userInfo || {
              id: 0,
              name: 'User',
              avatar: '',
              mailAddress: '',
              userId: 'current-user'
            },
            ticketInfo: {
              title: ticketData?.title || 'Current Ticket',
              status: ticketData?.status || 'Unknown',
              assignee: ticketData?.assignee
            },
            contextSummary: data.contextSummary,
            lastSummaryIndex: data.lastSummaryIndex,
            totalTokensUsed: data.totalTokensUsed
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
            recentMessages: optimizedResult.recentMessages
          };

          console.log('🔧 [Background] Optimized context:', {
            originalMessages: chatHistory.length,
            recentMessages: optimizedResult.recentMessages.length,
            estimatedTokens: optimizedResult.estimatedTokens
          });
        } else {
          // For regular chat without history, include full context
          processedMessage = this.buildChatPrompt(message, ticketData, chatHistory);
        }
      }

      // Process with AI service
      const response = await aiService.processUserMessage(processedMessage, optimizedContext, settings);

      console.log('✅ [Background] AI response received:', response.response.substring(0, 200) + '...');
      console.log('🔧 [Background] Token usage:', response.tokensUsed, 'tokens');

      sendResponse({ success: true, response: response.response, tokensUsed: response.tokensUsed, responseId: response.responseId });

    } catch (error) {
      console.error('❌ [Background] Error processing message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleChatWithAI(data: any, sendResponse: (response?: any) => void) {
    try {
      const { message, ticketData, chatHistory } = data;

      // Build context for AI conversation
      const context = {
        conversationHistory: chatHistory || [],
        ticketData: ticketData || null,
        currentMessage: message
      };

      // Get user settings for personalized responses
      const settings = await this.getSettings();
      const aiService = await this.getCurrentAIService();
      const response = await aiService.processUserMessage(message, context, settings);

      sendResponse({ success: true, response });
    } catch (error) {
      console.error('Error in handleChatWithAI:', error);
      sendResponse({
        success: false,
        error: `Lỗi khi chat với AI: ${error}`
      });
    }
  }

  private async handleTicketSummary(data: any, sendResponse: (response?: any) => void) {
    try {
      console.log('🔄 [Background] Handling ticket summary request:', data);

      let ticketData = data.ticketData;

      // If ticket data is not provided, try to extract from active tab
      if (!ticketData) {
        console.log('🔧 [Background] No ticket data provided, extracting from active tab...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id || !tabs[0]?.url) {
          throw new Error('No active tab found');
        }
        ticketData = await this.extractTicketDataFromActiveTab(tabs[0].id);
      }

      if (!ticketData) {
        throw new Error('Could not extract ticket data');
      }

      console.log('🔧 [Background] Ticket data for summary:', {
        id: ticketData.id,
        title: ticketData.title,
        status: ticketData.status,
        hasDescription: !!ticketData.description
      });

      // Cache the ticket data
      this.ticketDataCache.set(ticketData.id, ticketData);

      // Get user settings for personalized summary
      const settings = await this.getSettings();
      console.log('🔧 [Background] Settings for summary:', {
        hasApiKey: !!settings.apiKey,
        userRole: settings.userRole,
        language: settings.language,
        aiModel: settings.aiModel
      });

      // Create specialized summary prompt
      const summaryPrompt = this.buildTicketSummaryPrompt(ticketData, settings);
      console.log('🔧 [Background] Summary prompt length:', summaryPrompt.length);

      const aiService = await this.getCurrentAIService();
      const summary = await aiService.processUserMessage(summaryPrompt, { ticketData }, settings);

      console.log('✅ [Background] Summary generated, length:', summary.response.length);
      console.log('🔧 [Background] Summary token usage:', summary.tokensUsed);

      sendResponse({ success: true, summary: summary.response, tokensUsed: summary.tokensUsed });
    } catch (error) {
      console.error('❌ [Background] Error handling ticket summary:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async extractTicketDataFromActiveTab(tabId: number): Promise<TicketData | null> {
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
            const titleElement = document.querySelector('h1.loom-issue-title, .ticket-title, [data-test="issue-title"]');
            const descriptionElement = document.querySelector('.loom-issue-description, .ticket-description, [data-test="issue-description"]');

            return {
              id: window.location.pathname.split('/').pop() || 'unknown',
              title: titleElement?.textContent?.trim() || 'No title found',
              description: descriptionElement?.textContent?.trim() || 'No description found',
              status: 'Unknown',
              priority: 'Unknown',
              assignee: 'Unknown',
              reporter: 'Unknown',
              dueDate: 'Unknown',
              labels: [],
              comments: []
            };
          }
        }
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error extracting ticket data:', error);
      return null;
    }
  }

  private async extractSpaceInfoFromTab(tabId: number): Promise<{ spaceName: string; domain: string } | null> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const url = window.location.href;
          const match = url.match(/https:\/\/([^.]+)\.(backlog\.com|backlog\.jp|backlogtool\.com)/);

          if (match) {
            return {
              spaceName: match[1],
              domain: match[2]
            };
          }

          return null;
        }
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
          const match = url.match(/\/view\/([A-Z]+-\d+)/);
          return match ? match[1] : null;
        }
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error extracting issue key:', error);
      return null;
    }
  }

  private async getTicketDataViaAPI(spaceInfo: { spaceName: string; domain: string }, issueKey: string): Promise<TicketData | null> {
    try {
      // Get Backlog API configuration
      const backlogSettings = await this.getBacklogMultiSettings();
      const config = this.findMatchingBacklogConfig(backlogSettings.configs, spaceInfo);

      if (!config) {
        console.log('No matching Backlog API config found, using DOM extraction');
        return null;
      }

      // Call Backlog API through background script (no CORS issues)
      const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
      const apiUrl = `${baseUrl}/issues/${issueKey}?apiKey=${encodeURIComponent(config.apiKey)}`;

      console.log('Calling Backlog API:', apiUrl.replace(config.apiKey, '***'));

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const issueData = await response.json();

      // Get comments separately
      const commentsUrl = `${baseUrl}/issues/${issueKey}/comments?apiKey=${encodeURIComponent(config.apiKey)}`;
      const commentsResponse = await fetch(commentsUrl);
      const comments = commentsResponse.ok ? await commentsResponse.json() : [];

      // Convert to our TicketData format
      return this.convertBacklogDataToTicketData(issueData, comments);

    } catch (error) {
      console.error('Error getting ticket data via API:', error);
      return null;
    }
  }

  private findMatchingBacklogConfig(configs: any[], spaceInfo: { spaceName: string; domain: string }): any | null {
    return configs.find(config =>
      config.domain === spaceInfo.domain &&
      config.spaceName === spaceInfo.spaceName
    ) || null;
  }

  private convertBacklogDataToTicketData(issueData: any, comments: any[]): TicketData {
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
      comments: comments.map(comment => ({
        author: comment.createdUser?.name || 'Unknown',
        content: comment.content || '',
        timestamp: comment.created || '', // Map 'created' field to 'timestamp', keep ISO 8601 format
        created: comment.created || '' // Keep 'created' field as backup
      })),
      // Extended fields
      issueType: issueData.issueType?.name,
      created: issueData.created,
      updated: issueData.updated,
      estimatedHours: issueData.estimatedHours,
      actualHours: issueData.actualHours,
      parentIssueId: issueData.parentIssueId,
      customFields: issueData.customFields || [],
      attachments: issueData.attachments || []
    };

    return convertedTicketData;
  }

  private buildTicketSummaryPrompt(ticketData: TicketData, settings?: Settings): string {
    const roleContext = settings?.userRole ? this.getRoleContext(settings.userRole) : '';
    const languagePrompt = settings?.language ? this.getLanguagePrompt(settings.language) : this.getLanguagePrompt('vi');

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
**Labels**: ${Array.isArray(ticketData.labels) ? ticketData.labels.join(', ') : 'No labels'}

${ticketData.comments && ticketData.comments.length > 0 ? (() => {
  const sortedComments = this.sortCommentsByTime(ticketData.comments);

  return `**Comments gần đây**:
${sortedComments.slice(-3).map(comment => {
  const content = comment.content || '';
  const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
  return `- ${comment.author}: ${truncatedContent}`;
}).join('\n')}`;
})() : ''}

Hãy tóm tắt trong 3-5 câu ngắn gọn:
1. Vấn đề chính của ticket
2. Trạng thái hiện tại
3. Những điểm quan trọng cần lưu ý
4. Next steps nếu có thể xác định được`;
  }

  private sortCommentsByTime(comments: any[]): any[] {
    return comments
      .filter((comment: any) => comment.content && comment.content.trim())
      .sort((a: any, b: any) => {
        // Sort by timestamp field ascending (oldest first, newest last)
        // timestamp contains ISO 8601 format from Backlog API's 'created' field
        const timeA = new Date(a.timestamp || a.created || 0).getTime();
        const timeB = new Date(b.timestamp || b.created || 0).getTime();
        return timeA - timeB;
      });
  }

  private buildSummaryPrompt(ticketData: any): string {
    if (!ticketData) {
      return 'Hãy tóm tắt nội dung của ticket này một cách ngắn gọn và súc tích.';
    }

    const commentsSection = ticketData.comments && ticketData.comments.length > 0
      ? `\n\n**Comments**:\n${this.sortCommentsByTime(ticketData.comments)
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
          .join('\n')}`
      : '';

    return `Hãy tóm tắt nội dung của ticket sau một cách ngắn gọn và súc tích:

**Tiêu đề**: ${ticketData.title || 'Không có tiêu đề'}
**Mô tả**: ${ticketData.description || 'Không có mô tả'}
**Trạng thái**: ${ticketData.status || 'Không rõ'}
**Độ ưu tiên**: ${ticketData.priority || 'Không rõ'}
**Người được gán**: ${ticketData.assignee || 'Chưa gán'}${commentsSection}

Bao gồm: mục tiêu chính, yêu cầu chức năng, và những điểm quan trọng cần lưu ý.`;
  }

  private buildExplainPrompt(ticketData: any): string {
    if (!ticketData) {
      return 'Hãy giải thích chi tiết yêu cầu và mục tiêu của ticket này.';
    }

    const commentsSection = ticketData.comments && ticketData.comments.length > 0
      ? `\n\n**Comments**:\n${this.sortCommentsByTime(ticketData.comments)
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
          .join('\n')}`
      : '';

    return `Hãy giải thích chi tiết yêu cầu và mục tiêu của ticket sau:

**Tiêu đề**: ${ticketData.title || 'Không có tiêu đề'}
**Mô tả**: ${ticketData.description || 'Không có mô tả'}
**Trạng thái**: ${ticketData.status || 'Không rõ'}
**Độ ưu tiên**: ${ticketData.priority || 'Không rõ'}
**Người được gán**: ${ticketData.assignee || 'Chưa gán'}${commentsSection}

Phân tích các tác vụ cần thực hiện, dependencies, và impact của thay đổi này.`;
  }

  private buildTranslatePrompt(ticketData: any): string {
    if (!ticketData) {
      return 'Hãy dịch toàn bộ nội dung ticket sang tiếng Anh.';
    }

    const commentsSection = ticketData.comments && ticketData.comments.length > 0
      ? `\n\n**Comments**:\n${this.sortCommentsByTime(ticketData.comments)
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
          .join('\n')}`
      : '';

    return `Hãy dịch toàn bộ nội dung của ticket sau sang tiếng Anh:

**Tiêu đề**: ${ticketData.title || 'Không có tiêu đề'}
**Mô tả**: ${ticketData.description || 'Không có mô tả'}
**Trạng thái**: ${ticketData.status || 'Không rõ'}
**Độ ưu tiên**: ${ticketData.priority || 'Không rõ'}
**Người được gán**: ${ticketData.assignee || 'Chưa gán'}${commentsSection}

Bao gồm title, description, và các thông tin quan trọng khác. Giữ nguyên format và structure của nội dung.`;
  }

  // New method: Build suggestion prompt with ticket context
  private buildSuggestionPrompt(suggestionMessage: string, ticketData: any): string {
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
  private buildChatPrompt(userMessage: string, ticketData: any, chatHistory: any[]): string {
    if (!ticketData) {
      return `Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng tiếng Việt:

**Câu hỏi:** ${userMessage}`;
    }

    // Build ticket context
    const ticketContext = this.buildTicketContext(ticketData);

    // Build chat history context (last 10 messages to avoid token limit)
    const recentHistory = chatHistory.slice(-10);
    const historyContext = recentHistory.length > 0
      ? `\n\n**Lịch sử cuộc trò chuyện:**\n${recentHistory
          .map((msg: any, index: number) => `${index + 1}. ${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`)
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
    const sortedComments = this.sortCommentsByTime(ticketData.comments || []);

    const commentsSection = sortedComments.length > 0
      ? `\n\n**Comments (theo thời gian):**\n${sortedComments
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
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

  private async callOpenAISummary(prompt: string, settings?: Settings): Promise<string> {
    try {
      const apiKey = settings?.apiKey;
      if (!apiKey) {
        return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
      }

      console.log('🔄 [Background] Calling OpenAI API for summary...');
      console.log('🔧 [Background] API Key exists:', !!apiKey);
      console.log('🔧 [Background] Model:', settings?.aiModel || 'gpt-3.5-turbo');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.getOpenAIModelName(settings),
          messages: [
            {
              role: 'system',
              content: 'Bạn là một AI assistant giúp summarize ticket một cách chính xác và hữu ích.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      console.log('🔧 [Background] Response status:', response.status);
      console.log('🔧 [Background] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Background] API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🔧 [Background] API Response:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        firstChoice: data.choices?.[0] ? {
          hasMessage: !!data.choices[0].message,
          hasContent: !!data.choices[0].message?.content
        } : null,
        error: data.error
      });

      if (data.error) {
        throw new Error(`OpenAI API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const summary = data.choices[0].message.content;
        console.log('✅ [Background] Summary generated successfully');
        return summary;
      } else {
        console.error('❌ [Background] Invalid API response structure:', data);
        throw new Error('Invalid API response - no content in choices');
      }
    } catch (error) {
      console.error('❌ [Background] Error calling OpenAI API for summary:', error);
      return `Lỗi khi gọi AI API: ${error}`;
    }
  }

  private async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get([
        'encryptedApiKey',
        'encryptedGeminiApiKey',
        'userRole',
        'language',
        'aiModel',
        'preferredProvider',
        'preferredModel'
      ]);

      // Decrypt OpenAI API key if exists
      let apiKey = '';
      if (result.encryptedApiKey) {
        try {
          apiKey = await EncryptionService.decryptApiKey(result.encryptedApiKey);
        } catch (error) {
          console.error('Failed to decrypt OpenAI API key in getSettings:', error);
        }
      }

      // Decrypt Gemini API key if exists
      let geminiApiKey = '';
      if (result.encryptedGeminiApiKey) {
        try {
          geminiApiKey = await EncryptionService.decryptApiKey(result.encryptedGeminiApiKey);
        } catch (error) {
          console.error('Failed to decrypt Gemini API key in getSettings:', error);
        }
      }

      // Determine preferred provider based on preferred model if not explicitly set
      let preferredProvider = result.preferredProvider;
      if (!preferredProvider && result.preferredModel) {
        // Use availableModels to determine provider
        const selectedModel = availableModels.find(m => m.id === result.preferredModel);
        preferredProvider = selectedModel?.provider || 'openai';
      }

      return {
        apiKey,
        geminiApiKey,
        userRole: result.userRole || 'developer',
        language: result.language || 'vi',
        aiModel: result.aiModel || result.preferredModel || defaultModelId,
        preferredProvider: preferredProvider || 'openai'
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        apiKey: '',
        geminiApiKey: '',
        userRole: 'developer',
        language: 'vi',
        aiModel: defaultModelId,
        preferredProvider: 'openai' as const
      };
    }
  }

  private async saveSettings(settings: Settings) {
    try {
      // Encrypt API key before storing
      const encryptedApiKey = await EncryptionService.encryptApiKey(settings.apiKey);

      await chrome.storage.sync.set({
        encryptedApiKey,
        userRole: settings.userRole,
        language: settings.language,
        aiModel: settings.aiModel
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  private async getBacklogSettings(): Promise<BacklogSettings> {
    try {
      const result = await chrome.storage.sync.get(['backlogApiKey', 'backlogSpaceName']);
      return {
        backlogApiKey: result.backlogApiKey || '',
        backlogSpaceName: result.backlogSpaceName || ''
      };
    } catch (error) {
      console.error('Error getting Backlog settings:', error);
      return {
        backlogApiKey: '',
        backlogSpaceName: ''
      };
    }
  }

  private async getBacklogMultiSettings(): Promise<BacklogMultiSettings> {
    try {
      const result = await chrome.storage.sync.get(['backlogConfigs']);
      return {
        configs: result.backlogConfigs || []
      };
    } catch (error) {
      console.error('Error getting Backlog multi settings:', error);
      return {
        configs: []
      };
    }
  }

  private async saveBacklogSettings(settings: BacklogSettings) {
    try {
      await chrome.storage.sync.set({
        backlogApiKey: settings.backlogApiKey,
        backlogSpaceName: settings.backlogSpaceName
      });
    } catch (error) {
      console.error('Error saving Backlog settings:', error);
      throw error;
    }
  }

  private async saveBacklogMultiSettings(settings: BacklogMultiSettings) {
    try {
      await chrome.storage.sync.set({
        backlogConfigs: settings.configs
      });
    } catch (error) {
      console.error('Error saving Backlog multi settings:', error);
      throw error;
    }
  }

  private async testBacklogConnection(config: BacklogApiConfig): Promise<{success: boolean, message: string, data?: any}> {
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

      const apiUrl = `${baseUrl}/api/v2/space?apiKey=${encodeURIComponent(config.apiKey)}`;

      console.log('Testing Backlog connection:', baseUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const spaceInfo = await response.json();
        console.log('Backlog connection successful:', spaceInfo);
        return {
          success: true,
          message: `Kết nối thành công! Space: ${spaceInfo.name || spaceName}`,
          data: spaceInfo
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'API Key không hợp lệ hoặc không có quyền truy cập'
        };
      } else if (response.status === 404) {
        return {
          success: false,
          message: 'Domain không tồn tại hoặc không thể truy cập'
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Kết nối thất bại: ${response.status} ${response.statusText} - ${errorText}`
        };
      }
    } catch (error) {
      console.error('Backlog connection test failed:', error);
      return {
        success: false,
        message: 'Lỗi kết nối. Kiểm tra internet và thông tin cấu hình.'
      };
    }
  }

  private async getCurrentUser(): Promise<{success: boolean, data?: any, error?: string}> {
    try {
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
      const backlogSettings = await this.getBacklogMultiSettings();
      const config = this.findMatchingBacklogConfig(backlogSettings.configs, spaceInfo);

      if (!config) {
        return {
          success: false,
          error: 'No matching Backlog API config found'
        };
      }

      // Call Backlog API to get current user
      const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
      const apiUrl = `${baseUrl}/users/myself?apiKey=${encodeURIComponent(config.apiKey)}`;

      console.log('Getting current user from Backlog API:', apiUrl.replace(config.apiKey, '***'));

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
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
          nulabAccount: userData.nulabAccount // Include full nulabAccount for debugging
        }
      };

    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        success: false,
        error: String(error)
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
- Collaborative recommendations`
    };

    return roleContexts[userRole as keyof typeof roleContexts] || roleContexts.other;
  }

  private getLanguagePrompt(language: string): string {
    const languagePrompts = {
      vi: `Hãy respond bằng tiếng Việt. Giữ technical terms bằng tiếng Anh khi cần thiết.`,
      en: `Please respond in English with clear and professional language.`,
      ja: `日本語で回答してください。技術用語は適切に使用してください。`
    };

    return languagePrompts[language as keyof typeof languagePrompts] || languagePrompts.vi;
  }

  private async handleSidebarWidthSync(width: number, sender: chrome.runtime.MessageSender): Promise<void> {
    try {
      console.log('🔧 [Background] Syncing sidebar width across tabs:', width);

      // Get all tabs to sync width
      const tabs = await chrome.tabs.query({});

      // Send width update to all other tabs
      const promises = tabs.map(async (tab) => {
        if (tab.id && tab.id !== sender.tab?.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SIDEBAR_WIDTH_UPDATE',
              width: width
            });
          } catch (error) {
            // Ignore errors for tabs without content script
            console.log(`Tab ${tab.id} does not have content script loaded`);
          }
        }
      });

      await Promise.allSettled(promises);
      console.log('✅ [Background] Width sync completed');

    } catch (error) {
      console.error('❌ [Background] Error syncing sidebar width:', error);
    }
  }

  private handleOpenOptionsPage(): void {
    try {
      // Open options page in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html'),
        active: true
      });
      console.log('✅ [Background] Options page opened successfully');
    } catch (error) {
      console.error('❌ [Background] Error opening options page:', error);
    }
  }
}

// Khởi tạo background service
new BackgroundService();
