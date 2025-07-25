// Utility để phân tích và extract thông tin ticket từ trang Backlog
export interface TicketData {
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
}

export interface CommentData {
  author: string;
  content: string;
  timestamp: string;
}

export class TicketAnalyzer {
  extractTicketData(): TicketData {
    const ticketData: TicketData = {
      id: this.extractTicketId(),
      title: this.extractTitle(),
      description: this.extractDescription(),
      status: this.extractStatus(),
      priority: this.extractPriority(),
      assignee: this.extractAssignee(),
      reporter: this.extractReporter(),
      dueDate: this.extractDueDate(),
      labels: this.extractLabels(),
      comments: this.extractComments()
    };

    return ticketData;
  }

  private extractTicketId(): string {
    // Extract từ URL hoặc page title
    const url = window.location.href;
    const match = url.match(/\/view\/([A-Z]+-\d+)/);
    if (match) {
      return match[1];
    }

    // Fallback: tìm trong page title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const titleMatch = titleElement.textContent?.match(/([A-Z]+-\d+)/);
      if (titleMatch) {
        return titleMatch[1];
      }
    }

    return '';
  }

  private extractTitle(): string {
    // Tìm title trong các selector phổ biến của Backlog
    const selectors = [
      '.ticket__header-title',
      '.issue-title',
      '.ticket-title',
      'h1.title',
      '.ticket__summary'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractDescription(): string {
    // Tìm description trong các selector
    const selectors = [
      '.ticket__description',
      '.issue-description',
      '.ticket-description',
      '.description-content',
      '.ticket__body'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractStatus(): string {
    const selectors = [
      '.ticket__status',
      '.issue-status',
      '.status-value',
      '.ticket__header-status'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractPriority(): string {
    const selectors = [
      '.ticket__priority',
      '.issue-priority',
      '.priority-value'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractAssignee(): string {
    const selectors = [
      '.ticket__assignee',
      '.issue-assignee',
      '.assignee-value'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractReporter(): string {
    const selectors = [
      '.ticket__reporter',
      '.issue-reporter',
      '.reporter-value'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractDueDate(): string {
    const selectors = [
      '.ticket__due-date',
      '.issue-due-date',
      '.due-date-value'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractLabels(): string[] {
    const labels: string[] = [];
    const selectors = [
      '.ticket__labels .label',
      '.issue-labels .label',
      '.labels .tag'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.textContent) {
          labels.push(element.textContent.trim());
        }
      });
    }

    return labels;
  }

  private extractComments(): CommentData[] {
    const comments: CommentData[] = [];
    const commentSelectors = [
      '.comment-item',
      '.ticket-comment',
      '.comment'
    ];

    for (const selector of commentSelectors) {
      const commentElements = document.querySelectorAll(selector);
      commentElements.forEach(commentEl => {
        const author = this.extractCommentAuthor(commentEl);
        const content = this.extractCommentContent(commentEl);
        const timestamp = this.extractCommentTimestamp(commentEl);

        if (content) {
          comments.push({ author, content, timestamp });
        }
      });
    }

    return comments;
  }

  private extractCommentAuthor(commentElement: Element): string {
    const authorSelectors = [
      '.comment-author',
      '.author-name',
      '.comment-user'
    ];

    for (const selector of authorSelectors) {
      const element = commentElement.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractCommentContent(commentElement: Element): string {
    const contentSelectors = [
      '.comment-content',
      '.comment-body',
      '.comment-text'
    ];

    for (const selector of contentSelectors) {
      const element = commentElement.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  private extractCommentTimestamp(commentElement: Element): string {
    const timestampSelectors = [
      '.comment-timestamp',
      '.comment-date',
      '.comment-time'
    ];

    for (const selector of timestampSelectors) {
      const element = commentElement.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return '';
  }
}
