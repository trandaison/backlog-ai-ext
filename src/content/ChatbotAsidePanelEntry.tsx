// Entry point for ChatbotAsidePanel to be loaded as separate bundle
import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatbotAsidePanel from './ChatbotAsidePanel';

// Export to global scope for main world access
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;
(window as any).ChatbotAsidePanel = ChatbotAsidePanel;

console.log('🎯 [ChatbotAsidePanelEntry] React components loaded to global scope in main world');

// Set up message listener for component checks from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'CHECK_COMPONENTS') {
    const available = !!(window as any).React &&
                     !!(window as any).ReactDOM &&
                     !!(window as any).ChatbotAsidePanel;

    console.log('🎯 [MainWorld] Components check:', {
      React: !!(window as any).React,
      ReactDOM: !!(window as any).ReactDOM,
      ChatbotAsidePanel: !!(window as any).ChatbotAsidePanel,
      available
    });

    window.postMessage({
      type: 'COMPONENTS_CHECK_RESPONSE',
      id: event.data.id,
      available
    }, '*');
  }

  if (event.data.type === 'CREATE_COMPONENT') {
    try {
      console.log('🎯 [MainWorld] Looking for container:', event.data.containerId);
      const container = document.getElementById(event.data.containerId);

      if (!container) {
        console.log('🎯 [MainWorld] Available elements with IDs:',
          Array.from(document.querySelectorAll('[id]')).map(el => el.id).slice(0, 10)
        );
        throw new Error(`Container ${event.data.containerId} not found`);
      }

      console.log('🎯 [MainWorld] Found container:', container);

      const React = (window as any).React;
      const ReactDOM = (window as any).ReactDOM;
      const ChatbotAsidePanel = (window as any).ChatbotAsidePanel;

      if (!React || !ReactDOM || !ChatbotAsidePanel) {
        throw new Error('React components not available');
      }

      // Create a message-based ticket analyzer
      const ticketAnalyzer = {
        extractTicketData: async () => {
          return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();

            const responseHandler = (event: MessageEvent) => {
              if (event.source !== window) return;

              if (event.data.type === 'TICKET_DATA_RESPONSE' && event.data.id === messageId) {
                window.removeEventListener('message', responseHandler);

                if (event.data.success) {
                  resolve(event.data.data);
                } else {
                  reject(new Error(event.data.error));
                }
              }
            };

            window.addEventListener('message', responseHandler);

            window.postMessage({
              type: 'REQUEST_TICKET_DATA',
              id: messageId
            }, '*');

            // Timeout
            setTimeout(() => {
              window.removeEventListener('message', responseHandler);
              reject(new Error('Timeout requesting ticket data'));
            }, 5000);
          });
        }
      };

      // Message-based onClose handler
      const onClose = () => {
        window.postMessage({
          type: 'CHATBOT_CLOSE'
        }, '*');
      };

      console.log('🔧 [MainWorld] Creating component with props:', event.data.props);

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(ChatbotAsidePanel, {
        ticketAnalyzer,
        onClose,
        initialWidth: event.data.props?.initialWidth // Pass initialWidth from props
      }));

      // Store root for later cleanup
      (window as any).chatbotRoot = root;

      window.postMessage({
        type: 'COMPONENT_CREATED',
        id: event.data.id,
        success: true
      }, '*');

      console.log('✅ [MainWorld] Component created successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [MainWorld] Failed to create component:', error);
      window.postMessage({
        type: 'COMPONENT_CREATED',
        id: event.data.id,
        success: false,
        error: errorMessage
      }, '*');
    }
  }
});

// Also create a helper function for content script to use
(window as any).createChatbotComponent = (container: Element, props: any) => {
  try {
    const React = (window as any).React;
    const ReactDOM = (window as any).ReactDOM;
    const ChatbotAsidePanel = (window as any).ChatbotAsidePanel;

    if (!React || !ReactDOM || !ChatbotAsidePanel) {
      throw new Error('React components not available');
    }

    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(ChatbotAsidePanel, props));

    return root;
  } catch (error) {
    console.error('🎯 [MainWorld] Failed to create component:', error);
    throw error;
  }
};

// Notify content script that components are loaded
window.postMessage({
  type: 'REACT_COMPONENTS_LOADED'
}, '*');

console.log('🎯 [ChatbotAsidePanelEntry] Setup complete, components ready for use');
