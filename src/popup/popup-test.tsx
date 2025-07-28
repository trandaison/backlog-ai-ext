// Simple popup test
import React from 'react';
import { createRoot } from 'react-dom/client';

const TestApp = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>🤖 Test Popup</h2>
      <p>React is working!</p>
      <button onClick={() => alert('Button clicked!')}>
        Test Button
      </button>
    </div>
  );
};

// Try to render
try {
  console.log('Attempting to render React app...');
  const container = document.getElementById('popup-root');
  console.log('Container found:', container);

  if (container) {
    const root = createRoot(container);
    console.log('Root created:', root);
    root.render(<TestApp />);
    console.log('App rendered successfully');
  } else {
    console.error('popup-root element not found');
  }
} catch (error) {
  console.error('Error rendering React app:', error);
}
