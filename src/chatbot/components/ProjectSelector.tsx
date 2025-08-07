/**
 * Project selector component for create ticket modal
 */
import React, { useState, useMemo } from 'react';
import type { Project } from '../../types/createTicket.d';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectKey: string;
  onProjectChange: (projectKey: string) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjectKey,
  onProjectChange,
  loading = false,
  error = null,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(selectedProjectKey);

  // Filter projects based on input value for autocomplete
  const filteredProjects = useMemo(() => {
    if (!inputValue.trim()) return projects;

    const searchTerm = inputValue.toLowerCase();
    return projects.filter(project =>
      project.projectKey.toLowerCase().includes(searchTerm) ||
      project.name.toLowerCase().includes(searchTerm)
    ).slice(0, 20); // Limit to 20 results for performance
  }, [projects, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onProjectChange(value);
  };

  const handleSelectProject = (projectKey: string) => {
    setInputValue(projectKey);
    onProjectChange(projectKey);
  };

  // Generate unique datalist ID
  const datalistId = `projects-${Math.random().toString(36).substr(2, 9)}`;

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
          Project *
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

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px',
        color: '#333'
      }}>
        Project *
      </label>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={disabled ? "Vui lòng chọn backlog trước" : "Chọn Project..."}
          disabled={disabled || loading}
          list={datalistId}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: disabled ? '#f9fafb' : 'white',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          required
        />

        {loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#718096'
          }}>
            Đang tải...
          </div>
        )}

        <datalist id={datalistId}>
          {filteredProjects.map((project) => (
            <option key={project.id} value={project.projectKey}>
              {project.name}
            </option>
          ))}
        </datalist>
      </div>

      {!disabled && !loading && inputValue && !projects.find(p => p.projectKey === inputValue) && (
        <div style={{
          fontSize: '12px',
          color: '#d69e2e',
          marginTop: '4px'
        }}>
          Project không tồn tại trong danh sách
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
