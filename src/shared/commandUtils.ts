/**
 * Command parsing utilities for the AI extension
 */

import type { CommandParseResult } from '../types/commands.d';
import { availableCommands, availableLanguages } from '../configs/commands';

/**
 * Parse a message to check if it matches any command pattern
 * @param message The message to parse
 * @returns Command match result or null
 */
export function parseCommand(message: string): CommandParseResult | null {
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
 * Get language display name from code
 */
export function getLanguageDisplayName(code: string): string {
  const lang = availableLanguages.find(l => l.code === code);
  return lang ? `${lang.name} (${lang.nativeName})` : code.toUpperCase();
}
