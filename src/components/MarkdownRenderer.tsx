import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onOpenSandbox?: (code: string, language: string) => void;
}

type MarkdownBlock =
  | { type: 'code'; code: string; language: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onOpenSandbox }) => {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3.5 text-[15px] leading-relaxed break-words font-sans">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={block.code}
              language={block.language}
              onOpenSandbox={onOpenSandbox}
            />
          );
        }
        if (block.type === 'heading') {
          const headingClasses: Record<number, string> = {
            1: 'text-2xl font-bold tracking-tight text-white mt-6 mb-3 border-b border-white/10 pb-2',
            2: 'text-xl font-semibold tracking-tight text-white mt-5 mb-2.5',
            3: 'text-lg font-medium text-zinc-100 mt-4 mb-2',
            4: 'text-base font-medium text-zinc-200 mt-3 mb-1.5',
          };
          const cls = headingClasses[block.level] || 'text-base font-semibold text-zinc-100';

          if (block.level === 1) {
            return (
              <h1 key={index} className={cls}>
                <InlineText text={block.text} />
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={index} className={cls}>
                <InlineText text={block.text} />
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3 key={index} className={cls}>
                <InlineText text={block.text} />
              </h3>
            );
          }
          return (
            <h4 key={index} className={cls}>
              <InlineText text={block.text} />
            </h4>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="space-y-1.5 pl-5 list-disc marker:text-indigo-400/80 my-2 text-zinc-200">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ordered-list') {
          return (
            <ol key={index} className="space-y-1.5 pl-5 list-decimal marker:text-indigo-400 marker:font-medium my-2 text-zinc-200">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  <InlineText text={item} />
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote key={index} className="border-l-3 border-indigo-500/70 pl-4 py-1.5 my-3 bg-indigo-500/5 rounded-r-lg text-zinc-300 italic">
              <InlineText text={block.text} />
            </blockquote>
          );
        }
        if (block.type === 'table') {
          return <TableBlock key={index} headers={block.headers} rows={block.rows} />;
        }
        if (block.type === 'hr') {
          return <hr key={index} className="border-white/10 my-4" />;
        }

        // Paragraph
        return (
          <p key={index} className="text-zinc-200 leading-relaxed">
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
};

// Inline parser for bold, italics, links, inline code
const InlineText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  const tokenRegex = /(`[^`]+`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // Inline code
      const codeVal = match[1].slice(1, -1);
      parts.push(
        <code
          key={keyCounter++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/90 text-indigo-300 font-mono text-[13px] border border-white/5"
        >
          {codeVal}
        </code>
      );
    } else if (match[2]) {
      // Bold
      parts.push(
        <strong key={keyCounter++} className="font-semibold text-white">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      // Italic
      parts.push(
        <em key={keyCounter++} className="italic text-zinc-200">
          {match[5]}
        </em>
      );
    } else if (match[6]) {
      // Link
      const linkLabel = match[7];
      const linkUrl = match[8];
      parts.push(
        <a
          key={keyCounter++}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-3 transition-colors inline-flex items-center gap-0.5"
        >
          {linkLabel}
        </a>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
};

// Code block with Run Sandbox, Download, Copy button and line numbers
const CodeBlock: React.FC<{
  code: string;
  language: string;
  onOpenSandbox?: (code: string, language: string) => void;
}> = ({ code, language, onOpenSandbox }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const lang = (language || '').toLowerCase();
    const extMap: Record<string, string> = {
      python: 'py',
      py: 'py',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      tsx: 'tsx',
      jsx: 'jsx',
      html: 'html',
      css: 'css',
      sql: 'sql',
      rust: 'rs',
      go: 'go',
      golang: 'go',
      json: 'json',
      bash: 'sh',
      sh: 'sh',
      shell: 'sh',
      cpp: 'cpp',
    };
    const ext = extMap[lang] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vexo-code-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lines = code.trim().split('\n');
  const isRunnable =
    ['html', 'htm', 'svg', 'xml', 'javascript', 'js'].includes((language || '').toLowerCase()) ||
    code.includes('<!DOCTYPE') ||
    code.includes('<html') ||
    code.includes('<div');

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 shadow-2xl font-mono text-[13px] group">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Terminal size={14} className="text-emerald-400" />
          <span className="font-medium text-zinc-300 uppercase tracking-wider">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isRunnable && onOpenSandbox && (
            <button
              onClick={() => onOpenSandbox(code, language)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all cursor-pointer"
              title="Run code in interactive sandbox"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Run Live</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-all cursor-pointer"
            title="Download code file"
          >
            <span>Save</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-all cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-4 flex gap-4 text-zinc-300 leading-relaxed">
        {lines.length > 2 && (
          <div className="select-none text-zinc-600 text-right pr-2 border-r border-zinc-800/60 font-mono text-[12px] leading-relaxed">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <pre className="font-mono flex-1 whitespace-pre">
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
};

// Table block
const TableBlock: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-800 text-sm">
        <thead className="bg-zinc-900/60 text-zinc-300 font-semibold text-left">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5">
                <InlineText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-zinc-900/30 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2 text-zinc-300">
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const match = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
      const language = match ? match[1] : '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: 'code',
        code: codeLines.join('\n'),
        language: language || 'text',
      });
      continue;
    }

    // Horizontal rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      });
      continue;
    }

    // Table
    if (line.includes('|') && lines[i + 1] && lines[i + 1].includes('|') && lines[i + 1].includes('-')) {
      const headers = line
        .split('|')
        .map((s) => s.trim())
        .filter((s, idx, arr) => !(idx === 0 && s === '') && !(idx === arr.length - 1 && s === ''));
      i += 2; // skip header & separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
          .split('|')
          .map((s) => s.trim())
          .filter((s, idx, arr) => !(idx === 0 && s === '') && !(idx === arr.length - 1 && s === ''));
        if (row.length > 0) rows.push(row);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Unordered List
    if (/^[-*+]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---|___|\*\*\*)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({
      type: 'paragraph',
      text: paraLines.join(' '),
    });
  }

  return blocks;
}
