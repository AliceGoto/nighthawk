import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import './CommandMenu.css';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
}

export interface CommandMenuProps {
  query: string;
  items: CommandItem[];
  onRun: (id: string) => void;
  onClose: () => void;
}

function matches(item: CommandItem, needle: string): boolean {
  if (item.label.toLowerCase().includes(needle)) return true;
  if (item.id.toLowerCase().includes(needle)) return true;
  return (item.description ?? '').toLowerCase().includes(needle);
}

export function CommandMenu({ query, items, onRun, onClose }: CommandMenuProps): ReactElement {
  const [highlight, setHighlight] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => (needle.length === 0 ? items : items.filter((item) => matches(item, needle))),
    [items, needle],
  );
  const active = visible.length === 0 ? -1 : Math.min(highlight, visible.length - 1);

  useEffect(() => {
    setHighlight(0);
  }, [needle]);

  useEffect(() => {
    if (active < 0) return;
    const node = menuRef.current?.querySelector<HTMLElement>(
      `[data-cm-index="${String(active)}"]`,
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, visible]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (visible.length === 0) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const count = visible.length;
        setHighlight((previous) => {
          const base = Math.min(previous, count - 1);
          const next = base + (event.key === 'ArrowDown' ? 1 : -1);
          if (next < 0) return count - 1;
          if (next >= count) return 0;
          return next;
        });
        return;
      }
      if (event.key === 'Enter') {
        const item = visible[active];
        if (item === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        onRun(item.id);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active, visible, onClose, onRun]);

  return (
    <div className="cm-menu" role="listbox" aria-label="命令" ref={menuRef}>
      {visible.length === 0 && (
        <div className="cm-empty" role="presentation">
          没有匹配的命令
        </div>
      )}
      {visible.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === active}
          tabIndex={-1}
          className={index === active ? 'cm-item cm-active' : 'cm-item'}
          data-cm-index={index}
          onMouseEnter={() => setHighlight(index)}
          onClick={() => onRun(item.id)}
        >
          <span className="cm-label">/{item.label}</span>
          {item.description !== undefined && item.description.length > 0 && (
            <span className="cm-desc">{item.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}
