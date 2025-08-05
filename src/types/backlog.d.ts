export type TicketData = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  dueDate: string;
  labels: string[];
  comments: CommentData[];
  // Extended fields from Backlog API
  issueType?: string;
  created?: string;
  updated?: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  parentIssueId?: number | null;
  customFields?: any[];
  attachments?: any[];
}

export type CommentData = {
  author: string;
  content: string;
  timestamp: string;
}

export type UserInfo = {
  id: number;
  name: string;
  avatar: string;
  mailAddress: string;
  userId: string;
  nulabAccount?: NulabAccount;
}

export type NulabAccount = {
  nulabId: string;
  name: string;
  uniqueId: string;
  iconUrl: string;
}
