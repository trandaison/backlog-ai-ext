import { availableModels, defaultModelId } from '../configs/aiModels';
import ContextOptimizer from '../shared/contextOptimizer';
import { SettingsService } from '../shared/settingsService';
import { AIService } from '../types';
import { FileAttachment } from '../types/attachment';
import { TicketData } from '../types/backlog';
import { Settings } from '../types/settings';

export class GeminiService implements AIService {
  private apiKey: string = '';
  private baseApiUrl: string =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    try {
      const settingsService = SettingsService.getInstance();
      const aiModelSettings = await settingsService.getAiModelSettings();
      this.apiKey = aiModelSettings.aiProviderKeys.gemini || '';
    } catch (error) {
      console.error('❌ [Gemini] Error loading API key:', error);
      this.apiKey = '';
    }
  }

  // Map preferred model to actual Gemini API model name
  private getGeminiModelName(preferredModel?: string): string {
    if (!preferredModel) {
      // Use default model from config and map to actual Gemini model
      const defaultModel = availableModels.find((m) => m.id === defaultModelId);
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
      'o3-mini': 'gemini-2.0-flash-thinking-exp', // reasoning model
    };

    return modelMap[modelId] || 'gemini-2.0-flash-exp';
  }
  private getApiUrl(model: string = 'gemini-2.0-flash-exp'): string {
    return `${this.baseApiUrl}/${model}:generateContent`;
  }

  async analyzeTicket(
    ticketData: TicketData,
    settings?: Settings
  ): Promise<string> {
    const prompt = this.buildAnalysisPrompt(ticketData, settings);
    const result = await this.callGeminiAPI(prompt, settings);
    return result.response;
  }

  async processUserMessage(
    message: string,
    contextData: any,
    settings?: Settings,
    attachments?: FileAttachment[]
  ): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    console.log(
      '🔎 ~ GeminiService ~ processUserMessage ~ contextData:',
      contextData
    );
    // Build prompt based on whether comment context is present
    let finalPrompt: string;

    if (contextData.commentContext) {
      // Build comment-focused prompt
      finalPrompt = this.buildCommentPrompt(message, contextData, settings);
    } else {
      // Build enhanced message with attachments if any
      finalPrompt = message;
      if (attachments && attachments.length > 0) {
        finalPrompt = this.buildMessageWithAttachments(message, attachments);
      }

      // Check if this is optimized context from ContextOptimizer
      if (contextData.isOptimized) {
        // Use the optimized context as is
      } else {
        // Build regular chat prompt for legacy handling
        finalPrompt = this.buildChatPrompt(message, contextData, settings);
      }
    }

    // Log the final prompt for review
    console.log('🔍 [Gemini] Final prompt being sent to AI:', finalPrompt);

    const result = await this.callGeminiAPI(finalPrompt, settings, attachments);
    return {
      response: result.response,
      responseId: result.responseId,
      tokensUsed:
        result.tokensUsed ||
        ContextOptimizer.estimateTokenCount(result.response),
    };
  }

  private buildMessageWithAttachments(
    message: string,
    attachments: FileAttachment[]
  ): string {
    let enhancedMessage = message;

    for (const attachment of attachments) {
      enhancedMessage += `\n\n**File: ${attachment.name}** (${
        attachment.type
      }, ${this.formatFileSize(attachment.size)})\n`;

      // For files that will be sent as inline_data, just mention them
      if (
        attachment.type.startsWith('image/') ||
        attachment.type.startsWith('text/') ||
        attachment.type.includes('csv') ||
        attachment.type.includes('json') ||
        attachment.type.includes('plain')
      ) {
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

  private buildAnalysisPrompt(
    ticketData: TicketData,
    settings?: Settings
  ): string {
    const language =
      settings?.general.language === 'vi' ? 'tiếng Việt' : 'English';
    const role = settings?.general.userRole || 'developer';

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

  private buildChatPrompt(
    message: string,
    context: any,
    settings?: Settings
  ): string {
    const language =
      settings?.general.language === 'vi' ? 'tiếng Việt' : 'English';
    const role = settings?.general.userRole || 'developer';

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

  private buildCommentPrompt(
    message: string,
    context: any,
    settings?: Settings
  ): string {
    const language =
      settings?.general.language === 'vi' ? 'tiếng Việt' : 'English';
    const role = settings?.general.userRole || 'developer';

    let prompt = `Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:\n\n`;

    // Add ticket context
    if (context.ticketData) {
      prompt += `Bối cảnh ticket:
- ID: ${context.ticketData.id}
- Tiêu đề: ${context.ticketData.title}
- Trạng thái: ${context.ticketData.status}
- Mô tả ticket: ${context.ticketData.description || 'Không có mô tả'}\n\n`;
    }

    // Add selected comment context
    const commentContext = context.commentContext;
    if (commentContext && commentContext.selectedComment) {
      const selectedComment = commentContext.selectedComment;
      const createdDate = selectedComment.created
        ? new Date(selectedComment.created).toLocaleString('vi-VN')
        : 'Không rõ';

      prompt += `Comment cần phân tích (người dùng tập trung vào comment này):
- Người gửi: ${selectedComment.createdUser?.name || 'Không rõ'}
- Thời gian: ${createdDate}
- Nội dung: ${selectedComment.content || 'Không có nội dung'}\n\n`;
    }

    // Add previous comments for context
    if (
      commentContext &&
      commentContext.previousComments &&
      commentContext.previousComments.length > 0
    ) {
      prompt += `2 comments gần đó nhất cho việc tham khảo các thông tin liên quan:\n`;

      commentContext.previousComments
        .slice(0, 2)
        .forEach((comment: any, index: number) => {
          const createdDate = comment.created
            ? new Date(comment.created).toLocaleString('vi-VN')
            : 'Không rõ';
          prompt += `${index + 1}. ${
            comment.createdUser?.name || 'Không rõ'
          } lúc ${createdDate} với nội dung: ${
            comment.content || 'Không có nội dung'
          }\n`;
        });
      prompt += '\n';
    }

    prompt += `---\nCâu hỏi: ${message}`;

    return prompt;
  }

  private async callGeminiAPI(
    prompt: string,
    settings?: Settings,
    attachments?: FileAttachment[]
  ): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }> {
    try {
      const apiKey = this.apiKey;
      if (!apiKey) {
        return {
          response:
            'Gemini API key chưa được cấu hình. Vui lòng vào popup để cài đặt.',
          tokensUsed: 0,
        };
      }

      // Get the actual Gemini model name from preferred model
      const geminiModel = this.getGeminiModelName(
        settings?.aiModels.preferredModel || undefined
      );
      const apiUrl = this.getApiUrl(geminiModel);

      // Build parts array for multimodal content
      const parts: any[] = [
        {
          text: prompt,
        },
      ];

      // Add attachments if any
      if (attachments && attachments.length > 0) {
        console.log('📎 [Gemini] Processing attachments:', attachments.length);
        for (const attachment of attachments) {
          console.log(
            '📎 [Gemini] Attachment:',
            attachment.name,
            attachment.type,
            'has base64:',
            !!attachment.base64
          );
          if (attachment.base64) {
            // For images, add as inline_data for vision processing
            if (attachment.type.startsWith('image/')) {
              console.log(
                '🖼️ [Gemini] Adding image attachment:',
                attachment.name
              );
              parts.push({
                inline_data: {
                  mime_type: attachment.type,
                  data: attachment.base64,
                },
              });
            }
            // For text files (CSV, TXT, JSON, etc), also add as inline_data for better processing
            else if (
              attachment.type.startsWith('text/') ||
              attachment.type.includes('csv') ||
              attachment.type.includes('json') ||
              attachment.type.includes('plain')
            ) {
              console.log(
                '📄 [Gemini] Adding text file as inline_data:',
                attachment.name
              );
              parts.push({
                inline_data: {
                  mime_type: attachment.type,
                  data: attachment.base64,
                },
              });
            }
            // For other binary files, mention in text (already included in prompt)
          }
        }
      }

      console.log(
        '🚀 [Gemini] Final parts array:',
        parts.length,
        parts.map((p) =>
          p.inline_data ? `inline_data: ${p.inline_data.mime_type}` : 'text'
        )
      );

      const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased from 1024 to handle longer responses
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Gemini] API Error Response:', errorText);
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(
          `Gemini API Error: ${
            data.error.message || JSON.stringify(data.error)
          }`
        );
      }

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        const content = data.candidates[0].content.parts[0].text;
        const responseId =
          data.candidates[0].citationMetadata?.citationSources?.[0]?.endIndex?.toString() ||
          undefined;
        const tokensUsed =
          data.usageMetadata?.totalTokenCount ||
          ContextOptimizer.estimateTokenCount(content);

        return {
          response: content,
          responseId,
          tokensUsed,
        };
      } else {
        console.error('❌ [Gemini] Invalid API response structure:', data);
        throw new Error(
          'Invalid Gemini API response - no content in candidates'
        );
      }
    } catch (error) {
      console.error('❌ [Gemini] Error calling API:', error);
      throw error;
    }
  }
}
