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
