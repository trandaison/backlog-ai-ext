# Component Documentation

## Content Script (`src/content/content.ts`)

### Purpose
Main entry point that detects Backlog pages and injects the AI chatbot interface.

### Key Methods

#### `BacklogAIInjector`
```typescript
class BacklogAIInjector {
  private ticketAnalyzer: TicketAnalyzer;
  private chatbotManager: ChatbotManager;
  private chatbotContainer: HTMLElement | null = null;
}
```

**Methods:**
- `init()` - Initializes the injector when DOM is ready
- `setupChatbot()` - Sets up chatbot if on ticket page
- `isTicketPage()` - Detects if current page is a ticket
- `injectChatbot()` - Creates UI elements and loads React component
- `toggleChatbot()` - Shows/hides chatbot interface
- `loadChatbotComponent()` - Dynamically loads chatbot scripts
- `analyzeTicket()` - Extracts and sends ticket data for analysis

### Usage Flow
1. Script loads when content script is injected
2. Checks if page is a Backlog ticket
3. Extracts ticket data using TicketAnalyzer
4. Creates floating AI button
5. Loads React chatbot component on demand
6. Manages communication with background script

---

## Background Script (`src/background/background.ts`)

### Purpose
Service worker that handles AI API integration and message routing between components.

### Key Classes

#### `OpenAIService`
```typescript
class OpenAIService implements AIService {
  private apiKey: string = '';
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';
}
```

**Methods:**
- `analyzeTicket(ticketData)` - Sends ticket data to OpenAI for analysis
- `processUserMessage(message, context)` - Handles chat messages with context
- `buildTicketAnalysisPrompt(ticketData)` - Creates analysis prompt
- `buildSystemPrompt(ticketData)` - Creates system prompt for chat

#### `BackgroundService`
```typescript
class BackgroundService {
  private aiService: AIService;
  private ticketDataCache: Map<string, TicketData> = new Map();
}
```

**Methods:**
- `setupMessageListeners()` - Sets up message handling
- `handleMessage(message, sender, sendResponse)` - Routes incoming messages
- `handleTicketAnalysis(ticketData, sendResponse)` - Processes ticket analysis
- `handleUserMessage(data, sendResponse)` - Processes chat messages
- `saveApiKey(apiKey)` - Stores API key securely
- `getApiKey()` - Retrieves stored API key

### Message Types
```typescript
// Ticket Analysis
{
  action: 'analyzeTicket',
  data: TicketData
}

// User Chat Message
{
  action: 'processUserMessage',
  data: {
    sessionId: string,
    ticketId: string,
    message: string,
    conversationHistory: ChatMessage[]
  }
}

// API Key Management
{
  action: 'saveApiKey',
  data: { apiKey: string }
}
```

---

## Popup Component (`src/popup/popup.tsx`)

### Purpose
Extension popup interface for configuring API settings and preferences.

### Main Component
```typescript
const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    aiModel: 'gpt-3.5-turbo',
    language: 'vi'
  });
}
```

### Features
- **API Key Management**: Secure input with show/hide toggle
- **Model Selection**: Choose between GPT models
- **Language Settings**: Vietnamese, English, Japanese
- **Connection Testing**: Verify API key validity
- **Quick Access**: Button to open Backlog tabs

### State Management
```typescript
interface Settings {
  apiKey: string;
  aiModel: string;
  language: string;
}
```

### Key Functions
- `loadSettings()` - Loads saved settings from storage
- `saveSettings()` - Saves settings to Chrome storage
- `testConnection()` - Tests API key with OpenAI
- `openBacklogTab()` - Opens new Backlog tab

---

## Chatbot Component (`src/chatbot/chatbot.tsx`)

### Purpose
React-based chat interface providing interactive AI assistance for tickets.

### Main Components

#### `ChatbotComponent`
```typescript
interface ChatbotProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
}
```

**Features:**
- Message display with user/AI differentiation
- Input handling with Enter key support
- Suggested questions for quick start
- Typing indicators
- Auto-scrolling to new messages

#### `ChatMessage`
```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}
```

#### `ChatbotApp`
Main application component that manages state and communication:
```typescript
const ChatbotApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
}
```

### Communication Flow
1. User types message and hits send
2. Message sent to content script via `postMessage`
3. Content script forwards to background script
4. Background script processes with AI
5. Response flows back through same chain
6. Chatbot updates UI with new message

### Suggested Questions
```typescript
const suggestedQuestions = [
  "Phân tích ticket này",
  "Đề xuất giải pháp",
  "Ước tính thời gian",
  "Rủi ro tiềm ẩn",
  "Best practices"
];
```

---

## Shared Utilities

### TicketAnalyzer (`src/shared/ticketAnalyzer.ts`)

#### Purpose
Extracts structured ticket data from Backlog DOM elements.

#### Interfaces
```typescript
interface TicketData {
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

interface CommentData {
  author: string;
  content: string;
  timestamp: string;
}
```

#### Key Methods
- `extractTicketData()` - Main extraction method
- `extractTicketId()` - Gets ticket ID from URL or DOM
- `extractTitle()` - Finds ticket title
- `extractDescription()` - Extracts main content
- `extractComments()` - Gathers all comments
- Private extraction methods for each field

#### Extraction Strategy
Uses multiple CSS selectors for robustness:
```typescript
const selectors = [
  '.ticket__header-title',
  '.issue-title',
  '.ticket-title',
  'h1.title',
  '.ticket__summary'
];
```

### ChatbotManager (`src/shared/chatbotManager.ts`)

#### Purpose
Manages chat sessions, message routing, and conversation persistence.

#### Interfaces
```typescript
interface ChatSession {
  id: string;
  ticketId: string;
  messages: ChatMessage[];
  createdAt: Date;
}
```

#### Key Methods
- `createChatSession(ticketId)` - Creates new chat session
- `addMessage(content, sender)` - Adds message to current session
- `sendUserMessage(content)` - Sends user message for processing
- `handleAIResponse(data)` - Processes AI responses
- `saveChatSession()` - Persists session to storage
- `loadChatSession(sessionId)` - Loads existing session

#### Message Routing
Handles communication between chatbot component and content script:
```typescript
// From chatbot to manager
window.postMessage({
  source: 'backlog-ai-chatbot',
  action: 'sendMessage',
  message: 'user input'
}, '*');

// From manager to chatbot
window.postMessage({
  source: 'backlog-ai-manager',
  action: 'messageAdded',
  data: newMessage
}, '*');
```

---

## Component Interaction Flow

### 1. Initial Load
```
Page Load → Content Script → TicketAnalyzer → Background Script → OpenAI API
```

### 2. User Interaction
```
User Click → Chatbot Component → ChatbotManager → Content Script → Background Script → OpenAI API
```

### 3. Response Flow
```
OpenAI API → Background Script → Content Script → ChatbotManager → Chatbot Component → UI Update
```

### 4. Settings Management
```
Popup Component → Background Script → Chrome Storage
```

## Error Handling Patterns

### 1. Component Level
```typescript
try {
  const result = await operation();
  setSuccess(result);
} catch (error) {
  console.error('Component error:', error);
  setError(String(error));
}
```

### 2. Service Level
```typescript
async function serviceMethod() {
  try {
    return await apiCall();
  } catch (error) {
    console.error('Service error:', error);
    throw new Error(`Service failed: ${error}`);
  }
}
```

### 3. UI Level
```typescript
{error && (
  <div className="error-message">
    {error}
  </div>
)}
```

## Performance Considerations

### 1. React Optimization
- Use `React.memo` for expensive components
- Implement proper dependency arrays in hooks
- Avoid unnecessary re-renders

### 2. DOM Interaction
- Cache DOM queries
- Use efficient selectors
- Debounce DOM mutations

### 3. Memory Management
- Clean up event listeners
- Clear timers and intervals
- Limit chat history size

### 4. API Optimization
- Implement request throttling
- Cache responses appropriately
- Use abort signals for cancellation
