import { TicketData } from './ticketAnalyzer';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface UserInfo {
  id: number;
  name: string;
  avatar: string;
  mailAddress: string;
  userId: string;
  nulabAccount?: {
    nulabId: string;
    name: string;
    uniqueId: string;
    iconUrl: string;
  };
}

interface ChatHistoryData {
  ticketId: string;
  ticketUrl: string;
  messages: ChatMessage[];
  lastUpdated: string;
  userInfo: UserInfo;
  ticketInfo: {
    title: string;
    status: string;
    assignee?: string;
  };
}

interface StorageMetadata {
  ticketIds: string[];
  lastAccess: Record<string, number>;
  lastCleanup: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  cleaned?: boolean;
  usage?: number;
}

export class ChatStorageService {
  private static readonly STORAGE_KEY_PREFIX = 'chat-history-';
  private static readonly META_KEY = 'chat-history-meta';
  private static readonly MAX_STORAGE_USAGE = 0.85; // 85% of quota
  private static readonly EMERGENCY_CLEANUP_THRESHOLD = 0.95; // 95% - force cleanup
  private static readonly MAX_TICKETS = 300; // Maximum tickets to store
  private static readonly MAX_MESSAGES_PER_TICKET = 100; // Maximum messages per ticket

  /**
   * Save chat history for a ticket with quota management
   */
  static async saveChatHistory(
    ticketId: string, 
    messages: ChatMessage[], 
    ticketData: TicketData, 
    userInfo: UserInfo
  ): Promise<SaveResult> {
    try {
      // Check if we have direct Chrome API access
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        return await this.saveChatHistoryDirect(ticketId, messages, ticketData, userInfo);
      } else {
        // Use message passing for main world context
        return await this.saveChatHistoryViaMessage(ticketId, messages, ticketData, userInfo);
      }
    } catch (error) {
      console.error('❌ [ChatStorage] Save failed:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error) 
      };
    }
  }

  /**
   * Direct save method (for content script context)
   */
  private static async saveChatHistoryDirect(
    ticketId: string, 
    messages: ChatMessage[], 
    ticketData: TicketData, 
    userInfo: UserInfo
  ): Promise<SaveResult> {
    // Check storage quota before saving
    const quotaCheck = await this.checkStorageQuota();
    
    if (quotaCheck.usage > this.EMERGENCY_CLEANUP_THRESHOLD) {
      console.warn('🚨 [ChatStorage] Emergency cleanup required - storage at', 
        `${(quotaCheck.usage * 100).toFixed(1)}%`);
      
      const cleanupResult = await this.emergencyCleanup();
      if (!cleanupResult.success) {
        return { 
          success: false, 
          error: 'Storage đã đầy và không thể dọn dẹp. Vui lòng xóa dữ liệu cũ thủ công.',
          usage: quotaCheck.usage
        };
      }
    } else if (quotaCheck.usage > this.MAX_STORAGE_USAGE) {
      await this.smartCleanup();
    }

    // Prepare data for storage
    const historyData: ChatHistoryData = {
      ticketId,
      ticketUrl: window.location.href,
      messages: messages.slice(-this.MAX_MESSAGES_PER_TICKET), // Keep only recent messages
      lastUpdated: new Date().toISOString(),
      userInfo,
      ticketInfo: {
        title: ticketData.title.slice(0, 200), // Limit title length
        status: ticketData.status,
        assignee: ticketData.assignee?.slice(0, 100) // Limit assignee length
      }
    };

    const storageKey = `${this.STORAGE_KEY_PREFIX}${ticketId}`;

    // Attempt to save with error handling
    const saveResult = await this.safeSave(storageKey, historyData);
    
    if (saveResult.success) {
      // Update metadata and access tracking
      await this.updateMetadata(ticketId);
    }

    return {
      ...saveResult,
      usage: quotaCheck.usage
    };
  }

  /**
   * Save via message passing (for main world context)
   */
  private static async saveChatHistoryViaMessage(
    ticketId: string, 
    messages: ChatMessage[], 
    ticketData: TicketData, 
    userInfo: UserInfo
  ): Promise<SaveResult> {
    return new Promise((resolve) => {
      const messageId = Date.now() + Math.random();

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'CHAT_STORAGE_SAVE_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);
          
          // The content script sends the result directly, not nested in a 'result' property
          resolve({
            success: event.data.success,
            error: event.data.error
          });
        }
      };

      window.addEventListener('message', responseHandler);

      window.postMessage({
        type: 'CHAT_STORAGE_SAVE',
        id: messageId,
        ticketKey: ticketId,
        data: {
          ticketId,
          messages,
          ticketData,
          userInfo
        }
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        resolve({
          success: false,
          error: 'Timeout khi lưu chat history'
        });
      }, 30000);
    });
  }

  /**
   * Load chat history for a ticket
   */
  static async loadChatHistory(ticketId: string): Promise<ChatMessage[]> {
    try {
      // Check if we have direct Chrome API access
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${ticketId}`;
        const result = await chrome.storage.local.get([storageKey]);
        const historyData = result[storageKey] as ChatHistoryData;
        
        if (historyData && historyData.messages) {
          // Convert timestamp strings back to Date objects
          const messages = historyData.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          // Update access time for smart cleanup
          await this.updateAccessTime(ticketId);
          
          return messages;
        }
        
        return [];
      } else {
        // Use message passing for main world context
        return await this.loadChatHistoryViaMessage(ticketId);
      }
    } catch (error) {
      console.error('❌ [ChatStorage] Failed to load chat history:', error);
      return [];
    }
  }

  /**
   * Load chat history via message passing (for main world context)
   */
  private static async loadChatHistoryViaMessage(ticketId: string): Promise<ChatMessage[]> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now() + Math.random();

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'CHAT_STORAGE_LOAD_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);

          if (event.data.success) {
            // Handle the response data correctly - it comes as 'data', not 'messages'
            const rawMessages = event.data.data || [];
            const messages = rawMessages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            resolve(messages);
          } else {
            console.error('❌ [ChatStorage] Load failed:', event.data.error);
            resolve([]);
          }
        }
      };

      window.addEventListener('message', responseHandler);

      window.postMessage({
        type: 'CHAT_STORAGE_LOAD',
        id: messageId,
        ticketKey: ticketId
      }, '*');

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        resolve([]);
      }, 10000);
    });
  }

  /**
   * Clear chat history for a specific ticket
   */
  static async clearChatHistory(ticketId: string): Promise<boolean> {
    try {
      // Check if we have direct Chrome API access
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${ticketId}`;
        await chrome.storage.local.remove([storageKey]);
        await this.removeFromMetadata(ticketId);
        return true;
      } else {
        // Use message passing for main world context
        return await this.clearChatHistoryViaMessage(ticketId);
      }
    } catch (error) {
      console.error('❌ [ChatStorage] Failed to clear chat history:', error);
      return false;
    }
  }

  /**
   * Clear chat history via message passing
   */
  private static async clearChatHistoryViaMessage(ticketId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = Date.now() + Math.random();

      const responseHandler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data.type === 'CHAT_STORAGE_CLEAR_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', responseHandler);
          resolve(event.data.success);
        }
      };

      window.addEventListener('message', responseHandler);

      window.postMessage({
        type: 'CHAT_STORAGE_CLEAR',
        id: messageId,
        ticketKey: ticketId
      }, '*');

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    usage: number;
    bytesUsed: number;
    maxBytes: number;
    ticketCount: number;
  }> {
    try {
      const quotaInfo = await this.checkStorageQuota();
      const meta = await this.getMetadata();
      
      return {
        usage: quotaInfo.usage,
        bytesUsed: quotaInfo.bytesUsed,
        maxBytes: quotaInfo.maxBytes,
        ticketCount: meta.ticketIds.length
      };
    } catch (error) {
      console.error('❌ [ChatStorage] Failed to get storage stats:', error);
      return {
        usage: 0,
        bytesUsed: 0,
        maxBytes: 100 * 1024 * 1024, // 100MB default
        ticketCount: 0
      };
    }
  }

  /**
   * Manual cleanup - remove all chat histories
   */
  static async clearAllChatHistories(): Promise<boolean> {
    try {
      const meta = await this.getMetadata();
      
      for (const ticketId of meta.ticketIds) {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${ticketId}`;
        await chrome.storage.local.remove([storageKey]);
      }
      
      // Clear metadata
      await chrome.storage.local.remove([this.META_KEY]);
      
      return true;
    } catch (error) {
      console.error('❌ [ChatStorage] Failed to clear all chat histories:', error);
      return false;
    }
  }

  // Private methods

  /**
   * Safe save with quota error handling and retry mechanism
   */
  private static async safeSave(
    key: string, 
    data: ChatHistoryData
  ): Promise<{success: boolean, error?: string, cleaned?: boolean}> {
    try {
      await chrome.storage.local.set({ [key]: data });
      return { success: true };

    } catch (error) {
      // Handle quota exceeded errors
      if (this.isQuotaExceededError(error)) {
        console.warn('🚨 [ChatStorage] Quota exceeded, attempting emergency cleanup...');
        
        const cleanupResult = await this.emergencyCleanup();
        if (cleanupResult.success) {
          try {
            // Retry save after cleanup
            await chrome.storage.local.set({ [key]: data });
            return { success: true, cleaned: true };
          } catch (retryError) {
            return { 
              success: false, 
              error: 'Không thể lưu dữ liệu ngay cả sau khi dọn dẹp. Dữ liệu có thể quá lớn.',
              cleaned: true 
            };
          }
        }
        
        return { 
          success: false, 
          error: 'Storage đã đầy và không thể dọn dẹp tự động.',
          cleaned: false 
        };
      }

      // Handle other storage errors
      throw error;
    }
  }

  /**
   * Check current storage usage
   */
  private static async checkStorageQuota(): Promise<{
    usage: number; 
    bytesUsed: number; 
    maxBytes: number;
  }> {
    try {
      // Only call if we have direct Chrome API access
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const bytesUsed = await chrome.storage.local.getBytesInUse();
        const maxBytes = 100 * 1024 * 1024; // 100MB for chrome.storage.local
        const usage = bytesUsed / maxBytes;

        return { usage, bytesUsed, maxBytes };
      } else {
        // Return conservative estimate for main world context
        return { usage: 0.1, bytesUsed: 0, maxBytes: 100 * 1024 * 1024 };
      }
    } catch (error) {
      // Return conservative estimate
      return { usage: 0.5, bytesUsed: 0, maxBytes: 100 * 1024 * 1024 };
    }
  }

  /**
   * Emergency cleanup - remove oldest 50% of tickets
   */
  private static async emergencyCleanup(): Promise<{success: boolean, removedCount: number}> {
    try {
      const meta = await this.getMetadata();
      if (meta.ticketIds.length === 0) {
        return { success: true, removedCount: 0 };
      }

      const sortedTickets = meta.ticketIds
        .map(id => ({ id, lastAccess: meta.lastAccess?.[id] || 0 }))
        .sort((a, b) => a.lastAccess - b.lastAccess);

      // Remove oldest 50%
      const removeCount = Math.floor(sortedTickets.length * 0.5);
      const ticketsToRemove = sortedTickets.slice(0, removeCount);

      for (const ticket of ticketsToRemove) {
        await this.clearChatHistory(ticket.id);
      }

      return { success: true, removedCount: removeCount };

    } catch (error) {
      console.error('❌ [ChatStorage] Emergency cleanup failed:', error);
      return { success: false, removedCount: 0 };
    }
  }

  /**
   * Smart cleanup - remove least accessed tickets older than 30 days
   */
  private static async smartCleanup(): Promise<void> {
    const meta = await this.getMetadata();
    const now = Date.now();
    
    // Remove tickets older than 30 days with no recent access
    const oldThreshold = now - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    const ticketsToRemove = meta.ticketIds.filter(id => {
      const lastAccess = meta.lastAccess?.[id] || 0;
      return lastAccess < oldThreshold;
    });

    // Also enforce max ticket limit
    if (meta.ticketIds.length > this.MAX_TICKETS) {
      const sortedTickets = meta.ticketIds
        .map(id => ({ id, lastAccess: meta.lastAccess?.[id] || 0 }))
        .sort((a, b) => a.lastAccess - b.lastAccess);
      
      const excessCount = meta.ticketIds.length - this.MAX_TICKETS;
      const excessTickets = sortedTickets.slice(0, excessCount);
      ticketsToRemove.push(...excessTickets.map(t => t.id));
    }

    // Remove duplicates
    const uniqueTicketsToRemove = [...new Set(ticketsToRemove)];

    for (const ticketId of uniqueTicketsToRemove) {
      await this.clearChatHistory(ticketId);
    }
  }

  /**
   * Update metadata with access tracking
   */
  private static async updateMetadata(ticketId: string): Promise<void> {
    const meta = await this.getMetadata();
    
    if (!meta.ticketIds.includes(ticketId)) {
      meta.ticketIds.push(ticketId);
    }
    
    // Track last access time for smart cleanup
    meta.lastAccess = meta.lastAccess || {};
    meta.lastAccess[ticketId] = Date.now();
    
    await chrome.storage.local.set({ [this.META_KEY]: meta });
  }

  /**
   * Update access time for a ticket
   */
  private static async updateAccessTime(ticketId: string): Promise<void> {
    const meta = await this.getMetadata();
    meta.lastAccess = meta.lastAccess || {};
    meta.lastAccess[ticketId] = Date.now();
    
    await chrome.storage.local.set({ [this.META_KEY]: meta });
  }

  /**
   * Remove ticket from metadata
   */
  private static async removeFromMetadata(ticketId: string): Promise<void> {
    const meta = await this.getMetadata();
    meta.ticketIds = meta.ticketIds.filter(id => id !== ticketId);
    
    if (meta.lastAccess) {
      delete meta.lastAccess[ticketId];
    }
    
    await chrome.storage.local.set({ [this.META_KEY]: meta });
  }

  /**
   * Get metadata with default values
   */
  private static async getMetadata(): Promise<StorageMetadata> {
    try {
      const result = await chrome.storage.local.get([this.META_KEY]);
      return result[this.META_KEY] || {
        ticketIds: [],
        lastAccess: {},
        lastCleanup: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [ChatStorage] Failed to get metadata:', error);
      return {
        ticketIds: [],
        lastAccess: {},
        lastCleanup: new Date().toISOString()
      };
    }
  }

  /**
   * Detect quota exceeded errors
   */
  private static isQuotaExceededError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';
    
    // Check basic error patterns first
    const isQuotaError = (
      errorName.includes('quotaexceedederror') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('storage area is full') ||
      errorMessage.includes('quota_exceeded')
    );

    // Only check chrome.runtime.lastError if chrome is available
    if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
      return isQuotaError || chrome.runtime.lastError.message?.toLowerCase().includes('quota');
    }

    return isQuotaError;
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: any): string {
    if (this.isQuotaExceededError(error)) {
      return 'Storage đã đầy. Hệ thống đã cố gắng dọn dẹp tự động.';
    }
    
    if (error?.message?.includes('network')) {
      return 'Lỗi mạng khi lưu dữ liệu.';
    }

    if (error?.message?.includes('permission')) {
      return 'Không có quyền truy cập storage.';
    }
    
    return 'Lỗi không xác định khi lưu chat history.';
  }
}
