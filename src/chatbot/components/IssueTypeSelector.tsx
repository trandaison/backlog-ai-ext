/**
 * Issue Type selector component for create ticket modal
 */
import React from 'react';
import type { IssueType } from '../../types/createTicket.d';

interface IssueTypeSelectorProps {
  issueTypes: IssueType[];
  selectedIssueTypeId: number | null;
  onIssueTypeChange: (issueTypeId: number) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

const IssueTypeSelector: React.FC<IssueTypeSelectorProps> = ({
  issueTypes,
  selectedIssueTypeId,
  onIssueTypeChange,
  loading = false,
  error = null,
  disabled = false
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onIssueTypeChange(value);
    }
  };

  return (
    <div className="ai-ext-form-group flex-1">
      <label htmlFor="issueType" className="ai-ext-label">
        Issue Type *
      </label>

      {error && (
        <div className="ai-ext-error-message">
          {error}
        </div>
      )}

      <select
        id="issueType"
        value={selectedIssueTypeId || ''}
        onChange={handleSelectChange}
        disabled={disabled || loading}
        className={`ai-ext-select ${error ? 'error' : ''}`}
        required
      >
        <option value="">
          {loading ? 'Đang tải...' : '-- Chọn --'}
        </option>
        {issueTypes.map((issueType) => (
          <option key={issueType.id} value={issueType.id}>
            {issueType.name}
          </option>
        ))}
      </select>

      {loading && (
        <div className="ai-ext-loading-text">
          Đang tải danh sách issue types...
        </div>
      )}
    </div>
  );
};

export default IssueTypeSelector;
