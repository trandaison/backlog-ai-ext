/**
 * Type definitions for Create Ticket feature
 */

export type Project = {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  useResolvedForChart: boolean;
  subtaskingEnabled: boolean;
  projectLeaderCanEditProjectLeader: boolean;
  useWiki: boolean;
  useFileSharing: boolean;
  useWikiTreeView: boolean;
  useSubversion: boolean;
  useGit: boolean;
  useOriginalImageSizeAtWiki: boolean;
  textFormattingRule: string;
  archived: boolean;
  displayOrder: number;
  useDevAttributes: boolean;
};

export type CreateTicketData = {
  projectId: number;
  summary: string;
  issueTypeId: number;
  priorityId: number;
  description?: string;
  parentIssueId?: number;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  categoryId?: number[];
  versionId?: number[];
  milestoneId?: number[];
  assigneeId?: number;
  notifiedUserId?: number[];
  attachmentId?: number[];
};

export type IssueType = {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
};

export type Priority = {
  id: number;
  name: string;
};

export type CreateTicketFormData = {
  selectedBacklog: string | null; // backlog ID
  selectedProject: string; // projectKey
  selectedLanguage: string;
  selectedIssueTypeId: number | null;
  selectedPriorityId: number;
};

export type CreateTicketResponse = {
  id: number;
  issueKey: string;
  keyId: number;
  issueType: {
    id: number;
    projectId: number;
    name: string;
    color: string;
    displayOrder: number;
  };
  summary: string;
  description: string;
  resolution: any;
  priority: {
    id: number;
    name: string;
  };
  status: {
    id: number;
    projectId: number;
    name: string;
    color: string;
    displayOrder: number;
  };
  assignee: any;
  category: any[];
  versions: any[];
  milestone: any[];
  startDate: any;
  dueDate: any;
  estimatedHours: any;
  actualHours: any;
  parentIssueId: any;
  createdUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: any;
    mailAddress: string;
  };
  created: string;
  updatedUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: any;
    mailAddress: string;
  };
  updated: string;
  customFields: any[];
  attachments: any[];
  sharedFiles: any[];
  stars: any[];
};
