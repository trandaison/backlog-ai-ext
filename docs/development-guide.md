# Development Guide

## Setup & Getting Started

### Prerequisites
- Node.js 18+ and npm
- Chrome/Chromium browser
- OpenAI API key
- VS Code (recommended)

### Initial Setup
```bash
# Clone and install dependencies
cd backlog-ai-ext
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```

### Loading Extension in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder
5. Extension should appear in toolbar

## Development Workflow

### 1. Development Mode
```bash
npm run dev  # Enables watch mode
```
- Automatically rebuilds on file changes
- Source maps enabled for debugging
- Hot reload for most changes (except manifest)

### 2. Testing Changes
- Make code changes
- Webpack rebuilds automatically
- Refresh extension in Chrome Extensions page
- Test on actual Backlog pages

### 3. Debugging

#### Content Script Debugging
```javascript
// Add to content script for debugging
console.log('Backlog AI: Content script loaded');
console.log('Page URL:', window.location.href);
console.log('Ticket data:', ticketData);
```

#### Background Script Debugging
- Open Chrome Extensions page
- Click "Inspect views: service worker"
- Use DevTools console

#### React Component Debugging
- Inspect element in chatbot
- Use React DevTools extension
- Console.log in component methods

### 4. VS Code Tasks
- **Ctrl/Cmd + Shift + P** → "Tasks: Run Task"
- Available tasks:
  - "Build Extension" - Production build
  - "Watch Development" - Development with watch
  - "Clean Build" - Clean dist folder
  - "Type Check" - TypeScript validation

## File Structure Explanation

```
src/
├── content/
│   ├── content.ts          # Main content script
│   └── content.css         # Injected styles
├── background/
│   └── background.ts       # Service worker
├── popup/
│   ├── popup.tsx          # Settings UI
│   └── popup.html         # Popup HTML
├── chatbot/
│   ├── chatbot.tsx        # Chat interface
│   └── chatbot.css        # Chat styles
├── shared/
│   ├── ticketAnalyzer.ts  # DOM extraction
│   └── chatbotManager.ts  # Chat logic
└── assets/
    └── icons/             # Extension icons
```

## Adding New Features

### 1. New API Endpoint
```typescript
// In background/background.ts
private async handleMessage(message: any, sender: MessageSender, sendResponse: Function) {
  switch (message.action) {
    case 'newFeature':
      await this.handleNewFeature(message.data, sendResponse);
      break;
    // ... existing cases
  }
}

private async handleNewFeature(data: any, sendResponse: Function) {
  try {
    // Implement feature logic
    const result = await this.processNewFeature(data);
    sendResponse({ success: true, result });
  } catch (error) {
    sendResponse({ error: String(error) });
  }
}
```

### 2. New React Component
```typescript
// Create new component file
import React from 'react';

interface NewComponentProps {
  data: any;
  onAction: (action: string) => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({ data, onAction }) => {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

// Add to main chatbot component
import { NewComponent } from './NewComponent';

// Use in render
<NewComponent data={data} onAction={handleAction} />
```

### 3. New Shared Utility
```typescript
// In src/shared/
export class NewUtility {
  constructor() {
    // Initialize
  }

  public performAction(params: any): any {
    // Implementation
  }
}

// Import and use
import { NewUtility } from '../shared/NewUtility';
const utility = new NewUtility();
```

## Testing Strategy

### 1. Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Detects Backlog ticket pages correctly
- [ ] AI button appears and functions
- [ ] Chatbot opens/closes properly
- [ ] API key can be set in popup
- [ ] Ticket analysis works
- [ ] Chat functionality works
- [ ] Multiple language support
- [ ] Error handling works

### 2. Test Pages
Create test scenarios:
```javascript
// Test different Backlog URLs
const testUrls = [
  'https://company.backlog.com/view/PROJ-123',
  'https://company.backlog.jp/view/BUG-456',
  'https://company.backlogtool.com/view/TASK-789'
];
```

### 3. Error Simulation
```javascript
// Test API errors
const mockApiError = () => {
  // Temporarily break API key
  chrome.storage.sync.set({ openaiApiKey: 'invalid-key' });
};

// Test network errors
const mockNetworkError = () => {
  // Block requests to OpenAI in DevTools Network tab
};
```

## Performance Optimization

### 1. Bundle Size Analysis
```bash
# Analyze bundle size
npm run build
ls -la dist/

# Check specific file sizes
du -h dist/*.js
```

### 2. Memory Usage Monitoring
```javascript
// Add to components for memory tracking
const measureMemory = () => {
  if ('memory' in performance) {
    console.log('Memory usage:', performance.memory);
  }
};

// Call periodically in development
setInterval(measureMemory, 10000);
```

### 3. Performance Profiling
- Use Chrome DevTools Performance tab
- Profile content script execution
- Monitor React component re-renders
- Check for memory leaks

## Common Issues & Solutions

### 1. Content Script Not Loading
**Problem**: AI button doesn't appear
**Solutions**:
- Check manifest.json content_scripts patterns
- Verify page URL matches patterns
- Check console for errors
- Ensure permissions are granted

### 2. API Calls Failing
**Problem**: AI responses not working
**Solutions**:
- Verify API key in popup
- Check network requests in DevTools
- Test API key with curl
- Check CORS and CSP settings

### 3. React Components Not Rendering
**Problem**: Chatbot appears blank
**Solutions**:
- Check for JavaScript errors
- Verify React DevTools shows components
- Check CSS conflicts
- Validate props being passed

### 4. Message Passing Issues
**Problem**: Components not communicating
**Solutions**:
- Check chrome.runtime.sendMessage calls
- Verify message listeners are set up
- Check for typos in action names
- Use console.log to trace messages

## Code Style Guidelines

### 1. TypeScript
- Use strict mode
- Define interfaces for all data structures
- Avoid `any` type
- Use proper error handling

### 2. React
- Use functional components with hooks
- Implement proper error boundaries
- Use memo for performance optimization
- Follow React best practices

### 3. Chrome Extension
- Follow Manifest V3 guidelines
- Use proper permission declarations
- Implement CSP compliance
- Handle lifecycle events correctly

## Build & Deployment

### 1. Production Build
```bash
npm run build
```
- Minified JavaScript
- Optimized assets
- Production React build
- Source maps removed

### 2. Extension Packaging
```bash
# Create extension package
cd dist
zip -r ../backlog-ai-ext.zip .
```

### 3. Store Submission
- Test on clean Chrome profile
- Validate all functionality
- Prepare store screenshots
- Write store description
- Submit for review

## Monitoring & Analytics

### 1. Error Tracking
```javascript
// Global error handler
window.addEventListener('error', (event) => {
  console.error('Extension error:', event.error);
  // Report to analytics if needed
});
```

### 2. Usage Analytics
```javascript
// Track feature usage
const trackUsage = (feature: string) => {
  chrome.storage.local.get(['usage'], (result) => {
    const usage = result.usage || {};
    usage[feature] = (usage[feature] || 0) + 1;
    chrome.storage.local.set({ usage });
  });
};
```

### 3. Performance Metrics
```javascript
// Track API response times
const trackAPIPerformance = (startTime: number, endTime: number) => {
  const duration = endTime - startTime;
  console.log(`API call took ${duration}ms`);
  // Store metrics for analysis
};
```
