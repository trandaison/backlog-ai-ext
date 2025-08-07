/**
 * Command-related constants and configurations
 * Commands are special instructions that users can type directly or use through UI
 */

import type { CommandConfig, LanguageOption } from '../types/commands.d';

export const availableCommands: CommandConfig[] = [
  {
    command: 'translate',
    pattern: /^\/translate\s+([a-z]{2})\s*->\s*([a-z]{2})$/i,
    description: 'Translate ticket content from one language to another',
    example: '/translate ja -> vi',
    requiresModal: true
  },
  {
    command: 'create-ticket',
    pattern: /^\/create-ticket\s+(\S+)\/(\S+)\s+([a-z]{2})\sissueType:(\d+)\spriority:(\d+)$/i,
    description: 'Create a backlog ticket with AI-generated content',
    example: '/create-ticket example.backlogtool.com/TEST vi',
    requiresModal: false
  }
];

export const COMMAND_PREFIX = '/';

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
