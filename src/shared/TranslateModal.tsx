import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { availableLanguages, getLanguageDisplayName, type LanguageOption } from '../configs';

export interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (command: string) => void;
}

const TranslateModal: React.FC<TranslateModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [sourceLanguage, setSourceLanguage] = useState<string>('ja'); // Default: Japanese
  const [targetLanguage, setTargetLanguage] = useState<string>('vi'); // Default: Vietnamese

  const handleConfirm = () => {
    if (sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage) {
      const command = `/translate ${sourceLanguage} -> ${targetLanguage}`;
      onConfirm(command);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const isValid = sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage;

  return (
    <Modal
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
              className="ai-ext-form-select-compact"
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
              className="ai-ext-form-select-compact"
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
            {sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage
              ? `/translate ${sourceLanguage} -> ${targetLanguage}`
              : '/translate [source] -> [target]'
            }
          </code>
        </div>

        <div className="ai-ext-form-actions">
          <button
            className="ai-ext-button ai-ext-button-secondary"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="ai-ext-button ai-ext-button-primary"
            onClick={handleConfirm}
            disabled={!isValid}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TranslateModal;
