<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Backlog AI Extension - Copilot Instructions

This is a Chrome extension project that integrates AI assistance into Backlog ticket pages. The extension provides intelligent ticket analysis and chat functionality to help users understand and work with tickets more effectively.

## Project Overview

- **Technology Stack**: TypeScript, React, Chrome Extension APIs, Webpack
- **AI Integration**: OpenAI GPT models for ticket analysis and conversational assistance
- **Target Platform**: Backlog.com, Backlog.jp, Backlogtool.com

## Architecture

### Core Components:
1. **Content Script** (`src/content/content.ts`): Injects chatbot into Backlog pages
2. **Background Script** (`src/background/background.ts`): Handles AI API calls and message routing
3. **Popup** (`src/popup/popup.tsx`): Extension settings and configuration
4. **Chatbot** (`src/chatbot/chatbot.tsx`): React-based chat interface
5. **Shared Utilities** (`src/shared/`): Ticket analysis and chat management

### Key Features:
- Automatic ticket data extraction from Backlog pages
- AI-powered ticket analysis and recommendations
- Interactive chatbot for discussing tickets
- Secure API key storage
- Multi-language support (Vietnamese, English, Japanese)

## Development Guidelines

### Code Style:
- Use TypeScript with strict mode
- Follow React functional component patterns with hooks
- Implement proper error handling and user feedback
- Use Chrome extension APIs according to Manifest V3 specifications

### Configuration Management:
- **Centralized Constants**: All reusable constants, configurations, and common values should be defined in `src/configs/` directory
- Use `src/configs/index.ts` as the main export point for all configuration modules
- Split large configuration files into smaller, focused modules (e.g., `aiModels.ts`, `uiConstants.ts`, `apiEndpoints.ts`) and re-export through the index file
- Always import configurations from `src/configs` instead of hardcoding values throughout the codebase
- Common configuration patterns:
  - AI model definitions and defaults (`availableModels`, `defaultModelId`)
  - UI constants (colors, sizes, timeouts)
  - API endpoints and configuration
  - Feature flags and settings defaults
- When adding new constants that may change over time, create them in the configs directory first

### Security:
- Store API keys securely using Chrome storage APIs
- Validate all user inputs
- Handle API rate limiting gracefully
- Follow content security policy guidelines

### Performance:
- Minimize bundle size using code splitting
- Implement lazy loading for React components
- Cache ticket data appropriately
- Optimize DOM manipulation in content scripts

### Git Workflow:
- **DO NOT automatically commit changes** - Always let the user review and commit manually
- Only build and test automatically, but wait for user's explicit commit instruction
- User prefers to control git commits themselves for better change management

### Testing:
- Test on multiple Backlog domains and page types
- Verify extension permissions and security
- Test AI API integration with various scenarios
- Ensure responsive design for different screen sizes

## File Structure Guidelines:
- Keep components small and focused
- Separate business logic from UI components
- Use TypeScript interfaces for all data structures
- Implement proper error boundaries in React components

## Chrome Extension Specific:
- Follow Manifest V3 best practices
- Use service workers for background processing
- Implement proper message passing between scripts
- Handle extension lifecycle events correctly

## Development Commands:
**IMPORTANT**: Always use the development helper script instead of direct npm commands:

- **Build project**: Use `./dev.sh build` instead of `npm run build:dev`
- **Start development**: Use `./dev.sh start` for watch mode
- **Clean build**: Use `./dev.sh clean` to clean dev-build directory
- **Check status**: Use `./dev.sh status` to check if watch mode is running
- **Get help**: Use `./dev.sh help` for Chrome extension loading instructions

The `dev.sh` script provides a standardized development workflow and should be used for all build operations.

## Release Management:

### Versioning:
- Use semantic versioning (MAJOR.MINOR.PATCH) starting from v1.0.0
- Follow semver principles:
  - PATCH: Bug fixes and minor improvements
  - MINOR: New features that are backward compatible
  - MAJOR: Breaking changes or significant feature overhauls

### Changelog Management:
- Use `changelogen` library for automated changelog generation and release management
- Changelogen automatically parses commit messages and generates appropriate changelog entries
- Release commands:
  - `npx changelogen --release` - Generate changelog and create release
  - `npx changelogen --bump` - Only bump version without release
  - `npx changelogen` - Generate changelog preview

### Commit Message Format:
- Follow conventional commit format for automated changelog generation
- Format: `type: short description`
- Keep messages concise and descriptive, avoid multi-line commits
- Common types:
  - `feat: add new chat feature`
  - `fix: resolve token optimization bug`
  - `docs: update installation guide`
  - `style: improve chatbot UI spacing`
  - `refactor: optimize context processing`
  - `test: add unit tests for storage service`
  - `chore: update dependencies`
