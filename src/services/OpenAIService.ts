import { availableModels, defaultModelId } from '../configs/aiModels';
import ContextOptimizer from '../shared/contextOptimizer';
import { SettingsService } from '../shared/settingsService';
import { AIService } from '../types';
import { FileAttachment } from '../types/attachment';
import { TicketData } from '../types/backlog';
import { Settings } from '../types/settings';

export class OpenAIService implements AIService {
  private apiKey: string = '';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    try {
      const settingsService = SettingsService.getInstance();
      const aiModelSettings = await settingsService.getAiModelSettings();
      this.apiKey = aiModelSettings.aiProviderKeys.openAi || '';
    } catch (error) {
      console.error('Failed to load/decrypt API key:', error);
      this.apiKey = '';
    }
  }

  private getOpenAIModel(settings?: Settings): string {
    const preferredModel = settings?.aiModels.preferredModel || defaultModelId;

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
    const apiKey = this.apiKey;
    if (!apiKey) {
      await this.loadApiKey(); // Try to reload in case it was updated
      const fallbackApiKey = this.apiKey;
      if (!fallbackApiKey) {
        return 'API key chưa được cấu hình. Vui lòng vào popup để cài đặt.';
      }
    }

    const finalApiKey = this.apiKey;
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
    const apiKey = this.apiKey;
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
    const roleContext = this.getRoleContext(settings?.general.userRole || 'developer');
    const languagePrompt = this.getLanguagePrompt(settings?.general.language || 'vi');

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
    const roleContext = this.getRoleContext(settings?.general.userRole || 'developer');
    const languageContext = this.getLanguagePrompt(settings?.general.language || 'vi');

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
