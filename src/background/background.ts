// Background script để xử lý AI API và communication
import { TicketData } from '../shared/ticketAnalyzer';
import { EncryptionService } from '../shared/encryption';
import ContextOptimizer from '../shared/contextOptimizer';
import { availableModels, defaultModelId } from '../configs';
import { parseCommand } from '../shared/commandUtils';
import { getLanguageDisplayName } from '../shared/languageUtils';
import type { ChatHistoryData } from '../shared/chatStorageService';
import { FileAttachment } from '../types/attachment';

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
  processUserMessage(message: string, context: any, settings?: Settings, attachments?: FileAttachment[]): Promise<{
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
      return 'gemini-2.0-flash-exp'; // Updated fallback to Gemini 2.0
    }

    return this.mapToGeminiAPI(preferredModel);
  }

  private mapToGeminiAPI(modelId: string): string {
    // Map our model IDs to actual Gemini API model names
    // All 2.5 variants use Gemini 2.0 Flash Experimental for consistency
    const modelMap: Record<string, string> = {
      'gemini-2.5-pro': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash-lite': 'gemini-2.0-flash-exp', // ✅ Now uses Gemini 2.0 as expected
      // OpenAI models that might accidentally come through
      'gpt-4o': 'gemini-2.0-flash-exp', // fallback
      'gpt-4o-mini': 'gemini-2.0-flash-exp', // fallback
      'o1-preview': 'gemini-2.0-flash-thinking-exp', // reasoning model
      'o1-mini': 'gemini-2.0-flash-thinking-exp', // reasoning model
      'o3-mini': 'gemini-2.0-flash-thinking-exp' // reasoning model
    };

    return modelMap[modelId] || 'gemini-2.0-flash-exp';
  }  private getApiUrl(model: string = 'gemini-2.0-flash-exp'): string {
    return `${this.baseApiUrl}/${model}:generateContent`;
  }

  async analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string> {
    const prompt = this.buildAnalysisPrompt(ticketData, settings);
    const result = await this.callGeminiAPI(prompt, settings);
    return result.response;
  }

  async processUserMessage(message: string, contextData: any, settings?: Settings, attachments?: FileAttachment[]): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    // Build enhanced message with attachments if any
    let enhancedMessage = message;
    if (attachments && attachments.length > 0) {
      enhancedMessage = this.buildMessageWithAttachments(message, attachments);
    }

    // Check if this is optimized context from ContextOptimizer
    if (contextData.isOptimized) {
      const result = await this.callGeminiAPI(enhancedMessage, settings, attachments);
      return {
        response: result.response,
        responseId: result.responseId,
        tokensUsed: result.tokensUsed || ContextOptimizer.estimateTokenCount(result.response)
      };
    }

    // Legacy handling for non-optimized context
    const result = await this.callGeminiAPI(enhancedMessage, settings, attachments);
    return {
      response: result.response,
      responseId: result.responseId,
      tokensUsed: result.tokensUsed || ContextOptimizer.estimateTokenCount(result.response)
    };
  }

  private buildMessageWithAttachments(message: string, attachments: FileAttachment[]): string {
    let enhancedMessage = message;

    for (const attachment of attachments) {
      enhancedMessage += `\n\n**File: ${attachment.name}** (${attachment.type}, ${this.formatFileSize(attachment.size)})\n`;

      // For files that will be sent as inline_data, just mention them
      if (attachment.type.startsWith('image/') ||
          attachment.type.startsWith('text/') ||
          attachment.type.includes('csv') ||
          attachment.type.includes('json') ||
          attachment.type.includes('plain')) {
        enhancedMessage += `[File content will be processed by AI - please analyze this file]\n`;
      } else if (attachment.preview) {
        // For other files with preview, include preview
        enhancedMessage += `Content preview:\n\`\`\`\n${attachment.preview}\n\`\`\`\n`;
      } else {
        enhancedMessage += `[Binary file attached - content type: ${attachment.type}]\n`;
      }
    }

    return enhancedMessage;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  private async callGeminiAPI(prompt: string, settings?: Settings, attachments?: FileAttachment[]): Promise<{
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

      // Build parts array for multimodal content
      const parts: any[] = [{
        text: prompt
      }];

      // Add attachments if any
      if (attachments && attachments.length > 0) {
        console.log('📎 [Gemini] Processing attachments:', attachments.length);
        for (const attachment of attachments) {
          console.log('📎 [Gemini] Attachment:', attachment.name, attachment.type, 'has base64:', !!attachment.base64);
          if (attachment.base64) {
            // For images, add as inline_data for vision processing
            if (attachment.type.startsWith('image/')) {
              console.log('🖼️ [Gemini] Adding image attachment:', attachment.name);
              parts.push({
                inline_data: {
                  mime_type: attachment.type,
                  data: attachment.base64
                }
              });
            }
            // For text files (CSV, TXT, JSON, etc), also add as inline_data for better processing
            else if (attachment.type.startsWith('text/') ||
                     attachment.type.includes('csv') ||
                     attachment.type.includes('json') ||
                     attachment.type.includes('plain')) {
              console.log('📄 [Gemini] Adding text file as inline_data:', attachment.name);
              parts.push({
                inline_data: {
                  mime_type: attachment.type,
                  data: attachment.base64
                }
              });
            }
            // For other binary files, mention in text (already included in prompt)
          }
        }
      }

      console.log('🚀 [Gemini] Final parts array:', parts.length, parts.map(p => p.inline_data ? `inline_data: ${p.inline_data.mime_type}` : 'text'));

      const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased from 1024 to handle longer responses
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Gemini] API Error Response:', errorText);
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const content = data.candidates[0].content.parts[0].text;
        const responseId = data.candidates[0].citationMetadata?.citationSources?.[0]?.endIndex?.toString() || undefined;
        const tokensUsed = data.usageMetadata?.totalTokenCount || ContextOptimizer.estimateTokenCount(content);

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

  async processUserMessage(message: string, contextData: any, settings?: Settings, attachments?: FileAttachment[]): Promise<{
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

    // Build enhanced message with attachments if any
    let enhancedMessage = message;
    if (attachments && attachments.length > 0) {
      enhancedMessage = this.buildMessageWithAttachments(message, attachments);
    }

    // The message is already processed by BackgroundService with full context
    // Build messages array for OpenAI with multimodal support
    const userContent: any[] = [{
      type: 'text',
      text: enhancedMessage
    }];

    // Add image attachments for GPT-4V
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.base64 && attachment.type.startsWith('image/')) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.type};base64,${attachment.base64}`
            }
          });
        }
      }
    }

    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(settings)
      },
      {
        role: 'user',
        content: userContent.length === 1 ? enhancedMessage : userContent
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

  private buildMessageWithAttachments(message: string, attachments: FileAttachment[]): string {
    let enhancedMessage = message;

    for (const attachment of attachments) {
      enhancedMessage += `\n\n**File: ${attachment.name}** (${attachment.type}, ${this.formatFileSize(attachment.size)})\n`;

      if (attachment.type.startsWith('text/') && attachment.base64) {
        // For text files, decode and include full content
        try {
          const fullContent = atob(attachment.base64);
          enhancedMessage += `Nội dung file:\n\`\`\`\n${fullContent}\n\`\`\`\n`;
        } catch (error) {
          enhancedMessage += `[Lỗi đọc file text: ${error}]\n`;
        }
      } else if (attachment.preview) {
        // Fallback to preview if base64 not available
        enhancedMessage += `Content preview:\n\`\`\`\n${attachment.preview}\n\`\`\`\n`;
      } else if (attachment.base64) {
        // For binary files, mention they are attached
        if (attachment.type.startsWith('image/')) {
          enhancedMessage += `[Image file attached - please analyze the visual content]\n`;
        } else {
          enhancedMessage += `[Binary file attached - content type: ${attachment.type}]\n`;
        }
      }
    }

    return enhancedMessage;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          await this.handleUserMessage(message.data, sendResponse, sender);
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

        case 'getBacklogConfigs':
          await this.handleGetBacklogConfigs(sendResponse);
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

      sendResponse({ success: true, cached: true });
    } catch (error) {
      console.error('Error caching ticket data:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  private async handleUserMessage(data: any, sendResponse: (response?: any) => void, sender?: chrome.runtime.MessageSender) {
    try {
      const { message, messageType, ticketData, chatHistory, userInfo, currentModel, attachments } = data;

      console.log('🔍 [Background] handleUserMessage attachments:', attachments?.length || 0, attachments);

      // Get current AI service, but override aiModel with currentModel if provided
      const settings = await this.getSettings();
      if (currentModel) {
        settings.aiModel = currentModel;
      }

      const aiService = await this.getCurrentAIService();

      if (!aiService) {
        throw new Error('AI service not configured');
      }

      let processedMessage = message;
      let optimizedContext: any = data;

      // Check if this is a command
      const commandResult = parseCommand(message);
      if (commandResult && commandResult.command === 'translate') {
        // Extract source and target languages from the command
        const [, sourceLanguage, targetLanguage] = commandResult.matches;
        processedMessage = this.buildTranslatePrompt(ticketData, sourceLanguage, targetLanguage);
      } else if (commandResult && commandResult.command === 'create-ticket') {
        // Extract target backlog, source language and target language from the command
        // Pattern: /create-ticket domain.com source target
        const [, targetBacklog, sourceLanguage, targetLanguage] = commandResult.matches;
        const tabId = sender?.tab?.id;
        if (!tabId) {
          throw new Error('Không thể xác định tab hiện tại');
        }
        return await this.handleCreateTicketCommand(tabId, targetBacklog, sourceLanguage, targetLanguage, ticketData, userInfo);
      } else if (messageType === 'suggestion') {
        // Build context-aware prompt based on message type
        processedMessage = this.buildSuggestionPrompt(message, ticketData);
      } else {
        // For regular chat, use optimized context processing
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
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
        } else {
          // For regular chat without history, include full context
          processedMessage = this.buildChatPrompt(message, ticketData, chatHistory);
        }
      }

      // Process with AI service, including attachments
      console.log('🚀 [Background] Sending to AI service with attachments:', attachments?.length || 0);
      const response = await aiService.processUserMessage(processedMessage, optimizedContext, settings, attachments);

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
      let ticketData = data.ticketData;

      // If ticket data is not provided, try to extract from active tab
      if (!ticketData) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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
      const summary = await aiService.processUserMessage(summaryPrompt, { ticketData }, settings);

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

  private buildTranslatePrompt(ticketData: any, sourceLanguage?: string, targetLanguage?: string): string {
    if (!ticketData) {
      const sourceDisplay = sourceLanguage ? getLanguageDisplayName(sourceLanguage) : 'ngôn ngữ nguồn';
      const targetDisplay = targetLanguage ? getLanguageDisplayName(targetLanguage) : 'tiếng Anh';
      return `Hãy dịch toàn bộ nội dung ticket từ ${sourceDisplay} sang ${targetDisplay}.`;
    }

    const sourceDisplay = sourceLanguage ? getLanguageDisplayName(sourceLanguage) : 'ngôn ngữ hiện tại';
    const targetDisplay = targetLanguage ? getLanguageDisplayName(targetLanguage) : 'tiếng Anh';

    const commentsSection = ticketData.comments && ticketData.comments.length > 0
      ? `\n\n**Comments**:\n${this.sortCommentsByTime(ticketData.comments)
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
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

  // New method: Build create ticket prompt for API JSON format
  private buildCreateTicketPrompt(ticketData: any, sourceLanguage: string, targetLanguage: string): string {
    const sourceDisplay = sourceLanguage ? getLanguageDisplayName(sourceLanguage) : 'ngôn ngữ hiện tại';
    const targetDisplay = targetLanguage ? getLanguageDisplayName(targetLanguage) : 'tiếng Anh';

    const commentsSection = ticketData.comments && ticketData.comments.length > 0
      ? `\n\n**Comments**:\n${this.sortCommentsByTime(ticketData.comments)
          .map((comment: any, index: number) => `${index + 1}. ${comment.author || 'Unknown'}: ${comment.content.trim()}`)
          .join('\n')}`
      : '';

    return `Bạn là một AI assistant chuyên xử lý ticket/issue. Hãy dịch và chuyển đổi thông tin ticket sau từ ${sourceDisplay} sang ${targetDisplay} và xuất ra dưới dạng JSON phù hợp với Backlog API để tạo ticket mới.

**Thông tin ticket gốc:**
**Tiêu đề**: ${ticketData.title || 'Không có tiêu đề'}
**Mô tả**: ${ticketData.description || 'Không có mô tả'}
**Trạng thái**: ${ticketData.status || 'Không rõ'}
**Độ ưu tiên**: ${ticketData.priority || 'Không rõ'}
**Người được gán**: ${ticketData.assignee || 'Chưa gán'}${commentsSection}

**Yêu cầu xuất JSON:**
Hãy dịch và tạo ra JSON object chứa các thông tin sau để tạo ticket mới qua Backlog API:

1. **summary**: Tiêu đề ticket đã dịch (tối đa 255 ký tự)
2. **description**: Mô tả chi tiết đã dịch, bao gồm:
   - Nội dung chính đã dịch
   - Thông tin trạng thái và độ ưu tiên
   - Comments quan trọng (nếu có)
3. **priorityId**: Mapping độ ưu tiên (1=Lowest, 2=Low, 3=Normal, 4=High, 5=Highest)
4. **originalTicketInfo**: Thông tin tham chiếu ticket gốc

**Định dạng JSON output:**
\`\`\`json
{
  "summary": "...",
  "description": "...",
  "priorityId": 3,
  "originalTicketInfo": {
    "sourceUrl": "...",
    "originalTitle": "...",
    "translatedFrom": "ja",
    "translatedTo": "${targetLanguage}"
  }
}
\`\`\`

Chỉ trả về JSON object, không thêm text giải thích nào khác.`;
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Background] API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`OpenAI API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const summary = data.choices[0].message.content;
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
    } catch (error) {
      console.error('❌ [Background] Error syncing sidebar width:', error);
    }
  }

  private async handleCreateTicketCommand(
    tabId: number,
    targetBacklog: string,
    sourceLanguage: string,
    targetLanguage: string,
    ticketData: any,
    userInfo: any
  ) {
    try {
      if (!ticketData) {
        return {
          content: 'Không thể tạo ticket: Không tìm thấy thông tin ticket hiện tại.',
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

      // Step 1: Get Backlog API configuration
      const backlogConfig = await this.getBacklogAPIConfig(targetBacklog);
      if (!backlogConfig) {
        return {
          content: `❌ Không thể tạo ticket: Không tìm thấy cấu hình API cho backlog ${targetBacklog}.

**Hướng dẫn:**
1. Mở Options (click icon extension)
2. Vào tab "Backlog API Keys"
3. Thêm API key cho domain ${targetBacklog}`,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Get project information from target backlog
      const projectInfo = await this.getBacklogProjectInfo(backlogConfig);
      if (!projectInfo || !projectInfo.projectId) {
        return {
          content: `❌ Không thể tạo ticket: Không thể lấy thông tin project từ ${targetBacklog}.

**Nguyên nhân có thể:**
- API key không có quyền truy cập project
- Backlog không có project nào
- Lỗi kết nối API`,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

      // Step 3: Translate ticket content and generate API payload
      const createTicketPrompt = this.buildCreateTicketPrompt(ticketData, sourceLanguage, targetLanguage);
      const aiService = await this.getCurrentAIService();

      if (!aiService) {
        return {
          content: '❌ Không thể tạo ticket: Không tìm thấy AI service để dịch nội dung.',
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

      const settings = await this.getSettings();
      const translationResponse = await aiService.processUserMessage(createTicketPrompt, { ticketData }, settings);

      // Parse JSON response from AI
      const ticketPayload = this.parseCreateTicketResponse(translationResponse.response, projectInfo);
      if (!ticketPayload) {
        return {
          content: '❌ Không thể tạo ticket: Lỗi xử lý thông tin dịch từ AI.',
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

      // Step 4: Create ticket via Backlog API
      const createResult = await this.createBacklogTicket(backlogConfig, ticketPayload);

      if (createResult.success) {
        const ticketUrl = `https://${targetBacklog}/view/${createResult.issueKey}`;
        return {
          content: `✅ Đã tạo ticket thành công:
[${createResult.issueKey}](${ticketUrl}) ${createResult.summary}

**Chi tiết:**
- Backlog đích: ${targetBacklog}
- Project: ${projectInfo.projectName || projectInfo.projectKey}
- Ngôn ngữ: ${getLanguageDisplayName(targetLanguage)}
- Người tạo: ${userInfo?.name || 'User'}`,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          content: `❌ Không thể tạo ticket: ${createResult.error}

**Chi tiết lỗi:**
${createResult.details || 'Không có thông tin chi tiết'}`,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('Error creating ticket:', error);
      return {
        content: `❌ Lỗi khi tạo ticket: ${error instanceof Error ? error.message : String(error)}`,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getBacklogAPIConfig(targetBacklog: string): Promise<{
    domain: string;
    apiKey: string;
    namespace?: string;
  } | null> {
    try {
      const result = await chrome.storage.sync.get(['backlogAPIKeys']);
      const backlogAPIKeys = result.backlogAPIKeys || [];

      const config = backlogAPIKeys.find((key: any) => key.domain === targetBacklog);
      return config ? {
        domain: config.domain,
        apiKey: config.apiKey,
        namespace: config.namespace
      } : null;
    } catch (error) {
      console.error('Error loading backlog API config:', error);
      return null;
    }
  }

  private async getBacklogProjectInfo(backlogConfig: any): Promise<{
    projectId: number;
    projectKey: string;
    projectName?: string;
  } | null> {
    try {
      // Get first available project from the backlog
      const response = await fetch(`https://${backlogConfig.domain}/api/v2/projects?apiKey=${backlogConfig.apiKey}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const projects = await response.json();

      if (!projects || projects.length === 0) {
        return null;
      }

      // Return the first project (could be enhanced to let user choose)
      const firstProject = projects[0];
      return {
        projectId: firstProject.id,
        projectKey: firstProject.projectKey,
        projectName: firstProject.name
      };
    } catch (error) {
      console.error('Error getting project info:', error);
      return null;
    }
  }

  private parseCreateTicketResponse(aiResponse: string, projectInfo: any): any {
    try {
      // Extract JSON from AI response (might be wrapped in markdown code blocks)
      let jsonString = aiResponse.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonString);

      // Add required fields for Backlog API
      return {
        projectId: projectInfo.projectId,
        summary: parsed.summary || 'Untitled Ticket',
        description: parsed.description || '',
        issueTypeId: 1, // Default to Task (you might want to make this configurable)
        priorityId: parsed.priorityId || 3, // Default to Normal priority
        ...parsed
      };
    } catch (error) {
      console.error('Error parsing create ticket response:', error);
      return null;
    }
  }

  private parseTranslatedContent(translationResponse: string, originalTicket: any): any {
    // Simple parsing for now - in production, you might want more sophisticated parsing
    const lines = translationResponse.split('\n');
    let title = originalTicket.title;
    let description = originalTicket.description;

    // Try to extract translated title and description
    for (const line of lines) {
      if (line.includes('**Tiêu đề**:') || line.includes('**Title**:')) {
        title = line.split(':').slice(1).join(':').trim();
      } else if (line.includes('**Mô tả**:') || line.includes('**Description**:')) {
        description = line.split(':').slice(1).join(':').trim();
      }
    }

    return {
      ...originalTicket,
      title,
      description
    };
  }

  private async createBacklogTicket(backlogConfig: any, ticketPayload: any): Promise<{
    success: boolean;
    issueKey?: string;
    summary?: string;
    error?: string;
    details?: string;
  }> {
    try {
      // Prepare form data for Backlog API
      const formData = new URLSearchParams();
      formData.append('projectId', ticketPayload.projectId.toString());
      formData.append('summary', ticketPayload.summary);
      formData.append('description', ticketPayload.description);
      formData.append('issueTypeId', ticketPayload.issueTypeId.toString());
      formData.append('priorityId', ticketPayload.priorityId.toString());

      // Add original ticket info to description
      if (ticketPayload.originalTicketInfo) {
        const originalInfo = `\n\n---\n**Original Ticket Reference:**\n- Translated from: ${ticketPayload.originalTicketInfo.translatedFrom} to ${ticketPayload.originalTicketInfo.translatedTo}\n- Original Title: ${ticketPayload.originalTicketInfo.originalTitle}`;
        formData.set('description', ticketPayload.description + originalInfo);
      }

      // Make API request to create ticket
      const response = await fetch(`https://${backlogConfig.domain}/api/v2/issues?apiKey=${backlogConfig.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors) {
            const errorDetails = errorJson.errors.map((err: any) =>
              `${err.field || 'unknown'}: ${err.message || err.code}`
            ).join('\n');
            errorMessage = errorDetails;
          }
        } catch {
          // If can't parse as JSON, use the text as-is
          if (errorText) {
            errorMessage = errorText;
          }
        }

        return {
          success: false,
          error: 'Lỗi từ Backlog API',
          details: errorMessage
        };
      }

      const result = await response.json();

      return {
        success: true,
        issueKey: result.issueKey,
        summary: result.summary
      };

    } catch (error) {
      console.error('Error calling Backlog API:', error);
      return {
        success: false,
        error: `Lỗi kết nối API: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }  private handleOpenOptionsPage(): void {
    try {
      // Open options page in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html'),
        active: true
      });
    } catch (error) {
      console.error('❌ [Background] Error opening options page:', error);
    }
  }

  private async handleGetBacklogConfigs(sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('🔄 [Background] Getting backlog configurations...');

      // Get current backlog domain from active tab
      let currentDomain = '';
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url) {
          const url = tabs[0].url;
          const match = url.match(/https:\/\/([^.]+\.(backlog\.com|backlog\.jp|backlogtool\.com))/);
          if (match) {
            currentDomain = match[1]; // e.g., "nals.backlogtool.com"
          }
        }
      } catch (error) {
        console.warn('⚠️ [Background] Could not determine current domain:', error);
      }

      // Get backlog configurations
      const backlogSettings = await this.getBacklogMultiSettings();
      const allConfigs = backlogSettings.configs || [];

      // Filter out configs with the same domain as current tab
      const filteredConfigs = allConfigs.filter(config => {
        if (!currentDomain) return true; // If can't determine current domain, show all
        return config.domain !== currentDomain;
      });

      console.log('✅ [Background] Found backlog configurations:', {
        total: allConfigs.length,
        filtered: filteredConfigs.length,
        currentDomain,
        configs: filteredConfigs
      });

      sendResponse({
        configs: filteredConfigs,
        currentDomain
      });

    } catch (error) {
      console.error('❌ [Background] Error getting backlog configurations:', error);
      sendResponse({
        configs: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Khởi tạo background service
new BackgroundService();
