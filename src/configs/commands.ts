/**
 * Command definitions for the AI extension
 * Commands are special instructions that users can type directly or use through UI
 */

export interface CommandConfig {
  command: string;
  pattern: RegExp;
  description: string;
  example: string;
  requiresModal?: boolean;
}

export const availableCommands: CommandConfig[] = [
  {
    command: 'translate',
    pattern: /^\/translate\s+([a-z]{2})\s*->\s*([a-z]{2})$/i,
    description: 'Translate ticket content from one language to another',
    example: '/translate ja -> vi',
    requiresModal: true
  }
];

export const COMMAND_PREFIX = '/';

/**
 * Parse a message to check if it matches any command pattern
 * @param message The message to parse
 * @returns Command match result or null
 */
export function parseCommand(message: string): {
  command: string;
  matches: RegExpMatchArray;
  config: CommandConfig;
} | null {
  const trimmedMessage = message.trim();

  for (const config of availableCommands) {
    const matches = trimmedMessage.match(config.pattern);
    if (matches) {
      return {
        command: config.command,
        matches,
        config
      };
    }
  }

  return null;
}

/**
 * Common language codes and their display names
 */
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const availableLanguages: LanguageOption[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' }
];

/**
 * Get language display name from code
 */
export function getLanguageDisplayName(code: string): string {
  const lang = availableLanguages.find(l => l.code === code);
  return lang ? `${lang.name} (${lang.nativeName})` : code.toUpperCase();
}
