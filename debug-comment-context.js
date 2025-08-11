// Debug script để test comment context flow
// Chạy trong browser console trên trang Backlog ticket

console.log('🔍 Starting comment context debug...');

// Test 1: Kiểm tra comment enhancer có hoạt động không
const commentItems = document.querySelectorAll('.comment-item');
console.log('📝 Found comment items:', commentItems.length);

if (commentItems.length > 0) {
  const firstComment = commentItems[0];
  const aiButton = firstComment.querySelector('.ai-ext-comment-chat-btn');
  console.log('🤖 AI button found on first comment:', !!aiButton);

  if (aiButton) {
    console.log('✅ Comment enhancer is working');

    // Test 2: Simulate click để test comment context loading
    console.log('🖱️ Simulating AI button click...');

    // Listen for comment context messages
    const messageHandler = (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'COMMENT_CONTEXT_LOADED') {
        console.log('✅ Comment context loaded:', event.data.data);
      } else if (event.data.type === 'COMMENT_CONTEXT_RESPONSE') {
        console.log('📨 Comment context response:', event.data);
      } else if (event.data.type === 'CHAT_RESPONSE') {
        console.log('💬 Chat response received:', event.data);
      }
    };

    window.addEventListener('message', messageHandler);

    // Simulate button click
    aiButton.click();

    // Clean up after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      console.log('🧹 Cleaned up message listener');
    }, 10000);

  } else {
    console.log('❌ AI button not found - comment enhancer may not be working');
  }
} else {
  console.log('❌ No comment items found on this page');
}

// Test 3: Check if chatbot panel exists
const chatbotPanel = document.querySelector('#ai-ext-chatbot-aside');
console.log('🤖 Chatbot panel exists:', !!chatbotPanel);

// Test 4: Check if toggle button exists
const toggleButton = document.querySelector('.backlog-ai-toggle');
console.log('🔘 Toggle button exists:', !!toggleButton);

// Test 5: Manual comment context test
function testCommentContext() {
  console.log('🧪 Testing manual comment context...');

  // Mock comment data
  const mockCommentData = {
    id: '123',
    text: 'Test comment content',
    author: 'Test User',
    date: new Date().toISOString(),
    url: window.location.href
  };

  // Send load comment context message
  window.postMessage({
    type: 'LOAD_COMMENT_CONTEXT',
    data: mockCommentData
  }, '*');

  console.log('📤 Sent LOAD_COMMENT_CONTEXT message');
}

// Test 6: Check current URL pattern
const url = window.location.href;
const isTicketPage = /\/view\/[A-Z][A-Z0-9_]*-\d+/.test(url);
console.log('🎫 Current URL:', url);
console.log('✅ Is ticket page:', isTicketPage);

if (isTicketPage) {
  const issueMatch = url.match(/\/view\/([A-Z][A-Z0-9_]*-\d+)/);
  const issueKey = issueMatch ? issueMatch[1] : null;
  console.log('🔑 Issue key:', issueKey);
}

// Export test functions to global scope
window.testCommentContext = testCommentContext;

console.log('🎯 Debug setup complete. Available functions:');
console.log('- testCommentContext(): Test manual comment context loading');
console.log('- Check console for comment enhancer status and flow');
