# Create Backlog Ticket Implementation

## Overview
This document details the implementation of the "📋 Tạo Backlog ticket" quick action feature in the chatbot. This feature allows users to create Backlog tickets through a modal interface with AI-powered content translation.

## Feature Flow

### 1. Quick Action Trigger
- User clicks on "📋 Tạo Backlog ticket" quick action button
- Opens a modal dialog for ticket creation configuration

### 2. Modal Components

#### 2.1 Backlog Selection
- **Data Source**: `await settingsClient.getBacklogs()`
- **UI Component**: Select dropdown
- **Behavior**:
  - Load all configured backlogs from settings
  - Display backlog name and domain
  - Required field - user must select a backlog

#### 2.2 Project Selection
- **Data Source**: Backlog API - `GET /api/v2/projects`
- **UI Component**: Input with datalist for autocomplete
- **Behavior**:
  - Triggered after backlog selection
  - Fetch projects from selected backlog's API
  - User types `projectKey` with autocomplete suggestions

**API Response Structure:**
```json
[
  {
    "id": 1,
    "projectKey": "TEST",
    "name": "test",
    "chartEnabled": false,
    "useResolvedForChart": false,
    "subtaskingEnabled": false,
    "projectLeaderCanEditProjectLeader": false,
    "useWiki": true,
    "useFileSharing": true,
    "useWikiTreeView": true,
    "useSubversion": true,
    "useGit": true,
    "useOriginalImageSizeAtWiki": false,
    "textFormattingRule": "markdown",
    "archived": false,
    "displayOrder": 2147483646,
    "useDevAttributes": true
  }
]
```

#### 2.3 Language Selection
- **UI Component**: Select dropdown
- **Options**: Available languages for translation
- **Purpose**: Specify target language for AI content translation

#### 2.4 Command Preview
- **Display Format**: `/create-ticket <projectKey> <language>`
- **Behavior**:
  - Updates dynamically as user selects options
  - Shows the command that will be sent in chat

### 3. Command Execution Flow

#### 3.1 Chat Message Generation
- Command format: `/create-ticket <projectKey> <language>`
- Example: `/create-ticket TEST vietnamese`

#### 3.2 AI Prompt Building
The system will build a prompt requesting AI to:
1. Analyze current ticket context (from existing conversation)
2. Translate content to specified language
3. Structure response as JSON for Backlog API

#### 3.3 Required API Parameters
Based on Backlog API documentation, the AI should generate JSON with these parameters:

| Parameter Name | Type | Required | Description |
|---------------|------|----------|-------------|
| `projectId` | Number | ✓ | Project ID (resolved from projectKey) |
| `summary` | String | ✓ | Ticket title/summary |
| `issueTypeId` | Number | ✓ | Issue type ID |
| `priorityId` | Number | ✓ | Priority ID |
| `description` | String | - | Detailed description |
| `parentIssueId` | Number | - | Parent issue ID |
| `startDate` | String | - | Start date (yyyy-MM-dd) |
| `dueDate` | String | - | Due date (yyyy-MM-dd) |
| `estimatedHours` | Number | - | Estimated hours |
| `actualHours` | Number | - | Actual hours |
| `categoryId[]` | Number[] | - | Category IDs |
| `versionId[]` | Number[] | - | Version IDs |
| `milestoneId[]` | Number[] | - | Milestone IDs |
| `assigneeId` | Number | - | Assignee ID |
| `notifiedUserId[]` | Number[] | - | Notified user IDs |
| `attachmentId[]` | Number[] | - | Attachment file IDs |

#### 3.4 AI Response Format
Expected JSON structure from AI:
```json
{
  "summary": "Translated ticket title",
  "description": "Translated detailed description",
  "issueTypeId": 1,
  "priorityId": 3,
  "estimatedHours": 8,
  "dueDate": "2025-08-15",
}
```

#### 3.5 Success Response
After successfully creating the ticket, the system will display a response message to the user:

**Response Format:**
```
Đã tạo ticket: [<Ticket key>](url)
```

**Example:**
```
Đã tạo ticket: [TEST-123](https://example.backlog.jp/view/TEST-123)
```

**Implementation Details:**
- `<Ticket key>`: The ticket key returned from Backlog API (e.g., "TEST-123")
- `url`: Direct link to the created ticket in Backlog
- The message should be formatted as a clickable link in the chat interface
- Display this message as an AI response in the chat conversation

### 4. Implementation Architecture

#### 4.1 Component Structure
```
CreateTicketModal/
├── components/
│   ├── BacklogSelector.tsx
│   ├── ProjectSelector.tsx
│   ├── LanguageSelector.tsx
│   └── CommandPreview.tsx
├── hooks/
│   ├── useBacklogProjects.ts
│   └── useCreateTicket.ts
├── services/
│   ├── backlogApi.ts
│   └── ticketCreation.ts
└── CreateTicketModal.tsx
```

#### 4.2 State Management
```typescript
interface CreateTicketState {
  selectedBacklog: BacklogIntegration | null;
  selectedProject: string; // projectKey
  selectedLanguage: string;
  projects: Project[];
  loading: boolean;
  error: string | null;
}
```

#### 4.3 Key Hooks

**useBacklogProjects.ts**
```typescript
export const useBacklogProjects = (backlog: BacklogIntegration | null) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch projects when backlog changes
  // Return projects, loading state, and error handling
};
```

**useCreateTicket.ts**
```typescript
export const useCreateTicket = () => {
  const createTicket = async (
    backlog: BacklogIntegration,
    projectKey: string,
    language: string,
    ticketData: TicketData
  ) => {
    // Handle ticket creation API call
    // Return success/error status
  };

  return { createTicket };
};
```

### 5. API Integration

#### 5.1 Backlog Settings Client
```typescript
// Get configured backlogs
const backlogs = await settingsClient.getBacklogs();
```

#### 5.2 Project List API
```typescript
const fetchProjects = async (backlog: BacklogIntegration): Promise<Project[]> => {
  const response = await fetch(`https://${backlog.domain}/api/v2/projects`, {
    headers: {
      'Authorization': `Bearer ${backlog.apiKey}`
    }
  });
  return response.json();
};
```

#### 5.3 Create Issue API
```typescript
const createIssue = async (
  backlog: BacklogIntegration,
  issueData: IssueData
): Promise<Issue> => {
  const response = await fetch(`https://${backlog.domain}/api/v2/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${backlog.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });
  return response.json();
};
```

### 6. Error Handling

#### 6.1 Validation Errors
- No backlog selected
- Invalid project key
- Missing required fields
- API authentication failures

#### 6.2 Network Errors
- Failed to fetch projects
- Failed to create ticket
- Timeout handling

#### 6.3 User Feedback
- Loading states for async operations
- Success notifications
- Error messages with actionable suggestions

### 7. Security Considerations

#### 7.1 API Key Protection
- Use background script for API calls
- Never expose API keys in content scripts
- Implement proper message passing

#### 7.2 Input Validation
- Sanitize user inputs
- Validate project keys against fetched list
- Prevent injection attacks

### 8. Performance Optimizations

#### 8.1 Project List Handling
- Implement debounced search for large project lists
- Cache project data per backlog
- Lazy loading for better UX

#### 8.2 API Call Optimization
- Batch API requests where possible
- Implement request caching
- Handle rate limiting gracefully

### 9. Accessibility

#### 9.1 Keyboard Navigation
- Tab order through form fields
- Enter key to submit
- Escape key to close modal

#### 9.2 Screen Reader Support
- Proper ARIA labels
- Form validation announcements
- Status updates for async operations

### 10. Testing Strategy

#### 10.1 Unit Tests
- Modal component rendering
- Form validation logic
- API service functions

#### 10.2 Integration Tests
- End-to-end ticket creation flow
- API error handling
- Settings integration

#### 10.3 Manual Testing
- Test with different backlog configurations
- Verify translations work correctly
- Test with large project lists

## Next Steps

1. Create modal component structure
2. Implement backlog and project selection
3. Add language selection and command preview
4. Integrate with AI prompt building
5. Implement ticket creation API calls
6. Add error handling and user feedback
7. Test with real Backlog instances
8. Document usage and troubleshooting

## Dependencies

- React components for modal UI
- Settings client for backlog configuration
- Background script for API calls
- AI service for content translation
- Backlog API integration utilities
