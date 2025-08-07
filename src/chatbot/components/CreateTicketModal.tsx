/**
 * Create Ticket Modal - Main modal component for creating backlog tickets
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { BacklogIntegration } from '../../configs/settingsTypes';
import type { CreateTicketFormData } from '../../types/createTicket.d';
import { useBacklogProjects } from '../hooks/useBacklogProjects';
import { useBacklogs } from '../hooks/useBacklogs';
import { useIssueTypes } from '../hooks/useIssueTypes';
import { CREATE_TICKET_COMMAND_PREFIX, DEFAULT_LANGUAGE, PRIORITY_OPTIONS, DEFAULT_TICKET_VALUES } from '../../configs/createTicket';
import Modal from "../../shared/Modal";
import BacklogSelector from "./BacklogSelector";
import ProjectSelector from './ProjectSelector';
import LanguageSelector from './LanguageSelector';
import IssueTypeSelector from './IssueTypeSelector';
import PrioritySelector from './PrioritySelector';
import CommandPreview from './CommandPreview';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: string) => void;
  ModalComponent: React.ComponentType<any>;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ModalComponent
}) => {
  const [formData, setFormData] = useState<CreateTicketFormData>({
    selectedBacklog: null,
    selectedProject: '',
    selectedLanguage: DEFAULT_LANGUAGE,
    selectedIssueTypeId: DEFAULT_TICKET_VALUES.issueTypeId,
    selectedPriorityId: DEFAULT_TICKET_VALUES.priorityId
  });

  // Use useBacklogs hook instead of settingsClient
  const {
    backlogs,
    loading: backlogsLoading,
    error: backlogsError
  } = useBacklogs(isOpen);

  // Selected backlog object
  const selectedBacklogObj = useMemo(() => {
    return backlogs.find(b => b.id === formData.selectedBacklog) || null;
  }, [backlogs, formData.selectedBacklog]);

  const command = useMemo(() => {
    const backlogDomain = selectedBacklogObj?.domain || '';
    const project = `${backlogDomain ? `${backlogDomain}/` : ''}${formData.selectedProject || '<project-key>'}`;
    const issueTypeId = formData.selectedIssueTypeId || '<issue-type-id>';
    const priorityId = formData.selectedPriorityId;

    return `${CREATE_TICKET_COMMAND_PREFIX} ${project} ${formData.selectedLanguage} issueType:${issueTypeId} priority:${priorityId}`;
  }, [selectedBacklogObj, formData.selectedLanguage, formData.selectedProject, formData.selectedIssueTypeId, formData.selectedPriorityId]);

  // Projects hook
  const {
    projects,
    loading: projectsLoading,
    error: projectsError
  } = useBacklogProjects(selectedBacklogObj);

  // Issue types hook
  const {
    issueTypes,
    loading: issueTypesLoading,
    error: issueTypesError
  } = useIssueTypes(selectedBacklogObj, formData.selectedProject);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        selectedBacklog: null,
        selectedProject: '',
        selectedLanguage: DEFAULT_LANGUAGE,
        selectedIssueTypeId: DEFAULT_TICKET_VALUES.issueTypeId,
        selectedPriorityId: DEFAULT_TICKET_VALUES.priorityId
      });
    }
  }, [isOpen]);

  const handleBacklogChange = (backlogId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBacklog: backlogId,
      selectedProject: '', // Reset project when backlog changes
      selectedIssueTypeId: DEFAULT_TICKET_VALUES.issueTypeId // Reset issue type when backlog changes
    }));

  };

  const handleProjectChange = (projectKey: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProject: projectKey,
      selectedIssueTypeId: DEFAULT_TICKET_VALUES.issueTypeId // Reset issue type when project changes
    }));
  };

  const handleLanguageChange = (language: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLanguage: language
    }));
  };

  const handleIssueTypeChange = (issueTypeId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedIssueTypeId: issueTypeId
    }));
  };

  const handlePriorityChange = (priorityId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedPriorityId: priorityId
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.selectedBacklog) {
      alert('Vui lòng chọn backlog');
      return;
    }

    if (!formData.selectedProject.trim()) {
      alert('Vui lòng nhập project key');
      return;
    }

    if (!formData.selectedIssueTypeId) {
      alert('Vui lòng chọn issue type');
      return;
    }

    // Check if project exists in the list (if projects are loaded)
    if (projects.length > 0 && !projects.find(p => p.projectKey === formData.selectedProject)) {
      const confirmCreate = confirm(
        `Project key "${formData.selectedProject}" không tồn tại trong danh sách. Bạn có chắc chắn muốn tiếp tục?`
      );
      if (!confirmCreate) {
        return;
      }
    }

    // Submit command
    onSubmit(command);
    onClose();
  };

  const canSubmit = formData.selectedBacklog &&
                    formData.selectedProject.trim() &&
                    formData.selectedIssueTypeId &&
                    !backlogsLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 Tạo Backlog Ticket"
      className="ai-ext-create-ticket-modal"
    >
      <div className="ai-ext-create-ticket-form">
        <form onSubmit={handleSubmit}>
          <div>
            <BacklogSelector
              backlogs={backlogs}
              selectedBacklogId={formData.selectedBacklog}
              onBacklogChange={handleBacklogChange}
              loading={backlogsLoading}
              error={backlogsError}
            />

            <ProjectSelector
              projects={projects}
              selectedProjectKey={formData.selectedProject}
              onProjectChange={handleProjectChange}
              loading={projectsLoading}
              error={projectsError}
              disabled={!formData.selectedBacklog}
            />

            <div className="flex gap-4">
              <IssueTypeSelector
                issueTypes={issueTypes}
                selectedIssueTypeId={formData.selectedIssueTypeId}
                onIssueTypeChange={handleIssueTypeChange}
                loading={issueTypesLoading}
                error={issueTypesError}
                disabled={!formData.selectedProject.trim()}
              />

              <PrioritySelector
                priorities={PRIORITY_OPTIONS}
                selectedPriorityId={formData.selectedPriorityId}
                onPriorityChange={handlePriorityChange}
              />
            </div>

            <LanguageSelector
              selectedLanguage={formData.selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />

            <CommandPreview command={command} />
          </div>

          <div className="ai-ext-form-actions">
            <button
              type="button"
              className="ai-ext-button ai-ext-button-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`ai-ext-button ai-ext-button-primary ${!canSubmit ? 'disabled' : ''}`}
              disabled={!canSubmit}
            >
              Tạo Ticket
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateTicketModal;
