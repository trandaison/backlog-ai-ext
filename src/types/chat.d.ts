import { FileAttachment } from './attachment.d';
import { UserInfo } from './backlog';

export type ChatMessage = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string | Date; // Allow both string and Date for storage/runtime compatibility
  responseId?: string; // Store Gemini responseId for reference
  tokenCount?: number; // Track token usage per message
  compressed?: boolean; // Flag if this message was summarized
  attachments?: FileAttachment[]; // Array of file attachments
  commentContext?: {
    iconUrl: string;
    name: string;
    created: string;
    content: string; // Truncated to first 200 characters
  };
};

export type ChatHistoryData = {
  ticketId: string;
  ticketUrl: string;
  messages: Array<ChatMessage>;
  lastUpdated: string;
  userInfo: UserInfo;
  ticketInfo: {
    title: string;
    status: string;
    assignee?: string;
  };
  // Add optimization fields:
  contextSummary?: string; // Compressed summary of older messages
  lastSummaryIndex?: number; // Index of last message included in summary
  totalTokensUsed?: number; // Track cumulative token usage
}

export type StorageMetadata = {
  ticketIds: string[];
  lastAccess: Record<string, number>;
  lastCleanup: string;
}

export type SaveResult = {
  success: boolean;
  error?: string;
  cleaned?: boolean;
  usage?: number;
}
