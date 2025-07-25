# SCSS Implementation Guide

## Tổng quan

Project đã được migrate từ CSS sang SCSS để có cấu trúc styling tốt hơn với variables, mixins và nested selectors.

## Cài đặt

### Dependencies
```bash
npm install --save-dev sass sass-loader mini-css-extract-plugin
```

### File Structure
```
src/
├── content/
│   ├── content.scss (compiled to content-styles.css)
│   └── sidebar.scss (compiled to sidebar-styles.css)
├── chatbot/
│   └── chatbot.scss (compiled to chatbot-styles.css)
```

## SCSS Features được sử dụng

### 1. Variables
```scss
// Colors
$primary-color: #4CBA95;
$text-color: #333;
$bg-color: white;

// Dimensions
$sidebar-width-lg: 400px;
$sidebar-width-md: 350px;

// Animation
$animation-duration: 0.3s;
$animation-easing: ease-in-out;
```

### 2. Mixins
```scss
@mixin transition($property, $duration: $animation-duration) {
  transition: $property $duration $animation-easing;
}

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin custom-scrollbar {
  &::-webkit-scrollbar {
    width: 6px;
  }
  // ... other scrollbar styles
}
```

### 3. Nested Selectors
```scss
#ai-ext-root {
  font-family: $font-family;

  * {
    box-sizing: border-box;
  }

  button {
    @include button-base;

    &:hover {
      transform: scale(1.1);
    }
  }
}
```

### 4. Modern SASS Functions
```scss
// Thay thế darken() deprecated
&:hover {
  background: color-mix(in srgb, $primary-color 90%, black 10%);
}
```

## Webpack Configuration

### Entry Points
```javascript
entry: {
  // JavaScript entries
  content: './src/content/content.ts',
  // SCSS entries
  'content-styles': './src/content/content.scss',
  'sidebar-styles': './src/content/sidebar.scss',
  'chatbot-styles': './src/chatbot/chatbot.scss'
}
```

### Loaders
```javascript
{
  test: /\.scss$/,
  use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
}
```

### Plugins
```javascript
new MiniCssExtractPlugin({
  filename: '[name].css'
})
```

## File Mapping

| SCSS Source | CSS Output | Purpose |
|------------|------------|---------|
| `content.scss` | `content-styles.css` | Content script base styles |
| `sidebar.scss` | `sidebar-styles.css` | Sidebar layout và animations |
| `chatbot.scss` | `chatbot-styles.css` | Chatbot component styles |

## Manifest Integration

### Content Scripts
```json
"css": ["content-styles.css", "sidebar-styles.css"]
```

### Web Accessible Resources
```json
"resources": ["chatbot.js", "chatbot-styles.css", "sidebar-styles.css"]
```

## Build Process

### Development
```bash
npm run build:dev    # Development build với source maps
npm run dev          # Watch mode
```

### Production
```bash
npm run build        # Clean + production build
```

### Output
- `content-styles.css` - 10.4KB (minified)
- `sidebar-styles.css` - 5.54KB (minified)
- `chatbot-styles.css` - 9.7KB (minified)

## SCSS Best Practices

### 1. Variable Organization
```scss
// Color palette
$primary-color: #4CBA95;
$secondary-color: #007acc;
$success-color: #28a745;
$warning-color: #ffc107;
$error-color: #dc3545;

// Spacing scale
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

### 2. Mixin Conventions
```scss
// Utility mixins
@mixin sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Component mixins
@mixin button-variant($bg, $color: white) {
  background: $bg;
  color: $color;

  &:hover {
    background: color-mix(in srgb, $bg 90%, black 10%);
  }
}
```

### 3. Responsive Design
```scss
// Breakpoint system
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
$breakpoint-xl: 1200px;

@mixin respond-to($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (min-width: $breakpoint-sm) { @content; }
  }
  @if $breakpoint == 'md' {
    @media (min-width: $breakpoint-md) { @content; }
  }
  // ... other breakpoints
}
```

### 4. Component Structure
```scss
.component-name {
  // Base styles
  position: relative;

  // States
  &.is-active {
    // Active state styles
  }

  &.is-disabled {
    // Disabled state styles
  }

  // Variants
  &--variant-name {
    // Variant styles
  }

  // Child elements
  &__element {
    // Element styles

    &--modifier {
      // Element modifier
    }
  }
}
```

## Migration Benefits

### 1. Code Organization
- **Variables**: Centralized color and spacing definitions
- **Mixins**: Reusable style patterns
- **Nesting**: Logical component structure

### 2. Maintainability
- **Single Source of Truth**: Colors và spacing defined once
- **Consistency**: Mixins ensure consistent patterns
- **Readability**: Nested structure mirrors HTML

### 3. Performance
- **Compilation**: SCSS compiled to optimized CSS
- **Minification**: Production builds are minified
- **Bundling**: Single CSS files per component

### 4. Developer Experience
- **IntelliSense**: Better IDE support
- **Error Checking**: Compile-time error detection
- **Hot Reload**: Fast development iteration

## Troubleshooting

### Common Issues

#### 1. Build Errors
```bash
# Clear dist and rebuild
npm run clean
npm run build
```

#### 2. SCSS Syntax Errors
- Check nesting levels (max 3-4 levels)
- Verify variable names (start with $)
- Ensure proper mixin syntax (@mixin/@include)

#### 3. CSS Not Loading
- Verify manifest.json paths
- Check webpack output filenames
- Ensure web_accessible_resources includes CSS

#### 4. Style Conflicts
- Use specific selectors for extension styles
- Add !important for critical overrides
- Scope styles with component containers

### Debug Commands
```bash
# Lint SCSS
npx stylelint "src/**/*.scss"

# Check compiled output
cat dist/content-styles.css

# Webpack bundle analysis
npx webpack-bundle-analyzer dist
```

---

## Future Improvements

### Planned Features
- [ ] Theme system với CSS custom properties
- [ ] Component library với reusable SCSS modules
- [ ] Style linting với stylelint
- [ ] Automated accessibility checks
- [ ] Performance budgets cho CSS bundle size

### Advanced SCSS Features
- [ ] Function definitions cho color manipulation
- [ ] Loop-generated utility classes
- [ ] Conditional styling với @if/@else
- [ ] Import organization với partials
- [ ] Documentation generation từ SCSS comments
