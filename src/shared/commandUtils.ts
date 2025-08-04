/**
 * Command parsing utilities for the AI extension
 */

import { availableCommands, type CommandConfig } from '../configs';

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
