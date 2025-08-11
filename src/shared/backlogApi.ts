import { ISSUE_URL_REGEX } from '../configs/backlog';
import { settingsClient } from '../shared/settingsClient';
import { BacklogIntegration } from '../types/settings';

// Backlog API service để lấy thông tin ticket thay vì DOM extraction
export interface BacklogTicketData {
  id: number;
  projectId: number;
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
  resolution: {
    id: number;
    name: string;
  } | null;
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
  assignee: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string;
    mailAddress: string;
  } | null;
  category: Array<{
    id: number;
    name: string;
    displayOrder: number;
  }>;
  versions: Array<{
    id: number;
    projectId: number;
    name: string;
    description: string;
    startDate: string | null;
    releaseDueDate: string | null;
    archived: boolean;
    displayOrder: number;
  }>;
  milestone: Array<{
    id: number;
    projectId: number;
    name: string;
    description: string;
    startDate: string | null;
    releaseDueDate: string | null;
    archived: boolean;
    displayOrder: number;
  }>;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentIssueId: number | null;
  createdUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string;
    mailAddress: string;
  };
  created: string;
  updatedUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string;
    mailAddress: string;
  };
  updated: string;
  customFields: Array<{
    id: number;
    fieldTypeId: number;
    name: string;
    value: any;
  }>;
  attachments: Array<{
    id: number;
    name: string;
    size: number;
    createdUser: {
      id: number;
      userId: string;
      name: string;
      roleType: number;
      lang: string;
      mailAddress: string;
    };
    created: string;
  }>;
  sharedFiles: Array<{
    id: number;
    type: string;
    dir: string;
    name: string;
    size: number;
    createdUser: {
      id: number;
      userId: string;
      name: string;
      roleType: number;
      lang: string;
      mailAddress: string;
    };
    created: string;
    updated: string;
  }>;
  stars: Array<{
    id: number;
    comment: string | null;
    url: string;
    title: string;
    presenter: {
      id: number;
      userId: string;
      name: string;
      roleType: number;
      lang: string;
      mailAddress: string;
    };
    created: string;
  }>;
}

export interface BacklogComment {
  id: number;
  content: string;
  changeLog: Array<{
    field: string;
    newValue: string;
    oldValue: string;
    type: string;
  }>;
  createdUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string;
    mailAddress: string;
  };
  created: string;
  updated: string;
  stars: Array<{
    id: number;
    comment: string | null;
    url: string;
    title: string;
    presenter: {
      id: number;
      userId: string;
      name: string;
      roleType: number;
      lang: string;
      mailAddress: string;
    };
    created: string;
  }>;
  notifications: Array<{
    id: number;
    alreadyRead: boolean;
    reason: number;
    user: {
      id: number;
      userId: string;
      name: string;
      roleType: number;
      lang: string;
      mailAddress: string;
    };
    resourceAlreadyRead: boolean;
  }>;
}

export class BacklogApiService {
  private configs: BacklogIntegration[] = [];

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      this.configs = await settingsClient.getBacklogs() || [];
    } catch (error) {
      console.error('Error loading Backlog settings:', error);
    }
  }

  private getCurrentConfig(): BacklogIntegration | null {
    const { hostname } = window.location;

    return this.configs.find(config => hostname === config.domain) || (this.configs[0] ?? null);
  }

  private getBaseUrl(config: BacklogIntegration): string {
    const baseUrl = `https://${config.domain}/api/v2`;
    return baseUrl;
  }

  public updateSettings(settings: BacklogIntegration[]) {
    this.configs = settings;
  }

  public async getIssue(issueKey: string): Promise<BacklogTicketData> {
    const config = this.getCurrentConfig();
    if (!config) {
      throw new Error('Backlog API config chưa được cấu hình');
    }

    try {
      const baseUrl = this.getBaseUrl(config);
      const response = await fetch(`${baseUrl}/issues/${issueKey}?apiKey=${config.apiKey}`);

      if (!response.ok) {
        throw new Error(`Backlog API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching issue from Backlog API:', error);
      throw error;
    }
  }

  public async getIssueComments(issueKey: string): Promise<BacklogComment[]> {
    const config = this.getCurrentConfig();
    if (!config) {
      throw new Error('Backlog API config chưa được cấu hình');
    }

    try {
      const baseUrl = this.getBaseUrl(config);
      const response = await fetch(`${baseUrl}/issues/${issueKey}/comments?order=asc&apiKey=${config.apiKey}`);

      if (!response.ok) {
        throw new Error(`Backlog API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching comments from Backlog API:', error);
      throw error;
    }
  }

  /**
   * Convert Backlog API data to our internal TicketData format
   */
  public convertToTicketData(backlogData: BacklogTicketData, comments: BacklogComment[] = []): any {
    return {
      id: backlogData.issueKey,
      title: backlogData.summary,
      description: backlogData.description || '',
      status: backlogData.status.name,
      priority: backlogData.priority.name,
      assignee: backlogData.assignee?.name || 'Chưa assign',
      reporter: backlogData.createdUser.name,
      dueDate: backlogData.dueDate || '',
      labels: [
        ...backlogData.category.map(cat => cat.name),
        ...backlogData.versions.map(ver => ver.name),
        ...backlogData.milestone.map(mil => mil.name)
      ],
      comments: comments.map(comment => ({
        author: comment.createdUser.name,
        content: comment.content,
        timestamp: new Date(comment.created).toISOString()
      })),
      // Additional metadata from Backlog API
      issueType: backlogData.issueType.name,
      created: backlogData.created,
      updated: backlogData.updated,
      estimatedHours: backlogData.estimatedHours,
      actualHours: backlogData.actualHours,
      parentIssueId: backlogData.parentIssueId,
      customFields: backlogData.customFields,
      attachments: backlogData.attachments
    };
  }

  /**
   * Extract issue key from current page URL
   */
  public static extractIssueKeyFromUrl(): string | null {
    const url = window.location.href;
    // Comprehensive regex to support various Backlog issue key formats:
    // - PROJ-123
    // - PROJ_SUB-123
    // - PROJECTKEY_2405-1603
    // - PROJECT123_ABC-999
    const match = url.match(ISSUE_URL_REGEX);
    return match ? match[1] : null;
  }

  /**
   * Test API connection
   */
  public async testConnection(): Promise<boolean> {
    const config = this.getCurrentConfig();
    if (!config) {
      throw new Error('API config chưa được cấu hình');
    }

    try {
      const baseUrl = this.getBaseUrl(config);
      const response = await fetch(`${baseUrl}/users/myself?apiKey=${config.apiKey}`);
      return response.ok;
    } catch (error) {
      console.error('Error testing Backlog API connection:', error);
      return false;
    }
  }
}
