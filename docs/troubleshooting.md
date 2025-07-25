# Troubleshooting Guide

## Common Issues & Solutions

### 1. Extension Not Loading

#### Symptoms
- Extension icon doesn't appear in toolbar
- No response when clicking extension icon
- Console shows extension errors

#### Solutions
```bash
# Check if extension is loaded properly
1. Go to chrome://extensions/
2. Verify "Backlog AI Assistant" is listed and enabled
3. Check for any errors in the extension card

# Reload extension
1. Click refresh icon in extension card
2. Or disable/re-enable the extension

# Check manifest.json
1. Verify all file paths exist
2. Check permissions are correct
3. Validate JSON syntax
```

#### Debug Steps
```javascript
// Check if background script is running
chrome.runtime.sendMessage({action: 'ping'}, (response) => {
  console.log('Background script response:', response);
});

// Check content script injection
console.log('Content script loaded:', !!window.backlogAI);
```

### 2. AI Button Not Appearing

#### Symptoms
- On Backlog ticket page but no floating AI button
- Console shows content script loaded

#### Solutions
```javascript
// Check page detection
console.log('Current URL:', window.location.href);
console.log('Is ticket page:', /\/view\/[A-Z]+-\d+/.test(window.location.href));

// Manual injection test
const button = document.getElementById('backlog-ai-toggle');
console.log('Button exists:', !!button);
```

#### Common Causes
1. **URL Pattern Mismatch**
   ```javascript
   // Add more flexible pattern
   const isTicketPage = () => {
     const url = window.location.href;
     return url.includes('/view/') || url.includes('/issue/');
   };
   ```

2. **DOM Loading Issues**
   ```javascript
   // Wait for DOM
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', setupChatbot);
   } else {
     setTimeout(setupChatbot, 1000); // Fallback delay
   }
   ```

3. **CSS Conflicts**
   ```css
   /* Force visibility */
   #backlog-ai-toggle {
     display: flex !important;
     visibility: visible !important;
     opacity: 1 !important;
   }
   ```

### 3. API Key Issues

#### Symptoms
- "API key chưa được cấu hình" error
- API calls returning 401 errors

#### Solutions
```javascript
// Verify API key storage
chrome.storage.sync.get(['openaiApiKey'], (result) => {
  console.log('Stored API key exists:', !!result.openaiApiKey);
  console.log('Key length:', result.openaiApiKey?.length || 0);
});

// Test API key manually
const testApiKey = async (apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log('API test status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('API test failed:', error);
    return false;
  }
};
```

#### Validation Checklist
- [ ] API key starts with "sk-"
- [ ] Key is 51 characters long
- [ ] No extra spaces or characters
- [ ] OpenAI account has available credits
- [ ] API key has correct permissions

### 4. Chatbot Not Opening

#### Symptoms
- AI button appears but clicking does nothing
- Chatbot container exists but remains hidden

#### Debug Steps
```javascript
// Check button click handler
const button = document.getElementById('backlog-ai-toggle');
console.log('Button click listeners:', getEventListeners(button));

// Check container state
const container = document.getElementById('backlog-ai-chatbot-container');
console.log('Container display:', container?.style.display);
console.log('Container visibility:', container?.style.visibility);

// Manual toggle test
if (container) {
  container.style.display = 'block';
  console.log('Manual toggle successful');
}
```

#### Solutions
```javascript
// Robust toggle function
const toggleChatbot = () => {
  const container = document.getElementById('backlog-ai-chatbot-container');
  if (!container) {
    console.error('Chatbot container not found');
    return;
  }

  const isVisible = container.style.display !== 'none';
  container.style.display = isVisible ? 'none' : 'block';
  container.style.visibility = isVisible ? 'hidden' : 'visible';
  container.style.opacity = isVisible ? '0' : '1';
};
```

### 5. React Component Not Loading

#### Symptoms
- Chatbot opens but shows blank content
- React DevTools shows no components

#### Debug Steps
```javascript
// Check if React scripts loaded
console.log('React loaded:', typeof React !== 'undefined');
console.log('ReactDOM loaded:', typeof ReactDOM !== 'undefined');

// Check script loading
const scripts = Array.from(document.querySelectorAll('script'));
const chatbotScript = scripts.find(s => s.src.includes('chatbot.js'));
console.log('Chatbot script loaded:', !!chatbotScript);

// Check for JavaScript errors
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});
```

#### Solutions
```javascript
// Ensure proper script loading
const loadChatbotComponent = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/chatbot.js');
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Wait for React to be available
const waitForReact = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (typeof React !== 'undefined') {
        resolve(true);
      } else if (Date.now() - start > timeout) {
        reject(new Error('React not loaded within timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};
```

### 6. Message Passing Failures

#### Symptoms
- Components not communicating
- Messages sent but not received
- Async operations hanging

#### Debug Steps
```javascript
// Test background script communication
chrome.runtime.sendMessage({action: 'ping'}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Runtime error:', chrome.runtime.lastError);
  } else {
    console.log('Background response:', response);
  }
});

// Test window message passing
window.addEventListener('message', (event) => {
  console.log('Received message:', event.data);
});

// Send test message
window.postMessage({
  source: 'test',
  action: 'test',
  data: 'test message'
}, '*');
```

#### Solutions
```javascript
// Robust message sending
const sendMessageWithRetry = (message, maxRetries = 3) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = () => {
      attempts++;
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          if (attempts < maxRetries) {
            setTimeout(attempt, 1000 * attempts);
          } else {
            reject(chrome.runtime.lastError);
          }
        } else {
          resolve(response);
        }
      });
    };

    attempt();
  });
};

// Message listener with error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ error: String(error) });
    return false;
  }
});
```

### 7. Performance Issues

#### Symptoms
- Slow response times
- High memory usage
- Browser freezing

#### Solutions
```javascript
// Implement request throttling
class RequestThrottler {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    this.isProcessing = false;
  }
}

// Memory cleanup
const cleanup = () => {
  // Remove event listeners
  document.removeEventListener('DOMContentLoaded', handler);
  window.removeEventListener('message', messageHandler);

  // Clear intervals/timeouts
  if (intervalId) clearInterval(intervalId);
  if (timeoutId) clearTimeout(timeoutId);

  // Remove DOM elements
  const elements = document.querySelectorAll('[id^="backlog-ai-"]');
  elements.forEach(el => el.remove());
};
```

## Development Debugging

### 1. Browser DevTools Setup

#### Content Script Debugging
```javascript
// Add to content script for debugging
console.log('Content script loaded at:', new Date());
console.log('Page URL:', window.location.href);
console.log('Document ready state:', document.readyState);

// Enable verbose logging
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) console.log('[Backlog AI]', ...args);
};
```

#### Background Script Debugging
```javascript
// Open background script console
// 1. Go to chrome://extensions/
// 2. Click "Inspect views: service worker"

// Add debugging
console.log('Background script started');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  console.log('From sender:', sender);
});
```

### 2. Network Debugging

#### Monitor API Calls
```javascript
// Override fetch to log requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Fetch request:', args);
  const response = await originalFetch(...args);
  console.log('Fetch response:', response.status, response.statusText);
  return response;
};
```

#### Check CORS Issues
```javascript
// Test CORS
fetch('https://api.openai.com/v1/models', {
  method: 'OPTIONS',
  headers: {
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Authorization'
  }
})
.then(response => console.log('CORS preflight:', response.status))
.catch(error => console.error('CORS error:', error));
```

### 3. State Debugging

#### Check Storage
```javascript
// Check all stored data
chrome.storage.sync.get(null, (items) => {
  console.log('All sync storage:', items);
});

chrome.storage.local.get(null, (items) => {
  console.log('All local storage:', items);
});
```

#### Monitor State Changes
```javascript
// Watch storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', changes, areaName);
});
```

## Production Debugging

### 1. Error Reporting

#### Global Error Handler
```javascript
window.addEventListener('error', (event) => {
  const errorData = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Report to analytics or logging service
  reportError(errorData);
});

window.addEventListener('unhandledrejection', (event) => {
  const errorData = {
    reason: event.reason,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };

  reportError(errorData);
});
```

#### Chrome Extension Error Tracking
```javascript
// Background script error tracking
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending');
});
```

### 2. User Feedback Collection

#### Debug Info Generation
```javascript
const generateDebugInfo = async () => {
  const debugInfo = {
    extensionVersion: chrome.runtime.getManifest().version,
    chromeVersion: navigator.appVersion,
    url: window.location.href,
    timestamp: new Date().toISOString(),

    // Extension state
    hasApiKey: !!(await getApiKey()),
    ticketDetected: isTicketPage(),
    chatbotVisible: isChatbotVisible(),

    // Console errors (last 10)
    consoleErrors: getRecentErrors(),

    // Storage info
    storageSize: await getStorageSize()
  };

  return JSON.stringify(debugInfo, null, 2);
};
```

### 3. Remote Debugging

#### Feature Flags
```javascript
const FEATURE_FLAGS = {
  debugMode: false,
  verboseLogging: false,
  experimentalFeatures: false
};

// Load from remote config
const loadFeatureFlags = async () => {
  try {
    const response = await fetch('https://api.yourservice.com/config');
    const config = await response.json();
    Object.assign(FEATURE_FLAGS, config);
  } catch (error) {
    console.error('Failed to load feature flags:', error);
  }
};
```
