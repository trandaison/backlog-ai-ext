# Backlog AI Assistant

🤖 AI-powered Chrome extension for intelligent Backlog ticket analysis and assistance.

## Features

- **Automatic Ticket Analysis**: AI analyzes ticket content, complexity, and provides recommendations
- **Interactive Chatbot**: Chat with AI about ticket details, solutions, and best practices
- **Multi-language Support**: Vietnamese, English, and Japanese
- **Secure API Integration**: Safe storage of OpenAI API keys
- **Easy Integration**: Works seamlessly with Backlog.com, Backlog.jp, and Backlogtool.com

## Installation

### Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd backlog-ai-ext
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Production Build

```bash
npm run build
```

## Usage

### Setup
1. Click the extension icon in your browser toolbar
2. Enter your OpenAI API key in the popup
3. Save settings and test the connection

### Using the Assistant
1. Navigate to any Backlog ticket page
2. Click the floating AI 🤖 button that appears
3. Start chatting with the AI about the ticket

### Features Available
- **Ticket Analysis**: Ask "Phân tích ticket này" for comprehensive analysis
- **Solution Suggestions**: Get technical recommendations and approaches
- **Time Estimation**: Receive project timeline estimates
- **Risk Assessment**: Identify potential issues and challenges
- **Best Practices**: Learn industry standards and best practices

## Development

### Scripts
- `npm run dev` - Development build with watch mode
- `npm run build` - Production build
- `npm run clean` - Clean dist folder
- `npm run lint` - TypeScript type checking

### Project Structure
```
src/
├── content/          # Content scripts injected into Backlog pages
├── background/       # Service worker for AI API handling
├── popup/           # Extension popup interface
├── chatbot/         # React chatbot component
├── shared/          # Shared utilities and types
└── assets/          # Static assets (icons, etc.)
```

### Architecture

1. **Content Script**: Detects Backlog pages, extracts ticket data, injects chatbot
2. **Background Script**: Processes AI requests, manages API calls
3. **Popup**: Configuration interface for API keys and settings
4. **Chatbot**: React-based chat interface for user interaction

## Configuration

### Required Permissions
- `activeTab`: Access current tab content
- `storage`: Store API keys and settings
- `scripting`: Inject content scripts

### Supported Domains
- `*.backlog.com/*`
- `*.backlog.jp/*`
- `*.backlogtool.com/*`

## API Integration

The extension uses OpenAI's GPT models for analysis and conversation. You'll need:
- Valid OpenAI API key
- Sufficient API credits/quota

### Supported Models
- GPT-3.5 Turbo (default)
- GPT-4
- GPT-4 Turbo

## Security

- API keys are stored locally using Chrome's secure storage
- No data is sent to external servers except OpenAI
- All communications use HTTPS
- Extension follows Chrome's security best practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue in the repository.

## Changelog

### v1.0.0
- Initial release
- Basic ticket analysis
- Interactive chatbot
- Multi-language support
- OpenAI integration
