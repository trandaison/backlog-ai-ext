import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  // Configure marked options for better rendering
  const renderer = new marked.Renderer();

  // Custom link renderer to open in new tab and add security
  renderer.link = ({ href, title, tokens }) => {
    // Convert tokens back to text
    const text = tokens.map(token => {
      if (typeof token === 'string') return token;
      return token.raw || '';
    }).join('');
    return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  // Custom code block renderer with language support
  renderer.code = ({ text, lang }) => {
    const language = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${language}>${text}</code></pre>`;
  };

  // Configure marked options
  marked.setOptions({
    renderer,
    gfm: true, // GitHub Flavored Markdown
    breaks: true // Convert line breaks to <br>
  });

  // Parse markdown to HTML
  const htmlContent = marked.parse(content);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
