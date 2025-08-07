/**
 * Backlog API Service - Handles API calls to Backlog
 */
import type { Project, CreateTicketData, CreateTicketResponse, IssueType } from '../types/createTicket.d';

export class BacklogApiService {

  /**
   * Fetch projects from Backlog API
   */
  static async fetchProjects(domain: string, apiKey: string): Promise<Project[]> {
    const url = `https://${domain}/api/v2/projects?apiKey=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
    }

    const projects = await response.json();
    return projects;
  }

  /**
   * Fetch issue types from a specific project
   */
  static async fetchIssueTypes(domain: string, apiKey: string, projectKey: string): Promise<IssueType[]> {
    const url = `https://${domain}/api/v2/projects/${projectKey}/issueTypes?apiKey=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch issue types: ${response.status} ${errorText}`);
    }

    const issueTypes = await response.json();
    return issueTypes;
  }

  /**
   * Create issue/ticket in Backlog
   */
  static async createIssue(
    domain: string,
    apiKey: string,
    issueData: CreateTicketData
  ): Promise<CreateTicketResponse> {
    const url = `https://${domain}/api/v2/issues?apiKey=${apiKey}`;

    // Convert data to form format (Backlog API expects form data)
    const formData = new FormData();

    formData.append('projectId', issueData.projectId.toString());
    formData.append('summary', issueData.summary);
    formData.append('issueTypeId', issueData.issueTypeId.toString());
    formData.append('priorityId', issueData.priorityId.toString());

    if (issueData.description) {
      formData.append('description', issueData.description);
    }

    if (issueData.parentIssueId) {
      formData.append('parentIssueId', issueData.parentIssueId.toString());
    }

    if (issueData.startDate) {
      formData.append('startDate', issueData.startDate);
    }

    if (issueData.dueDate) {
      formData.append('dueDate', issueData.dueDate);
    }

    if (issueData.estimatedHours) {
      formData.append('estimatedHours', issueData.estimatedHours.toString());
    }

    if (issueData.actualHours) {
      formData.append('actualHours', issueData.actualHours.toString());
    }

    if (issueData.assigneeId) {
      formData.append('assigneeId', issueData.assigneeId.toString());
    }

    // Handle array fields
    if (issueData.categoryId && issueData.categoryId.length > 0) {
      issueData.categoryId.forEach(id => {
        formData.append('categoryId[]', id.toString());
      });
    }

    if (issueData.versionId && issueData.versionId.length > 0) {
      issueData.versionId.forEach(id => {
        formData.append('versionId[]', id.toString());
      });
    }

    if (issueData.milestoneId && issueData.milestoneId.length > 0) {
      issueData.milestoneId.forEach(id => {
        formData.append('milestoneId[]', id.toString());
      });
    }

    if (issueData.notifiedUserId && issueData.notifiedUserId.length > 0) {
      issueData.notifiedUserId.forEach(id => {
        formData.append('notifiedUserId[]', id.toString());
      });
    }

    if (issueData.attachmentId && issueData.attachmentId.length > 0) {
      issueData.attachmentId.forEach(id => {
        formData.append('attachmentId[]', id.toString());
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create ticket: ${response.status} ${errorText}`);
    }

    const ticket = await response.json();
    return ticket;
  }

  /**
   * Get project by project key
   */
  static async getProjectByKey(domain: string, apiKey: string, projectKey: string): Promise<Project | null> {
    const projects = await this.fetchProjects(domain, apiKey);
    return projects.find(p => p.projectKey === projectKey) || null;
  }

  /**
   * Generate ticket URL
   */
  static generateTicketUrl(domain: string, ticketKey: string): string {
    return `https://${domain}/view/${ticketKey}`;
  }
}
