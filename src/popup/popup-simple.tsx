import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const SimplePopupApp: React.FC = () => {
  const [message, setMessage] = useState('Extension is working!');

  return (
    <div style={{ padding: '20px', width: '300px' }}>
      <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
        🤖 Simple Test
      </h2>
      <p style={{ margin: '0 0 10px 0', color: '#666' }}>
        {message}
      </p>
      <button
        onClick={() => setMessage('Button clicked!')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
};

// Simple render
console.log('Simple popup script loaded');
const container = document.getElementById('popup-root');
console.log('Container:', container);

if (container) {
  try {
    const root = createRoot(container);
    root.render(<SimplePopupApp />);
    console.log('Simple popup rendered');
  } catch (error) {
    console.error('Render error:', error);
  }
} else {
  console.error('No popup-root found');
}
