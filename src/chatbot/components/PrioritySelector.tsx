/**
 * Priority selector component for create ticket modal
 */
import React from 'react';
import type { Priority } from '../../types/createTicket.d';

interface PrioritySelectorProps {
  priorities: Priority[];
  selectedPriorityId: number;
  onPriorityChange: (priorityId: number) => void;
  disabled?: boolean;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  priorities,
  selectedPriorityId,
  onPriorityChange,
  disabled = false
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onPriorityChange(value);
    }
  };

  return (
    <div className="ai-ext-form-group flex-1">
      <label htmlFor="priority" className="ai-ext-label">
        Priority *
      </label>

      <select
        id="priority"
        value={selectedPriorityId}
        onChange={handleSelectChange}
        disabled={disabled}
        className="ai-ext-select"
        required
      >
        {priorities.map((priority) => (
          <option key={priority.id} value={priority.id}>
            {priority.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PrioritySelector;
