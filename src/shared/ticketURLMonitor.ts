/**
 * URL monitoring utility for detecting ticket changes in Backlog
 */

export interface TicketChangeEvent {
  oldTicketId: string | null;
  newTicketId: string | null;
  url: string;
  timestamp: number;
}

export class TicketURLMonitor {
  private currentTicketId: string | null = null;
  private observers: ((event: TicketChangeEvent) => void)[] = [];
  private urlObserver: MutationObserver | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupURLMonitoring();
  }

  /**
   * Subscribe to ticket change events
   */
  public subscribe(callback: (event: TicketChangeEvent) => void): () => void {
    this.observers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Get current ticket ID
   */
  public getCurrentTicketId(): string | null {
    return this.currentTicketId;
  }

  /**
   * Manually trigger ticket detection (useful for initial load)
   */
  public async detectCurrentTicket(): Promise<string | null> {
    const ticketId = await this.extractTicketIdFromPage();
    if (ticketId !== this.currentTicketId) {
      this.notifyTicketChange(this.currentTicketId, ticketId);
      this.currentTicketId = ticketId;
    }
    return ticketId;
  }

  /**
   * Setup URL monitoring using multiple detection methods
   */
  private setupURLMonitoring(): void {
    // Method 1: Intercept history API changes
    this.interceptHistoryAPI();

    // Method 2: Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.debounceURLChange();
    });

    // Method 3: Monitor DOM changes for ticket content
    this.setupDOMObserver();

    // Method 4: Periodic check as fallback
    this.setupPeriodicCheck();

    // Initial detection
    setTimeout(() => {
      this.detectCurrentTicket();
    }, 1000);
  }

  /**
   * Intercept pushState and replaceState to detect SPA navigation
   */
  private interceptHistoryAPI(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const self = this;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      self.debounceURLChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      self.debounceURLChange();
    };
  }

  /**
   * Setup DOM observer to detect content changes
   */
  private setupDOMObserver(): void {
    // Target common Backlog content containers
    const targetSelectors = [
      '#content',
      '.content',
      '.main-content',
      '[data-reactroot]',
      'body'
    ];

    let targetNode: Element | null = null;
    for (const selector of targetSelectors) {
      targetNode = document.querySelector(selector);
      if (targetNode) break;
    }

    if (!targetNode) {
      targetNode = document.body;
    }

    this.urlObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if any added nodes contain ticket-related content
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Look for ticket-related indicators
              if (element.querySelector?.('.ticket-header, .issue-header, [data-ticket-key]') ||
                  element.matches?.('.ticket-header, .issue-header, [data-ticket-key]') ||
                  element.textContent?.match(/[A-Z]+-\d+/)) {
                shouldCheck = true;
              }
            }
          });
        }
      });

      if (shouldCheck) {
        this.debounceURLChange();
      }
    });

    this.urlObserver.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Periodic check as fallback for missed changes
   */
  private setupPeriodicCheck(): void {
    setInterval(() => {
      this.handleURLChange();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Debounced URL change handler to avoid rapid successive calls
   */
  private debounceURLChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.handleURLChange();
    }, 500);
  }

  /**
   * Handle URL change and detect ticket transitions
   */
  private async handleURLChange(): Promise<void> {
    try {
      const newTicketId = await this.extractTicketIdFromPage();

      if (newTicketId !== this.currentTicketId) {
        this.notifyTicketChange(this.currentTicketId, newTicketId);
        this.currentTicketId = newTicketId;
      }
    } catch (error) {
      console.error('❌ [TicketURLMonitor] Error handling URL change:', error);
    }
  }

  /**
   * Extract ticket ID from current page using multiple methods
   */
  private async extractTicketIdFromPage(): Promise<string | null> {
    // Method 1: From URL pattern
    const urlPatterns = [
      /\/view\/([A-Z]+-\d+)/,
      /\/issues\/([A-Z]+-\d+)/,
      /\/ticket\/([A-Z]+-\d+)/,
      /[?&]id=([A-Z]+-\d+)/
    ];

    for (const pattern of urlPatterns) {
      const match = window.location.href.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Method 2: From DOM data attributes
    const dataAttributes = [
      '[data-ticket-key]',
      '[data-issue-key]',
      '[data-ticket-id]'
    ];

    for (const selector of dataAttributes) {
      const element = document.querySelector(selector);
      if (element) {
        const value = element.getAttribute(selector.slice(1, -1));
        if (value && /^[A-Z]+-\d+$/.test(value)) {
          return value;
        }
      }
    }

    // Method 3: From ticket header elements
    const headerSelectors = [
      '.ticket-header .ticket-key',
      '.issue-header .issue-key',
      '.ticket-title .ticket-id',
      '.issue-title .issue-id',
      'h1 .ticket-key',
      'h1 .issue-key'
    ];

    for (const selector of headerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text && /^[A-Z]+-\d+$/.test(text)) {
          return text;
        }
      }
    }

    // Method 4: From page title
    const titlePatterns = [
      /\[([A-Z]+-\d+)\]/,
      /([A-Z]+-\d+)/
    ];

    for (const pattern of titlePatterns) {
      const match = document.title.match(pattern);
      if (match && /^[A-Z]+-\d+$/.test(match[1])) {
        return match[1];
      }
    }

    // Method 5: Search in page content as last resort
    const contentText = document.body.textContent || '';
    const contentMatch = contentText.match(/\b([A-Z]+-\d+)\b/);
    if (contentMatch) {
      // Verify this is actually a ticket by checking if it appears in specific contexts
      const ticketContext = document.querySelector(`[title*="${contentMatch[1]}"], [alt*="${contentMatch[1]}"]`);
      if (ticketContext) {
        return contentMatch[1];
      }
    }

    return null;
  }

  /**
   * Notify observers about ticket change
   */
  private notifyTicketChange(oldTicketId: string | null, newTicketId: string | null): void {
    const event: TicketChangeEvent = {
      oldTicketId,
      newTicketId,
      url: window.location.href,
      timestamp: Date.now()
    };

    console.log('🔄 [TicketURLMonitor] Ticket change detected:', event);

    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ [TicketURLMonitor] Error in observer callback:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.urlObserver) {
      this.urlObserver.disconnect();
      this.urlObserver = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.observers = [];
  }
}
