# 🧠 Comment Enhancer Implementation

## 📋 Tổng quan

Comment Enhancer là một tính năng mới được thêm vào Backlog AI Extension, cho phép người dùng tương tác với AI về các comment cụ thể trên trang ticket Backlog.

## ✨ Tính năng chính

### 1. **Nút AI Chat ẩn/hiện**
- Nút "AI Chat" chỉ hiện khi hover vào comment
- Thiết kế responsive cho mobile và desktop
- Icon và text rõ ràng, dễ hiểu

### 2. **Tự động inject cho comments mới**
- Sử dụng `MutationObserver` để theo dõi comments mới
- Tự động thêm nút AI Chat cho comments được load qua AJAX
- Tránh inject trùng lặp

### 3. **Tích hợp với Chatbot**
- Click nút sẽ mở chatbot panel
- Tự động load context comment vào chat
- Gửi message với thông tin comment đầy đủ

### 4. **Highlight Comment Container**
- Hover vào button AI Chat sẽ highlight comment container
- Sử dụng class `ai-ext-highlight-comment-container` cho hiệu ứng
- Tự động xóa highlight khi ngưng hover

### 5. **Comment Context Integration**
- Click button AI Chat → Mở chatbox và focus textarea
- Gọi API để lấy comment details và previous comments
- Hiển thị badge UI với thông tin comment đã chọn
- Cho phép người dùng gỡ bỏ comment context
- Tự động include comment context khi gửi message

## 🏗️ Kiến trúc Implementation

### Class CommentEnhancer

```typescript
class CommentEnhancer {
  private observer: MutationObserver | null = null;
  private isInitialized: boolean = false;
  private initTimeout: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Inject buttons cho comments hiện tại với delay
    this.scheduleInitialInjection();

    // Theo dõi comments mới
    this.observeCommentList();
  }

  private injectChatButton(commentItem: HTMLElement): void {
    // Tránh inject trùng lặp
    if (commentItem.querySelector('.ai-ext-comment-chat-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ai-ext-comment-chat-btn';
    btn.title = 'Chat với AI về comment này';

    // Tạo icon
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/icon.svg');
    iconImg.alt = 'AI Chat';

    btn.appendChild(iconImg);

    // Thêm event listeners
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openAIChatboxWithContext(commentItem);
    });

    // Thêm hover events để highlight comment container
    btn.addEventListener('mouseenter', (event) => {
      this.highlightCommentContainer(commentItem);
    });

    btn.addEventListener('mouseleave', (event) => {
      this.unhighlightCommentContainer(commentItem);
    });

    commentItem.appendChild(btn);
  }

  private highlightCommentContainer(commentItem: HTMLElement): void {
    // Tìm comment container (có thể là commentItem hoặc parent element)
    const commentContainer = commentItem.closest('.js_comment-container') || commentItem;
    if (commentContainer) {
      commentContainer.classList.add('ai-ext-highlight-comment-container');
    }
  }

  private unhighlightCommentContainer(commentItem: HTMLElement): void {
    // Tìm comment container và xóa class highlight
    const commentContainer = commentItem.closest('.js_comment-container') || commentItem;
    if (commentContainer) {
      commentContainer.classList.remove('ai-ext-highlight-comment-container');
    }
  }
}
```

### CSS Integration

CSS được định nghĩa trực tiếp trong `src/content/content.scss`:

```scss
/* Comment Enhancer Styles */
.ai-ext-comment-chat-btn {
  display: inline-block;
  opacity: 0;
  position: absolute;
  top: 75px;
  left: 32px;
  margin: 0;
  padding: 0;
  background: none;
  width: 28px;
  height: 28px;
  border: none;
  outline: none;
  pointer-events: none;
  transition: 0.15s ease-in-out;
}

.ai-ext-comment-chat-btn img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  box-shadow: 0 4px 8px 2px hsl(160deg 59% 53% / 0);
  scale: 1;
  transition: 0.15s ease-in-out;
}

.ai-ext-comment-chat-btn:hover {
  img {
    scale: 1.1;
    box-shadow: 0 4px 8px 2px hsl(160deg 59% 53% / 30%);
  }
}

/* Hiện nút khi hover comment-item */
.comment-item:hover .ai-ext-comment-chat-btn {
  pointer-events: auto;
  opacity: 1;
}

/* Highlight comment container when hovering button */
.ai-ext-highlight-comment-container {
  background: #40ce9f4f;
  outline: 10px solid #40ce9f4f;
  border-radius: 4px;
}

/* Responsive adjustments for comment enhancer */
@media (max-width: 768px) {
  .ai-ext-comment-chat-btn {
    font-size: 11px;
    padding: 3px 6px;
  }

  .ai-ext-comment-chat-btn img {
    width: 12px;
    height: 12px;
  }
}
```

### Timing Strategy

```typescript
private scheduleInitialInjection(): void {
  // Clear any existing timeout
  if (this.initTimeout) {
    clearTimeout(this.initTimeout);
  }

  // Schedule initial injection with delay to ensure comments are loaded
  this.initTimeout = window.setTimeout(() => {
    this.injectAllCommentButtons();

    // If no comments found, try again after a longer delay
    const commentItems = document.querySelectorAll('.comment-item');
    if (commentItems.length === 0) {
      console.log('⚠️ [CommentEnhancer] No comments found, retrying in 2 seconds...');
      setTimeout(() => {
        this.injectAllCommentButtons();
      }, 2000);
    }
  }, 1000); // Wait 1 second for initial load
}
```

### Message Flow

1. **User click nút AI Chat**
2. **CommentEnhancer** extract comment data
3. **Content Script** nhận message `LOAD_COMMENT_CONTEXT`
4. **ChatbotAsidePanel** gửi message `GET_COMMENT_CONTEXT` với unique ID
5. **Content Script** proxy message đến background script
6. **Background Script** gọi Backlog API để lấy comment details và previous comments
7. **Content Script** nhận response và gửi `COMMENT_CONTEXT_RESPONSE` về ChatbotAsidePanel
8. **ChatbotAsidePanel** hiển thị badge UI và focus textarea
9. **User type message** → Comment context được include khi gửi

## 🔧 Integration Points

### Content Script Integration

```typescript
// Trong BacklogAIInjector
private setupCommentEnhancer(): void {
  try {
    this.commentEnhancer = new CommentEnhancer();
  } catch (error) {
    console.error('❌ [Content] Error setting up comment enhancer:', error);
  }
}

// Message handling
case 'OPEN_CHATBOX_WITH_COMMENT':
  this.handleOpenChatboxWithComment(event.data.data);
  break;

case 'OPEN_CHATBOT_PANEL':
  this.openChatbotPanel();
  break;
```

### Chatbot Integration

```typescript
// Trong ChatbotAsidePanel
else if (event.data.type === 'COMMENT_CONTEXT_LOADED') {
  const commentData = event.data.data;

  // Create message with comment context
  const commentMessage = `Tôi muốn thảo luận về comment này:\n\n**Tác giả:** ${commentData.author}\n**Ngày:** ${commentData.date}\n**Nội dung:**\n${commentData.text}\n\nBạn có thể giúp tôi phân tích hoặc trả lời comment này không?`;

  // Add message and auto-send
  setMessages(prev => [...prev, newMessage]);
  handleSendMessage(commentMessage, 'user');
}
```

### API Integration

```typescript
// Background Script - API calls
private async getCommentDetails(spaceInfo: { spaceName: string; domain: string }, issueKey: string, commentId: string): Promise<any | null> {
  // Get Backlog API configuration
  const backlogConfig = await this.getCurrentBacklogConfig();

  const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
  const commentUrl = `${baseUrl}/issues/${issueKey}/comments/${commentId}?apiKey=${encodeURIComponent(backlogConfig.apiKey)}`;
  // GET https://sontd.backlog.com/api/v2/issues/IBL-6/comments/10?apiKey=xxx
}

private async getPreviousComments(spaceInfo: { spaceName: string; domain: string }, issueKey: string, maxId: string, count: number = 2): Promise<any[] | null> {
  // Get Backlog API configuration
  const backlogConfig = await this.getCurrentBacklogConfig();

  const baseUrl = `https://${spaceInfo.spaceName}.${spaceInfo.domain}/api/v2`;
  const commentsUrl = `${baseUrl}/issues/${issueKey}/comments?apiKey=${encodeURIComponent(backlogConfig.apiKey)}&order=desc&count=${count}&maxId=${maxId}`;
  // GET https://sontd.backlog.com/api/v2/issues/IBL-6/comments?apiKey=xxx&order=desc&count=2&maxId=10
}
```

## 📊 Data Extraction

### Comment Data Structure

```typescript
interface CommentData {
  id: string;
  text: string;
  author: string;
  date: string;
  url: string;
  element: string; // HTML for context
}
```

### Extraction Logic

```typescript
private extractCommentData(commentItem: HTMLElement): any {
  // Extract comment text
  const commentText = commentItem.querySelector('.comment-item__text')?.textContent?.trim() || '';

  // Extract comment author
  const authorElement = commentItem.querySelector('.comment-item__author');
  const author = authorElement?.textContent?.trim() || '';

  // Extract comment date
  const dateElement = commentItem.querySelector('.comment-item__date');
  const date = dateElement?.textContent?.trim() || '';

  // Extract comment ID
  const commentId = commentItem.dataset.id || '';

  return {
    id: commentId,
    text: commentText,
    author: author,
    date: date,
    url: commentUrl,
    element: commentItem.outerHTML
  };
}
```

## 🎨 UI/UX Design

### Button Design
- **Size**: 28x28px (absolute positioned)
- **Position**: top: 75px, left: 32px
- **Style**: Transparent background with icon only
- **Hover Effect**: Scale 1.1 with shadow
- **Transition**: Smooth 0.15s ease-in-out

### Highlight Functionality
- **Trigger**: Hover vào button AI Chat
- **Target**: `.js_comment-container` hoặc comment item
- **Effect**: Background và outline màu xanh lá (#40ce9f4f)
- **Auto-remove**: Khi ngưng hover button

### Badge UI Design
- **Background**: Light blue (#f0f8ff) với border blue (#007acc)
- **Content**: Icon 💬 + Comment ID và author name
- **Remove Button**: X button với hover effect
- **Position**: Above textarea input area
- **Responsive**: Text overflow với ellipsis

### Responsive Design
```scss
@media (max-width: 768px) {
  .ai-ext-comment-chat-btn {
    font-size: 11px;
    padding: 3px 6px;
  }

  .ai-ext-comment-chat-btn img {
    width: 12px;
    height: 12px;
  }
}
```

### Placement Strategy
1. **Primary**: Insert vào `.comment-item__actions`
2. **Fallback**: Append vào cuối comment item
3. **Avoid**: Không inject nếu đã có button

## 🔄 Lifecycle Management

### Initialization
```typescript
// Trong BacklogAIInjector.init()
if (this.isTicketPage()) {
  this.setupChatbot();
  this.setupCommentEnhancer(); // ✅ Mới thêm
}
```

### Cleanup
```typescript
// Trong BacklogAIInjector.cleanup()
if (this.commentEnhancer) {
  try {
    this.commentEnhancer.destroy();
    this.commentEnhancer = null;
  } catch (error) {
    console.error('Error disposing comment enhancer:', error);
  }
}
```

## 🧪 Testing

### Test File
- **File**: `test-comment-enhancer.html`
- **Purpose**: Test UI và functionality
- **Features**:
  - Mock comment structure
  - Test button injection
  - Test hover behavior
  - Test responsive design

### Test Scenarios
1. **Basic Functionality**
   - Hover vào comment → nút hiện
   - Click nút → chatbot mở
   - Context được load đúng

2. **Dynamic Comments**
   - Thêm comment mới → nút tự động xuất hiện
   - MutationObserver hoạt động đúng

3. **Responsive Design**
   - Mobile view → button size nhỏ hơn
   - Touch-friendly interaction

4. **Error Handling**
   - Comment structure khác → fallback
   - Network errors → graceful degradation

## 🚀 Performance Considerations

### Optimization Strategies
1. **Lazy Initialization**: Chỉ init khi cần
2. **Debounced Observer**: Tránh spam mutations
3. **Memory Management**: Cleanup observers và timeouts
4. **CSS Optimization**: Styles được load từ content.scss

### Memory Usage
- **Observer**: 1 instance per page
- **Buttons**: ~1KB per comment
- **Event Listeners**: Cleanup on destroy
- **Timeouts**: Properly cleared on destroy

## 🔮 Future Enhancements

### Potential Improvements
1. **Keyboard Shortcuts**: Ctrl+Click để mở AI chat
2. **Batch Processing**: Xử lý nhiều comments cùng lúc
3. **Smart Suggestions**: AI gợi ý reply dựa trên comment
4. **Comment Analytics**: Thống kê tương tác với AI

### Configuration Options
1. **Enable/Disable**: User có thể tắt feature
2. **Custom Styling**: User có thể customize CSS
3. **Keyboard Shortcuts**: Configurable shortcuts
4. **Auto-Reply**: Tự động generate reply

## 📝 Changelog

### v1.0.3 - Comment Context Integration
- ✅ Changed flow from auto-send to open chatbox and focus textarea
- ✅ Added API calls to get comment details and previous comments
- ✅ Added comment context badge UI with remove functionality
- ✅ Integrated comment context into message sending
- ✅ Enhanced user experience with visual feedback
- ✅ Fixed message flow: ChatbotAsidePanel → Content Script → Background Script
- ✅ Added proper message ID handling and response pattern
- ✅ Fixed Backlog config retrieval using getCurrentBacklogConfig()

### v1.0.2 - Highlight Feature
- ✅ Added highlight functionality for comment containers
- ✅ Hover button to highlight comment container with green background
- ✅ Auto-remove highlight when mouse leaves button
- ✅ Updated button positioning and styling
- ✅ Enhanced user experience with visual feedback

### v1.0.1 - Bug Fixes & Improvements
- ✅ Moved CSS to content.scss instead of dynamic injection
- ✅ Improved timing for comment injection with retry mechanism
- ✅ Simplified selectors to use only class names
- ✅ Added proper timeout cleanup in destroy method
- ✅ Enhanced error handling and logging

### v1.0.0 - Initial Implementation
- ✅ Basic comment enhancer functionality
- ✅ Hover-to-show button design
- ✅ Integration with existing chatbot
- ✅ Responsive design support
- ✅ MutationObserver for dynamic comments
- ✅ Error handling and cleanup
- ✅ Test file for validation

## 🎯 Kết luận

Comment Enhancer đã được implement thành công với:
- **UI/UX**: Intuitive và responsive
- **Integration**: Seamless với existing chatbot
- **Performance**: Optimized và memory-safe
- **Maintainability**: Clean code structure với CSS trong file riêng
- **Testability**: Comprehensive test coverage
- **Timing**: Robust timing strategy cho comment loading

Feature này sẽ giúp người dùng tương tác với AI một cách tự nhiên hơn khi làm việc với comments trong Backlog.

### Message Types

```typescript
// Comment Enhancer → Content Script
window.postMessage({
  type: 'LOAD_COMMENT_CONTEXT',
  data: commentData
}, '*');

// ChatbotAsidePanel → Content Script
window.postMessage({
  type: 'GET_COMMENT_CONTEXT',
  id: messageId,
  data: {
    spaceInfo,
    issueKey,
    commentId: commentData.id
  }
}, '*');

// Content Script → Background Script
chrome.runtime.sendMessage({
  action: 'getCommentContext',
  data: commentData
});

// Content Script → ChatbotAsidePanel
window.postMessage({
  type: 'COMMENT_CONTEXT_RESPONSE',
  id: messageId,
  success: response.success,
  data: response.data,
  error: response.error
}, '*');
```
