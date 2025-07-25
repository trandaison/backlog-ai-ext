# API Integration Guide

## OpenAI API Setup

### 1. API Configuration
```javascript
const API_CONFIG = {
  baseURL: 'https://api.openai.com/v1',
  endpoints: {
    chat: '/chat/completions',
    models: '/models'
  },
  models: {
    'gpt-3.5-turbo': { maxTokens: 4096, costPer1k: 0.002 },
    'gpt-4': { maxTokens: 8192, costPer1k: 0.03 },
    'gpt-4-turbo': { maxTokens: 128000, costPer1k: 0.01 }
  }
};
```

### 2. Request Structure
```javascript
// Ticket Analysis Request
{
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: 'Bạn là AI assistant chuyên phân tích ticket Backlog...'
    },
    {
      role: 'user',
      content: buildTicketAnalysisPrompt(ticketData)
    }
  ],
  max_tokens: 1000,
  temperature: 0.7
}

// Chat Request
{
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage }
  ],
  max_tokens: 800,
  temperature: 0.7
}
```

### 3. Prompt Templates

#### System Prompt for Ticket Analysis
```javascript
const ANALYSIS_SYSTEM_PROMPT = `
Bạn là một AI assistant chuyên phân tích ticket Backlog.
Hãy phân tích ticket một cách chi tiết và đưa ra những insight hữu ích.

Khi phân tích, hãy tập trung vào:
1. Tóm tắt nội dung chính
2. Đánh giá mức độ phức tạp (1-5)
3. Đề xuất approach kỹ thuật
4. Nhận diện rủi ro tiềm ẩn
5. Ước tính timeline
6. Đề xuất test cases
7. Best practices liên quan

Trả lời bằng tiếng Việt một cách chuyên nghiệp và dễ hiểu.
`;
```

#### Dynamic Ticket Prompt Builder
```javascript
function buildTicketAnalysisPrompt(ticketData: TicketData): string {
  return `
Hãy phân tích ticket Backlog sau:

**Thông tin cơ bản:**
- ID: ${ticketData.id}
- Tiêu đề: ${ticketData.title}
- Trạng thái: ${ticketData.status}
- Độ ưu tiên: ${ticketData.priority}
- Người phụ trách: ${ticketData.assignee || 'Chưa assigned'}
- Deadline: ${ticketData.dueDate || 'Không có'}

**Mô tả chi tiết:**
${ticketData.description}

**Labels/Tags:**
${ticketData.labels.length > 0 ? ticketData.labels.join(', ') : 'Không có'}

**Comments gần đây:**
${formatComments(ticketData.comments)}

Hãy đưa ra phân tích toàn diện và actionable insights.
`;
}
```

#### Chat System Prompt
```javascript
function buildChatSystemPrompt(ticketData?: TicketData): string {
  let prompt = `
Bạn là AI assistant chuyên hỗ trợ development và project management.
Bạn có khả năng:
- Phân tích requirements và technical specifications
- Đề xuất solutions và best practices
- Hỗ trợ debugging và troubleshooting
- Code review và optimization suggestions
- Planning và estimation

Hãy trả lời một cách:
- Chi tiết và chính xác
- Practical và actionable
- Phù hợp với context của ticket
- Sử dụng tiếng Việt tự nhiên
`;

  if (ticketData) {
    prompt += `\n\nContext ticket hiện tại:
- ID: ${ticketData.id}
- Tiêu đề: ${ticketData.title}
- Status: ${ticketData.status}
- Mô tả: ${ticketData.description.slice(0, 500)}...
`;
  }

  return prompt;
}
```

## Error Handling & Retry Logic

### 1. API Error Types
```javascript
const API_ERRORS = {
  UNAUTHORIZED: 401,      // Invalid API key
  RATE_LIMIT: 429,       // Too many requests
  SERVER_ERROR: 500,     // OpenAI server issues
  NETWORK_ERROR: 'NETWORK', // Connection issues
  TIMEOUT: 'TIMEOUT'     // Request timeout
};
```

### 2. Retry Strategy
```javascript
async function callOpenAIWithRetry(request, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      if (response.ok) {
        return await response.json();
      }

      // Handle specific error codes
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`API Error: ${response.status}`);

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### 3. Response Validation
```javascript
function validateOpenAIResponse(response: any): string {
  if (!response) {
    throw new Error('Empty response from API');
  }

  if (response.error) {
    throw new Error(`OpenAI Error: ${response.error.message}`);
  }

  if (!response.choices || response.choices.length === 0) {
    throw new Error('No choices in API response');
  }

  const message = response.choices[0].message;
  if (!message || !message.content) {
    throw new Error('Invalid message format in response');
  }

  return message.content.trim();
}
```

## Rate Limiting & Cost Management

### 1. Request Throttling
```javascript
class APIThrottler {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private minInterval = 1000; // 1 second between requests

  async throttleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, this.minInterval));
    }

    this.isProcessing = false;
  }
}
```

### 2. Token Usage Tracking
```javascript
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English
  // Vietnamese may be different, so we use a conservative estimate
  return Math.ceil(text.length / 3);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelConfig = API_CONFIG.models[model];
  if (!modelConfig) return 0;

  const totalTokens = inputTokens + outputTokens;
  return (totalTokens / 1000) * modelConfig.costPer1k;
}
```

## Testing API Integration

### 1. Connection Test
```javascript
async function testAPIConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### 2. Mock API for Development
```javascript
class MockOpenAIService implements AIService {
  async analyzeTicket(ticketData: TicketData): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return `Mock analysis for ticket ${ticketData.id}:

1. **Tóm tắt**: ${ticketData.title}
2. **Độ phức tạp**: Trung bình (3/5)
3. **Thời gian ước tính**: 2-3 ngày
4. **Rủi ro**: Cần test kỹ integration
5. **Đề xuất**: Sử dụng TDD approach
    `;
  }

  async processUserMessage(message: string, context: any): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return `Mock response to: "${message}"`;
  }
}
```

### 3. API Monitoring
```javascript
class APIMonitor {
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    totalCost: 0
  };

  recordRequest(success: boolean, tokens: number, cost: number) {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    this.stats.totalTokens += tokens;
    this.stats.totalCost += cost;

    // Save to storage for analytics
    chrome.storage.local.set({ apiStats: this.stats });
  }

  getStats() {
    return { ...this.stats };
  }
}
```
