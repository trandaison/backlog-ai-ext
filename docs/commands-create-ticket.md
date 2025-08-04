# Create Ticket Command Implementation

## ✅ Implementation Status
**COMPLETED**: Create Backlog Ticket command feature with modal UI, dropdown selection, and Backlog API integration.

## Overview
Chức năng tạo ticket cho phép người dùng clone ticket hiện tại về một backlog khác, đồng thời dịch nội dung sang ngôn ngữ đích đã chọn.

## 🎯 Key Features Implemented

### ✅ **Modal Interface**
- **Title**: "Tạo Backlog Ticket"
- **Dropdown Selection**: Backlog đích được chọn từ danh sách đã cấu hình
- **Language Selection**: Dropdown chọn ngôn ngữ đích
- **Command Preview**: Hiển thị command trước khi thực thi
- **Validation**: Kiểm tra backlog và ngôn ngữ đã chọn
- **Caching**: Lưu lựa chọn để sử dụng lần sau

### ✅ **Quick Actions Integration**
- **Trigger**: "📋 Tạo Backlog ticket" trong Quick Actions dropdown
- **Command Format**: `/create-ticket <domain> <language>`

### ✅ **Backlog API Integration**
- **Configuration Loading**: Tự động load danh sách backlog từ Options
- **Project Detection**: Tự động lấy thông tin project từ backlog đích
- **API Authentication**: Sử dụng API key đã cấu hình
- **Form-urlencoded**: Đúng format theo Backlog API specification

### ✅ **AI Translation Pipeline**
- **Smart Prompting**: AI dịch và format JSON theo Backlog API
- **Structured Output**: JSON với summary, description, priorityId
- **Original Reference**: Thêm thông tin tham chiếu ticket gốc

## 🛠️ Implementation Details

### File Structure
```
src/
├── configs/
│   └── commands.ts          # Added create-ticket command definition
├── shared/
│   └── CreateTicketModal.tsx # Modal component with dropdown selection
├── content/
│   └── ChatbotAsidePanel.tsx # Updated quick actions
└── background/
    └── background.ts        # Command handling & Backlog API integration
```

### Command Configuration
```typescript
{
  command: 'create-ticket',
  pattern: /^\/create-ticket\s+([\w.-]+\.backlog\.(?:com|jp|tool\.com))\s+([a-z]{2})$/i,
  description: 'Create a new ticket in target backlog with translated content',
  example: '/create-ticket myspace.backlog.com vi',
  requiresModal: true
}
```

### Modal Features
- **Dependency Injection**: Uses Modal component when available, fallback otherwise
- **Configuration Integration**: Loads backlog configs from Chrome storage
- **Real-time Validation**: Checks selected backlog exists in user configurations
- **Error Handling**: Clear error messages for missing configurations

### API Integration Process
1. **Load Configuration**: Get API key for selected backlog domain
2. **Project Discovery**: Query `/api/v2/projects` to get available projects
3. **AI Translation**: Generate JSON payload for ticket creation
4. **Ticket Creation**: POST to `/api/v2/issues` with form-urlencoded data
5. **Response Handling**: Parse response and provide user feedback

### Error Handling
- **Missing Configuration**: Guide user to Options page for API setup
- **API Failures**: Detailed error messages with specific failure reasons
- **Validation Errors**: Real-time form validation with helpful hints

## 📋 Usage Flow

1. **Access**: User clicks "📋 Tạo Backlog ticket" from Quick Actions
2. **Configure**:
   - Select target backlog from dropdown (populated from Options)
   - Choose target language for translation
3. **Preview**: View generated command `/create-ticket domain language`
4. **Execute**: Click "Tạo Ticket" to process
5. **Processing**:
   - Validate backlog configuration exists
   - Get project information from target backlog
   - Use AI to translate and format ticket data
   - Create ticket via Backlog API
   - Show success/error message with ticket link

## 🔧 Configuration Requirements

### Prerequisites
- Backlog API keys configured in Options page
- Target backlog domain must be accessible
- API key must have permission to create issues

### Setup Steps
1. Open extension Options (click extension icon)
2. Navigate to "Backlog API Keys" tab
3. Add API configuration for target backlog:
   - Domain: `myspace.backlog.com`
   - API Key: Your Backlog API key
   - Note: Optional description
4. Test connection to verify configuration

## 🎨 UI/UX Features

### Modal Design
- **Compact Layout**: Optimized for sidebar chatbox
- **Smart Defaults**: Remembers last selected options
- **Progressive Disclosure**: Shows command preview when both fields selected
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation

### Error States
- **Empty Configuration**: Clear guidance to setup API keys
- **Invalid Selection**: Validation with helpful error messages
- **API Errors**: Detailed error information for troubleshooting

## 🚀 Future Enhancements

### Planned Features
- **Project Selection**: Allow user to choose specific project within backlog
- **Issue Type Mapping**: Support different issue types (Task, Bug, etc.)
- **Custom Field Support**: Handle backlog-specific custom fields
- **Bulk Operations**: Create multiple tickets from ticket lists
- **Template System**: Predefined ticket templates

### Advanced Integration
- **Assignee Mapping**: Auto-assign to equivalent users across backlogs
- **Label Migration**: Transfer labels/tags between systems
- **Attachment Handling**: Copy attachments to new tickets
- **Comment Threading**: Maintain comment history references

## Implementation details
1. Thêm command mới `create-ticket` vào danh sách các command trong `src/configs/commands.ts`. Thêm quick action "Create Ticket" vào quick actions dropdown của chatbot.
2. Tạo modal `CreateTicketModal` để người dùng nhập thông tin ticket mới, bao gồm:
- Chọn backlog đích: options từ danh sách các backlog đã cấu hình dưới dạng full domain (ví dụ: myspace.backlog.com)
- Chọn ngôn ngữ đích: options danh sách các ngôn ngữ muốn dịch sang.
3. Trigger: Khi người dùng nhập command `/create-ticket`, mở modal `CreateTicketModal` hoặc khi người dùng chọn quick action "Create Ticket".
4. Command preview: Hiển thị preview command `/create-ticket <target_backlog> <target_lang>` trong modal.
5. Khi người dùng nhấn "OK", gửi message với nội dung command giống với command preview và tiến hành parse command để thực hiện tạo ticket mới.
6. Xử lý command: Trong `src/shared/commandParser.ts`, thêm logic để nhận diện command `/create-ticket` và thực hiện các bước sau:
   - Lấy thông tin ticket hiện tại từ context (title, description, assignee, etc.)
   - Dịch nội dung sang ngôn ngữ đích nếu cần
   - Tạo ticket mới trên backlog đích với thông tin đã dịch bằng API của Backlog, assignee sẽ là người dùng hiện tại.
   - Hiển thị thông báo thành công hoặc lỗi cho người dùng
7. Hiển thị thông báo thành công hoặc lỗi sau khi tạo ticket:
   - Phản hồi lại người dùng đưới dạng tin nhắn trong chatbox.
   - Nếu có lỗi, hiển thị thông báo lỗi chi tiết để người dùng biết nguyên nhân. Đặc biệt là lỗi validation của Backlog API.
   - Nếu thành công, hiển thị nội dung như sau:
    ```
    Đã tạo ticket thành công:
    [TICKET_ID](https://myspace.backlog.com/view/TICKET_ID) <Ticket title>
    ```


Yêu cầu:
- Tạo modal `CreateTicketModal` với các trường nhập liệu cần thiết.
- Tái sử dụng component Modal đã có để hiển thị modal.
- Modal hiển thị compact, gọn gàng bên trong chatbox.
- Thông tin backlog đích và ngôn ngữ đích được cache ở localStorage để tránh phải nhập lại mỗi lần.
