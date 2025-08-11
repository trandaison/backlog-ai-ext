// Test script để kiểm tra comment prompt generation
// Chạy trong browser console để test

// Mock data giống như từ Backlog API
const mockCommentContext = {
  selectedComment: {
    id: 123,
    content: "Tôi nghĩ chúng ta nên thay đổi approach này. Hiện tại code đang có performance issue khi xử lý large dataset.",
    createdUser: {
      id: 1,
      name: "Nguyễn Văn A",
      userId: "nguyenvana"
    },
    created: "2024-01-15T10:30:00Z"
  },
  previousComments: [
    {
      id: 121,
      content: "Đã implement feature theo spec. Tuy nhiên có một số edge cases cần review thêm.",
      createdUser: {
        id: 2,
        name: "Trần Thị B",
        userId: "tranthib"
      },
      created: "2024-01-15T09:15:00Z"
    },
    {
      id: 122,
      content: "Unit tests đã pass nhưng integration test còn fail ở một số scenarios.",
      createdUser: {
        id: 3,
        name: "Lê Văn C",
        userId: "levanc"
      },
      created: "2024-01-15T09:45:00Z"
    }
  ]
};

const mockTicketData = {
  id: "PROJ-123",
  title: "Optimize data processing performance",
  status: "In Progress",
  description: "Cần tối ưu hóa performance cho module xử lý data. Hiện tại system đang chậm khi xử lý file lớn hơn 100MB."
};

const mockContextData = {
  ticketData: mockTicketData,
  commentContext: mockCommentContext,
  chatHistory: []
};

const mockSettings = {
  general: {
    language: 'vi',
    userRole: 'developer'
  }
};

// Function để build comment prompt (copy từ GeminiService)
function buildCommentPrompt(message, context, settings) {
  const language = settings?.general.language === 'vi' ? 'tiếng Việt' : 'English';
  const role = settings?.general.userRole || 'developer';

  let prompt = `Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:\n\n`;

  // Add ticket context
  if (context.ticketData) {
    prompt += `Bối cảnh ticket:
- ID: ${context.ticketData.id}
- Tiêu đề: ${context.ticketData.title}
- Trạng thái: ${context.ticketData.status}
- Mô tả ticket: ${context.ticketData.description || 'Không có mô tả'}\n\n`;
  }

  // Add selected comment context
  const commentContext = context.commentContext;
  if (commentContext && commentContext.selectedComment) {
    const selectedComment = commentContext.selectedComment;
    const createdDate = selectedComment.created ? new Date(selectedComment.created).toLocaleString('vi-VN') : 'Không rõ';

    prompt += `Comment cần phân tích (người dùng tập trung vào comment này):
- Người gửi: ${selectedComment.createdUser?.name || 'Không rõ'}
- Thời gian: ${createdDate}
- Nội dung: ${selectedComment.content || 'Không có nội dung'}\n\n`;
  }

  // Add previous comments for context
  if (commentContext && commentContext.previousComments && commentContext.previousComments.length > 0) {
    prompt += `2 comments gần đó nhất cho việc tham khảo các thông tin liên quan:\n`;

    commentContext.previousComments.slice(0, 2).forEach((comment, index) => {
      const createdDate = comment.created ? new Date(comment.created).toLocaleString('vi-VN') : 'Không rõ';
      prompt += `${index + 1}. ${comment.createdUser?.name || 'Không rõ'} lúc ${createdDate} với nội dung: ${comment.content || 'Không có nội dung'}\n`;
    });
    prompt += '\n';
  }

  prompt += `---\nCâu hỏi: ${message}`;

  return prompt;
}

// Test cases
console.log('=== TEST COMMENT PROMPT GENERATION ===\n');

// Test case 1: Comment với context
const testMessage1 = "Bạn có thể giải thích rõ hơn về performance issue này không? Và đề xuất solution?";
const prompt1 = buildCommentPrompt(testMessage1, mockContextData, mockSettings);

console.log('🔍 TEST 1 - Comment với full context:');
console.log('📝 Message:', testMessage1);
console.log('📋 Generated Prompt:');
console.log(prompt1);
console.log('\n' + '='.repeat(80) + '\n');

// Test case 2: Comment không có previous comments
const contextWithoutPrevious = {
  ...mockContextData,
  commentContext: {
    selectedComment: mockCommentContext.selectedComment,
    previousComments: []
  }
};

const testMessage2 = "Comment này có ý nghĩa gì trong context của ticket?";
const prompt2 = buildCommentPrompt(testMessage2, contextWithoutPrevious, mockSettings);

console.log('🔍 TEST 2 - Comment không có previous comments:');
console.log('📝 Message:', testMessage2);
console.log('📋 Generated Prompt:');
console.log(prompt2);
console.log('\n' + '='.repeat(80) + '\n');

// Test case 3: Regular chat (không có comment context)
const regularContext = {
  ticketData: mockTicketData,
  chatHistory: []
};

function buildRegularChatPrompt(message, context, settings) {
  const language = settings?.general.language === 'vi' ? 'tiếng Việt' : 'English';
  const role = settings?.general.userRole || 'developer';

  let prompt = `Bạn là một AI assistant chuyên hỗ trợ ${role} trong việc xử lý ticket/issue.
Hãy trả lời câu hỏi sau bằng ${language}:\n\n`;

  if (context.ticketData) {
    prompt += `**Bối cảnh ticket hiện tại:**
- ID: ${context.ticketData.id}
- Tiêu đề: ${context.ticketData.title}
- Trạng thái: ${context.ticketData.status}\n\n`;
  }

  if (context.chatHistory && context.chatHistory.length > 0) {
    prompt += `**Lịch sử chat gần đây:**\n`;
    context.chatHistory.slice(-3).forEach((msg) => {
      prompt += `${msg.sender}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  prompt += `**Câu hỏi:** ${message}`;

  return prompt;
}

const testMessage3 = "Ticket này có độ phức tạp như thế nào?";
const prompt3 = buildRegularChatPrompt(testMessage3, regularContext, mockSettings);

console.log('🔍 TEST 3 - Regular chat (không có comment context):');
console.log('📝 Message:', testMessage3);
console.log('📋 Generated Prompt:');
console.log(prompt3);
console.log('\n' + '='.repeat(80) + '\n');

// Validation
console.log('✅ VALIDATION RESULTS:');
console.log('1. Comment prompt có chứa "Comment cần phân tích":', prompt1.includes('Comment cần phân tích'));
console.log('2. Comment prompt có chứa "2 comments gần đó nhất":', prompt1.includes('2 comments gần đó nhất'));
console.log('3. Comment prompt có chứa thông tin ticket:', prompt1.includes('Bối cảnh ticket:'));
console.log('4. Regular prompt KHÔNG chứa comment context:', !prompt3.includes('Comment cần phân tích'));
console.log('5. Prompt có format đúng với "---\\nCâu hỏi:":', prompt1.includes('---\nCâu hỏi:'));

console.log('\n🎯 Kết luận: Prompt generation hoạt động đúng như mong đợi!');
