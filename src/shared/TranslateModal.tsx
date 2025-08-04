import React, { useState, useEffect } from 'react';
import { availableLanguages, UI_CONSTANTS, FORM_CONSTANTS, type LanguageOption } from '../configs';
import { getLanguageDisplayName } from './languageUtils';

export interface ModalComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (command: string) => void;
  ModalComponent?: React.ComponentType<ModalComponentProps>;
}

const DefaultModal: React.FC<ModalComponentProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');

  // Handle modal animation states
  useEffect(() => {
    if (isOpen) {
      setAnimationState('entering');
      const timer = setTimeout(() => {
        setAnimationState('entered');
      }, 50); // Small delay to ensure entering state is applied
      return () => clearTimeout(timer);
    } else {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setAnimationState('exited');
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Inline modal implementation as fallback
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Don't prevent body scroll since modal is scoped to chatbox
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Don't render if modal is completely closed
  if (!isOpen && animationState === 'exited') return null;

  return (
    <div
      className={`${UI_CONSTANTS.MODAL_BACKDROP_CLASS} ai-ext-chatbox-modal ai-ext-modal-${animationState} ${className}`}
      onClick={handleBackdropClick}
      style={{
        zIndex: UI_CONSTANTS.MODAL_Z_INDEX,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div
        className={UI_CONSTANTS.MODAL_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ai-ext-modal-header">
            <h3 className="ai-ext-modal-title">{title}</h3>
            <button
              className="ai-ext-modal-close"
              onClick={onClose}
              type="button"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}
        <div className="ai-ext-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

const TranslateModal: React.FC<TranslateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ModalComponent = DefaultModal
}) => {
  const [sourceLanguage, setSourceLanguage] = useState<string>('ja');
  const [targetLanguage, setTargetLanguage] = useState<string>('vi');

  const handleConfirm = () => {
    if (sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage) {
      const command = `/translate ${sourceLanguage} -> ${targetLanguage}`;
      onConfirm(command);
      onClose();
    }
  };

  const isValid = sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage;

  return (
    <ModalComponent
      isOpen={isOpen}
      onClose={onClose}
      title="🌍 Translate Ticket Content"
      className="ai-ext-translate-modal"
    >
      <div className="ai-ext-translate-form">
        <div className="ai-ext-form-row">
          <div className="ai-ext-form-column">
            <label htmlFor="source-language" className="ai-ext-form-label-top">
              Translate from
            </label>
            <select
              id="source-language"
              className={FORM_CONSTANTS.SELECT_CLASS}
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-ext-form-arrow-center">
            <span className="ai-ext-arrow-icon">→</span>
          </div>

          <div className="ai-ext-form-column">
            <label htmlFor="target-language" className="ai-ext-form-label-top">
              To
            </label>
            <select
              id="target-language"
              className={FORM_CONSTANTS.SELECT_CLASS}
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sourceLanguage === targetLanguage && sourceLanguage && (
          <div className="ai-ext-form-error">
            ⚠️ Source and target languages must be different
          </div>
        )}

        <div className="ai-ext-form-preview">
          <span className="ai-ext-preview-label">Command preview:</span>
          <code className="ai-ext-preview-command">
            {isValid
              ? `/translate ${sourceLanguage} -> ${targetLanguage}`
              : '/translate [source] -> [target]'
            }
          </code>
        </div>

        <div className="ai-ext-form-actions">
          <button
            className={FORM_CONSTANTS.BUTTON_SECONDARY_CLASS}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={FORM_CONSTANTS.BUTTON_PRIMARY_CLASS}
            onClick={handleConfirm}
            disabled={!isValid}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </ModalComponent>
  );
};

export default TranslateModal;
