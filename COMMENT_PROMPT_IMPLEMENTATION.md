# 🧠 Comment Prompt Enhancement Implementation

## 📋 Tổng quan

Đã cải thiện prompt generation cho chức năng Comment Selection để AI có thể hiểu và phân tích comment context một cách tốt hơn.

## ✨ Thay đổi chính

### 1. **GeminiService.ts**
- ✅ Thêm `buildCommentPrompt()` method
- ✅ Cập nhật `processUserMessage()` để detect comment context
- ✅ Thêm logging để review prompt trước khi gửi AI
- ✅ Tách biệt logic xử lý comment vs regular chat

### 2. **OpenAIService.ts**
- ✅ Thêm `buildCommentPrompt()` method (tương tự GeminiService)
- ✅ Cập nhật `processUserMessage()` để detect comment context
- ✅ Thêm `buildChatPrompt()` method cho regular chat
- ✅ Thêm logging để review prompt trước khi gửi AI

### 3. **Background Script (background.ts)**
- ✅ Cập nhật `handleUserMessage()` để truyền `commentContext`
- ✅ Đảm bảo comment context được preserve trong optimized flow
- ✅ Thêm logging để track comment context

### 4. **ChatbotAsidePanel.tsx**
- ✅ Comment context đã được include trong `contextData` khi gửi message
- ✅ Flow hoàn chỉnh: Comment selection → API call → Context loading → Message sending

## 🎯 Prompt Template Mới

### Khi có Comment Context:
```
Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:

Bối cảnh ticket:
- ID: ${ticketData.id}
- Tiêu đề: ${ticketData.title}
- Trạng thái: ${ticketData.status}
- Mô tả ticket: ${ticketData.description}

Comment cần phân tích (người dùng tập trung vào comment này):
- Người gửi: ${selectedComment.createdUser.name}
- Thời gian: ${createdDate}
- Nội dung: ${selectedComment.content}

2 comments gần đó nhất cho việc tham khảo các thông tin liên quan:
1. ${comment1.createdUser.name} lúc ${comment1.created} với nội dung: ${comment1.content}
2. ${comment2.createdUser.name} lúc ${comment2.created} với nội dung: ${comment2.content}

---
Câu hỏi: ${userMessage}
```

### Khi không có Comment Context:
```
Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:

**Bối cảnh ticket hiện tại:**
- ID: ${ticketData.id}
- Tiêu đề: ${ticketData.title}
- Trạng thái: ${ticketData.status}

**Lịch sử chat gần đây:**
${chatHistory}

**Câu hỏi:** ${userMessage}
```

## 🔄 Message Flow

1. **User click comment AI button** → CommentEnhancer extracts comment data
2. **Content script** → Calls background script API để lấy comment details + previous comments
3. **ChatbotAsidePanel** → Receives comment context và hiển thị badge
4. **User types message** → Comment context được include trong contextData
5. **Background script** → Detects comment context và truyền vào AI service
6. **AI Service** → Builds appropriate prompt (comment vs regular)
7. **AI Response** → Với full context về comment và ticket

## 🧪 Testing

Tạo file `test-comment-prompt.js` để test prompt generation:

```javascript
// Test với mock data
const mockCommentContext = {
  selectedComment: { ... },
  previousComments: [ ... ]
};

// Kiểm tra prompt output
const prompt = buildCommentPrompt(message, context, settings);
console.log('Generated Prompt:', prompt);
```

## 📊 Logging & Debugging

### Console Logs để track:
```javascript
// GeminiService & OpenAIService
console.log('🔍 [Gemini/OpenAI] Final prompt being sent to AI:', finalPrompt);

// Background Script
console.log('🔍 [Background] handleUserMessage commentContext:', !!commentContext);

// ChatbotAsidePanel
console.log('✅ [ChatbotAsidePanel] Comment context loaded:', response.data);
```

## ✅ Validation Checklist

- [x] Comment context được detect đúng cách
- [x] Prompt template theo đúng format yêu cầu
- [x] Previous comments được include (tối đa 2)
- [x] Ticket context được preserve
- [x] Regular chat vẫn hoạt động bình thường
- [x] Logging đầy đủ để debug
- [x] Cả OpenAI và Gemini đều support
- [x] Date formatting theo locale vi-VN

## 🎯 Kết quả mong đợi

### Trước khi cải thiện:
- AI chỉ nhận được user message đơn thuần
- Không có context về comment cụ thể
- Phải đoán ý nghĩa từ message

### Sau khi cải thiện:
- AI nhận được full context về comment được chọn
- Có thông tin về 2 comments trước đó để tham khảo
- Hiểu rõ ticket context và comment relationship
- Có thể đưa ra phân tích chính xác và đề xuất phù hợp

## 🚀 Next Steps

1. **Monitor logs** để đảm bảo prompt được build đúng
2. **Test với real data** trên Backlog
3. **Fine-tune prompt** dựa trên feedback
4. **Add more context** nếu cần (như comment attachments, mentions, etc.)

## 📝 Example Usage

```javascript
// User clicks comment AI button
// → Comment context loaded: { selectedComment: {...}, previousComments: [...] }

// User types: "Bạn có thể giải thích performance issue này không?"
// → AI receives full prompt with comment context
// → AI responds with specific analysis about the comment and suggestions
```

Prompt enhancement này sẽ giúp AI hiểu rõ hơn về context và đưa ra responses chính xác hơn khi người dùng tương tác với specific comments.
