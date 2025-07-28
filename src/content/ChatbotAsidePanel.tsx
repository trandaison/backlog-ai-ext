import React, { useState, useEffect, useRef } from 'react';
import { TicketAnalyzer, TicketData } from '../shared/ticketAnalyzer';

// AI Icon as data URL
const aiIcon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQyIiBoZWlnaHQ9IjE0MiIgdmlld0JveD0iMCAwIDE0MiAxNDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xNzk2XzQ1OSkiPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTExMi41MjEgMTQxLjI3N0gyOS41NDk0QzEzLjgyNDMgMTQxLjI3NyAwLjk1NzAzMSAxMjguMzkgMC45NTcwMzEgMTEyLjYzOVYyOS41MzEyQzAuOTU3MDMxIDEzLjc4MDQgMTMuODI0MyAwLjg5MzU1NSAyOS41NDk0IDAuODkzNTU1SDExMi41MjFDMTI4LjI0NiAwLjg5MzU1NSAxNDEuMTEyIDEzLjc4MDQgMTQxLjExMiAyOS41MzEyVjExMi42MzlDMTQxLjExMiAxMjguMzkgMTI4LjI0NiAxNDEuMjc3IDExMi41MjEgMTQxLjI3N1oiIGZpbGw9IiM0MkNFOUYiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01Mi4xOTkgNjEuMzI0MkM1Mi4xNDQzIDcyLjk3NTIgNTIuMTE0OCA4NC4zMTI3IDUyLjE0NDIgOTEuMDk2NEM2Mi4yNzU4IDkwLjU0NjcgNjcuMjkzOSA4OC40ODI3IDcxLjI2MzQgODMuNzEzOEM3NC4wNzc3IDgwLjMzMjUgNzQuNjg2OSA3Ni40NTkxIDcyLjk4IDcyLjgwNzlDNzAuNzQ2OCA2OC4wMzMzIDY0LjE4MDYgNjIuOTkwMiA1Mi4xOTkgNjEuMzI0MlpNNDUuNTM1OSAxMDQuNzk2QzQzLjczNSAxMDQuNzk2IDQyLjAwNzEgMTA0LjA3NiA0MC43MzgyIDEwMi43OTdMNDAuNzM1NCAxMDIuNzk0QzM4Ljc0MzYgMTAwLjc4NSAzOC43MTU1IDk4Ljg2MjggMzguNjY1IDk1LjM3NDdDMzguNjM5NyA5My42NTEgMzguNjI0MyA5MS4yMDg5IDM4LjYxNzMgODguMjkwMUMzOC42MDYgODMuMTcyNSAzOC42MTg3IDc2LjA3MTEgMzguNjUzOCA2Ny4xODEzQzM4LjcxNTUgNTEuODg2MSAzOC44MjY0IDM2LjYzODcgMzguODI2NCAzNi42Mzg3TDUyLjM0NSAzNi43MzcxQzUyLjMxOTcgNDAuMTE1NiA1Mi4yOTU4IDQzLjgzMDEgNTIuMjcyIDQ3LjcwNjJDNjguMjY4IDQ5LjU1MzYgODAuMjgzMiA1Ni41MDA0IDg1LjIyMjcgNjcuMDY2Qzg5LjE2NDEgNzUuNDk0NiA4Ny44MjY1IDg0Ljk1OTQgODEuNjQ3NiA5Mi4zODQyQzcyLjExNjggMTAzLjgzNyA1OC41ODE0IDEwNC43OTYgNDUuNTM1OSAxMDQuNzk2WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTk4LjQ0MTQgMjcuMzY3MkM5OC40MzM1IDI2LjI2MiA5OC43NzM2IDI1LjE4MzEgOTkuNDEyMSAyNC4yODIyQzEwMC4wMTEgMjMuNDM3NiAxMDAuODQ0IDIyLjc4ODcgMTAxLjgwNiAyMi40MTVMMTAyIDIyLjM0MzdMMTAyLjAzMSAyMi4zMzRMMTA1LjE4OSAyMS4zMDQ3TDEwNS4zMTkgMjEuMjU2OEMxMDUuNjIgMjEuMTM2NSAxMDUuODk0IDIwLjk1NiAxMDYuMTI0IDIwLjcyNTZDMTA2LjM4NSAyMC40NjQgMTA2LjU4MSAyMC4xNDUgMTA2LjY5NyAxOS43OTQ5TDEwNy43MDQgMTYuNjk1M0MxMDguMDI5IDE1LjY3NDIgMTA4LjY1MyAxNC43NzYxIDEwOS40OTIgMTQuMTE2MkwxMDkuNjYyIDEzLjk4NzNMMTA5LjY2OSAxMy45ODI0TDEwOS42NzUgMTMuOTc4NUMxMTAuNTY4IDEzLjM0MjQgMTExLjYzOCAxMyAxMTIuNzM1IDEzQzExMy44MzIgMTMgMTE0LjkwMiAxMy4zNDIgMTE1Ljc5NiAxMy45Nzg1TDExNS43OTUgMTMuOTc5NUMxMTYuNjg1IDE0LjYxMTIgMTE3LjM2IDE1LjUwMTMgMTE3LjcyNiAxNi41MzAzTDExNy43MzUgMTYuNTU2NkwxMTcuNzQ0IDE2LjU4M0wxMTguNzc1IDE5Ljc2MjdDMTE4Ljg5NCAyMC4xMDcyIDExOS4wOSAyMC40MTk5IDExOS4zNDkgMjAuNjc3N0MxMTkuNjEyIDIwLjkzOTkgMTE5LjkzMiAyMS4xMzczIDEyMC4yODQgMjEuMjUzOUwxMjMuMzkzIDIyLjI2NTZMMTIzLjQxMiAyMi4yNzE1QzEyNC40NzIgMjIuNjI4NiAxMjUuMzk0IDIzLjMxMjQgMTI2LjA0MiAyNC4yMjU2TDEyNi4xNjMgMjQuNDA3MkMxMjYuNzEgMjUuMjU4MSAxMjcgMjYuMjQ5MSAxMjYuOTk5IDI3LjI2MjdDMTI2Ljk5OSAyNy4yNjgyIDEyNyAyNy4yNzM4IDEyNyAyNy4yNzkzTDEyNi45OTkgMjcuMjc5M0MxMjcgMjguMjk5MyAxMjYuNzA1IDI5LjI5NiAxMjYuMTUyIDMwLjE0OTRMMTI2LjAzOCAzMC4zMTkzQzEyNS40MDggMzEuMjEyNCAxMjQuNTE2IDMxLjg4OTQgMTIzLjQ4MyAzMi4yNTM5TDEyMy40NTkgMzIuMjYyN0wxMjMuNDM2IDMyLjI2OTVMMTIwLjI2OSAzMy4yOTg4QzExOS45MTUgMzMuNDE1IDExOS41OTQgMzMuNjEyMiAxMTkuMzMxIDMzLjg3NUwxMTkuMzMgMzMuODc1QzExOS4wNjkgMzQuMTM1MyAxMTguODcyIDM0LjQ1MjYgMTE4Ljc1NSAzNC44MDE4TDExNy43NCAzNy45MjA5TDExNy43MzggMzcuOTI4N0wxMTcuNzM1IDM3LjkzNTVDMTE3LjM4MiAzOC45OTM0IDExNi43MDUgMzkuOTEyMyAxMTUuOCA0MC41NjI1TDExNS43OTQgNDAuNTY2NEMxMTQuOSA0MS4yMDM2IDExMy44MyA0MS41NDU5IDExMi43MzIgNDEuNTQ1OUMxMTEuNzA0IDQxLjU0NTkgMTEwLjcgNDEuMjQ0OCAxMDkuODQyIDQwLjY4MjZMMTA5LjY3MiA0MC41Njc0QzEwOC43ODIgMzkuOTM1NyAxMDguMTA4IDM5LjA0NDMgMTA3Ljc0MiAzOC4wMTU2TDEwNy43MzIgMzcuOTg5M0wxMDcuNzI0IDM3Ljk2MjlMMTA2LjcwMSAzNC44MTE1QzEwNi41NzkgMzQuNDc1NyAxMDYuMzgzIDM0LjE3MDkgMTA2LjEyNyAzMy45MjA5QzEwNS44NjUgMzMuNjY1NSAxMDUuNTQ4IDMzLjQ3NDEgMTA1LjIgMzMuMzYwM0wxMDIuMDc0IDMyLjMzOThMMTAyLjA3MSAzMi4zMzg5QzEwMS4wMjIgMzEuOTk0OCAxMDAuMTA2IDMxLjMyOTYgOTkuNDU1MSAzMC40Mzc1Qzk4LjgwMzcgMjkuNTQ1MSA5OC40NDkzIDI4LjQ3MTQgOTguNDQxNCAyNy4zNjcyWk02MyA1My4yOTU5QzYzIDUyLjA1NzUgNjMuMzUzNiA1MC44NDY5IDY0LjAxNTYgNDkuODA0N0w2NC4xNTE0IDQ5LjU5NzdMNjQuMTU4MiA0OS41ODg5TDY0LjE2NDEgNDkuNTgwMUM2NC44ODM5IDQ4LjU2MTEgNjUuODg0NCA0Ny43NzQ3IDY3LjA0MSA0Ny4zMTU0TDY3LjI3NDQgNDcuMjI3NUw2Ny4yOTc5IDQ3LjIxOTdMNjcuMzIyMyA0Ny4yMTE5TDczLjQwOTIgNDUuMjM0NEw3My44NjgyIDQ1LjA2NjRDNzQuOTI3NiA0NC42NDI2IDc1Ljg5MTggNDQuMDA3MSA3Ni43MDAyIDQzLjE5NzNDNzcuNjIxMSA0Mi4yNzQ0IDc4LjMxNDUgNDEuMTUwMyA3OC43MjY2IDM5LjkxNDFMODAuNjc5NyAzMy45MTAyTDgwLjY3OTcgMzMuOTA5Mkw4MC42OTE0IDMzLjg3NEw4MC42OTE0IDMzLjg3NUM4MC45ODk5IDMyLjkxNTggODEuNTA4NSAzMi4wMzg3IDgyLjIwOCAzMS4zMTY0QzgyLjkxNTYgMzAuNTg1NSA4My43ODcgMzAuMDMzMyA4NC43NSAyOS43MDUxQzg1LjcxMzEgMjkuMzc2NyA4Ni43NDAxIDI5LjI4MjcgODcuNzQ2MSAyOS40Mjg3Qzg4Ljc0OTQgMjkuNTc0MyA4OS43MDI5IDI5Ljk1NjEgOTAuNTMwMyAzMC41NDFMOTAuNTMxMiAzMC41NEM5MS42MjUxIDMxLjMwNzMgOTIuNDUxNSAzMi4zOTgzIDkyLjg5MzYgMzMuNjU5Mkw5Mi45MDE0IDMzLjY4MDdMOTIuOTA4MiAzMy43MDMxTDk0Ljg4NTcgMzkuNzkxTDk0Ljg4NjcgMzkuNzlDOTUuMjQ5MiA0MC44NzUzIDk1LjgyODggNDEuODczNiA5Ni41ODc5IDQyLjcyNTZMOTYuOTIzOCA0My4wODJDOTcuODQ2OCA0NC4wMDQ0IDk4Ljk3MTkgNDQuNzAxNCAxMDAuMjEgNDUuMTE1MkwxMDAuMjExIDQ1LjExNDNMMTA2LjU5NSA0Ny4yMTA5TDEwNi42ODYgNDcuMjQxMkwxMDYuNzcyIDQ3LjI3ODNDMTA3LjkxOSA0Ny43Nzk3IDEwOC44OTQgNDguNjA0NyAxMDkuNTc5IDQ5LjY1MTRMMTA5LjU4IDQ5LjY1MTRDMTEwLjI2NSA1MC42OTgxIDExMC42MyA1MS45MjI1IDExMC42MzEgNTMuMTczOEwxMTAuNjMxIDUzLjE3NThDMTEwLjYzIDU0LjUwNzQgMTEwLjIxNSA1NS44MDU0IDEwOS40NDYgNTYuODkxNkwxMDkuNDQ2IDU2Ljg5MjZDMTA4LjY3NyA1Ny45NzkgMTA3LjU4OSA1OC44MDAxIDEwNi4zMzMgNTkuMjQzMkwxMDYuMzExIDU5LjI1MUwxMDYuMjg3IDU5LjI1ODhMMTAwLjE5NiA2MS4yNDMyQzk5LjI5MDQgNjEuNTQwMyA5OC40NDE4IDYxLjk5MDggOTcuNjg4NSA2Mi41NzUyTDk3LjY4MjYgNjIuNTgwMUM5Ny40MDU4IDYyLjc5MzEgOTcuMTQyNSA2My4wMjMyIDk2Ljg5NTUgNjMuMjY5NUM5NS45NjYzIDY0LjIwMDUgOTUuMjY2MSA2NS4zMzQ5IDk0Ljg0ODYgNjYuNTgyTDk0Ljg0ODYgNjYuNTgzTDkyLjg5MjYgNzIuNjA2NEw5Mi44ODQ4IDcyLjYzMThDOTIuNDU1MiA3My44OTg4IDkxLjY0MDYgNzUuMDAwMyA5MC41NTU3IDc1Ljc4MzJDODkuNDcwOCA3Ni41NjU5IDg4LjE2ODggNzYuOTkxMiA4Ni44MzExIDc3Qzg1LjQ5MzQgNzcuMDA4NyA4NC4xODU4IDc2LjU5OTggODMuMDkwOCA3NS44MzExTDgzLjA5MDggNzUuODMyQzgxLjk5NTcgNzUuMDYzNCA4MS4xNjY4IDczLjk3MjMgODAuNzIwNyA3Mi43MTA5TDgwLjcxMTkgNzIuNjg2NUw4MC43MDQxIDcyLjY2MTFMNzguNzMwNSA2Ni41ODU5Qzc4LjMxMTYgNjUuMzgzNCA3Ny42MjU2IDY0LjI5MTMgNzYuNzIyNyA2My4zOTI2Qzc1LjgyMDkgNjIuNDk1MSA3NC43MjY5IDYxLjgxNDMgNzMuNTIzNCA2MS40MDA0TDY3LjM2MjMgNTkuMzk1NUw2Ny4zNDY3IDU5LjM5MDZMNjcuMzMxMSA1OS4zODQ4QzY2LjA1MjkgNTguOTQ1NiA2NC45NDUgNTguMTE1NSA2NC4xNjUgNTcuMDExN0w2NC4xNTgyIDU3LjAwMjlMNjQuMTUyMyA1Ni45OTMyQzYzLjQwMjIgNTUuOTA2MSA2My4wMDAxIDU0LjYxNjYgNjMgNTMuMjk1OVoiIGZpbGw9IiNGRkY2MDAiIHN0cm9rZT0iIzQyQ0U5RiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMTc5Nl80NTkiPgo8cmVjdCB3aWR0aD0iMTQyIiBoZWlnaHQ9IjE0MiIgZmlsbD0id2hpdGUiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface UserInfo {
  id: number;
  name: string;
  avatar: string;
  mailAddress: string;
  userId: string;
  nulabAccount?: {
    nulabId: string;
    name: string;
    uniqueId: string;
    iconUrl: string;
  };
}

interface ChatbotAsidePanelProps {
  ticketAnalyzer: TicketAnalyzer;
  onClose: () => void;
}

const ChatbotAsidePanel: React.FC<ChatbotAsidePanelProps> = ({ ticketAnalyzer, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load ticket data and user info when component mounts
    loadTicketData();
    loadUserInfo();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicketData = async () => {
    try {
      const data = await ticketAnalyzer.extractTicketData();
      setTicketData(data);
      console.log('🎯 [ChatbotAsidePanel] Loaded ticket data:', data);
    } catch (error) {
      console.error('Error loading ticket data:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      console.log('🔍 [ChatbotAsidePanel] Loading user info...');

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
        console.log('✅ [ChatbotAsidePanel] User info loaded:', response.data);
        console.log('🔍 [ChatbotAsidePanel] Avatar URL:', response.data.avatar);
        console.log('🔍 [ChatbotAsidePanel] NulabAccount:', response.data.nulabAccount);
      } else {
        console.log('❌ [ChatbotAsidePanel] Failed to load user info:', response.error);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
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

      console.log('🔄 [ChatbotAsidePanel] Requesting summary for ticket:', ticketData.id);

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
      console.log('✅ [ChatbotAsidePanel] Summary received:', response);

    } catch (error) {
      console.error('Error getting ticket summary:', error);
      setSummaryError(String(error));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSuggestionClick = (type: 'summary' | 'explain' | 'translate') => {
    console.log('🎯 [ChatbotAsidePanel] Suggestion clicked:', type);

    // Messages for each suggestion type - these will appear as user messages in chat
    const suggestionMessages = {
      summary: 'Tóm tắt nội dung',
      explain: 'Giải thích yêu cầu ticket',
      translate: 'Dịch nội dung ticket'
    };

    // Send the suggestion as a message
    handleSendMessage(suggestionMessages[type]);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      // Send message via postMessage to content script
      const response = await new Promise<any>((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const responseHandler = (event: MessageEvent) => {
          if (event.source !== window) return;

          if (event.data.type === 'CHAT_RESPONSE' && event.data.id === messageId) {
            window.removeEventListener('message', responseHandler);

            if (event.data.success) {
              resolve({ response: event.data.data, success: true });
            } else {
              reject(new Error(event.data.error));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        window.postMessage({
          type: 'CHAT_MESSAGE',
          id: messageId,
          message: message,
          ticketData: ticketData,
          chatHistory: messages
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

      setMessages(prev => [...prev, aiMessage]);

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

  const formatMessageContent = (content: string): string => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>');
  };

  return (
    <div className="ai-ext-aside-content">
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

      {/* Ticket Info */}
      {ticketData && (
        <div className="ai-ext-ticket-info">
          <div className="ai-ext-ticket-title">
            <strong>{ticketData.id}</strong>: {ticketData.title}
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
                  <div
                    className="ai-ext-message-text"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                  />
                  <div className="ai-ext-message-time">
                    {message.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
            <input
              type="text"
              className="ai-ext-chat-input"
              placeholder="Nhập câu hỏi về ticket..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(currentMessage);
                }
              }}
              disabled={isTyping}
            />
            <button
              className="ai-ext-send-button"
              onClick={() => handleSendMessage(currentMessage)}
              disabled={!currentMessage.trim() || isTyping}
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
