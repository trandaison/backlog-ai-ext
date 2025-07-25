// Background script để xử lý AI API và communication
import { TicketData } from '../shared/ticketAnalyzer';

interface AIService {
  analyzeTicket(ticketData: TicketData): Promise<string>;
  processUserMessage(message: string, context: any): Promise<string>;
}

class OpenAIService implements AIService {
  private apiKey: string = '';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    this.apiKey = result.openaiApiKey || '';
  }

  async analyzeTicket(ticketData: TicketData): Promise<string> {
    if (!this.apiKey) {
      return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
    }

    const prompt = this.buildTicketAnalysisPrompt(ticketData);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Bạn là một AI assistant chuyên phân tích ticket Backlog. Hãy phân tích ticket một cách chi tiết và đưa ra những insight hữu ích.'
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

  async processUserMessage(message: string, context: any): Promise<string> {
    if (!this.apiKey) {
      return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
    }

    const conversationHistory = context.conversationHistory || [];
    const ticketData = context.ticketData;

    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(ticketData)
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

  private buildTicketAnalysisPrompt(ticketData: TicketData): string {
    return `
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

  private buildSystemPrompt(ticketData?: TicketData): string {
    let systemPrompt = `
Bạn là AI assistant chuyên hỗ trợ phân tích và thảo luận về ticket Backlog.
Bạn có thể:
- Phân tích chi tiết nội dung ticket
- Đề xuất giải pháp kỹ thuật
- Giải thích các khái niệm kỹ thuật
- Hỗ trợ planning và estimation
- Đưa ra best practices

Hãy trả lời một cách chi tiết, chuyên nghiệp và hữu ích.
`;

    if (ticketData) {
      systemPrompt += `\n\nThông tin ticket hiện tại:
ID: ${ticketData.id}
Tiêu đề: ${ticketData.title}
Mô tả: ${ticketData.description}
Status: ${ticketData.status}
Priority: ${ticketData.priority}
`;
    }

    return systemPrompt;
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
          await this.saveApiKey(message.data.apiKey);
          sendResponse({ success: true });
          break;

        case 'getApiKey':
          const apiKey = await this.getApiKey();
          sendResponse({ apiKey });
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

    const analysis = await this.aiService.analyzeTicket(ticketData);

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

    const response = await this.aiService.processUserMessage(data.message, context);

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

  private async saveApiKey(apiKey: string) {
    await chrome.storage.sync.set({ openaiApiKey: apiKey });
  }

  private async getApiKey(): Promise<string> {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    return result.openaiApiKey || '';
  }
}

// Khởi tạo background service
new BackgroundService();
