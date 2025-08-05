/**
 * Command related type definitions
 */

export type CommandConfig = {
  command: string;
  pattern: RegExp;
  description: string;
  example: string;
  requiresModal?: boolean;
};

export type CommandParseResult = {
  command: string;
  matches: RegExpMatchArray;
  config: CommandConfig;
};

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};
