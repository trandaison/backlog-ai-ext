# Backlog AI Extension - Project Overview

## Project Context
**Created**: July 24, 2025
**Purpose**: Chrome extension that integrates AI assistance into Backlog ticket pages for intelligent analysis and chat functionality.

## Technology Stack
- **Framework**: Chrome Extension Manifest V3
- **Languages**: TypeScript, React
- **Build Tool**: Webpack 5
- **AI Provider**: OpenAI GPT models (3.5-turbo, GPT-4)
- **Target Platforms**:
  - backlog.com
  - backlog.jp
  - backlogtool.com

## Key Features
1. **Automatic Ticket Analysis**: Extracts ticket data and provides AI-powered insights
2. **Interactive Chatbot**: React-based chat interface for discussing tickets with AI
3. **Multi-language Support**: Vietnamese, English, Japanese
4. **Secure API Integration**: Safe storage of OpenAI API keys
5. **Real-time Injection**: Dynamic content script injection into Backlog pages

## Architecture Components

### 1. Content Script (`src/content/content.ts`)
- **Purpose**: Injects chatbot into Backlog ticket pages
- **Key Functionality**:
  - Detects ticket pages using URL pattern matching
  - Creates floating AI toggle button
  - Dynamically loads React chatbot component
  - Extracts ticket data for analysis
  - Handles communication with background script

### 2. Background Script (`src/background/background.ts`)
- **Purpose**: Service worker for AI API calls and message routing
- **Key Functionality**:
  - Processes OpenAI API requests
  - Manages conversation context and history
  - Handles secure API key storage
  - Routes messages between components
  - Caches ticket data for performance

### 3. Popup Interface (`src/popup/popup.tsx`)
- **Purpose**: Extension configuration and settings
- **Key Functionality**:
  - OpenAI API key management
  - Model selection (GPT-3.5, GPT-4)
  - Language preference settings
  - Connection testing
  - Quick access to Backlog

### 4. Chatbot Component (`src/chatbot/chatbot.tsx`)
- **Purpose**: React-based interactive chat interface
- **Key Functionality**:
  - Real-time messaging with AI
  - Conversation history management
  - Suggested question prompts
  - Responsive design
  - Message formatting and timestamps

### 5. Shared Utilities (`src/shared/`)
- **TicketAnalyzer**: Extracts ticket data from Backlog DOM
- **ChatbotManager**: Manages chat sessions and communication

## Data Flow

```
1. User opens Backlog ticket page
2. Content script detects ticket page
3. TicketAnalyzer extracts ticket data
4. Data sent to background script
5. Background script calls OpenAI API
6. AI analysis returned to content script
7. User clicks AI button to open chatbot
8. Chatbot loads and displays analysis
9. User can chat with AI about ticket
10. All conversations stored locally
```

## Communication Pattern

```
Content Script ↔ Background Script ↔ OpenAI API
     ↓
Chatbot Component (React)
     ↓
ChatbotManager (Message routing)
```

## Security Considerations
- API keys stored in Chrome's secure storage
- Content Security Policy compliance
- No external data transmission except to OpenAI
- Input validation and sanitization
- Manifest V3 security best practices

## Performance Optimizations
- Lazy loading of React components
- Local ticket data caching
- Debounced API calls
- Minimal DOM manipulation
- Code splitting via Webpack

## Development Workflow
1. `npm run dev` - Watch mode for development
2. `npm run build` - Production build
3. Load unpacked extension in Chrome
4. Test on real Backlog pages
5. Monitor console for debugging

## Extension Permissions
- `activeTab`: Access current tab content
- `storage`: Store API keys and settings
- `scripting`: Inject content scripts
- Host permissions for Backlog domains

## Future Enhancement Areas
- Offline mode support
- Additional AI providers
- Custom prompt templates
- Team collaboration features
- Analytics and usage tracking
