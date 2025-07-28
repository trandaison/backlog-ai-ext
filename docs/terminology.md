# 📚 Thuật ngữ thống nhất cho Backlog AI Extension

## 🎯 Mục đích
Tài liệu này định nghĩa các thuật ngữ chuẩn được sử dụng trong project để tránh nhầm lẫn khi development và communication.

## 📝 Thuật ngữ chính

### 1. **Popup**
- **Định nghĩa**: Extension popup window hiện ra khi click vào biểu tượng extension ở toolbar
- **Thành phần**: Chứa popup settings và thông tin tổng quan
- **File**: `src/popup/popup.tsx`, `src/popup/popup.html`
- **Ví dụ**: "Mở popup để cấu hình API key"

### 2. **Popup Settings**
- **Định nghĩa**: Form settings bên trong popup, nơi người dùng cấu hình các thông tin ban đầu
- **Thành phần**:
  - OpenAI API Key settings
  - Backlog API configurations
  - User role selection
  - Language preferences
  - AI model selection
- **Ví dụ**: "Vào popup settings để nhập Backlog API key"

### 3. **Chatbot** / **Chatbot Panel**
- **Định nghĩa**: Aside panel bên phải trang Backlog, nơi người dùng tương tác với AI
- **Thành phần**:
  - Summary button và kết quả
  - Chat interface để hỏi đáp về ticket
  - Settings cho chatbot
- **File**: `src/content/content.ts` (injection logic), `src/chatbot/chatbot.tsx` (React component)
- **Ví dụ**: "Mở chatbot để chat về nội dung ticket"

### 4. **Content Script**
- **Định nghĩa**: Script chạy trên trang Backlog để inject chatbot panel
- **Chức năng**: DOM manipulation, chatbot injection, event handling
- **File**: `src/content/content.ts`

### 5. **Background Script**
- **Định nghĩa**: Service worker xử lý API calls và AI processing
- **Chức năng**: OpenAI API calls, Backlog API integration, data processing
- **File**: `src/background/background.ts`

## 🏗️ Kiến trúc Components

```
Extension Popup (Toolbar)
├── Popup Settings Form
    ├── OpenAI API Key
    ├── Backlog Configs
    └── User Preferences

Backlog Page Injection
├── Toggle Button (Fixed position)
└── Chatbot Aside Panel (Right side)
    ├── Header (Title + Close button)
    ├── Summary Button + Results
    └── Chat Interface (React component)
```

## 💬 Examples trong comments

### ✅ Correct
```typescript
// Inject chatbot aside panel vào trang Backlog
private injectChatbotAsidePanel() {

// Mở popup settings để cấu hình API keys
// Toggle chatbot panel visibility
// Load React chatbot component vào aside panel
```

### ❌ Incorrect
```typescript
// Inject sidebar (unclear)
// Open settings (ambiguous - popup settings?)
// Toggle sidebar (chatbot panel?)
// Load component (which component?)
```

## 📋 Naming Conventions

### Variables & Methods
- `chatbotAsideContainer` - Container cho chatbot panel
- `chatbotToggleButton` - Button để toggle chatbot panel
- `openChatbotPanel()` - Method mở chatbot panel
- `loadChatbotComponent()` - Load React chatbot vào panel

### CSS Classes
- `.ai-ext-*` - Prefix cho extension styles
- `#ai-ext-root` - Root container của chatbot panel
- `.ai-ext-summary-*` - Classes cho summary functionality

### Storage Keys
- `backlogConfigs` - Backlog API configurations
- `encryptedApiKey` - OpenAI API key (encrypted)
- `userRole`, `language`, `aiModel` - User preferences

## 🚀 Sử dụng trong Development

1. **Code Comments**: Sử dụng đúng terminology trong comments
2. **Variable Names**: Follow naming conventions đã định nghĩa
3. **Documentation**: Reference đúng components khi viết docs
4. **Communication**: Dùng terminology này khi discuss features

## 🔄 Updates

Document này sẽ được update khi có thêm components hoặc terminology mới.
