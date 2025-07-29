#!/bin/bash

# Development helper script for Backlog AI Extension
# This script helps manage the development workflow

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}    Backlog AI Extension - Dev Helper${NC}"
    echo -e "${BLUE}============================================${NC}"
}

function show_menu() {
    echo ""
    echo -e "${YELLOW}Available commands:${NC}"
    echo "1. start    - Start development mode with watch"
    echo "2. build    - Build once for development (outputs to dev-build/)"
    echo "3. prod     - Build for production (outputs to dist/)"
    echo "4. clean    - Clean dev-build directory"
    echo "5. help     - Show Chrome extension loading instructions"
    echo "6. status   - Check if watch mode is running"
    echo "7. release  - Preview changelog for next release"
    echo ""
    echo -e "${BLUE}Note:${NC}"
    echo "• Development builds preserve dev-build/ when running production builds"
    echo "• Production builds only affect dist/ directory"
    echo ""
}

function start_dev() {
    echo -e "${GREEN}Starting development mode with watch...${NC}"
    echo -e "${YELLOW}Files will auto-rebuild when you make changes${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    npm run dev:watch
}

function build_once() {
    echo -e "${GREEN}Building for development...${NC}"
    npm run clean:dev && npm run build:dev
}

function build_prod() {
    echo -e "${GREEN}Building for production...${NC}"
    echo -e "${YELLOW}Output will be in dist/ directory${NC}"
    echo -e "${YELLOW}dev-build/ directory will not be affected${NC}"
    npm run build
}

function clean_dev() {
    echo -e "${GREEN}Cleaning dev-build directory...${NC}"
    npm run clean:dev
    echo -e "${GREEN}Done!${NC}"
}

function show_help() {
    echo -e "${GREEN}How to load the extension in Chrome:${NC}"
    echo ""
    echo "1. Open Chrome browser"
    echo "2. Go to: chrome://extensions/"
    echo "3. Enable 'Developer mode' (toggle in top-right)"
    echo "4. Click 'Load unpacked'"
    echo "5. Select the 'dev-build' directory from this project"
    echo ""
    echo -e "${YELLOW}Important notes:${NC}"
    echo "- The extension will automatically update when files change"
    echo "- If the extension doesn't update, click the refresh icon in chrome://extensions/"
    echo "- For major changes, you might need to reload the extension"
    echo ""
    echo -e "${BLUE}Development workflow:${NC}"
    echo "1. Run './dev.sh start' to begin development"
    echo "2. Make your code changes"
    echo "3. Watch files auto-rebuild"
    echo "4. Test your changes in Chrome"
    echo ""
}

function check_status() {
    if pgrep -f "webpack.*webpack.dev.js.*watch" > /dev/null; then
        echo -e "${GREEN}✓ Development watch mode is running${NC}"
        echo -e "${YELLOW}PID: $(pgrep -f 'webpack.*webpack.dev.js.*watch')${NC}"
    else
        echo -e "${RED}✗ Development watch mode is not running${NC}"
        echo -e "${YELLOW}Run './dev.sh start' to begin development${NC}"
    fi
}

function preview_release() {
    echo -e "${BLUE}Previewing changelog for next release...${NC}"
    echo ""
    if command -v changelogen &> /dev/null; then
        npx changelogen
    else
        echo -e "${RED}❌ changelogen not found. Install it with: npm install -g changelogen${NC}"
        echo -e "${YELLOW}Or run: npx changelogen${NC}"
    fi
    echo ""
    echo -e "${YELLOW}💡 To create actual release:${NC}"
    echo "1. Make sure all changes are committed with conventional commit format"
    echo "2. Go to GitHub → Actions → Release workflow"
    echo "3. Click 'Run workflow' and select release type (patch/minor/major)"
    echo "4. Review the generated draft release and publish when ready"
    echo ""
    echo -e "${BLUE}Release types:${NC}"
    echo "• patch: Bug fixes (1.0.0 → 1.0.1)"
    echo "• minor: New features (1.0.0 → 1.1.0)"  
    echo "• major: Breaking changes (1.0.0 → 2.0.0)"
}

# Main script logic
print_header

if [ $# -eq 0 ]; then
    show_menu
    exit 0
fi

case "$1" in
    "start")
        start_dev
        ;;
    "build")
        build_once
        ;;
    "prod")
        build_prod
        ;;
    "clean")
        clean_dev
        ;;
    "help")
        show_help
        ;;
    "status")
        check_status
        ;;
    "release")
        preview_release
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_menu
        exit 1
        ;;
esac
