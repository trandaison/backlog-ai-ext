// Utility functions cho encryption/decryption API key
// Sử dụng Web Crypto API cho bảo mật

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 96; // 12 bytes for GCM

  /**
   * Generate encryption key từ password/passphrase
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Tạo master key từ extension ID (unique per installation)
   */
  private static async getMasterKey(): Promise<CryptoKey> {
    const extensionId = chrome.runtime.id;
    const salt = new TextEncoder().encode(extensionId + 'backlog-ai-salt');

    // Pad salt to 16 bytes
    const paddedSalt = new Uint8Array(16);
    paddedSalt.set(salt.slice(0, 16));

    return this.deriveKey(extensionId + 'master-key', paddedSalt);
  }

  /**
   * Encrypt API key
   */
  static async encryptApiKey(apiKey: string): Promise<string> {
    if (!apiKey || apiKey.trim() === '') {
      return '';
    }

    try {
      const key = await this.getMasterKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH / 8));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );

      // Combine IV + encrypted data and encode as base64
      const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.byteLength);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key
   */
  static async decryptApiKey(encryptedData: string): Promise<string> {
    if (!encryptedData || encryptedData.trim() === '') {
      return '';
    }

    try {
      const key = await this.getMasterKey();

      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const ivLength = this.IV_LENGTH / 8;
      const iv = combined.slice(0, ivLength);
      const encrypted = combined.slice(ivLength);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error: any) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt API key: ' + error.message);
    }
  }

  /**
   * Validate API key format (OpenAI format)
   */
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // OpenAI API key format: sk-... (can contain letters, numbers, hyphens, underscores)
    return /^sk-[a-zA-Z0-9-_]{48,}$/.test(apiKey.trim());
  }

  /**
   * Validate Backlog Personal API key format
   */
  static validateBacklogApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Backlog Personal API Key is typically alphanumeric, 40-60 characters
    return /^[a-zA-Z0-9]{20,80}$/.test(apiKey.trim());
  }

  /**
   * Validate Backlog space name format
   */
  static validateBacklogSpaceName(spaceName: string): boolean {
    if (!spaceName || typeof spaceName !== 'string') {
      return false;
    }

    // Backlog space name: alphanumeric, hyphens allowed, 3-30 characters
    return /^[a-zA-Z0-9-]{3,30}$/.test(spaceName.trim());
  }

  /**
   * Mask API key for display (show only first/last few characters)
   */
  static maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) {
      return '***';
    }

    const start = apiKey.substring(0, 3);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  }

  // =====================================================================
  // DIGITAL SIGNATURE METHODS FOR EXPORT/IMPORT SECURITY
  // =====================================================================

  /**
   * Sign export data to ensure authenticity and integrity
   * TEMPORARILY DISABLED - Return mock signature for now
   */
  static async signExportData(data: any): Promise<{ signature: string; metadata: any }> {
    console.log('🔐 signExportData: Temporarily disabled, returning mock signature');

    // Return mock signature for now
    return {
      signature: '',
      metadata: {
        extensionId: chrome.runtime.id,
        signedAt: new Date().toISOString(),
        version: '1.0.0',
        unsigned: true,
        note: 'Digital signature temporarily disabled'
      }
    };
  }

  /**
   * Verify the signature of imported data
   * TEMPORARILY DISABLED - Always return false (unsigned)
   */
  static async verifyImportData(data: any, signature: string, metadata: any): Promise<boolean> {
    console.log('🔍 verifyImportData: Temporarily disabled, treating all files as unsigned');

    // Always treat as unsigned for now
    return false;
  }
}
