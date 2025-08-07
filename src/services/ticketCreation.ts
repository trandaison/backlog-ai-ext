/**
 * Ticket Creation Service - Handles the full ticket creation workflow
 */
import { BacklogApiService } from './backlogApi';
import type {
  CreateTicketData,
  CreateTicketResponse,
  Project
} from '../types/createTicket.d';
import type { BacklogIntegration } from '../configs/settingsTypes';
import { DEFAULT_TICKET_VALUES } from '../configs/createTicket';

export class TicketCreationService {

  /**
   * Process AI-generated ticket data and create ticket
   */
  static async createTicketFromAI(
    backlog: BacklogIntegration,
    projectKey: string,
    aiGeneratedData: any
  ): Promise<{
    ticket: CreateTicketResponse;
    ticketUrl: string;
  }> {
    try {
      // First, get the project to obtain projectId
      const project = await BacklogApiService.getProjectByKey(
        backlog.domain,
        backlog.apiKey,
        projectKey
      );

      if (!project) {
        throw new Error(`Project with key "${projectKey}" not found`);
      }

      // Prepare ticket data with defaults
      const ticketData: CreateTicketData = {
        projectId: project.id,
        summary: aiGeneratedData.summary || 'Untitled Ticket',
        issueTypeId: aiGeneratedData.issueTypeId,
        priorityId: aiGeneratedData.priorityId || DEFAULT_TICKET_VALUES.priorityId,
        description: aiGeneratedData.description || '',
        parentIssueId: aiGeneratedData.parentIssueId || undefined,
        startDate: aiGeneratedData.startDate || undefined,
        dueDate: aiGeneratedData.dueDate || undefined,
        estimatedHours: aiGeneratedData.estimatedHours || undefined,
        actualHours: aiGeneratedData.actualHours || undefined,
        categoryId: aiGeneratedData.categoryId || undefined,
        versionId: aiGeneratedData.versionId || undefined,
        milestoneId: aiGeneratedData.milestoneId || undefined,
        assigneeId: aiGeneratedData.assigneeId || undefined,
        notifiedUserId: aiGeneratedData.notifiedUserId || undefined,
        attachmentId: aiGeneratedData.attachmentId || undefined
      };

      // Create the ticket
      const ticket = await BacklogApiService.createIssue(
        backlog.domain,
        backlog.apiKey,
        ticketData
      );

      // Generate ticket URL
      const ticketUrl = BacklogApiService.generateTicketUrl(
        backlog.domain,
        ticket.issueKey
      );

      return {
        ticket,
        ticketUrl
      };
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw error;
    }
  }

  /**
   * Generate success message for chat
   */
  static generateSuccessMessage(ticket: CreateTicketResponse, ticketUrl: string): string {
    return `Đã tạo ticket:\n[${ticket.issueKey}](${ticketUrl}) ${ticket.summary}`;
  }
}
