# Development Guide - Backlog AI Extension

## 🚀 Quick Start

### Option 1: Using Helper Script (Recommended)
```bash
# Make the script executable (one time only)
chmod +x dev.sh

# Start development mode with auto-rebuild
./dev.sh start

# Other useful commands
./dev.sh help    # Show Chrome extension loading guide
./dev.sh status  # Check if watch mode is running
./dev.sh clean   # Clean dev-build directory
```

### Option 2: Using NPM Scripts
```bash
# Start development with watch mode
npm run dev

# Build once for development
npm run clean:dev && npm run dev

# Clean development build
npm run clean:dev
```

## 📂 Development Workflow

1. **Start Development Mode**
   ```bash
   ./dev.sh start
   ```
   This will:
   - Clean the `dev-build` directory
   - Build all files to `dev-build/`
   - Watch for file changes
   - Auto-rebuild when you save files

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dev-build` directory

3. **Development Loop**
   - Make changes to source files
   - Files automatically rebuild
   - Refresh the page you're testing on
   - If needed, reload the extension in Chrome

## 🔧 Development Features

### Auto-Watch and Rebuild
- **What**: Webpack watches all source files and rebuilds automatically
- **Benefit**: No need to manually run build commands
- **Files Watched**: All `.ts`, `.tsx`, `.scss`, `.html` files

### Source Maps
- **What**: Detailed debugging information in dev builds
- **Benefit**: Easy debugging in Chrome DevTools
- **Location**: `.map` files in `dev-build/`

### Fast Rebuilds
- **What**: Only changed files are recompiled
- **Benefit**: Quick feedback loop during development
- **Speed**: Usually completes in under 2 seconds

## 📁 Directory Structure

```
project/
├── src/                    # Source code
│   ├── content/           # Content scripts
│   ├── background/        # Background service worker
│   ├── popup/            # Extension popup
│   ├── chatbot/          # Chat interface
│   └── assets/           # Icons and static assets
├── dev-build/            # Development build output (auto-generated)
├── dist/                 # Production build output
└── dev.sh               # Development helper script
```

## 🎯 Testing Your Changes

### Content Script Changes
1. Make changes to files in `src/content/`
2. Watch for auto-rebuild in terminal
3. Refresh the Backlog page you're testing
4. Open DevTools to see your changes

### Popup Changes
1. Make changes to files in `src/popup/`
2. Watch for auto-rebuild
3. Close and reopen the extension popup
4. Changes should be visible immediately

### Background Script Changes
1. Make changes to `src/background/`
2. Watch for auto-rebuild
3. Go to `chrome://extensions/`
4. Click the refresh icon for your extension
5. Test the functionality

### Style Changes (SCSS)
1. Make changes to `.scss` files
2. Auto-rebuild will update CSS files
3. Refresh the page to see style changes
4. No need to reload the extension

## 🐛 Troubleshooting

### Extension Not Updating
1. Check if watch mode is running: `./dev.sh status`
2. Look for build errors in terminal
3. Try refreshing the extension in Chrome
4. For major changes, reload the extension completely

### Build Errors
1. Check terminal output for specific errors
2. Ensure all dependencies are installed: `npm install`
3. Try cleaning and rebuilding: `./dev.sh clean && ./dev.sh start`

### Chrome Extension Issues
1. Check Chrome's extension error logs
2. Open DevTools on the extension popup
3. Check the background page console in `chrome://extensions/`

## ⚡ Performance Tips

1. **Keep Watch Mode Running**: Don't stop/start frequently
2. **Use Specific File Patterns**: Watch mode is optimized for the file types we use
3. **Development vs Production**: Use `npm run build` for final production builds

## 🔄 Hot Reload Behavior

| File Type | Reload Required |
|-----------|----------------|
| Content Scripts (.ts) | Page refresh |
| Background Scripts | Extension reload |
| Popup (.tsx) | Close/reopen popup |
| Styles (.scss) | Page refresh |
| Manifest.json | Extension reload |

## 📝 Development Commands Reference

```bash
# Start development with watch
./dev.sh start
npm run dev

# Build once for development
./dev.sh build
npm run clean:dev && npm run dev

# Clean development files
./dev.sh clean
npm run clean:dev

# Check development status
./dev.sh status

# Show help and Chrome loading guide
./dev.sh help

# Production build
npm run build

# Type checking
npm run lint
```

## 🎯 Features Implemented

### ✅ Story 1.1: Basic Extension Setup
- Manifest V3 configuration với permissions cho Backlog domains
- Content scripts injection và background service worker
- React-based popup interface
- Development workflow với webpack hot reload

### ✅ Story 1.2: Popup Configuration Interface
**Tasks Completed:**
- ✅ **Task 1.2.1**: Popup HTML structure với React components
- ✅ **Task 1.2.2**: Secure API key storage với AES-GCM encryption
- ✅ **Task 1.2.3**: User role configuration dropdown (Developer, PM, QA, Designer, DevOps, Other)
- ✅ **Task 1.2.4**: Connection testing với OpenAI API validation

**Security Features:**
- API keys được encrypt bằng AES-GCM algorithm trước khi lưu storage
- Master key derived từ extension ID để unique per installation
- API key validation với OpenAI format (sk-...)
- Password field với show/hide toggle
- API key masking trong UI displays

**User Settings:**
- OpenAI API Key (encrypted storage)
- User Role (Developer, PM, QA, Designer, DevOps, Other)
- Language preference (Vietnamese, English, Japanese)
- AI Model selection (GPT-3.5 Turbo, GPT-4, GPT-4 Turbo)

### 🔄 Story 1.3: Background Service Worker
**Partially Complete:**
- Enhanced background service với role-based AI prompts
- Settings integration với encrypted API key handling
- Personalized system prompts dựa trên user role và language
- API call optimization với proper error handling
- **NEW**: Backlog API settings management (backlogApiKey, backlogSpaceKey)

### ✅ Story 2.1: Ticket Information Extraction
**NEW Implementation - Using Backlog API:**
- **API-First Approach**: Sử dụng Backlog REST API thay vì DOM extraction
- **Fallback Strategy**: DOM extraction nếu API fails hoặc chưa config
- **Comprehensive Data**: Full ticket metadata từ Backlog API
- **Real-time Updates**: Direct API calls cho accurate data

**Features Implemented:**
- **Backlog API Service** (`src/shared/backlogApi.ts`):
  - Support tất cả Backlog domains (.com, .jp, .backlogtool.com)
  - Complete ticket data extraction với metadata
  - Comments và change history extraction
  - API connection testing và validation
  - Auto URL detection và space key parsing

- **Enhanced TicketAnalyzer** (`src/shared/ticketAnalyzer.ts`):
  - API-first extraction strategy
  - DOM fallback cho backward compatibility
  - Unified TicketData interface với extended fields
  - Automatic API settings management

- **Chatbot Settings Integration**:
  - Settings icon (⚙️) trong chatbot header
  - Modal interface cho Backlog API configuration
  - Secure storage cho API keys và space keys
  - Real-time settings updates

**API Data Extracted:**
- Complete issue metadata (type, priority, status, assignee)
- Full description và comments với timestamps
- Categories, versions, milestones như labels
- Custom fields, attachments, và file attachments
- Accurate created/updated timestamps
- Estimated vs actual hours tracking
- Parent/child issue relationships

### 📋 Next Steps
Theo user stories breakdown, tiếp theo cần implement:
- **Story 2.2**: AI-Powered Ticket Analysis với enhanced prompts
- **Story 2.3**: Smart Reply Generation với role-based suggestions
- **Story 3.1**: Chat Interface Development với improved UX
- **Story 4.1**: Multi-language Translation features

### 🔧 How to Test Backlog API Integration:

1. **Load Extension**: Load `dev-build/` vào Chrome extensions
2. **Configure APIs**:
   - Popup: Cấu hình OpenAI API key
   - Chatbot: Click ⚙️ để config Backlog API key và space key
3. **Get Backlog API Key**:
   - Vào Backlog → Personal Settings → API
   - Copy API key và space key từ URL
4. **Test on Ticket Page**:
   - Mở any ticket page trong Backlog
   - Click chatbot icon
   - Verify API data extraction vs DOM fallback
