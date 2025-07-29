import { ChatMessage, ChatHistoryData } from './chatStorageService';

interface OptimizationOptions {
  maxMessages?: number; // Keep only recent N messages
  maxTokens?: number; // Target total token count
  summaryTokens?: number; // Token budget for summary
  preserveUserMessages?: boolean; // Always keep user messages
}

class ContextOptimizer {
  private static readonly DEFAULT_OPTIONS: Required<OptimizationOptions> = {
    maxMessages: 10,
    maxTokens: 8000, // Conservative limit for Gemini context
    summaryTokens: 500, // Budget for conversation summary
    preserveUserMessages: true
  };

  /**
   * Estimate token count for a message (rough approximation)
   * Rule of thumb: ~4 characters per token for English text
   */
  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Optimize conversation context to fit within token limits
   */
  static optimizeContext(
    historyData: ChatHistoryData,
    options: OptimizationOptions = {}
  ): ChatHistoryData {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const messages = [...historyData.messages];

    // If we're already within limits, no optimization needed
    const totalTokens = this.calculateTotalTokens(messages);
    if (totalTokens <= opts.maxTokens && messages.length <= opts.maxMessages) {
      return historyData;
    }

    console.log(`Optimizing context: ${messages.length} messages, ~${totalTokens} tokens`);

    // Strategy 1: Keep recent messages within limit
    const recentMessages = this.keepRecentMessages(messages, opts);
    const recentTokens = this.calculateTotalTokens(recentMessages);

    if (recentTokens <= opts.maxTokens) {
      return {
        ...historyData,
        messages: recentMessages,
        lastSummaryIndex: messages.length - recentMessages.length - 1
      };
    }

    // Strategy 2: Summarize older messages if we still exceed limits
    return this.summarizeAndOptimize(historyData, recentMessages, opts);
  }

  /**
   * Keep only the most recent messages within limits
   */
  private static keepRecentMessages(
    messages: ChatMessage[],
    options: Required<OptimizationOptions>
  ): ChatMessage[] {
    const { maxMessages, maxTokens, preserveUserMessages } = options;

    // Start from the end and work backwards
    const result: ChatMessage[] = [];
    let tokenCount = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = message.tokenCount || this.estimateTokenCount(message.content);

      // Check if adding this message would exceed limits
      if (result.length >= maxMessages || tokenCount + messageTokens > maxTokens) {
        // If preserveUserMessages is true, always keep user messages
        if (preserveUserMessages && message.sender === 'user') {
          result.unshift(message);
          tokenCount += messageTokens;
        }
        break;
      }

      result.unshift(message);
      tokenCount += messageTokens;
    }

    return result;
  }

  /**
   * Create a summary of older messages and combine with recent ones
   */
  private static summarizeAndOptimize(
    historyData: ChatHistoryData,
    recentMessages: ChatMessage[],
    options: Required<OptimizationOptions>
  ): ChatHistoryData {
    const allMessages = historyData.messages;
    const cutoffIndex = allMessages.length - recentMessages.length;

    if (cutoffIndex <= 0) {
      return historyData; // No messages to summarize
    }

    const messagesToSummary = allMessages.slice(0, cutoffIndex);
    const summary = this.createConversationSummary(messagesToSummary, historyData.ticketInfo);

    return {
      ...historyData,
      messages: recentMessages,
      contextSummary: summary,
      lastSummaryIndex: cutoffIndex - 1,
      totalTokensUsed: (historyData.totalTokensUsed || 0) + this.calculateTotalTokens(messagesToSummary)
    };
  }

  /**
   * Create a concise summary of conversation messages
   */
  private static createConversationSummary(
    messages: ChatMessage[],
    ticketInfo: ChatHistoryData['ticketInfo']
  ): string {
    const userMessages = messages.filter(m => m.sender === 'user');
    const aiMessages = messages.filter(m => m.sender === 'ai');

    const topics = this.extractTopics(messages);
    const keyPoints = this.extractKeyPoints(aiMessages);

    return `
Previous conversation summary for ticket "${ticketInfo.title}":
- ${userMessages.length} user questions/requests
- Key topics discussed: ${topics.join(', ')}
- Main AI insights: ${keyPoints.join('; ')}
- Total messages: ${messages.length}
`.trim();
  }

  /**
   * Extract main topics from conversation
   */
  private static extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();

    messages.forEach(message => {
      const content = message.content.toLowerCase();

      // Simple keyword extraction for common Backlog topics
      if (content.includes('bug') || content.includes('error')) topics.add('bug analysis');
      if (content.includes('feature') || content.includes('enhancement')) topics.add('feature discussion');
      if (content.includes('test') || content.includes('testing')) topics.add('testing');
      if (content.includes('priority') || content.includes('urgent')) topics.add('priority');
      if (content.includes('assign') || content.includes('responsible')) topics.add('assignment');
      if (content.includes('deadline') || content.includes('schedule')) topics.add('timeline');
      if (content.includes('status') || content.includes('progress')) topics.add('status update');
    });

    return Array.from(topics).slice(0, 5); // Limit to top 5 topics
  }

  /**
   * Extract key insights from AI responses
   */
  private static extractKeyPoints(aiMessages: ChatMessage[]): string[] {
    const points: string[] = [];

    aiMessages.forEach(message => {
      const content = message.content;

      // Extract sentences that start with key phrases
      const lines = content.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('Key point:') ||
            trimmed.startsWith('Important:') ||
            trimmed.startsWith('Recommendation:') ||
            trimmed.startsWith('Summary:')) {
          points.push(trimmed);
        }
      });
    });

    return points.slice(0, 3); // Limit to top 3 key points
  }

  /**
   * Calculate total token count for a set of messages
   */
  static calculateTotalTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, message) => {
      return total + (message.tokenCount || this.estimateTokenCount(message.content));
    }, 0);
  }

  /**
   * Prepare context for AI API call with optimization
   */
  static prepareOptimizedContext(
    historyData: ChatHistoryData,
    newUserMessage: string,
    ticketContent: string
  ): {
    context: string;
    recentMessages: ChatMessage[];
    estimatedTokens: number;
  } {
    // Optimize existing conversation
    const optimized = this.optimizeContext(historyData, {
      maxMessages: 8,
      maxTokens: 6000 // Leave room for ticket content and response
    });

    // Build context string
    let context = `Backlog Ticket: ${optimized.ticketInfo.title}\n`;
    context += `Status: ${optimized.ticketInfo.status}\n`;
    if (optimized.ticketInfo.assignee) {
      context += `Assignee: ${optimized.ticketInfo.assignee}\n`;
    }
    context += `\nTicket Content:\n${ticketContent}\n\n`;

    // Add conversation summary if available
    if (optimized.contextSummary) {
      context += `${optimized.contextSummary}\n\n`;
    }

    // Add recent conversation
    if (optimized.messages.length > 0) {
      context += `Recent conversation:\n`;
      optimized.messages.forEach((msg) => {
        context += `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
      context += '\n';
    }

    // Add new user message
    context += `User: ${newUserMessage}\n`;
    context += `AI:`;

    const estimatedTokens = this.estimateTokenCount(context);

    return {
      context,
      recentMessages: optimized.messages,
      estimatedTokens
    };
  }
}

export default ContextOptimizer;
export type { OptimizationOptions };
