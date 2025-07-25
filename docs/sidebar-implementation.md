# Sidebar Layout Implementation

## Tổng quan

Phiên bản này đã implement layout sidebar thay vì floating chatbot, tích hợp tốt hơn với giao diện Backlog.

## Thay đổi chính

### 1. Layout mới
- **Trước**: Floating chatbot overlay ở góc phải màn hình
- **Sau**: Sidebar cố định bên phải, tích hợp vào layout của Backlog

### 2. Cấu trúc DOM
```html
#container (Backlog container)
├── #projectNav (Backlog navigation)
├── .content-outer (Backlog main content)
└── aside#ai-ext-root (AI Extension sidebar)
    ├── header (tiêu đề + nút đóng)
    └── #backlog-ai-chatbot-container (React chatbot)
```

### 3. Tính năng mới

#### Sidebar Toggle
- **Toggle Button**: Nút 🤖 cố định ở góc phải để bật/tắt sidebar
- **Animation**: Sidebar slide in/out mượt mà (0.3s ease-in-out)
- **State Management**: Body class `ai-ext-sidebar-open` để quản lý trạng thái

#### Layout Adaptation
- **Content Adjustment**: Tự động điều chỉnh margin của `.content-outer` khi sidebar mở
- **Responsive**: Thích ứng với các kích thước màn hình khác nhau
- **Mobile Support**: Fullscreen overlay trên màn hình nhỏ

#### UI/UX Improvements
- **Header**: Tiêu đề "🤖 AI Assistant" và nút đóng (✕)
- **Close Button**: Hover effects và easy access
- **Z-index Management**: Đảm bảo không conflict với Backlog UI

### 4. CSS Styling

#### Sidebar Styles (sidebar.css)
- Position: Fixed, right side của màn hình
- Width: 400px (responsive: 350px cho màn hình nhỏ)
- Height: Full height minus global nav
- Background: White với border trái
- Transition: Smooth slide animation

#### Responsive Design
```css
/* Desktop */
@media (min-width: 1200px) {
  aside#ai-ext-root { width: 400px; }
}

/* Tablet */
@media (max-width: 1200px) {
  aside#ai-ext-root { width: 350px; }
}

/* Mobile */
@media (max-width: 1024px) {
  aside#ai-ext-root {
    width: 100%;
    + overlay background
  }
}
```

### 5. Technical Implementation

#### Content Script Updates
- **BacklogAIInjector Class**:
  - `asideContainer`: HTMLElement cho sidebar
  - `toggleButton`: HTMLButtonElement cho toggle
  - `openChatbot()`: Mở sidebar + adjust content
  - `closeChatbot()`: Đóng sidebar + reset content

#### Build System
- **Webpack**: Copy sidebar.css vào dist/
- **Manifest**: Include sidebar.css trong content_scripts.css
- **Web Accessible Resources**: sidebar.css available for runtime

#### File Structure
```
src/content/
├── content.ts (updated injection logic)
├── content.css (original styles)
└── sidebar.css (new sidebar styles)
```

### 6. Integration Points

#### Backlog DOM Integration
- **Target**: `#container` element của Backlog
- **Position**: After `#projectNav`, before `.content-outer`
- **CSS Variables**: Sử dụng `--globalNavHeight` của Backlog

#### React Component Loading
- **Dynamic Import**: Async load React chatbot component
- **Error Handling**: Fallback UI nếu load fail
- **Performance**: Lazy loading chỉ khi cần thiết

### 7. User Experience

#### Interaction Flow
1. User click toggle button (🤖)
2. Sidebar slides in từ phải
3. Content area adjust margin để avoid overlap
4. User có thể close bằng nút ✕ hoặc toggle button
5. Sidebar slides out, content area reset

#### Visual Feedback
- **Hover Effects**: Toggle button scale + shadow
- **Active States**: Button press animation
- **Smooth Transitions**: Tất cả animations 0.3s ease-in-out

### 8. Browser Compatibility

#### Chrome Extension Manifest V3
- Service Worker background script
- Content Scripts với CSS injection
- Web Accessible Resources cho dynamic CSS loading

#### Cross-browser CSS
- **Webkit Scrollbars**: Custom styling
- **Flexbox**: Modern layout
- **CSS Variables**: Backlog theme integration

### 9. Performance Considerations

#### Bundle Size
- Sidebar CSS: 2.3KB (minimal overhead)
- Runtime Loading: CSS loaded via chrome.runtime.getURL()
- Memory: Minimal DOM manipulation

#### Optimization
- **CSS Containment**: Scoped styles với #ai-ext-root
- **Event Delegation**: Minimal event listeners
- **DOM Reflow**: Efficient layout adjustments

### 10. Future Enhancements

#### Planned Features
- [ ] Sidebar width resizing
- [ ] Position customization (left/right)
- [ ] Keyboard shortcuts (Ctrl+Shift+A)
- [ ] Remember sidebar state
- [ ] Dark mode support

#### Code Architecture
- Modular CSS approach cho easy theming
- Component-based React structure
- Event-driven communication pattern

---

## Installation & Usage

1. **Build**: `npm run build`
2. **Load Extension**: Chrome → Extensions → Load unpacked → select `dist/`
3. **Test**: Navigate to Backlog ticket page
4. **Toggle**: Click 🤖 button để mở sidebar
5. **Chat**: Interact với AI về ticket content

## Troubleshooting

### Common Issues
- **Sidebar không hiện**: Check console errors, ensure build successful
- **CSS conflicts**: Kiểm tra Backlog page có custom CSS không
- **Layout broken**: Test trên different screen sizes

### Debug Tips
- **Dev Tools**: Inspect #ai-ext-root element
- **Console**: Check "Backlog AI Extension loaded" message
- **Network**: Verify sidebar.css loaded successfully
