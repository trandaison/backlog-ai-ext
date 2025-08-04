import React, { useState, useEffect } from 'react';
import Modal from './Modal';

// Language options for translation
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
  { code: 'th', name: 'ไทย' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
];

// Local storage keys for caching
const STORAGE_KEYS = {
  TARGET_BACKLOG: 'ai-ext-create-ticket-target-backlog',
  SOURCE_LANGUAGE: 'ai-ext-create-ticket-source-language',
  TARGET_LANGUAGE: 'ai-ext-create-ticket-target-language',
};

// Backlog API Key interface (matching options.tsx)
interface BacklogAPIKey {
  id: string;
  domain: string;
  spaceName: string;
  apiKey: string;
  note?: string;
  namespace?: string;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: string) => void;
  Modal?: React.ComponentType<any>;
  loadBacklogConfigs?: () => Promise<BacklogAPIKey[]>;
}

interface CreateTicketModalState {
  targetBacklog: string;
  sourceLanguage: string;
  targetLanguage: string;
  error: string;
  availableBacklogs: BacklogAPIKey[];
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  Modal: InjectedModal,
  loadBacklogConfigs
}) => {
  const [formState, setFormState] = useState<CreateTicketModalState>({
    targetBacklog: '',
    sourceLanguage: '',
    targetLanguage: '',
    error: '',
    availableBacklogs: []
  });

  // Load cached values and backlog configs from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const cachedBacklog = localStorage.getItem(STORAGE_KEYS.TARGET_BACKLOG) || '';
        const cachedSourceLanguage = localStorage.getItem(STORAGE_KEYS.SOURCE_LANGUAGE) || '';
        const cachedTargetLanguage = localStorage.getItem(STORAGE_KEYS.TARGET_LANGUAGE) || '';

        // Load backlog API keys - use injected loader or fallback
        let availableBacklogs: BacklogAPIKey[] = [];
        try {
          console.log('🔍 Loading backlog API keys...');

          if (loadBacklogConfigs) {
            // Use injected loader function
            availableBacklogs = await loadBacklogConfigs();
            console.log('✅ Loaded configs via injected function:', availableBacklogs);
          } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            // Fallback to direct Chrome API call
            console.log('🔄 Using Chrome API fallback...');
            const response = await chrome.runtime.sendMessage({
              action: 'getBacklogConfigs'
            });

            if (response && response.configs) {
              availableBacklogs = response.configs;
              console.log('✅ Loaded configs via Chrome API:', availableBacklogs);
            } else {
              console.warn('⚠️ Failed to get backlog configs:', response?.error || 'Unknown error');
            }
          } else {
            console.warn('⚠️ No data loader available and Chrome APIs not accessible');
          }

          // Filter out backlog with same host as current page
          const { host: currentHost } = window.location;
          availableBacklogs = availableBacklogs.filter(item => `${item.spaceName}.${item.domain}` !== currentHost);

          // Filter out empty/invalid entries
          availableBacklogs = availableBacklogs.filter(backlog =>
            backlog && backlog.domain && backlog.domain.trim() !== ''
          );
          console.log('🎯 Final filtered backlogs:', availableBacklogs);

        } catch (error) {
          console.error('❌ Failed to load backlog configs:', error);
        }        setFormState({
          targetBacklog: cachedBacklog,
          sourceLanguage: cachedSourceLanguage,
          targetLanguage: cachedTargetLanguage,
          error: '',
          availableBacklogs
        });
      };

      loadData();
    }
  }, [isOpen, loadBacklogConfigs]);  const handleInputChange = (field: keyof CreateTicketModalState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      error: '' // Clear error when user makes changes
    }));
  };

  const validateForm = (): boolean => {
    if (!formState.targetBacklog.trim()) {
      setFormState(prev => ({ ...prev, error: 'Vui lòng chọn backlog đích' }));
      return false;
    }

    if (!formState.sourceLanguage) {
      setFormState(prev => ({ ...prev, error: 'Vui lòng chọn ngôn ngữ nguồn' }));
      return false;
    }

    if (!formState.targetLanguage) {
      setFormState(prev => ({ ...prev, error: 'Vui lòng chọn ngôn ngữ đích' }));
      return false;
    }

    // Check if selected backlog exists in available configs
    const selectedBacklog = formState.availableBacklogs.find(b => b.domain === formState.targetBacklog);
    if (!selectedBacklog) {
      setFormState(prev => ({
        ...prev,
        error: 'Backlog đã chọn không có trong cấu hình. Vui lòng cấu hình API key trong Options.'
      }));
      return false;
    }

    return true;
  };  const generateCommand = (): string => {
    return `/create-ticket ${formState.targetBacklog.trim()} ${formState.sourceLanguage} ${formState.targetLanguage}`;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Cache the values for future use
    localStorage.setItem(STORAGE_KEYS.TARGET_BACKLOG, formState.targetBacklog.trim());
    localStorage.setItem(STORAGE_KEYS.SOURCE_LANGUAGE, formState.sourceLanguage);
    localStorage.setItem(STORAGE_KEYS.TARGET_LANGUAGE, formState.targetLanguage);

    // Generate and submit command
    const command = generateCommand();
    onSubmit(command);
  };

  const handleCancel = () => {
    setFormState(prev => ({ ...prev, error: '' }));
    onClose();
  };

  // Use injected Modal if available, otherwise use fallback
  if (InjectedModal) {
    return (
      <InjectedModal isOpen={isOpen} onClose={handleCancel} title="Tạo Backlog Ticket">
        <CreateTicketForm
          formState={formState}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          generateCommand={generateCommand}
        />
      </InjectedModal>
    );
  }

  // Fallback modal implementation
  if (!isOpen) return null;

  return (
    <div className="ai-ext-chatbox-modal ai-ext-modal-entering">
      <div className="ai-ext-modal-content">
        <div className="ai-ext-modal-header">
          <h3 className="ai-ext-modal-title">Tạo Backlog Ticket</h3>
          <button
            className="ai-ext-modal-close"
            onClick={handleCancel}
            aria-label="Đóng modal"
          >
            ×
          </button>
        </div>
        <div className="ai-ext-modal-body">
          <CreateTicketForm
            formState={formState}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            generateCommand={generateCommand}
          />
        </div>
      </div>
    </div>
  );
};

// Separate form component for reusability
interface CreateTicketFormProps {
  formState: CreateTicketModalState;
  onInputChange: (field: keyof CreateTicketModalState, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  generateCommand: () => string;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({
  formState,
  onInputChange,
  onSubmit,
  onCancel,
  generateCommand
}) => {
  return (
    <div className="ai-ext-create-ticket-form">
      {/* Error Message */}
      {formState.error && (
        <div className="ai-ext-form-error">
          {formState.error}
        </div>
      )}

      {/* Target Backlog Dropdown */}
      <div className="ai-ext-form-group">
        <label className="ai-ext-form-label-top">
          Backlog đích
        </label>
        <select
          className="ai-ext-form-select-compact"
          value={formState.targetBacklog}
          onChange={(e) => onInputChange('targetBacklog', e.target.value)}
        >
          <option value="">Chọn backlog</option>
          {formState.availableBacklogs.map(backlog => (
            <option key={backlog.id} value={backlog.domain}>
              {backlog.spaceName}.{backlog.domain}
            </option>
          ))}
        </select>
        {formState.availableBacklogs.length === 0 && (
          <small className="ai-ext-form-help" style={{ color: '#dc3545' }}>
            Chưa có backlog nào được cấu hình. Vui lòng cấu hình trong Options.
          </small>
        )}
      </div>

      {/* Language Selection Row */}
      <div className="ai-ext-language-selection-row">
        <div className="ai-ext-language-group">
          <label className="ai-ext-form-label-top">
            Translate from
          </label>
          <select
            className="ai-ext-form-select-compact"
            value={formState.sourceLanguage}
            onChange={(e) => onInputChange('sourceLanguage', e.target.value)}
          >
            <option value="">Chọn ngôn ngữ nguồn</option>
            {LANGUAGE_OPTIONS.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ai-ext-language-arrow">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M10 1L15 6L10 11M15 6H1" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="ai-ext-language-group">
          <label className="ai-ext-form-label-top">
            To
          </label>
          <select
            className="ai-ext-form-select-compact"
            value={formState.targetLanguage}
            onChange={(e) => onInputChange('targetLanguage', e.target.value)}
          >
            <option value="">Chọn ngôn ngữ đích</option>
            {LANGUAGE_OPTIONS.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Command Preview */}
      {formState.targetBacklog && formState.sourceLanguage && formState.targetLanguage && (
        <div className="ai-ext-form-preview">
          <span className="ai-ext-preview-label">Command:</span>
          <code className="ai-ext-preview-command">
            {generateCommand()}
          </code>
        </div>
      )}

      {/* Action Buttons */}
      <div className="ai-ext-form-actions">
        <button
          type="button"
          className="ai-ext-button ai-ext-button-secondary"
          onClick={onCancel}
        >
          Hủy
        </button>
        <button
          type="button"
          className="ai-ext-button ai-ext-button-primary"
          onClick={onSubmit}
          disabled={!formState.targetBacklog || !formState.sourceLanguage || !formState.targetLanguage}
        >
          Tạo Ticket
        </button>
      </div>
    </div>
  );
};

export default CreateTicketModal;
