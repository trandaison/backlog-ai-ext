# Translate Command Implementation

## Overview
Improve chức năng dịch ngôn ngữ bằng cách cho phép người dùng lựa chọn ngôn ngữ nguồn và ngôn ngữ đích từ modal trước khi thực hiện dịch.

## ✅ Implementation Status
**COMPLETED**: Translate command feature with modal UI, dependency injection pattern, and smooth animations.

## 🛠️ Implementation Details

### Architecture Decisions

#### 1. Dependency Injection Pattern
**Problem**: Webpack dynamic imports cause bundle splitting issues in Chrome extensions.
**Solution**: Implemented dependency injection pattern to avoid dynamic imports.

```typescript
// TranslateModal.tsx - Uses dependency injection with fallback
interface TranslateModalProps {
  Modal?: React.ComponentType<ModalProps>; // Optional injected Modal
  // ... other props
}

function TranslateModal({ Modal: InjectedModal, ...props }: TranslateModalProps) {
  if (InjectedModal) {
    return <InjectedModal>{/* content */}</InjectedModal>;
  }
  // Fallback: self-contained modal implementation
  return <div className="ai-ext-chatbox-modal">{/* content */}</div>;
}
```

#### 2. Modal Scoping Strategy
**Requirement**: Modal should be scoped to chatbox only, not full page.
**Implementation**:
- Used `position: absolute` instead of `position: fixed`
- Applied to chatbox container with `position: relative`
- Ensures modal stays within chatbox boundaries

#### 3. Animation System
**Approach**: CSS-based transitions with React state management
- **States**: entering → entered → exiting → exited
- **Animations**: Fade in/out with opacity transitions (zoom removed for simplicity)
- **Duration**: 300ms with cubic-bezier easing

### File Structure

```
src/
├── configs/
│   ├── commands.ts          # Command definitions (/translate, future commands)
│   └── index.ts            # Export point for configurations
├── shared/
│   ├── Modal.tsx           # Reusable modal component with animations
│   └── TranslateModal.tsx  # Translate-specific modal with dependency injection
└── content/
    └── sidebar.scss        # Modal styling with scoped positioning and animations
```

### Key Implementation Files

#### 1. Modal Component (`src/shared/Modal.tsx`)
- **Purpose**: Reusable modal with animation state management
- **Features**:
  - Animation states (entering/entered/exiting/exited)
  - Configurable backdrop click behavior
  - Accessible with proper focus management
  - Scoped positioning for chatbox containment

#### 2. TranslateModal Component (`src/shared/TranslateModal.tsx`)
- **Purpose**: Translate-specific modal using dependency injection
- **Features**:
  - Language selection dropdowns (source → target)
  - Command preview (`/translate ja -> vi`)
  - Form validation and error handling
  - Fallback modal implementation when Modal component unavailable

#### 3. Command Configuration (`src/configs/commands.ts`)
- **Purpose**: Centralized command definitions
- **Structure**:
```typescript
export const COMMANDS = {
  TRANSLATE: {
    name: '/translate',
    pattern: /^\/translate\s+([a-z]{2})\s*->\s*([a-z]{2})$/i,
    description: 'Translate ticket content between languages'
  }
  // Future commands will be added here
};
```

#### 4. Styling System (`src/content/sidebar.scss`)
- **Scoped Modal**: `.ai-ext-chatbox-modal` for chatbox-only positioning
- **Animation Classes**: `.ai-ext-modal-entering`, `.ai-ext-modal-entered`, `.ai-ext-modal-exiting`
- **Responsive Design**: Compact sizing optimized for sidebar context

## 🎯 Usage Flow

1. **Trigger**: User selects "Dịch nội dung" from Quick Actions dropdown
2. **Modal Display**: TranslateModal opens with dependency injection
3. **Language Selection**: User chooses source and target languages from dropdowns
4. **Command Preview**: Real-time preview shows `/translate ja -> vi` format
5. **Execution**: "OK" button sends command message to chat
6. **Processing**: Command parser identifies translate pattern and builds AI prompt

## 🔧 Technical Considerations

### Animation Performance
- **CSS Transitions**: Preferred over JavaScript animations for performance
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Smooth UX**: 300ms duration provides good balance between speed and smoothness

### Browser Compatibility
- **Chrome Extension**: Tested on Manifest V3 environment
- **CSS Features**: Uses modern CSS with fallbacks for older browsers
- **TypeScript**: Strict type checking for reliability

### Maintenance Benefits
- **Modular Design**: Separate concerns (modal, translate logic, styling)
- **Reusable Components**: Modal component ready for future command modals
- **Configuration-Driven**: Easy to add new commands without code changes
- **Dependency Injection**: Flexible component composition without webpack issues

## 📋 Testing Checklist

✅ Modal opens within chatbox boundaries only
✅ Language dropdowns populate correctly
✅ Command preview updates in real-time
✅ Form validation prevents invalid submissions
✅ Animation states work smoothly
✅ Dependency injection fallback functions correctly
✅ Modal closes on backdrop click and cancel button
✅ Command parsing works with various language codes
✅ Integration with existing chat system

## 🚀 Future Enhancements

- **Language Detection**: Auto-detect source language from ticket content
- **Command History**: Remember recently used language pairs
- **Batch Translation**: Support translating multiple sections
- **Custom Commands**: User-defined translation commands
- **Keyboard Shortcuts**: Quick access to translate modal

## 🛠️ Implementation Steps
## Tạo modal
Yêu cầu:
- Giao diện giống hình ảnh đính kèm, gồm có 2 dropdown để chọn ngôn ngữ nguồn và ngôn ngữ đích, label đơn giản ngắn gọn nằm bên trên các dropdown.
- Phạm vi mở modal là bên trong chatbox, không phải toàn bộ trang.
- Trigger modal bằng cách chọn option "Dịch nội dung" trong Quick Actions dropdown.
- Button Hủy: click sẽ đóng modal và không làm gì cả.
- Button OK: thực hiện gửi message với nội dung tin nhắn là: `/translate ja -> vi` (đây là ví dụ); trong đó "ja" là ngôn ngữ nguồn và "vi" là ngôn ngữ đích, `/translate` là command, command bắt đầu bằng prefix `/`, và `->` là từ khóa thể hiện "from - to";
- Tạo ra một component Modal sao cho có thể tái sử dụng được, sau này sẽ còn một số chức năng cần hiển thị trong modal nên yêu cầu nội dung modal có thể động.

## Xử lý command
Trước khi gửi tin nhắn, hãy thử parse command nếu match với định dạng `/translate <source_lang> -> <target_lang>`, trong đó `<source_lang>` và `<target_lang>` là mã ngôn ngữ ISO 639-1 thì hãy build prompt string từ thông tin đã cung cấp gồm có: thông tin ticket, ngôn ngữ nguồn và ngôn ngữ đích để yêu cầu AI dịch ticket.

Yêu cầu:
- `/translate` chỉ là một trong số các command được thiết kế sẵn, sau này sẽ có thêm các command khác. Do đó hãy tạo file `src/configs/commands.ts` để định nghĩa các command, trong đó có command `/translate`.
