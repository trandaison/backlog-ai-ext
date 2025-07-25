# CSS Class-Based Architecture Refactoring

## Tổng quan

Đã refactor code từ inline styles sang CSS class-based architecture để dễ maintain và có cấu trúc tốt hơn.

## Những thay đổi chính

### 1. Loại bỏ Inline Styles

#### Trước (Inline CSS):
```typescript
this.asideContainer.style.cssText = `
  position: fixed;
  top: var(--globalNavHeight);
  width: 400px;
  right: -400px;
  // ... nhiều styles khác
`;
```

#### Sau (CSS Classes):
```typescript
this.asideContainer = document.createElement('aside');
this.asideContainer.id = 'ai-ext-root';
// Styles được định nghĩa trong sidebar.scss
```

### 2. CSS Class Structure

#### Sidebar Classes
```scss
#ai-ext-root {
  // Base sidebar styles

  &.ai-ext-open {
    right: 0; // Show sidebar
  }
}

.ai-ext-aside-content {
  // Aside content container
}

.ai-ext-header {
  // Header styling
}

.ai-ext-title {
  // Title styling
}

.ai-ext-close-button {
  // Close button with hover effects
}

.ai-ext-chatbot-content {
  // Chatbot container
}
```

#### Body State Class
```scss
body.ai-ext-sidebar-open {
  .content-outer {
    margin-right: 400px;
    transition: margin-right 0.3s ease-in-out;
  }
}
```

### 3. JavaScript Logic Simplification

#### State Management
```typescript
// Open sidebar
private openChatbot() {
  this.asideContainer.classList.add('ai-ext-open');
  document.body.classList.add('ai-ext-sidebar-open');
  this.isOpen = true;
}

// Close sidebar
private closeChatbot() {
  this.asideContainer.classList.remove('ai-ext-open');
  document.body.classList.remove('ai-ext-sidebar-open');
  this.isOpen = false;
}

// Toggle check
const isVisible = this.asideContainer.classList.contains('ai-ext-open');
```

#### DOM Creation
```typescript
// Clean HTML structure
const header = document.createElement('div');
header.className = 'ai-ext-header';

const title = document.createElement('h3');
title.className = 'ai-ext-title';
title.textContent = '🤖 AI Assistant';

const closeButton = document.createElement('button');
closeButton.className = 'ai-ext-close-button';
closeButton.innerHTML = '✕';
```

### 4. Responsive Design Removal

Loại bỏ tất cả responsive breakpoints để keep một behavior trên mọi screen size:

```scss
// ❌ Removed
@media (max-width: 1200px) { ... }
@media (max-width: 1024px) { ... }

// ✅ Single behavior
$sidebar-width: 400px; // Fixed width cho mọi screen
```

### 5. CSS Cascade Benefits

#### Layout Adaptation via CSS
```scss
body.ai-ext-sidebar-open {
  .content-outer {
    margin-right: $sidebar-width;
    transition: margin-right $animation-duration $animation-easing;
  }
}
```

#### Component State via CSS
```scss
#ai-ext-root {
  right: -$sidebar-width; // Hidden by default
  transition: right $animation-duration $animation-easing;

  &.ai-ext-open {
    right: 0; // Visible when class added
  }
}
```

#### Hover Effects via CSS
```scss
.ai-ext-close-button {
  transition: background-color 0.2s;

  &:hover {
    background-color: #e9ecef;
  }
}

#backlog-ai-toggle {
  transition: all $animation-duration cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba($primary-color, 0.4);
  }
}
```

## Architecture Benefits

### 1. Maintainability
- **Single Source of Truth**: Tất cả styles trong SCSS files
- **No JS Pollution**: JavaScript chỉ manage DOM structure và classes
- **CSS Cascade**: Leverage browser's natural styling mechanism

### 2. Performance
- **No Runtime Style Calculation**: Styles compiled beforehand
- **CSS Optimizations**: Browser optimizations cho CSS transitions
- **Reduced DOM Manipulation**: Chỉ toggle classes thay vì set multiple properties

### 3. Developer Experience
- **IDE Support**: CSS autocomplete và syntax highlighting
- **Debugging**: Easy inspect trong DevTools
- **Consistency**: SCSS variables ensure consistent values

### 4. Separation of Concerns
- **HTML Structure**: JavaScript creates semantic DOM
- **Visual Styling**: SCSS handles all appearance
- **Behavior**: JavaScript handles interactions và state

## File Structure

### SCSS Organization
```
src/content/sidebar.scss
├── Variables ($sidebar-width, $colors, etc.)
├── Mixins (@transition, @flex-center, etc.)
├── Base Layout (#ai-ext-root)
├── Components (.ai-ext-header, .ai-ext-title, etc.)
├── State Classes (.ai-ext-open)
└── Interactive Elements (#backlog-ai-toggle)
```

### TypeScript Organization
```typescript
class BacklogAIInjector {
  // DOM creation with semantic classes
  private injectChatbot() { ... }

  // State management via classes
  private openChatbot() { ... }
  private closeChatbot() { ... }
  private toggleChatbot() { ... }
}
```

## CSS Class Naming Convention

### BEM-inspired Structure
- **Block**: `ai-ext` (namespace)
- **Element**: `ai-ext-header`, `ai-ext-title`, `ai-ext-close-button`
- **Modifier**: `ai-ext-open`, `ai-ext-sidebar-open`

### Semantic Classes
- `ai-ext-aside-content`: Container content
- `ai-ext-header`: Header section
- `ai-ext-title`: Title text
- `ai-ext-close-button`: Close button
- `ai-ext-chatbot-content`: Chatbot area

### State Classes
- `ai-ext-open`: Sidebar visible state
- `ai-ext-sidebar-open`: Body state when sidebar open

## Migration Checklist

### ✅ Completed
- [x] Remove all inline styles from TypeScript
- [x] Create semantic CSS classes in SCSS
- [x] Implement state management via classes
- [x] Remove responsive breakpoints
- [x] Use CSS cascade for layout adaptation
- [x] Simplify JavaScript logic
- [x] Maintain single behavior across screen sizes

### 🔄 Benefits Achieved
- [x] Cleaner JavaScript code
- [x] Better maintainability
- [x] Easier debugging
- [x] Performance improvements
- [x] Separation of concerns
- [x] Consistent styling

## Future Improvements

### Planned Features
- [ ] CSS custom properties cho theming
- [ ] Animation classes cho complex transitions
- [ ] Utility classes cho common patterns
- [ ] Component variants via modifier classes

### Advanced Architecture
- [ ] CSS-in-TS type safety
- [ ] Style composition patterns
- [ ] Animation orchestration
- [ ] Theme switching architecture

---

## Code Examples

### Before vs After

#### DOM Creation
```typescript
// ❌ Before: Inline styles
element.style.cssText = `
  display: flex;
  padding: 16px 20px;
  background: #f8f9fa;
`;

// ✅ After: Semantic classes
element.className = 'ai-ext-header';
```

#### State Management
```typescript
// ❌ Before: Direct style manipulation
this.asideContainer.style.right = '0px';
contentOuter.style.marginRight = '400px';

// ✅ After: Class-based state
this.asideContainer.classList.add('ai-ext-open');
document.body.classList.add('ai-ext-sidebar-open');
```

#### Event Handling
```typescript
// ❌ Before: Manual hover effects
button.addEventListener('mouseenter', () => {
  button.style.backgroundColor = '#e9ecef';
});
button.addEventListener('mouseleave', () => {
  button.style.backgroundColor = 'transparent';
});

// ✅ After: CSS handles hover
button.className = 'ai-ext-close-button';
// CSS: .ai-ext-close-button:hover { background-color: #e9ecef; }
```

Architecture này giúp code dễ maintain hơn nhiều và performance tốt hơn!
