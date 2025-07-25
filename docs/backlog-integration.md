# Backlog Integration Specifics

## Backlog Page Types & Detection

### 1. URL Patterns
```javascript
const BACKLOG_PATTERNS = {
  // Standard ticket view
  ticket: /\/view\/([A-Z]+-\d+)/,

  // Project dashboard
  dashboard: /\/projects\/([^\/]+)\/?$/,

  // Issue list
  issueList: /\/find\/([^\/]+)/,

  // Wiki pages
  wiki: /\/wiki\/([^\/]+)/,

  // Git/SVN
  git: /\/git\/([^\/]+)/,
  svn: /\/svn\/([^\/]+)/
};

// Domain variations
const BACKLOG_DOMAINS = [
  'backlog.com',
  'backlog.jp',
  'backlogtool.com'
];
```

### 2. Page Detection Logic
```javascript
class BacklogPageDetector {
  static getCurrentPageType(): string {
    const url = window.location.href;

    if (BACKLOG_PATTERNS.ticket.test(url)) {
      return 'ticket';
    } else if (BACKLOG_PATTERNS.dashboard.test(url)) {
      return 'dashboard';
    } else if (BACKLOG_PATTERNS.issueList.test(url)) {
      return 'issueList';
    }

    return 'unknown';
  }

  static getTicketId(): string | null {
    const match = window.location.href.match(BACKLOG_PATTERNS.ticket);
    return match ? match[1] : null;
  }

  static isBacklogSite(): boolean {
    return BACKLOG_DOMAINS.some(domain =>
      window.location.hostname.includes(domain)
    );
  }
}
```

## DOM Structure Analysis

### 1. Ticket Page Layout
```html
<!-- Common Backlog ticket structure -->
<div class="ticket">
  <header class="ticket__header">
    <h1 class="ticket__summary">Ticket Title</h1>
    <div class="ticket__header-meta">
      <span class="ticket__id">PROJ-123</span>
      <span class="ticket__status">Open</span>
    </div>
  </header>

  <section class="ticket__body">
    <div class="ticket__description">
      <!-- Ticket description content -->
    </div>

    <aside class="ticket__sidebar">
      <dl class="ticket__properties">
        <dt>Assignee</dt>
        <dd class="ticket__assignee">John Doe</dd>

        <dt>Priority</dt>
        <dd class="ticket__priority">High</dd>

        <dt>Due Date</dt>
        <dd class="ticket__due-date">2025-07-30</dd>
      </dl>
    </aside>
  </section>

  <section class="ticket__comments">
    <!-- Comments section -->
  </section>
</div>
```

### 2. CSS Selector Mapping
```javascript
const BACKLOG_SELECTORS = {
  // Ticket basic info
  ticketId: [
    '.ticket__id',
    '.issue-key',
    '.ticket-key',
    '[data-ticket-key]'
  ],

  title: [
    '.ticket__summary',
    '.ticket__header-title',
    '.issue-title',
    'h1.ticket-title',
    '.ticket-summary'
  ],

  description: [
    '.ticket__description',
    '.ticket__body .wiki',
    '.issue-description',
    '.ticket-description-content',
    '.description .wiki'
  ],

  // Status and metadata
  status: [
    '.ticket__status',
    '.issue-status .status-label',
    '.ticket-status-value',
    '[data-status]'
  ],

  priority: [
    '.ticket__priority',
    '.issue-priority .priority-label',
    '.ticket-priority-value',
    '[data-priority]'
  ],

  assignee: [
    '.ticket__assignee',
    '.issue-assignee .user-name',
    '.ticket-assignee-value',
    '.assignee .user-link'
  ],

  reporter: [
    '.ticket__reporter',
    '.issue-reporter .user-name',
    '.ticket-created-user',
    '.reporter .user-link'
  ],

  dueDate: [
    '.ticket__due-date',
    '.issue-due-date',
    '.ticket-limit-date',
    '[data-due-date]'
  ],

  // Labels and categories
  labels: [
    '.ticket__categories .category',
    '.issue-categories .category-label',
    '.ticket-category',
    '.labels .label'
  ],

  // Comments
  comments: [
    '.ticket__comments .comment',
    '.issue-comments .comment-item',
    '.comment-list .comment',
    '.comments .comment-content'
  ],

  commentAuthor: [
    '.comment__author',
    '.comment-author .user-name',
    '.comment-user',
    '.comment-header .user-link'
  ],

  commentContent: [
    '.comment__content',
    '.comment-body .wiki',
    '.comment-text',
    '.comment-content .wiki'
  ],

  commentTime: [
    '.comment__time',
    '.comment-date',
    '.comment-timestamp',
    '.comment-created-on'
  ]
};
```

### 3. Robust Data Extraction
```javascript
class BacklogDataExtractor {
  private findBySelectors(selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element;
      }
    }
    return null;
  }

  extractTicketId(): string {
    // Try URL first
    const urlMatch = window.location.href.match(/\/view\/([A-Z]+-\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try DOM selectors
    const element = this.findBySelectors(BACKLOG_SELECTORS.ticketId);
    if (element) {
      return element.textContent.trim();
    }

    // Try page title
    const titleMatch = document.title.match(/([A-Z]+-\d+)/);
    return titleMatch ? titleMatch[1] : '';
  }

  extractTitle(): string {
    const element = this.findBySelectors(BACKLOG_SELECTORS.title);
    return element?.textContent?.trim() || '';
  }

  extractDescription(): string {
    const element = this.findBySelectors(BACKLOG_SELECTORS.description);

    if (element) {
      // Clean up HTML content
      const clone = element.cloneNode(true) as Element;

      // Remove script tags
      clone.querySelectorAll('script').forEach(script => script.remove());

      // Convert to text with basic formatting
      return this.htmlToText(clone.innerHTML);
    }

    return '';
  }

  private htmlToText(html: string): string {
    // Convert HTML to readable text while preserving structure
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }
}
```

## Dynamic Content Handling

### 1. SPA Navigation Detection
```javascript
class BacklogNavigationWatcher {
  private lastUrl: string = '';

  constructor() {
    this.setupNavigationWatcher();
  }

  private setupNavigationWatcher() {
    // Listen for URL changes (SPA navigation)
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.lastUrl) {
        this.lastUrl = window.location.href;
        this.onNavigationChange();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for popstate (back/forward)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.onNavigationChange(), 100);
    });
  }

  private onNavigationChange() {
    console.log('Navigation changed:', window.location.href);

    // Re-check if this is a ticket page
    if (BacklogPageDetector.getCurrentPageType() === 'ticket') {
      // Re-inject or update chatbot
      this.reinitializeChatbot();
    } else {
      // Hide chatbot on non-ticket pages
      this.hideChatbot();
    }
  }
}
```

### 2. Lazy Loading Content
```javascript
class LazyContentWatcher {
  private observer: IntersectionObserver;

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Content became visible, re-extract data
          this.onContentVisible(entry.target);
        }
      });
    });

    // Watch for comments section (often lazy loaded)
    const commentsSection = document.querySelector('.ticket__comments');
    if (commentsSection) {
      this.observer.observe(commentsSection);
    }
  }

  private onContentVisible(element: Element) {
    // Re-extract ticket data when new content loads
    const updatedData = new BacklogDataExtractor().extractTicketData();

    // Update AI context
    chrome.runtime.sendMessage({
      action: 'updateTicketData',
      data: updatedData
    });
  }
}
```

## Multi-language Support

### 1. Language Detection
```javascript
class BacklogLanguageDetector {
  static detectPageLanguage(): string {
    // Check HTML lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      return htmlLang.split('-')[0]; // 'ja-JP' -> 'ja'
    }

    // Check URL domain
    if (window.location.hostname.includes('.jp')) {
      return 'ja';
    }

    // Check interface language from content
    const pageText = document.body.textContent || '';
    if (this.containsJapanese(pageText)) {
      return 'ja';
    } else if (this.containsVietnamese(pageText)) {
      return 'vi';
    }

    return 'en'; // Default
  }

  private static containsJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  private static containsVietnamese(text: string): boolean {
    return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/.test(text);
  }
}
```

### 2. Localized Selectors
```javascript
const LOCALIZED_SELECTORS = {
  ja: {
    assignee: ['.担当者', '.アサイン先'],
    priority: ['.優先度'],
    dueDate: ['.期限', '.完了予定日'],
    status: ['.状態', '.ステータス']
  },
  en: {
    assignee: ['.assignee', '.assigned-to'],
    priority: ['.priority'],
    dueDate: ['.due-date', '.deadline'],
    status: ['.status', '.state']
  },
  vi: {
    // Vietnamese selectors if any custom implementation exists
  }
};
```

## Error Handling for Backlog-specific Issues

### 1. Permission Errors
```javascript
const handleBacklogPermissions = () => {
  // Check if user has access to ticket
  const accessDenied = document.querySelector('.access-denied, .permission-error');
  if (accessDenied) {
    return {
      error: 'ACCESS_DENIED',
      message: 'Không có quyền truy cập ticket này'
    };
  }

  // Check if ticket exists
  const notFound = document.querySelector('.not-found, .ticket-not-found');
  if (notFound) {
    return {
      error: 'TICKET_NOT_FOUND',
      message: 'Ticket không tồn tại hoặc đã bị xóa'
    };
  }

  return { success: true };
};
```

### 2. Data Extraction Fallbacks
```javascript
const extractWithFallbacks = (selectors: string[], fallbackMethod?: () => string): string => {
  // Try standard selectors first
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      return element.textContent.trim();
    }
  }

  // Try fallback method
  if (fallbackMethod) {
    try {
      const fallbackResult = fallbackMethod();
      if (fallbackResult) return fallbackResult;
    } catch (error) {
      console.warn('Fallback extraction failed:', error);
    }
  }

  return '';
};
```

## Performance Optimizations for Backlog

### 1. Efficient DOM Watching
```javascript
class EfficientDOMWatcher {
  private debounceTimer: number | null = null;

  startWatching() {
    const observer = new MutationObserver((mutations) => {
      // Debounce rapid changes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.processMutations(mutations);
      }, 300);
    });

    // Only watch specific containers
    const ticketContainer = document.querySelector('.ticket, .issue');
    if (ticketContainer) {
      observer.observe(ticketContainer, {
        childList: true,
        subtree: true,
        attributes: false // Skip attribute changes for performance
      });
    }
  }

  private processMutations(mutations: MutationRecord[]) {
    let shouldUpdate = false;

    for (const mutation of mutations) {
      // Only update if relevant content changed
      if (this.isRelevantChange(mutation)) {
        shouldUpdate = true;
        break;
      }
    }

    if (shouldUpdate) {
      this.updateTicketData();
    }
  }

  private isRelevantChange(mutation: MutationRecord): boolean {
    const target = mutation.target as Element;

    // Check if change is in relevant sections
    const relevantClasses = [
      'ticket__description',
      'ticket__comments',
      'ticket__properties',
      'issue-description',
      'comment-list'
    ];

    return relevantClasses.some(className =>
      target.closest(`.${className}`)
    );
  }
}
