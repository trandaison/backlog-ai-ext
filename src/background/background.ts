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
${ticketData.comments.map(comment => {
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
      const response = await this.aiService.processUserMessage(message, context, settings);

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
      const summary = await this.callOpenAISummary(summaryPrompt, settings);

      sendResponse({ success: true, summary });
    } catch (error) {
      console.error('Error handling ticket summary:', error);
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
    return {
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
        timestamp: comment.created || ''
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

${ticketData.comments && ticketData.comments.length > 0 ? `**Comments gần đây**:
${ticketData.comments.slice(-3).map(comment => {
  const content = comment.content || '';
  const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
  return `- ${comment.author}: ${truncatedContent}`;
}).join('\n')}` : ''}

Hãy tóm tắt trong 3-5 câu ngắn gọn:
1. Vấn đề chính của ticket
2. Trạng thái hiện tại
3. Những điểm quan trọng cần lưu ý
4. Next steps nếu có thể xác định được`;
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
          model: settings?.aiModel || 'gpt-3.5-turbo',
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

      const data = await response.json();

      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error calling OpenAI API for summary:', error);
      return `Lỗi khi gọi AI API: ${error}`;
    }
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
      const baseUrl = `https://${config.spaceName}.${config.domain}`;
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
          message: `Kết nối thành công! Space: ${spaceInfo.name || config.spaceName}`,
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

// Khởi tạo background service
new BackgroundService();
