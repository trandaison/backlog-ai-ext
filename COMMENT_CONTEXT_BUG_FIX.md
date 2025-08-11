# 🐛 Comment Context Bug Fix

## 📋 Vấn đề

`commentContext` trong `contextData` của hàm `processUserMessage` đang bị undefined mặc dù user đã chọn comment.

## 🔍 Root Cause Analysis

Sau khi trace flow từ đầu đến cuối, tôi phát hiện vấn đề ở **Content Script**:

### Flow hiện tại:
1. ✅ **CommentEnhancer** → Extract comment data và gửi `LOAD_COMMENT_CONTEXT`
2. ✅ **ChatbotAsidePanel** → Nhận comment data, gọi API, set `commentContext` state
3. ✅ **ChatbotAsidePanel** → Include `commentContext` trong `contextData` khi gửi message
4. ❌ **Content Script** → **KHÔNG** truyền `commentContext` vào `fullContextData`
5. ❌ **Background Script** → Nhận `commentContext = undefined`

### Vấn đề cụ thể:

Trong `src/content/content.ts`, hàm `handleChatMessage()`:

```typescript
// ❌ BEFORE - Missing commentContext
const fullContextData = {
  message: contextData.message,
  messageType: contextData.messageType || 'user',
  ticketData: finalTicketData,
  chatHistory: contextData.chatHistory || [],
  userInfo: contextData.userInfo,
  currentModel: contextData.currentModel,
  ticketId: finalTicketData?.id || finalTicketData?.key,
  ticketUrl: window.location.href,
  timestamp: contextData.timestamp || new Date().toISOString(),
  attachments: contextData.attachments || []
  // commentContext: contextData.commentContext // ← MISSING!
};
```

## ✅ Bug Fix

### 1. **Fixed Content Script** (`src/content/content.ts`)

```typescript
// ✅ AFTER - Added commentContext
const fullContextData = {
  message: contextData.message,
  messageType: contextData.messageType || 'user',
  ticketData: finalTicketData,
  chatHistory: contextData.chatHistory || [],
  userInfo: contextData.userInfo,
  currentModel: contextData.currentModel,
  ticketId: finalTicketData?.id || finalTicketData?.key,
  ticketUrl: window.location.href,
  timestamp: contextData.timestamp || new Date().toISOString(),
  attachments: contextData.attachments || [],
  commentContext: contextData.commentContext // ✅ ADDED!
};
```

### 2. **Added Debug Logging**

#### ChatbotAsidePanel:
```typescript
console.log('🔍 [ChatbotAsidePanel] Sending contextData with commentContext:', {
  hasCommentContext: !!commentContext,
  commentContext: commentContext
});
```

#### Content Script:
```typescript
console.log('📤 [Content] Sending to background:', {
  action: 'processUserMessage',
  messageType: fullContextData.messageType,
  hasTicketData: !!fullContextData.ticketData,
  chatHistoryLength: fullContextData.chatHistory.length,
  hasCommentContext: !!fullContextData.commentContext, // ✅ ADDED
  commentContext: fullContextData.commentContext // ✅ ADDED
});
```

#### Background Script (already existed):
```typescript
console.log('🔍 [Background] handleUserMessage commentContext:', !!commentContext);
```

#### AI Services (already existed):
```typescript
console.log('🔎 ~ GeminiService ~ processUserMessage ~ contextData:', contextData);
console.log('🔍 [Gemini] Final prompt being sent to AI:', finalPrompt);
```

## 🧪 Testing & Debugging

### 1. **Debug Script** (`debug-comment-context.js`)
- Kiểm tra comment enhancer hoạt động
- Test comment context loading flow
- Simulate AI button click
- Check URL patterns và issue key extraction

### 2. **Console Logs để Track**
```javascript
// Expected flow khi user click comment AI button:
// 1. CommentEnhancer extracts comment data
// 2. ChatbotAsidePanel loads comment context via API
// 3. User types message
// 4. ChatbotAsidePanel: "🔍 Sending contextData with commentContext: { hasCommentContext: true, ... }"
// 5. Content Script: "📤 Sending to background: { hasCommentContext: true, ... }"
// 6. Background Script: "🔍 handleUserMessage commentContext: true"
// 7. AI Service: "🔎 processUserMessage contextData: { commentContext: {...} }"
// 8. AI Service: "🔍 Final prompt being sent to AI: [comment-focused prompt]"
```

## ✅ Validation

### Before Fix:
```javascript
// Background Script
console.log('commentContext:', undefined); // ❌

// AI Service
if (contextData.commentContext) { // ❌ false
  // Comment prompt never executed
}
```

### After Fix:
```javascript
// Background Script
console.log('commentContext:', { selectedComment: {...}, previousComments: [...] }); // ✅

// AI Service
if (contextData.commentContext) { // ✅ true
  finalPrompt = this.buildCommentPrompt(message, contextData, settings); // ✅ Executed
}
```

## 🎯 Expected Result

Sau khi fix:

1. **User click comment AI button** → Comment context được load
2. **User type message** → Comment context được truyền đúng cách
3. **AI Service** → Detect comment context và build comment-focused prompt
4. **AI Response** → Với full context về comment và ticket

### Sample Prompt Output:
```
Bạn là một AI assistant chuyên hỗ trợ developer trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng tiếng Việt:

Bối cảnh ticket:
- ID: PROJ-123
- Tiêu đề: Fix performance issue
- Trạng thái: In Progress
- Mô tả ticket: System slow when processing large files

Comment cần phân tích (người dùng tập trung vào comment này):
- Người gửi: Nguyễn Văn A
- Thời gian: 15/1/2024, 10:30:00
- Nội dung: Tôi nghĩ chúng ta nên thay đổi approach này...

2 comments gần đó nhất cho việc tham khảo các thông tin liên quan:
1. Trần Thị B lúc 15/1/2024, 09:15:00 với nội dung: Đã implement feature theo spec...
2. Lê Văn C lúc 15/1/2024, 09:45:00 với nội dung: Unit tests đã pass nhưng...

---
Câu hỏi: Bạn có thể giải thích performance issue này không?
```

## 🚀 Status

- [x] **Root cause identified**: Missing `commentContext` in Content Script
- [x] **Bug fixed**: Added `commentContext` to `fullContextData`
- [x] **Debug logging added**: Full flow tracking
- [x] **Test script created**: `debug-comment-context.js`
- [x] **Documentation updated**: This bug fix report

Bug đã được fix và ready for testing!
