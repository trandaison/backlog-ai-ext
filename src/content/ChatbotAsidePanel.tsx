import React, { useState, useEffect, useRef } from 'react';
import { TicketAnalyzer, TicketData } from '../shared/ticketAnalyzer';
import { ChatStorageService, ChatMessage, UserInfo, SaveResult } from '../shared/chatStorageService';
import { formatRelativeTime, formatFullTimestamp, safeTimestampToDate } from '../shared/timeUtils';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

// AI Icon as data URL
const aiIcon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQyIiBoZWlnaHQ9IjE0MiIgdmlld0JveD0iMCAwIDE0MiAxNDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xNzk2XzQ1OSkiPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTExMi41MjEgMTQxLjI3N0gyOS41NDk0QzEzLjgyNDMgMTQxLjI3NyAwLjk1NzAzMSAxMjguMzkgMC45NTcwMzEgMTEyLjYzOVYyOS41MzEyQzAuOTU3MDMxIDEzLjc4MDQgMTMuODI0MyAwLjg5MzU1NSAyOS41NDk0IDAuODkzNTU1SDExMi41MjFDMTI4LjI0NiAwLjg5MzU1NSAxNDEuMTEyIDEzLjc4MDQgMTQxLjExMiAyOS41MzEyVjExMi42MzlDMTQxLjExMiAxMjguMzkgMTI4LjI0NiAxNDEuMjc3IDExMi41MjEgMTQxLjI3N1oiIGZpbGw9IiM0MkNFOUYiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01Mi4xOTkgNjEuMzI0MkM1Mi4xNDQzIDcyLjk3NTIgNTIuMTE0OCA4NC4zMTI3IDUyLjE0NDIgOTEuMDk2NEM2Mi4yNzU4IDkwLjU0NjcgNjcuMjkzOSA4OC40ODI3IDcxLjI2MzQgODMuNzEzOEM3NC4wNzc3IDgwLjMzMjUgNzQuNjg2OSA3Ni40NTkxIDcyLjk4IDcyLjgwNzlDNzAuNzQ2OCA2OC4wMzMzIDY0LjE4MDYgNjIuOTkwMiA1Mi4xOTkgNjEuMzI0MlpNNDUuNTM1OSAxMDQuNzk2QzQzLjczNSAxMDQuNzk2IDQyLjAwNzEgMTA0LjA3NiA0MC43MzgyIDEwMi43OTdMNDAuNzM1NCAxMDIuNzk0QzM4Ljc0MzYgMTAwLjc4NSAzOC43MTU1IDk4Ljg2MjggMzguNjY1IDk1LjM3NDdDMzguNjM5NyA5My42NTEgMzguNjI0MyA5MS4yMDg5IDM4LjYxNzMgODguMjkwMUMzOC42MDYgODMuMTcyNSAzOC42MTg3IDc2LjA3MTEgMzguNjUzOCA2Ny4xODEzQzM4LjcxNTUgNTEuODg2MSAzOC44MjY0IDM2LjYzODcgMzguODI2NCAzNi42Mzg3TDUyLjM0NSAzNi43MzcxQzUyLjMxOTcgNDAuMTE1NiA1Mi4yOTU4IDQzLjgzMDEgNTIuMjcyIDQ3LjcwNjJDNjguMjY4IDQ5LjU1MzYgODAuMjgzMiA1Ni41MDA0IDg1LjIyMjcgNjcuMDY2Qzg5LjE2NDEgNzUuNDk0NiA4Ny44MjY1IDg0Ljk1OTQgODEuNjQ3NiA5Mi4zODQyQzcyLjExNjggMTAzLjgzNyA1OC41ODE0IDEwNC43OTYgNDUuNTM1OSAxMDQuNzk2WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTk4LjQ0MTQgMjcuMzY3MkM5OC40MzM1IDI2LjI2MiA5OC43NzM2IDI1LjE4MzEgOTkuNDEyMSAyNC4yODIyQzEwMC4wMTEgMjMuNDM3NiAxMDAuODQ0IDIyLjc4ODcgMTAxLjgwNiAyMi40MTVMMTAyIDIyLjM0MzdMMTAyLjAzMSAyMi4zMzRMMTA1LjE4OSAyMS4zMDQ3TDEwNS4zMTkgMjEuMjU2OEMxMDUuNjIgMjEuMTM2NSAxMDUuODk0IDIwLjk1NiAxMDYuMTI0IDIwLjcyNTZDMTA2LjM4NSAyMC40NjQgMTA2LjU4MSAyMC4xNDUgMTA2LjY5NyAxOS43OTQ5TDEwNy43MDQgMTYuNjk1M0MxMDguMDI5IDE1LjY3NDIgMTA4LjY1MyAxNC43NzYxIDEwOS40OTIgMTQuMTE2MkwxMDkuNjYyIDEzLjk4NzNMMTA5LjY2OSAxMy45ODI0TDEwOS42NzUgMTMuOTc4NUMxMTAuNTY4IDEzLjM0MjQgMTExLjYzOCAxMyAxMTIuNzM1IDEzQzExMy44MzIgMTMgMTE0LjkwMiAxMy4zNDIgMTE1Ljc5NiAxMy45Nzg1TDExNS43OTUgMTMuOTc5NUMxMTYuNjg1IDE0LjYxMTIgMTE3LjM2IDE1LjUwMTMgMTE3LjcyNiAxNi41MzAzTDExNy43MzUgMTYuNTU2NkwxMTcuNzQ0IDE2LjU4M0wxMTguNzc1IDE5Ljc2MjdDMTE4Ljg5NCAyMC4xMDcyIDExOS4wOSAyMC40MTk5IDExOS4zNDkgMjAuNjc3N0MxMTkuNjEyIDIwLjkzOTkgMTE5LjkzMiAyMS4xMzczIDEyMC4yODQgMjEuMjUzOUwxMjMuMzkzIDIyLjI2NTZMMTIzLjQxMiAyMi4yNzE1QzEyNC40NzIgMjIuNjI4NiAxMjUuMzk0IDIzLjMxMjQgMTI2LjA0MiAyNC4yMjU2TDEyNi4xNjMgMjQuNDA3MkMxMjYuNzEgMjUuMjU4MSAxMjcgMjYuMjQ5MSAxMjYuOTk5IDI3LjI2MjdDMTI2Ljk5OSAyNy4yNjgyIDEyNyAyNy4yNzM4IDEyNyAyNy4yNzkzTDEyNi45OTkgMjcuMjc5M0MxMjcgMjguMjk5MyAxMjYuNzA1IDI5LjI5NiAxMjYuMTUyIDMwLjE0OTRMMTI2LjAzOCAzMC4zMTkzQzEyNS40MDggMzEuMjEyNCAxMjQuNTE2IDMxLjg4OTQgMTIzLjQ4MyAzMi4yNTM5TDEyMy40NTkgMzIuMjYyN0wxMjMuNDM2IDMyLjI2OTVMMTIwLjI2OSAzMy4yOTg4QzExOS45MTUgMzMuNDE1IDExOS41OTQgMzMuNjEyMiAxMTkuMzMxIDMzLjg3NUwxMTkuMzMgMzMuODc1QzExOS4wNjkgMzQuMTM1MyAxMTguODcyIDM0LjQ1MjYgMTE4Ljc1NSAzNC44MDE4TDExNy43NCAzNy45MjA5TDExNy43MzggMzcuOTI4N0wxMTcuNzM1IDM3LjkzNTVDMTE3LjM4MiAzOC45OTM0IDExNi43MDUgMzkuOTEyMyAxMTUuOCA0MC41NjI1TDExNS43OTQgNDAuNTY2NEMxMTQuOSA0MS4yMDM2IDExMy44MyA0MS41NDU5IDExMi43MzIgNDEuNTQ1OUMxMTEuNzA0IDQxLjU0NTkgMTEwLjcgNDEuMjQ0OCAxMDkuODQyIDQwLjY4MjZMMTA5LjY3MiA0MC41Njc0QzEwOC43ODIgMzkuOTM1NyAxMDguMTA4IDM5LjA0NDMgMTA3Ljc0MiAzOC4wMTU2TDEwNy43MzIgMzcuOTg5M0wxMDcuNzI0IDM3Ljk2MjlMMTA2LjcwMSAzNC44MTE1QzEwNi41NzkgMzQuNDc1NyAxMDYuMzgzIDM0LjE3MDkgMTA2LjEyNyAzMy45MjA5QzEwNS44NjUgMzMuNjY1NSAxMDUuNTQ4IDMzLjQ3NDEgMTA1LjIgMzMuMzYwM0wxMDIuMDc0IDMyLjMzOThMMTAyLjA3MSAzMi4zMzg5QzEwMS4wMjIgMzEuOTk0OCAxMDAuMTA2IDMxLjMyOTYgOTkuNDU1MSAzMC40Mzc1Qzk4LjgwMzcgMjkuNTQ1MSA5OC40NDkzIDI4LjQ3MTQgOTguNDQxNCAyNy4zNjcyWk02MyA1My4yOTU5QzYzIDUyLjA1NzUgNjMuMzUzNiA1MC44NDY5IDY0LjAxNTYgNDkuODA0N0w2NC4xNTE0IDQ5LjU5NzdMNjQuMTU4MiA0OS41ODg5TDY0LjE2NDEgNDkuNTgwMUM2NC44ODM5IDQ4LjU2MTEgNjUuODg0NCA0Ny43NzQ3IDY3LjA0MSA0Ny4zMTU0TDY3LjI3NDQgNDcuMjI3NUw2Ny4yOTc5IDQ3LjIxOTdMNjcuMzIyMyA0Ny4yMTE5TDczLjQwOTIgNDUuMjM0NEw3My44NjgyIDQ1LjA2NjRDNzQuOTI3NiA0NC42NDI2IDc1Ljg5MTggNDQuMDA3MSA3Ni43MDAyIDQzLjE5NzNDNzcuNjIxMSA0Mi4yNzQ0IDc4LjMxNDUgNDEuMTUwMyA3OC43MjY2IDM5LjkxNDFMODAuNjc5NyAzMy45MTAyTDgwLjY3OTcgMzMuOTA5Mkw4MC42OTE0IDMzLjg3NEw4MC42OTE0IDMzLjg3NUM4MC45ODk5IDMyLjkxNTggODEuNTA4NSAzMi4wMzg3IDgyLjIwOCAzMS4zMTY0QzgyLjkxNTYgMzAuNTg1NSA4My43ODcgMzAuMDMzMyA4NC43NSAyOS43MDUxQzg1LjcxMzEgMjkuMzc2NyA4Ni43NDAxIDI5LjI4MjcgODcuNzQ2MSAyOS40Mjg3Qzg4Ljc0OTQgMjkuNTc0MyA4OS43MDI5IDI5Ljk1NjEgOTAuNTMwMyAzMC41NDFMOTAuNTMxMiAzMC41NEM5MS42MjUxIDMxLjMwNzMgOTIuNDUxNSAzMi4zOTgzIDkyLjg5MzYgMzMuNjU5Mkw5Mi45MDE0IDMzLjY4MDdMOTIuOTA4MiAzMy43MDMxTDk0Ljg4NTcgMzkuNzkxTDk0Ljg4NjcgMzkuNzlDOTUuMjQ5MiA0MC44NzUzIDk1LjgyODggNDEuODczNiA5Ni41ODc5IDQyLjcyNTZMOTYuOTIzOCA0My4wODJDOTcuODQ2OCA0NC4wMDQ0IDk4Ljk3MTkgNDQuNzAxNCAxMDAuMjEgNDUuMTE1MkwxMDAuMjExIDQ1LjExNDNMMTA2LjU5NSA0Ny4yMTA5TDEwNi42ODYgNDcuMjQxMkwxMDYuNzcyIDQ3LjI3ODNDMTA3LjkxOSA0Ny43Nzk3IDEwOC44OTQgNDguNjA0NyAxMDkuNTc5IDQ5LjY1MTRMMTA5LjU4IDQ5LjY1MTRDMTEwLjI2NSA1MC42OTgxIDExMC42MyA1MS45MjI1IDExMC42MzEgNTMuMTczOEwxMTAuNjMxIDUzLjE3NThDMTEwLjYzIDU0LjUwNzQgMTEwLjIxNSA1NS44MDU0IDEwOS40NDYgNTYuODkxNkwxMDkuNDQ2IDU2Ljg5MjZDMTA4LjY3NyA1Ny45NzkgMTA3LjU4OSA1OC44MDAxIDEwNi4zMzMgNTkuMjQzMkwxMDYuMzExIDU5LjI1MUwxMDYuMjg3IDU5LjI1ODhMMTAwLjE5NiA2MS4yNDMyQzk5LjI5MDQgNjEuNTQwMyA5OC40NDE4IDYxLjk5MDggOTcuNjg4NSA2Mi41NzUyTDk3LjY4MjYgNjIuNTgwMUM5Ny40MDU4IDYyLjc5MzEgOTcuMTQyNSA2My4wMjMyIDk2Ljg5NTUgNjMuMjY5NUM5NS45NjYzIDY0LjIwMDUgOTUuMjY2MSA2NS4zMzQ5IDk0Ljg0ODYgNjYuNTgyTDk0Ljg0ODYgNjYuNTgzTDkyLjg5MjYgNzIuNjA2NEw5Mi44ODQ4IDcyLjYzMThDOTIuNDU1MiA3My44OTg4IDkxLjY0MDYgNzUuMDAwMyA5MC41NTU3IDc1Ljc4MzJDODkuNDcwOCA3Ni41NjU5IDg4LjE2ODggNzYuOTkxMiA4Ni44MzExIDc3Qzg1LjQ5MzQgNzcuMDA4NyA4NC4xODU4IDc2LjU5OTggODMuMDkwOCA3NS44MzExTDgzLjA5MDggNzUuODMyQzgxLjk5NTcgNzUuMDYzNCA4MS4xNjY4IDczLjk3MjMgODAuNzIwNyA3Mi43MTA5TDgwLjcxMTkgNzIuNjg2NUw4MC43MDQxIDcyLjY2MTFMNzguNzMwNSA2Ni41ODU5Qzc4LjMxMTYgNjUuMzgzNCA3Ny42MjU2IDY0LjI5MTMgNzYuNzIyNyA2My4zOTI2Qzc1LjgyMDkgNjIuNDk1MSA3NC43MjY5IDYxLjgxNDMgNzMuNTIzNCA2MS40MDA0TDY3LjM2MjMgNTkuMzk1NUw2Ny4zNDY3IDU5LjM5MDZMNjcuMzMxMSA1OS4zODQ4QzY2LjA1MjkgNTguOTQ1NiA2NC45NDUgNTguMTE1NSA2NC4xNjUgNTcuMDExN0w2NC4xNTgyIDU3LjAwMjlMNjQuMTUyMyA1Ni45OTMyQzYzLjQwMjIgNTUuOTA2MSA2My4wMDAxIDU0LjYxNjYgNjMgNTMuMjk1OVoiIGZpbGw9IiNGRkY2MDAiIHN0cm9rZT0iIzQyQ0U5RiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMTc5Nl80NTkiPgo8cmVjdCB3aWR0aD0iMTQyIiBoZWlnaHQ9IjE0MiIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K";

interface ChatbotAsidePanelProps {
  ticketAnalyzer: TicketAnalyzer;
  onClose: () => void;
  initialWidth?: number;
}

const ChatbotAsidePanel: React.FC<ChatbotAsidePanelProps> = ({ ticketAnalyzer, onClose, initialWidth }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Resize functionality state
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(initialWidth || 400); // Use initialWidth if provided

  // Chat storage state
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Title truncation state
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resize constants
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 1000;
  const STORAGE_KEY = 'ai-ext-sidebar-width';

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate the new height based on content
    const lineHeight = 20; // Approximate line height in pixels
    const maxLines = 12;
    const minHeight = lineHeight + 12; // 1 line + padding
    const maxHeight = lineHeight * maxLines + 12; // 12 lines + padding

    let newHeight = Math.max(minHeight, textarea.scrollHeight);
    newHeight = Math.min(newHeight, maxHeight);

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    // Load saved width immediately when component mounts, but only if no initialWidth provided
    if (!initialWidth) {
      loadSavedWidth();
    }
  }, []);

  useEffect(() => {
    // Load ticket data and user info when component mounts
    loadTicketData();
    loadUserInfo();

    // Setup width sync listener and ticket change handler
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'SIDEBAR_WIDTH_UPDATE') {
        const newWidth = Math.max(MIN_WIDTH, Math.min(getMaxAllowedWidth(), event.data.width));
        setSidebarWidth(newWidth);
      } else if (event.data.type === 'TICKET_CHANGE') {
        handleTicketChange(event.data);
      }
    };

    window.addEventListener('message', handleWindowMessage);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Load chat history when ticket data is available
  useEffect(() => {
    const loadChatHistory = async () => {
      if (ticketData?.id) {
        try {
          setIsLoadingHistory(true);

          const savedMessages = await ChatStorageService.loadChatHistory(ticketData.id);
          if (savedMessages.length > 0) {
            setMessages(savedMessages);
          }
        } catch (error) {
          console.error('❌ [ChatbotAsidePanel] Failed to load chat history:', error);
          setStorageWarning('Không thể tải lịch sử chat.');
          setTimeout(() => setStorageWarning(null), 5000);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    loadChatHistory();
  }, [ticketData?.id]);

  // Auto-save messages when they change
  useEffect(() => {
    const saveChatHistory = async () => {
      if (!autoSaveEnabled || !ticketData?.id || !userInfo || messages.length === 0) {
        return;
      }

      try {
        const result = await ChatStorageService.saveChatHistory(
          ticketData.id,
          messages,
          ticketData,
          userInfo
        );

        if (!result.success) {
          setStorageWarning(result.error || 'Lỗi lưu chat history');

          // Disable auto-save if storage is consistently failing
          if (result.error?.includes('đầy') || result.error?.includes('quota')) {
            setAutoSaveEnabled(false);
            console.warn('⚠️ [ChatbotAsidePanel] Auto-save disabled due to storage issues');
          }
        } else {
          // Clear any previous warnings on successful save
          if (storageWarning && !storageWarning.includes('thành công')) {
            setStorageWarning(null);
          }

          if (result.cleaned) {
            // Show user that cleanup happened
            setStorageWarning('Đã dọn dẹp dữ liệu cũ để tiết kiệm bộ nhớ.');
            setTimeout(() => setStorageWarning(null), 5000);
          }
        }

      } catch (error) {
        console.error('❌ [ChatbotAsidePanel] Auto-save failed:', error);
        setStorageWarning('Không thể lưu chat history tự động.');
        setTimeout(() => setStorageWarning(null), 5000);
      }
    };

    // Debounce save operations to avoid excessive saves
    const saveTimeout = setTimeout(saveChatHistory, 2000);
    return () => clearTimeout(saveTimeout);
  }, [messages, ticketData?.id, userInfo, autoSaveEnabled]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-resize textarea when currentMessage changes
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [currentMessage]);

  useEffect(() => {
    // Apply width to sidebar
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${sidebarWidth}px`;

      // Update CSS custom property for layout adjustment
      document.documentElement.style.setProperty('--ai-ext-sidebar-width', `${sidebarWidth}px`);

      // Update position: when closed, it should be hidden to the right
      // When open, it should be at right: 0
      if (sidebarRef.current.classList.contains('ai-ext-open')) {
        sidebarRef.current.style.right = '0px';
      } else {
        sidebarRef.current.style.right = `${-sidebarWidth}px`;
      }
    }
  }, [sidebarWidth]);

  // Load saved width from storage
  const loadSavedWidth = async () => {
    try {
      // Don't attempt chrome.storage.local if we're in main world without access
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('⚠️ [ChatbotAsidePanel] Chrome storage not available in main world');
        return;
      }

      const result = await chrome.storage.local.get([STORAGE_KEY]);
      console.log('🔄 [ChatbotAsidePanel] Loading saved width from storage:', result);

      if (result[STORAGE_KEY]) {
        const savedWidth = Math.max(MIN_WIDTH, Math.min(getMaxAllowedWidth(), result[STORAGE_KEY]));
        setSidebarWidth(savedWidth);
      } else {
        console.log('ℹ️ [ChatbotAsidePanel] No saved width found, using default:', 400);
      }
    } catch (error) {
      console.log('❌ [ChatbotAsidePanel] Could not load saved width:', error);
    }
  };

  // Save width to storage
  const saveWidth = async (width: number) => {
    try {
      console.log('💾 [ChatbotAsidePanel] Saving width to storage:', width);

      // If chrome.storage not available (main world), send message to content script
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('📤 [ChatbotAsidePanel] Sending width save request to content script');
        window.postMessage({
          type: 'SAVE_SIDEBAR_WIDTH',
          width: width
        }, '*');
        return;
      }

      await chrome.storage.local.set({ [STORAGE_KEY]: width });
      console.log('✅ [ChatbotAsidePanel] Width saved successfully');

      // Broadcast width change to other tabs
      chrome.runtime.sendMessage({
        action: 'sidebarWidthChanged',
        width: width
      }).catch(() => {
        // Ignore errors if background script is not available
      });
    } catch (error) {
      console.log('❌ [ChatbotAsidePanel] Could not save width:', error);
      // Fallback: send message to content script
      window.postMessage({
        type: 'SAVE_SIDEBAR_WIDTH',
        width: width
      }, '*');
    }
  };

  // Calculate max width based on screen size
  const getMaxAllowedWidth = () => {
    return Math.min(MAX_WIDTH, window.innerWidth * 0.8);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    if (sidebarRef.current) {
      sidebarRef.current.classList.add('ai-ext-resizing');
    }

    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let currentWidth = startWidth; // Track current width

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new width: when moving left (negative deltaX), width should increase
      // when moving right (positive deltaX), width should decrease
      const deltaX = startX - e.clientX; // This gives us the distance moved from start point
      const newWidth = Math.max(MIN_WIDTH, Math.min(getMaxAllowedWidth(), startWidth + deltaX));
      currentWidth = newWidth; // Update current width
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (sidebarRef.current) {
        sidebarRef.current.classList.remove('ai-ext-resizing');
      }

      // Save the current width (use currentWidth instead of sidebarWidth)
      saveWidth(currentWidth);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicketData = async () => {
    try {
      const data = await ticketAnalyzer.extractTicketData();
      setTicketData(data);
    } catch (error) {
      console.error('Error loading ticket data:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      // Use postMessage to communicate with content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'USER_INFO_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ data: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'GET_USER_INFO',
          id: messageId
        }, '*');

        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for user info response'));
        }, 10000);
      });

      if (response.success && response.data) {
        setUserInfo(response.data);
      } else {
        console.log('❌ [ChatbotAsidePanel] Failed to load user info:', response.error);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleTicketChange = async (changeData: {
    oldTicketId: string | null;
    newTicketId: string | null;
    url: string;
    timestamp: number;
  }) => {
    // Chỉ xử lý nếu thực sự có thay đổi ticket ID
    if (changeData.oldTicketId !== changeData.newTicketId) {
      try {
        // Reset chat state
        setMessages([]);
        setCurrentMessage('');
        setIsTyping(false);
        setSummaryContent('');
        setSummaryError('');
        setStorageWarning(null);

        // Load new ticket data
        await loadTicketData();

        // Show transition notification
        setStorageWarning(`Đã chuyển sang ticket ${changeData.newTicketId || 'mới'}`);
        setTimeout(() => setStorageWarning(null), 3000);
      } catch (error) {
        console.error('❌ [ChatbotAsidePanel] Error during ticket transition:', error);
        setStorageWarning('Lỗi khi chuyển đổi ticket');
        setTimeout(() => setStorageWarning(null), 5000);
      }
    }
  };

  const handleTicketSummary = async () => {
    if (!ticketData) {
      setSummaryError('Không thể tìm thấy thông tin ticket');
      return;
    }

    try {
      setIsLoadingSummary(true);
      setSummaryError('');
      setSummaryContent('');


      // Request summary via postMessage to content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'SUMMARY_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ summary: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'REQUEST_SUMMARY',
          id: messageId,
          ticketId: ticketData.id,
          ticketData: ticketData
        }, '*');

        // Timeout
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for summary response'));
        }, 30000);
      });

      setSummaryContent(response.summary || response.response);
    } catch (error) {
      console.error('Error getting ticket summary:', error);
      setSummaryError(String(error));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSuggestionClick = (type: 'summary' | 'explain' | 'translate') => {
    // Messages for each suggestion type - these will appear as user messages in chat
    const suggestionMessages = {
      summary: 'Tóm tắt nội dung',
      explain: 'Giải thích yêu cầu ticket',
      translate: 'Dịch nội dung ticket'
    };

    // Send the suggestion as a message with 'suggestion' type
    handleSendMessage(suggestionMessages[type], 'suggestion');
  };

  const handleSendMessage = async (message: string, messageType: 'user' | 'suggestion' = 'user') => {
    if (!message.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    // Update messages with the new user message
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsTyping(true);

    // Reset textarea height after clearing message
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        autoResizeTextarea(textareaRef.current);
      }
    }, 0);

    try {
      // Build comprehensive context for AI
      const contextData = {
        message: message.trim(),
        messageType: messageType,
        ticketData: ticketData,
        chatHistory: newMessages, // Include current chat history with the new message
        userInfo: userInfo,
        timestamp: new Date().toISOString()
      };

      // Send message with full context via postMessage to content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'CHAT_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ response: event.data.data, success: true });
            } else {
              console.error('❌ [ChatbotAsidePanel] Response error:', event.data.error);
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'CHAT_MESSAGE',
          id: messageId,
          data: contextData
        }, '*');

        // Timeout
        setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Timeout waiting for chat response'));
        }, 30000);
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        return newMessages;
      });

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Lỗi: ${error}`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearSummary = () => {
    setSummaryContent('');
    setSummaryError('');
  };

  // Manual save function
  const handleManualSave = async () => {
    if (!ticketData?.id || !userInfo) {
      setStorageWarning('Thiếu thông tin ticket hoặc user để lưu.');
      setTimeout(() => setStorageWarning(null), 3000);
      return;
    }

    try {
      const result = await ChatStorageService.saveChatHistory(
        ticketData.id,
        messages,
        ticketData,
        userInfo
      );

      if (result.success) {
        setAutoSaveEnabled(true); // Re-enable auto-save on successful manual save
        setTimeout(() => setStorageWarning(null), 3000);
      } else {
        setStorageWarning(result.error || 'Lỗi khi lưu chat history');
        setTimeout(() => setStorageWarning(null), 5000);
      }
    } catch (error) {
      console.error('❌ [ChatbotAsidePanel] Manual save failed:', error);
      setStorageWarning('Không thể lưu chat history.');
      setTimeout(() => setStorageWarning(null), 5000);
    }
  };

  // Clear chat history function
  const handleClearHistory = async () => {
    if (!ticketData?.id) {
      setStorageWarning('Không có thông tin ticket để xóa.');
      setTimeout(() => setStorageWarning(null), 3000);
      return;
    }

    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat cho ticket này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      const success = await ChatStorageService.clearChatHistory(ticketData.id);

      if (success) {
        setMessages([]);
        setStorageWarning('🗑️ Đã xóa lịch sử chat thành công.');
        setTimeout(() => setStorageWarning(null), 3000);
      } else {
        setStorageWarning('Không thể xóa lịch sử chat.');
        setTimeout(() => setStorageWarning(null), 5000);
      }
    } catch (error) {
      console.error('❌ [ChatbotAsidePanel] Failed to clear chat history:', error);
      setStorageWarning('Lỗi khi xóa lịch sử chat.');
      setTimeout(() => setStorageWarning(null), 5000);
    }
  };

  const formatMessageContent = (content: string): string => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>');
  };

  // Helper function to check if title needs truncation
  const shouldTruncateTitle = (title: string): boolean => {
    return title.length > 50; // Truncate if longer than 50 characters (suitable for 1 line)
  };

  // Helper function to get truncated title
  const getTruncatedTitle = (title: string): string => {
    if (!shouldTruncateTitle(title)) return title;
    return title.substring(0, 50) + '...';
  };

  return (
    <div className="ai-ext-aside-content" ref={sidebarRef}>
      {/* Resize Handle */}
      <div
        className={`ai-ext-resize-handle ${isResizing ? 'ai-ext-resize-active' : ''}`}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="ai-ext-header">
        <h3 className="ai-ext-title">
          <img src={aiIcon} alt="AI Icon" className="ai-ext-icon" />
          Backlog AI Assistant
        </h3>
        <button
          className="ai-ext-close-button"
          onClick={onClose}
          title="Đóng chatbot"
        >
          ✕
        </button>
      </div>

      {/* Storage warning banner */}
      {storageWarning && (
        <div className={`ai-ext-storage-warning ${
          storageWarning.includes('thành công') || storageWarning.includes('✅') ? 'success' :
          storageWarning.includes('dọn dẹp') ? 'info' : 'warning'
        }`}>
          <span>{storageWarning}</span>
          {!autoSaveEnabled && (
            <button
              className="ai-ext-manual-save-btn"
              onClick={handleManualSave}
              title="Lưu chat history thủ công"
            >
              💾 Lưu
            </button>
          )}
        </div>
      )}

      {/* Ticket Info */}
      {ticketData && (
        <div className="ai-ext-ticket-info">
          <div className="ai-ext-ticket-title">
            <div className="ai-ext-title-wrapper">
              <div
                className={`ai-ext-title-content ${isTitleExpanded ? 'ai-ext-title-expanded' : 'ai-ext-title-truncated'}`}
                title={ticketData.title} // Tooltip showing full title
              >
                <strong>{ticketData.id}</strong>: {
                  isTitleExpanded || !shouldTruncateTitle(ticketData.title)
                    ? ticketData.title
                    : getTruncatedTitle(ticketData.title)
                }
              </div>
              {shouldTruncateTitle(ticketData.title) && (
                <button
                  className="ai-ext-toggle-title-caret"
                  onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                  title={isTitleExpanded ? "Thu gọn tiêu đề" : "Xem đầy đủ tiêu đề"}
                  aria-label={isTitleExpanded ? "Thu gọn tiêu đề" : "Xem đầy đủ tiêu đề"}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    className={`ai-ext-caret-icon ${isTitleExpanded ? 'ai-ext-caret-up' : 'ai-ext-caret-down'}`}
                  >
                    <path d="M6 8L2 4h8z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="ai-ext-ticket-meta">
            <span className="ai-ext-status">{ticketData.status}</span>
            {ticketData.assignee && (
              <span className="ai-ext-assignee">👤 {ticketData.assignee}</span>
            )}
            {ticketData.priority && (
              <span className="ai-ext-priority">⚡ {ticketData.priority}</span>
            )}
          </div>
        </div>
      )}

      {/* Chat Section */}
      <div className="ai-ext-chatbot-content">
        <div className="ai-ext-chat-header">
          <h4>💬 Chat với AI</h4>
          <div className="ai-ext-chat-controls">
            {messages.length > 0 && (
              <>
                {!autoSaveEnabled && (
                  <button
                    className="ai-ext-control-button ai-ext-save-button"
                    onClick={handleManualSave}
                    title="Lưu chat history thủ công"
                  >
                    💾
                  </button>
                )}
                <button
                  className="ai-ext-control-button ai-ext-clear-button"
                  onClick={handleClearHistory}
                  title="Xóa lịch sử chat"
                >
                  🗑️
                </button>
              </>
            )}
            {isLoadingHistory && (
              <div className="ai-ext-loading-indicator" title="Đang tải lịch sử chat...">
                ⏳
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="ai-ext-messages-container">
          {messages.length === 0 ? (
            <div className="ai-ext-welcome-message">
              <p>👋 Xin chào! Tôi có thể giúp bạn phân tích ticket này.</p>
              <p>Hãy hỏi tôi bất cứ điều gì về ticket!</p>

              {/* Suggestion buttons */}
              <div className="ai-ext-suggestion-buttons">
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('summary')}
                  disabled={isTyping}
                >
                  📝 Tóm tắt nội dung
                </button>
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('explain')}
                  disabled={isTyping}
                >
                  💡 Giải thích yêu cầu ticket
                </button>
                <button
                  className="ai-ext-suggestion-button"
                  onClick={() => handleSuggestionClick('translate')}
                  disabled={isTyping}
                >
                  🌍 Dịch nội dung ticket
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`ai-ext-message ai-ext-message-${message.sender}`}
              >
                <div className="ai-ext-message-avatar">
                  {message.sender === 'user' ? (
                    userInfo?.avatar && userInfo.avatar.trim() ? (
                      <img
                        src={userInfo.avatar}
                        alt={userInfo.name || 'User'}
                        title={userInfo.name || 'User'}
                        className="ai-ext-avatar-image"
                        onError={(e) => {
                          console.error('Failed to load user avatar:', userInfo.avatar);
                          // Hide broken image and show fallback
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null
                  ) : (
                    <img
                      src={aiIcon}
                      alt="AI Assistant"
                      title="AI Assistant"
                      className="ai-ext-avatar-image ai-ext-ai-avatar"
                    />
                  )}
                  {message.sender === 'user' && (
                    <span
                      className="ai-ext-avatar-fallback"
                      style={{
                        display: (userInfo?.avatar && userInfo.avatar.trim()) ? 'none' : 'flex'
                      }}
                    >
                      👤
                    </span>
                  )}
                </div>
                <div className="ai-ext-message-content">
                  {message.sender === 'ai' ? (
                    <div className="ai-ext-message-text">
                      <MarkdownRenderer content={message.content} />
                    </div>
                  ) : (
                    <div
                      className="ai-ext-message-text"
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                    />
                  )}
                  <div className="ai-ext-message-time"
                       title={formatFullTimestamp(safeTimestampToDate(message.timestamp))}>
                    {formatRelativeTime(safeTimestampToDate(message.timestamp))}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="ai-ext-message ai-ext-message-ai">
              <div className="ai-ext-message-avatar">
                <img
                  src={aiIcon}
                  alt="AI Assistant"
                  title="AI Assistant"
                  className="ai-ext-avatar-image ai-ext-ai-avatar"
                />
              </div>
              <div className="ai-ext-message-content">
                <div className="ai-ext-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="ai-ext-chat-input-container">
          <div className="ai-ext-chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="ai-ext-chat-input"
              placeholder={`Nhập câu hỏi về ticket... (Enter để xuống dòng • ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter để gửi)`}
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                autoResizeTextarea(e.target as HTMLTextAreaElement);
              }}
              onKeyDown={(e) => {
                // Handle Ctrl+Enter or Cmd+Enter to submit
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage(currentMessage);
                }
              }}
              disabled={isTyping}
              rows={1}
              style={{
                resize: 'none',
                overflow: 'hidden'
              }}
            />
            <button
              className="ai-ext-send-button"
              onClick={() => handleSendMessage(currentMessage)}
              disabled={!currentMessage.trim() || isTyping}
              title={isTyping ? 'Đang xử lý...' : 'Gửi tin nhắn (Ctrl/Cmd + Enter)'}
            >
              {isTyping ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotAsidePanel;
