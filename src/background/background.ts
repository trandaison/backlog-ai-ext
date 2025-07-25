// Background script để xử lý AI API và communication
import { TicketData } from '../shared/ticketAnalyzer';
import { EncryptionService } from '../shared/encryption';

interface Settings {
  apiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
}

interface StoredSettings {
  encryptedApiKey: string;
  userRole: string;
  language: string;
  aiModel: string;
}

interface BacklogSettings {
  backlogApiKey: string;
  backlogSpaceKey: string;
}

interface BacklogApiConfig {
  id: string;
  domain: string;
  spaceKey: string;
  apiKey: string;
}

interface BacklogMultiSettings {
  configs: BacklogApiConfig[];
}

interface AIService {
  analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string>;
  processUserMessage(message: string, context: any, settings?: Settings): Promise<string>;
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

  async analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string> {
    if (!this.apiKey) {
      await this.loadApiKey(); // Try to reload in case it was updated
      if (!this.apiKey) {
        return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
      }
    }

    const prompt = this.buildTicketAnalysisPrompt(ticketData, settings);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: settings?.aiModel || 'gpt-3.5-turbo',
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

  async processUserMessage(message: string, context: any, settings?: Settings): Promise<string> {
    if (!this.apiKey) {
      return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
    }

    const conversationHistory = context.conversationHistory || [];
    const ticketData = context.ticketData;

    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(settings)
      },
      ...conversationHistory.slice(-10).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
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
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 800,
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

  private buildTicketAnalysisPrompt(ticketData: TicketData, settings?: Settings): string {
    const roleContext = this.getRoleContext(settings?.userRole || 'developer');
    const languagePrompt = this.getLanguagePrompt(settings?.language || 'vi');

    return `${languagePrompt}

${roleContext}

Hãy phân tích ticket Backlog sau:

**ID**: ${ticketData.id}
**Tiêu đề**: ${ticketData.title}
**Mô tả**: ${ticketData.description}
**Trạng thái**: ${ticketData.status}
**Độ ưu tiên**: ${ticketData.priority}
**Người được gán**: ${ticketData.assignee}
**Người báo cáo**: ${ticketData.reporter}
**Hạn**: ${ticketData.dueDate}
**Labels**: ${ticketData.labels.join(', ')}

**Comments**:
${ticketData.comments.map(comment =>
  `- ${comment.author} (${comment.timestamp}): ${comment.content}`
).join('\n')}

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
  private aiService: AIService;
  private ticketDataCache: Map<string, TicketData> = new Map();

  constructor() {
    this.aiService = new OpenAIService();
    this.setupMessageListeners();
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
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

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: String(error) });
    }
  }

  private async handleTicketAnalysis(ticketData: TicketData, sendResponse: (response?: any) => void) {
    // Cache ticket data
    this.ticketDataCache.set(ticketData.id, ticketData);

    // Get user settings for personalized analysis
    const settings = await this.getSettings();
    const analysis = await this.aiService.analyzeTicket(ticketData, settings);

    // Gửi kết quả về content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'aiResponse',
        data: { response: analysis, type: 'analysis' }
      });
    }

    sendResponse({ success: true, analysis });
  }

  private async handleUserMessage(data: any, sendResponse: (response?: any) => void) {
    const ticketData = this.ticketDataCache.get(data.ticketId);

    const context = {
      conversationHistory: data.conversationHistory,
      ticketData: ticketData
    };

    // Get user settings for personalized responses
    const settings = await this.getSettings();
    const response = await this.aiService.processUserMessage(data.message, context, settings);

    // Gửi response về content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'aiResponse',
        data: { response, type: 'chat' }
      });
    }

    sendResponse({ success: true, response });
  }

  private async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get([
        'encryptedApiKey',
        'userRole',
        'language',
        'aiModel'
      ]);

      // Decrypt API key if exists
      let apiKey = '';
      if (result.encryptedApiKey) {
        try {
          apiKey = await EncryptionService.decryptApiKey(result.encryptedApiKey);
        } catch (error) {
          console.error('Failed to decrypt API key in getSettings:', error);
        }
      }

      return {
        apiKey,
        userRole: result.userRole || 'developer',
        language: result.language || 'vi',
        aiModel: result.aiModel || 'gpt-3.5-turbo'
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        apiKey: '',
        userRole: 'developer',
        language: 'vi',
        aiModel: 'gpt-3.5-turbo'
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
      const result = await chrome.storage.sync.get(['backlogApiKey', 'backlogSpaceKey']);
      return {
        backlogApiKey: result.backlogApiKey || '',
        backlogSpaceKey: result.backlogSpaceKey || ''
      };
    } catch (error) {
      console.error('Error getting Backlog settings:', error);
      return {
        backlogApiKey: '',
        backlogSpaceKey: ''
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
        backlogSpaceKey: settings.backlogSpaceKey
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
      const baseUrl = `https://${config.spaceKey}.${config.domain}`;
      const apiUrl = `${baseUrl}/api/v2/space?apiKey=${encodeURIComponent(config.apiKey)}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const spaceInfo = await response.json();
        return {
          success: true,
          message: `Kết nối thành công! Space: ${spaceInfo.name || config.spaceKey}`,
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
          message: 'Space name không tồn tại'
        };
      } else {
        return {
          success: false,
          message: `Kết nối thất bại: ${response.status} ${response.statusText}`
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
}

// Khởi tạo background service
new BackgroundService();
