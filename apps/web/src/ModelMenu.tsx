import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import type { ModelEntry } from './api';
import './ModelMenu.css';

const EFFORT_LABELS: Record<string, string> = {
  off: '关闭',
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最高',
};

function effortLabel(value: string): string {
  return EFFORT_LABELS[value] ?? value;
}

function displayName(entry: ModelEntry | undefined, fallback: string): string {
  const display = entry?.display_name;
  if (display !== undefined && display.length > 0) return display;
  if (entry !== undefined && entry.model.length > 0) return entry.model;
  return fallback.length > 0 ? fallback : '选择模型';
}

type Panel = 'root' | 'models' | 'efforts';

interface ModelGroup {
  provider: string;
  items: { entry: ModelEntry; index: number }[];
}

function isSubsequence(needle: string, haystack: string): boolean {
  let cursor = 0;
  for (const char of haystack) {
    if (char === needle[cursor]) {
      cursor += 1;
      if (cursor === needle.length) return true;
    }
  }
  return false;
}

function filterModels(models: ModelEntry[], query: string): ModelEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return models;
  const prefix: ModelEntry[] = [];
  const others: ModelEntry[] = [];
  for (const entry of models) {
    const label = (entry.display_name ?? entry.model).toLowerCase();
    const id = entry.model.toLowerCase();
    if (!isSubsequence(needle, label) && !isSubsequence(needle, id)) continue;
    if (label.startsWith(needle) || id.startsWith(needle)) {
      prefix.push(entry);
    } else {
      others.push(entry);
    }
  }
  return [...prefix, ...others];
}

function groupModels(entries: ModelEntry[]): ModelGroup[] {
  const groups: ModelGroup[] = [];
  const byProvider = new Map<string, ModelGroup>();
  let index = 0;
  for (const entry of entries) {
    let group = byProvider.get(entry.provider);
    if (group === undefined) {
      group = { provider: entry.provider, items: [] };
      byProvider.set(entry.provider, group);
      groups.push(group);
    }
    group.items.push({ entry, index });
    index += 1;
  }
  return groups;
}

export interface ModelMenuProps {
  models: ModelEntry[];
  model: string;
  effort: string;
  onSelectModel: (entry: ModelEntry) => void;
  onSelectEffort: (value: string) => void;
  pending?: boolean;
  onManageProviders?: () => void;
  openSignal?: number;
}

export function ModelMenu({
  models,
  model,
  effort,
  onSelectModel,
  onSelectEffort,
  pending,
  onManageProviders,
  openSignal,
}: ModelMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('root');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  const openSignalRef = useRef(openSignal ?? 0);

  const selected = useMemo(
    () => models.find((entry) => entry.model === model),
    [models, model],
  );
  const efforts = selected?.support_efforts ?? [];
  const hasEfforts = efforts.length > 0;
  const defaultEffort = selected?.default_effort ?? efforts[0] ?? '';
  const canManageProviders = onManageProviders !== undefined;
  const manageRowIndex = hasEfforts ? 2 : 1;
  const showSearch = models.length > 4;
  const visible = panel === 'models' ? filterModels(models, query) : [];
  const groups = panel === 'models' ? groupModels(visible) : [];
  const itemCount =
    panel === 'root'
      ? (hasEfforts ? 2 : 1) + (canManageProviders ? 1 : 0)
      : panel === 'models'
        ? visible.length
        : efforts.length + (hasEfforts ? 1 : 0);

  const triggerLabel = models.length === 0 ? '没有可用模型' : displayName(selected, model);
  const effortText = effort.length > 0 ? effortLabel(effort) : '';
  const currentEffortText = effortText.length > 0 ? effortText : '默认';

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef.current?.focus();
      }
      return;
    }
    wasOpenRef.current = true;
    if (searchRef.current !== null) {
      searchRef.current.focus();
      return;
    }
    popupRef.current?.focus();
  }, [open, panel]);

  useEffect(() => {
    const signal = openSignal ?? 0;
    if (signal === openSignalRef.current) return;
    openSignalRef.current = signal;
    if (signal <= 0) return;
    setPanel('root');
    setQuery('');
    setHighlight(0);
    setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    setHighlight(0);
  }, [panel, query]);

  useEffect(() => {
    if (!open) return;
    const node = popupRef.current?.querySelector<HTMLElement>(
      `[data-mm-index="${String(highlight)}"]`,
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, panel, highlight, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      const root = rootRef.current;
      if (root !== null && event.target instanceof Node && root.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const openPanel = (next: Panel): void => {
    setQuery('');
    setPanel(next);
    setHighlight(0);
  };

  const close = (): void => {
    setOpen(false);
  };

  const toggle = (): void => {
    if (open) {
      close();
      return;
    }
    setPanel('root');
    setQuery('');
    setHighlight(0);
    setOpen(true);
  };

  const chooseModel = (entry: ModelEntry): void => {
    onSelectModel(entry);
    close();
  };

  const chooseEffort = (value: string): void => {
    onSelectEffort(value);
    close();
  };

  const manageProviders = (): void => {
    close();
    onManageProviders?.();
  };

  const moveHighlight = (delta: number): void => {
    if (itemCount === 0) return;
    setHighlight((previous) => {
      const next = previous + delta;
      if (next < 0) return itemCount - 1;
      if (next >= itemCount) return 0;
      return next;
    });
  };

  const activate = (index: number): void => {
    if (panel === 'root') {
      if (index === 0) {
        openPanel('models');
      } else if (index === 1 && hasEfforts) {
        openPanel('efforts');
      } else if (index === manageRowIndex && canManageProviders) {
        manageProviders();
      }
      return;
    }
    if (panel === 'models') {
      const entry = visible[index];
      if (entry !== undefined) chooseModel(entry);
      return;
    }
    if (hasEfforts) {
      if (index === 0) {
        chooseEffort(defaultEffort);
        return;
      }
      const value = efforts[index - 1];
      if (value !== undefined) chooseEffort(value);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      if (panel === 'root') {
        close();
      } else {
        openPanel('root');
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const keepFocus = event.target instanceof HTMLInputElement;
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      if (!keepFocus) popupRef.current?.focus();
      return;
    }
    if (event.key === 'Enter') {
      const target = event.target;
      if (target !== popupRef.current && target !== searchRef.current) return;
      event.preventDefault();
      activate(highlight);
    }
  };

  return (
    <div className="mm-root" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="mm-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={pending === true ? true : undefined}
        disabled={models.length === 0 || pending === true}
        onClick={toggle}
      >
        <span className="mm-trigger-name">{triggerLabel}</span>
        {models.length > 0 && effortText.length > 0 && (
          <span className="mm-trigger-tier">· {effortText}</span>
        )}
        {pending === true ? (
          <span className="mm-spinner" aria-hidden="true" />
        ) : (
          <span className="mm-chev" aria-hidden="true">
            ⌄
          </span>
        )}
      </button>
      {open && models.length > 0 && (
        <div
          ref={popupRef}
          className="mm-popup"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {panel !== 'root' && (
            <div className="mm-head">
              <button
                type="button"
                className="mm-back"
                aria-label="返回"
                onClick={() => openPanel('root')}
              >
                ‹
              </button>
              <span className="mm-title">{panel === 'models' ? '模型' : '强度'}</span>
            </div>
          )}
          {panel === 'models' && showSearch && (
            <input
              ref={searchRef}
              className="mm-search"
              type="text"
              value={query}
              placeholder="搜索模型"
              aria-label="搜索模型"
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {panel === 'root' && (
            <div className="mm-list" role="menu" aria-label="模型设置">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                className={highlight === 0 ? 'mm-row mm-active' : 'mm-row'}
                data-mm-index={0}
                onMouseEnter={() => setHighlight(0)}
                onClick={() => openPanel('models')}
              >
                <span className="mm-row-label">模型</span>
                <span className="mm-row-value">
                  <span className="mm-row-text">{displayName(selected, model)}</span>
                  <span className="mm-arrow" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>
              {hasEfforts && (
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  className={highlight === 1 ? 'mm-row mm-active' : 'mm-row'}
                  data-mm-index={1}
                  onMouseEnter={() => setHighlight(1)}
                  onClick={() => openPanel('efforts')}
                >
                  <span className="mm-row-label">强度</span>
                  <span className="mm-row-value">
                    <span className="mm-row-text">{currentEffortText}</span>
                    <span className="mm-arrow" aria-hidden="true">
                      ›
                    </span>
                  </span>
                </button>
              )}
              {canManageProviders && (
                <button
                  type="button"
                  role="menuitem"
                  className={highlight === manageRowIndex ? 'mm-row mm-active' : 'mm-row'}
                  data-mm-index={manageRowIndex}
                  onMouseEnter={() => setHighlight(manageRowIndex)}
                  onClick={manageProviders}
                >
                  <span className="mm-row-label">管理供应商</span>
                  <span className="mm-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              )}
            </div>
          )}
          {panel === 'models' && (
            <div className="mm-list" role="menu" aria-label="选择模型">
              {visible.length === 0 && <div className="mm-empty">没有匹配的模型</div>}
              {groups.map((group) => (
                <div className="mm-group" role="group" aria-label={group.provider} key={group.provider}>
                  <div className="mm-group-title" aria-hidden="true">
                    {group.provider.length > 0 ? group.provider : '默认'}
                  </div>
                  {group.items.map(({ entry, index }) => (
                    <button
                      key={`${group.provider}:${entry.model}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={entry.model === model}
                      className={index === highlight ? 'mm-item mm-active' : 'mm-item'}
                      data-mm-index={index}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => chooseModel(entry)}
                    >
                      <span className="mm-check" aria-hidden="true">
                        {entry.model === model ? '✓' : ''}
                      </span>
                      <span className="mm-item-name">{displayName(entry, entry.model)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {panel === 'efforts' && (
            <div className="mm-list" role="menu" aria-label="选择强度">
              {hasEfforts && (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={effort === defaultEffort}
                  className={highlight === 0 ? 'mm-item mm-active' : 'mm-item'}
                  data-mm-index={0}
                  onMouseEnter={() => setHighlight(0)}
                  onClick={() => chooseEffort(defaultEffort)}
                >
                  <span className="mm-check" aria-hidden="true">
                    {effort === defaultEffort ? '✓' : ''}
                  </span>
                  <span className="mm-item-name">模型默认</span>
                </button>
              )}
              {efforts.map((value, index) => {
                const rowIndex = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={value === effort}
                    className={rowIndex === highlight ? 'mm-item mm-active' : 'mm-item'}
                    data-mm-index={rowIndex}
                    onMouseEnter={() => setHighlight(rowIndex)}
                    onClick={() => chooseEffort(value)}
                  >
                    <span className="mm-check" aria-hidden="true">
                      {value === effort ? '✓' : ''}
                    </span>
                    <span className="mm-item-name">{effortLabel(value)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
