import React, { useEffect, useRef, useState } from 'react';
import { UI_CONSTANTS } from '../configs';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  showCloseButton = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
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

  // Handle escape key
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

  // Handle click outside modal
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Don't render if modal is completely closed
  if (!isOpen && animationState === 'exited') return null;

  return (
    <div
      className={`${UI_CONSTANTS.MODAL_BACKDROP_CLASS} ai-ext-modal-${animationState} ${className}`}
      onClick={handleBackdropClick}
      style={{ zIndex: UI_CONSTANTS.MODAL_Z_INDEX }}
    >
      <div
        ref={modalRef}
        className={UI_CONSTANTS.MODAL_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="ai-ext-modal-header">
            {title && (
              <h3 className="ai-ext-modal-title">{title}</h3>
            )}
            {showCloseButton && (
              <button
                className="ai-ext-modal-close"
                onClick={onClose}
                type="button"
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className="ai-ext-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
