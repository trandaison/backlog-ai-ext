import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={`ai-ext-modal-backdrop ${className}`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="ai-ext-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="ai-ext-modal-header">
          <h3 id="modal-title" className="ai-ext-modal-title">{title}</h3>
          <button
            className="ai-ext-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            title="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="ai-ext-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
