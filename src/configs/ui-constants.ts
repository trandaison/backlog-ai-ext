/**
 * UI Constants for styling and component configuration
 */

import type { UIConstants, FormConstants } from '../types/ui.d';

export const UI_CONSTANTS: UIConstants = {
  MODAL_Z_INDEX: 10000,
  ANIMATION_DURATION: 200,
  MODAL_BACKDROP_CLASS: 'ai-ext-modal-backdrop',
  MODAL_CONTENT_CLASS: 'ai-ext-modal-content'
} as const;

export const FORM_CONSTANTS: FormConstants = {
  SELECT_CLASS: 'ai-ext-form-select-compact',
  BUTTON_PRIMARY_CLASS: 'ai-ext-button ai-ext-button-primary',
  BUTTON_SECONDARY_CLASS: 'ai-ext-button ai-ext-button-secondary'
} as const;
