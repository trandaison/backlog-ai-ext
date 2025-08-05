/**
 * File attachment related type definitions
 */

export type FileAttachment = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  base64?: string; // Base64 encoded content for API transmission
  preview?: string; // Preview text for text files
};

export type AttachmentPreview = {
  id: string;
  name: string;
  size: number;
  type: string;
  displaySize: string; // Human readable size (e.g., "1.2 MB")
};

export type ChatMessageWithAttachments = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: FileAttachment[];
  attachmentPreviews?: AttachmentPreview[]; // For display in chat history
};

export type FileProcessingResult = {
  success: boolean;
  attachment?: FileAttachment;
  error?: string;
};
