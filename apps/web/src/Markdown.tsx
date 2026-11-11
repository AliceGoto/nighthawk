import { useState, type ReactElement, type ReactNode } from 'react';

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (token.startsWith('`')) {
      out.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('![')) {
      const parts = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      if (parts !== null) {
        out.push(
          <img
            key={key++}
            className="md-image"
            src={parts[2]}
            alt={parts[1] ?? ''}
            loading="lazy"
          />,
        );
      } else {
        out.push(token);
      }
    } else {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (parts !== null) {
        out.push(
          <a key={key++} href={parts[2]} target="_blank" rel="noreferrer">
            {parts[1]}
          </a>,
        );
      } else {
        out.push(token);
      }
    }
    last = index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeBlock({ language, code }: { language: string; code: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <div className="md-code-block">
      <div className="md-code-head">
        <span>{language.length > 0 ? language : 'text'}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="md-code">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ text }: { text: string }): ReactElement {
  const blocks = text.split('```');
  return (
    <div className="md">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const newline = block.indexOf('\n');
          const language = newline === -1 ? '' : block.slice(0, newline).trim();
          const code = newline === -1 ? block : block.slice(newline + 1);
          return <CodeBlock key={index} language={language} code={code.replace(/\n$/, '')} />;
        }
        if (block.trim().length === 0) return null;
        return (
          <p className="md-text" key={index}>
            {inline(block.replaceAll(/^\n+|\n+$/g, ''))}
          </p>
        );
      })}
    </div>
  );
}
