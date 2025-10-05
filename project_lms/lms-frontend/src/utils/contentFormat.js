// Simple content formatting utilities
// formatContent(raw): returns HTML string (safe for plain text -> paragraphs, preserves HTML if present)
// excerptText(raw, maxLen): returns plain-text excerpt

export function formatContent(raw) {
  if (!raw) return '<p>No content</p>';
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (looksLikeHtml) return raw;

  let text = String(raw || '');
  text = text.replace(/\r\n?/g, '\n').trim();

  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, (m, code) => {
    const idx = codeBlocks.push(code) - 1;
    return `\n\n{{CODE_BLOCK_${idx}}}\n\n`;
  });

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = escapeHtml(text);

  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => `<img src="${url}" alt="${alt}" />`);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, url) => `<a href="${url}" target="_blank" rel="noreferrer">${t}</a>`);

  text = text.replace(/^######\s*(.*)$/gm, '<h6>$1</h6>');
  text = text.replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>');
  text = text.replace(/^####\s*(.*)$/gm, '<h4>$1</h4>');
  text = text.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
  text = text.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
  text = text.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');

  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  text = text.replace(/(^|\n)([ \t]*[-\*] .+(?:\n[ \t]*[-\*] .+)*)/g, (m, pre, block) => {
    const items = block.split(/\n/).map(line => line.replace(/^[ \t]*[-\*]\s+/, ''));
    return `${pre}<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  });

  text = text.replace(/(^|\n)([ \t]*\d+\. .+(?:\n[ \t]*\d+\. .+)*)/g, (m, pre, block) => {
    const items = block.split(/\n/).map(line => line.replace(/^[ \t]*\d+\.\s+/, ''));
    return `${pre}<ol>${items.map(i => `<li>${i}</li>`).join('')}</ol>`;
  });

  const parts = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  let html = parts.map(part => `<p>${part.replace(/\n/g, '<br/>')}</p>`).join('\n');

  html = html.replace(/\{\{CODE_BLOCK_(\d+)\}\}/g, (m, idx) => {
    const code = codeBlocks[Number(idx)] || '';
    const escapedCode = escapeHtml(code);
    return `<pre><code>${escapedCode}</code></pre>`;
  });

  return html;
}

export function excerptText(raw, maxLen = 120) {
  if (!raw) return '';
  // Remove HTML tags if any
  const stripped = String(raw).replace(/<[^>]*>/g, '');
  if (stripped.length <= maxLen) return stripped;
  // Truncate at word boundary
  const truncated = stripped.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

export default { formatContent, excerptText };
