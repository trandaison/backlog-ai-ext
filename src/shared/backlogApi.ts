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

export interface BacklogSettings {
  apiKey: string;
  spaceName: string;
}

export interface BacklogApiConfig {
  id: string;
  domain: string;
  spaceName: string;
  apiKey: string;
}

export interface BacklogMultiSettings {
  configs: BacklogApiConfig[];
}

export class BacklogApiService {
  private configs: BacklogApiConfig[] = [];

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['backlogConfigs']);
      this.configs = result.backlogConfigs || [];
    } catch (error) {
      console.error('Error loading Backlog settings:', error);
    }
  }

  private getCurrentConfig(): BacklogApiConfig | null {
    const currentUrl = window.location.href;
    console.log('🔍 ~ BacklogApiService ~ getCurrentConfig ~ currentUrl:', currentUrl);
    console.log('🔍 ~ BacklogApiService ~ getCurrentConfig ~ available configs:', this.configs);

    // Try to find matching config based on current URL
    for (const config of this.configs) {
      console.log(`🔍 ~ Checking config: domain=${config.domain}, spaceName=${config.spaceName}`);
      console.log(`🔍 ~ URL includes .${config.domain}:`, currentUrl.includes(`.${config.domain}`));
      console.log(`🔍 ~ URL includes ${config.spaceName}:`, currentUrl.includes(config.spaceName));

      if (currentUrl.includes(`.${config.domain}`) &&
          currentUrl.includes(config.spaceName)) {
        console.log('✅ ~ Found matching config:', config);
        return config;
      }
    }

    // Fallback: return first config if any
    const fallbackConfig = this.configs.length > 0 ? this.configs[0] : null;
    console.log('🔄 ~ Using fallback config:', fallbackConfig);
    return fallbackConfig;
  }

  private getBaseUrl(config: BacklogApiConfig): string {
    const baseUrl = `https://${config.spaceName}.${config.domain}/api/v2`;
    console.log('🌐 ~ BacklogApiService ~ getBaseUrl ~ baseUrl:', baseUrl);
    console.log('🌐 ~ BacklogApiService ~ getBaseUrl ~ spaceName:', config.spaceName);
    console.log('🌐 ~ BacklogApiService ~ getBaseUrl ~ domain:', config.domain);
    return baseUrl;
  }

  public updateSettings(settings: BacklogMultiSettings) {
    console.log('🔧 ~ BacklogApiService ~ updateSettings ~ input:', settings);
    this.configs = settings.configs;
    console.log('🔧 ~ BacklogApiService ~ updateSettings ~ updated configs:', this.configs);
  }

  // Legacy method for backward compatibility
  public updateSettingsLegacy(settings: BacklogSettings) {
    // Convert to new format
    const config: BacklogApiConfig = {
      id: 'legacy',
      domain: this.detectDomainFromUrl(),
      spaceName: settings.spaceName,
      apiKey: settings.apiKey
    };
    this.configs = [config];
  }

  private detectDomainFromUrl(): string {
    const currentUrl = window.location.href;
    if (currentUrl.includes('.backlog.jp')) {
      return 'backlog.jp';
    } else if (currentUrl.includes('.backlogtool.com')) {
      return 'backlogtool.com';
    } else {
      return 'backlog.com';
    }
  }

  public async getIssue(issueKey: string): Promise<BacklogTicketData> {
    const config = this.getCurrentConfig();
    console.warn('🔎 ~ BacklogApiService ~ getIssue ~ config:', config);
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
      const response = await fetch(`${baseUrl}/issues/${issueKey}/comments?apiKey=${config.apiKey}`);

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
        timestamp: new Date(comment.created).toLocaleString('vi-VN')
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
    const match = url.match(/\/view\/([A-Z][A-Z0-9_]*-\d+)/);
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
