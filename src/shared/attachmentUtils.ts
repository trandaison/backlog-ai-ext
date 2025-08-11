/**
 * File attachment processing utilities
 */

import type {
  FileAttachment,
  AttachmentPreview,
  FileProcessingResult,
} from '../types/attachment.d';

export class AttachmentUtils {
  // Maximum file size in bytes (10MB)
  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Allowed file types
  static readonly ALLOWED_TYPES = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'application/javascript',
    'text/javascript',
    'text/typescript',
    'text/css',
    'text/html',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static isAllowedFileType(file: File): boolean {
    // Check MIME type first
    if (this.ALLOWED_TYPES.includes(file.type)) {
      return true;
    }

    // If MIME type is empty or not recognized, check file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    // Map file extensions to allowed types
    const extensionMap: { [key: string]: boolean } = {
      '.txt': true,
      '.md': true,
      '.markdown': true,
      '.csv': true,
      '.json': true,
      '.xml': true,
      '.js': true,
      '.ts': true,
      '.css': true,
      '.html': true,
      '.htm': true,
      '.pdf': true,
      '.jpg': true,
      '.jpeg': true,
      '.png': true,
      '.gif': true,
      '.webp': true,
      '.svg': true,
    };

    return extensionMap[extension] || false;
  }

  static isWithinSizeLimit(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }

  static generateAttachmentId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static async getTextPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        // Limit preview to first 200 characters
        const preview =
          text.length > 200 ? text.substring(0, 200) + '...' : text;
        resolve(preview);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  static async processFile(file: File): Promise<FileProcessingResult> {
    try {
      // Validate file type
      if (!this.isAllowedFileType(file)) {
        return {
          success: false,
          error: `File type "${
            file.type || 'unknown'
          }" is not supported. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`,
        };
      }

      // Validate file size
      if (!this.isWithinSizeLimit(file.size)) {
        return {
          success: false,
          error: `File size exceeds limit. Maximum size: ${this.formatFileSize(
            this.MAX_FILE_SIZE
          )}`,
        };
      }

      // Convert to base64
      const base64 = await this.fileToBase64(file);

      // Get text preview for text files
      let preview: string | undefined;
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        try {
          preview = await this.getTextPreview(file);
        } catch (error) {
          console.warn('Failed to generate text preview:', error);
        }
      }

      const attachment: FileAttachment = {
        id: this.generateAttachmentId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        base64,
        preview,
      };

      return {
        success: true,
        attachment,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  static createAttachmentPreview(
    attachment: FileAttachment
  ): AttachmentPreview {
    return {
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      displaySize: this.formatFileSize(attachment.size),
    };
  }
}
