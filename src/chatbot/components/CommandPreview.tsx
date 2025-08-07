/**
 * Command preview component for create ticket modal
 */
import React from 'react';

interface CommandPreviewProps {
  command: string;
}

const CommandPreview: React.FC<CommandPreviewProps> = ({
  command
}) => {
  return (
    <div className="ai-ext-form-preview">
      <span className="ai-ext-preview-label">Command preview:</span>
      <code className="ai-ext-preview-command">
        {command}
      </code>
    </div>
  );
};

export default CommandPreview;
