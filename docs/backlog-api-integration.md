# Backlog API Integration Guide

## 📋 Overview

Extension đã được upgrade để sử dụng **Backlog REST API** thay vì DOM extraction cho việc lấy thông tin ticket. Điều này cung cấp:

- **Accurate Data**: Dữ liệu chính xác trực tiếp từ Backlog server
- **Complete Metadata**: Full ticket information bao gồm custom fields, attachments
- **Real-time**: Always up-to-date data không phụ thuộc vào UI changes
- **Reliable**: Không bị ảnh hưởng bởi UI updates hoặc layout changes

## 🔧 Configuration

### 1. Backlog API Key Setup

**Get API Key:**
1. Vào Backlog → **Personal Settings** → **API**
2. Generate new API key nếu chưa có
3. Copy API key (format: random string, không có prefix)

**Space Name:**
- Từ URL: `https://your-space-name.backlog.com`
- Space name = `your-space-name`

### 2. Extension Configuration

**Via Chatbot Settings:**
1. Mở any ticket page trong Backlog
2. Click vào chatbot icon (💬)
3. Click settings icon (⚙️) trong chatbot header
4. Nhập **Backlog API Key** và **Space Name**
5. Click **Lưu**

**Storage:**
- API keys được lưu trong Chrome sync storage
- Không encrypt (không sensitive như OpenAI key)
- Accessible across devices với Chrome sync

## 🏗️ Technical Architecture

### API Service (`src/shared/backlogApi.ts`)

```typescript
export class BacklogApiService {
  // Main methods
  async getIssue(issueKey: string): Promise<BacklogTicketData>
  async getIssueComments(issueKey: string): Promise<BacklogComment[]>
  convertToTicketData(backlogData, comments): TicketData

  // Utility methods
  static extractIssueKeyFromUrl(): string | null
  async testConnection(): Promise<boolean>
  updateSettings(settings: BacklogSettings): void
}
```

### Enhanced TicketAnalyzer (`src/shared/ticketAnalyzer.ts`)

```typescript
export class TicketAnalyzer {
  async extractTicketData(): Promise<TicketData> // API-first approach
  private async extractFromApi(): Promise<TicketData | null>
  private extractFromDom(): TicketData // Fallback method
  updateBacklogSettings(settings): void
}
```

### Domain Support

**Supported Domains:**
- `*.backlog.com` (International)
- `*.backlog.jp` (Japan)
- `*.backlogtool.com` (Alternative)

**Auto-detection:**
```typescript
// Base URL construction
if (currentUrl.includes('.backlog.jp')) {
  this.baseUrl = `https://${spaceName}.backlog.jp/api/v2`;
} else if (currentUrl.includes('.backlogtool.com')) {
  this.baseUrl = `https://${spaceName}.backlogtool.com/api/v2`;
} else {
  this.baseUrl = `https://${spaceName}.backlog.com/api/v2`;
}
```

## 📊 Data Extraction

### Backlog API vs DOM Extraction

| Feature | API Extraction | DOM Extraction |
|---------|---------------|----------------|
| **Accuracy** | ✅ 100% accurate | ⚠️ Depends on UI |
| **Completeness** | ✅ Full metadata | ❌ Limited fields |
| **Reliability** | ✅ Stable | ❌ UI-dependent |
| **Custom Fields** | ✅ Available | ❌ Not accessible |
| **Attachments** | ✅ Full info | ❌ Limited info |
| **Performance** | ✅ Fast API calls | ⚠️ DOM parsing |
| **Multi-language** | ✅ Language agnostic | ❌ Language dependent |

### Extended TicketData Fields

**NEW fields từ Backlog API:**
```typescript
interface TicketData {
  // Existing fields
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

  // NEW extended fields
  issueType?: string;           // Bug, Task, Request, etc.
  created?: string;             // ISO timestamp
  updated?: string;             // ISO timestamp
  estimatedHours?: number;      // Estimated effort
  actualHours?: number;         // Actual time spent
  parentIssueId?: number;       // Parent issue relationship
  customFields?: any[];         // Custom field values
  attachments?: any[];          // File attachments info
}
```

## 🔄 Fallback Strategy

**API-First với DOM Fallback:**

1. **Try API First**: Attempt to extract via Backlog API
2. **Check Settings**: Verify API key và space name configured
3. **Parse URL**: Extract issue key từ current URL
4. **Make API Calls**: Parallel calls cho issue data và comments
5. **Handle Errors**: Log API errors, fallback to DOM
6. **DOM Extraction**: Use existing DOM parsing as backup

```typescript
async extractTicketData(): Promise<TicketData> {
  try {
    const apiData = await this.extractFromApi();
    if (apiData) {
      return apiData; // API success
    }
  } catch (error) {
    console.warn('API failed, using DOM fallback:', error);
  }

  return this.extractFromDom(); // Fallback
}
```

## 🧪 Testing

### Test API Configuration
1. Load extension trong Chrome
2. Configure Backlog API settings trong chatbot
3. Open ticket page và verify data extraction
4. Check console for API vs DOM usage

### Test Scenarios
- ✅ **Valid API Key**: Should use API extraction
- ✅ **Invalid API Key**: Should fallback to DOM
- ✅ **No API Key**: Should use DOM extraction
- ✅ **Network Error**: Should fallback gracefully
- ✅ **Different Domains**: Test .com, .jp, .backlogtool.com

### Debug Information
```javascript
// Check current extraction method
console.log('Using API extraction:', !!apiData);
console.log('Ticket data source:', apiData ? 'API' : 'DOM');
```

## 🔒 Security Considerations

**API Key Storage:**
- Stored trong Chrome sync storage (not encrypted)
- Less sensitive than OpenAI keys
- User-controlled visibility trong Backlog settings

**API Permissions:**
- Uses user's Backlog permissions
- Read-only access để issue data
- No write operations performed

**CORS Handling:**
- Backlog API supports CORS từ extensions
- No proxy hoặc background requests needed
- Direct API calls từ content scripts

## 🚀 Performance Optimization

**Parallel API Calls:**
```typescript
const [issueData, comments] = await Promise.all([
  this.backlogApi.getIssue(issueKey),
  this.backlogApi.getIssueComments(issueKey)
]);
```

**Caching Strategy:**
- API data cached trong BackgroundService
- Reduced duplicate API calls
- Cache invalidation on page navigation

**Efficient DOM Fallback:**
- Only used when API fails
- Existing optimized selectors
- Minimal performance impact

## 📈 Future Enhancements

**Planned Improvements:**
- [ ] API rate limiting và retry logic
- [ ] Offline support với cached data
- [ ] Webhook integration cho real-time updates
- [ ] Bulk ticket processing for project analysis
- [ ] Advanced filtering và search capabilities

**API Extensions:**
- [ ] Project-level analysis features
- [ ] Milestone và version tracking
- [ ] User activity và contribution metrics
- [ ] Custom dashboard creation
