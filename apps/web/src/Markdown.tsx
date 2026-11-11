import type { ReactElement, ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`\n]+`)/g);
  return parts.map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  );
}

export function Markdown({ text }: { text: string }): ReactElement {
  const blocks = text.split('```');
  return (
    <div className="md">
      {blocks.map((block, index) =>
        index % 2 === 1 ? (
          <pre className="md-code" key={index}>
            <code>{block.replace(/^[a-zA-Z0-9_+-]*\n/, '')}</code>
          </pre>
        ) : block.trim().length === 0 ? null : (
          <p className="md-text" key={index}>
            {inline(block.replaceAll(/^\n+|\n+$/g, ''))}
          </p>
        ),
      )}
    </div>
  );
}
