/**
 * Backlog selector component for create ticket modal
 */
import React from 'react';
import type { BacklogIntegration } from '../../configs/settingsTypes';

interface BacklogSelectorProps {
  backlogs: BacklogIntegration[];
  selectedBacklogId: string | null;
  onBacklogChange: (backlogId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const BacklogSelector: React.FC<BacklogSelectorProps> = ({
  backlogs,
  selectedBacklogId,
  onBacklogChange,
  loading = false,
  error = null
}) => {
  if (error) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#333'
        }}>
          Backlog *
        </label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fff5f5',
          border: '1px solid #fed7d7',
          borderRadius: '4px',
          color: '#c53030',
          fontSize: '14px'
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#333'
        }}>
          Backlog *
        </label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          color: '#718096',
          fontSize: '14px'
        }}>
          Đang tải backlogs...
        </div>
      </div>
    );
  }

  if (backlogs.length === 0) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#333'
        }}>
          Backlog *
        </label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fffbf0',
          border: '1px solid #fed7aa',
          borderRadius: '4px',
          color: '#c05621',
          fontSize: '14px'
        }}>
          Chưa có backlog nào được cấu hình. Vui lòng cấu hình trong Settings.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px',
        color: '#333'
      }}>
        Backlog *
      </label>
      <select
        value={selectedBacklogId || ''}
        onChange={(e) => onBacklogChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
        required
      >
        <option value="">-- Chọn backlog --</option>
        {backlogs.map((backlog) => (
          <option key={backlog.id} value={backlog.id}>
            {backlog.note || backlog.domain}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BacklogSelector;
