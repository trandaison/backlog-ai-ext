/**
 * Language utilities for the AI extension
 */

import { availableLanguages } from '../configs';

/**
 * Get language display name from code
 */
export function getLanguageDisplayName(code: string): string {
  const lang = availableLanguages.find(l => l.code === code);
  return lang ? `${lang.name} (${lang.nativeName})` : code.toUpperCase();
}
