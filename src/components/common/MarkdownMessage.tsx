import React from 'react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and clean arrows
 */
function parseInline(text: string, isUser = false): React.ReactNode[] {
  // Pattern matches:
  // 1. `code`
  // 2. **bold**
  // 3. *italic*
  // 4. -> or -->
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|-->|->)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium ${
            isUser ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-indigo-700'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={idx}
          className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em
          key={idx}
          className={`italic ${isUser ? 'text-blue-100' : 'text-slate-700'}`}
        >
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part === '->' || part === '-->') {
      return (
        <span key={idx} className="mx-1 text-slate-400 font-bold">
          →
        </span>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

/**
 * Structured Markdown Parser for conversational chat messages.
 * Converts raw markdown symbols (##, **, -, 1., tables, ---) into clean, human-friendly conversation.
 */
export function MarkdownMessage({ content, isUser = false, className = '' }: MarkdownMessageProps) {
  if (isUser) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  // Pre-process: split lines and group into structured blocks
  const rawLines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: { text: string; indent: number }[] } | null = null;
  let tableRows: string[] = [];

  const flushList = () => {
    if (!currentList) return;
    const listKey = `list-${elements.length}`;

    if (currentList.type === 'ol') {
      elements.push(
        <ol key={listKey} className="space-y-3 my-2.5">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center mt-0.5 shadow-2xs">
                {idx + 1}
              </span>
              <div className="flex-1 text-slate-800 text-xs sm:text-sm leading-relaxed">
                {parseInline(item.text, false)}
              </div>
            </li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={listKey} className="space-y-1.5 my-2 pl-1">
          {currentList.items.map((item, idx) => {
            const isSub = item.indent > 0;
            return (
              <li
                key={idx}
                className={`flex items-start gap-2 ${isSub ? 'ml-5 text-slate-650' : 'text-slate-800'}`}
              >
                <span
                  className={`flex-shrink-0 mt-1.5 rounded-full ${
                    isSub ? 'w-1 h-1 bg-slate-400' : 'w-1.5 h-1.5 bg-indigo-500'
                  }`}
                />
                <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                  {parseInline(item.text, false)}
                </div>
              </li>
            );
          })}
        </ul>
      );
    }
    currentList = null;
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const tableKey = `table-${elements.length}`;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1).filter((r) => !/^\|?[\s\-:|]+\|?$/.test(r.trim()));

    const parseCells = (row: string) =>
      row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

    const headers = parseCells(headerRow);

    elements.push(
      <div key={tableKey} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="py-2.5 px-3">
                  {parseInline(h, false)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dataRows.map((dr, rIdx) => {
              const cells = parseCells(dr);
              return (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-slate-800">
                      {parseInline(cell, false)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // 2. Table row detection (| cell | cell |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      tableRows.push(trimmed);
      continue;
    } else if (tableRows.length > 0) {
      flushTable();
    }

    // 3. Horizontal divider (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} className="my-3 border-t border-slate-200/80" />
      );
      continue;
    }

    // 4. Headings (## Heading or ### Heading)
    const hMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const text = hMatch[2];

      if (level === 1) {
        elements.push(
          <h2
            key={`h1-${i}`}
            className="text-base sm:text-lg font-extrabold text-slate-900 mt-3 mb-1.5 flex items-center gap-2"
          >
            {parseInline(text, false)}
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3
            key={`h2-${i}`}
            className="text-sm sm:text-base font-bold text-slate-900 mt-3 mb-1.5 pb-1 border-b border-slate-200/60 flex items-center gap-2"
          >
            {parseInline(text, false)}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={`h3-${i}`}
            className="text-xs sm:text-sm font-bold text-slate-800 mt-2 mb-1"
          >
            {parseInline(text, false)}
          </h4>
        );
      }
      continue;
    }

    // 5. Numbered list: "1. text" or "1) text"
    const olMatch = line.match(/^(\s*)(\d+)[\.\)]\s+(.*)$/);
    if (olMatch) {
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({
        indent: olMatch[1].length,
        text: olMatch[3],
      });
      continue;
    }

    // 6. Bullet list: "- text" or "* text" or "• text"
    const ulMatch = line.match(/^(\s*)([\-\*\•])\s+(.*)$/);
    if (ulMatch) {
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({
        indent: ulMatch[1].length,
        text: ulMatch[3],
      });
      continue;
    }

    // 7. Blockquote or Tip callout: "> text"
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, '');
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2 p-3 rounded-xl bg-indigo-50/70 border-l-4 border-indigo-500 text-xs sm:text-sm text-indigo-900 leading-relaxed"
        >
          {parseInline(quoteText, false)}
        </div>
      );
      continue;
    }

    // 8. Regular paragraph text
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-800 leading-relaxed my-1">
        {parseInline(trimmed, false)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
