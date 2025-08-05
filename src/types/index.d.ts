export type AIService = {
  analyzeTicket(ticketData: TicketData, settings?: Settings): Promise<string>;
  processUserMessage(message: string, context: any, settings?: Settings, attachments?: FileAttachment[]): Promise<{
    response: string;
    responseId?: string;
    tokensUsed?: number;
  }>;
}
