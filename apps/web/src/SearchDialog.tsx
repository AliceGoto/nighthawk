import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';

import { searchMessages, type SearchHit } from './api';
import './SearchDialog.css';

const DEBOUNCE_MS = 250;

const ROLE_LABELS: Record<SearchHit['role'], string> = {
  user: '你',
  assistant: 'Agent',
  title: '标题',
};

type Status = 'idle' | 'loading' | 'error' | 'empty' | 'results';

function relativeTime(time: number): string {
  if (!Number.isFinite(time) || time <= 0) return '';
  const diff = Date.now() - time;
  if (diff < 60_000) return '刚刚';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${String(minutes)} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} 小时前`;
  return `${String(Math.floor(hours / 24))} 天前`;
}

function displayTitle(title: string): string {
  return title.trim().length > 0 ? title : '未命名会话';
}

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function SearchDialog({
  open,
  onClose,
  onOpenSession,
}: SearchDialogProps): ReactElement | null {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState('');
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [retryTick, setRetryTick] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const requestSeqRef = useRef(0);

  const trimmed = query.trim();

  useEffect(() => {
    if (open) {
      if (wasOpenRef.current) return;
      wasOpenRef.current = true;
      const active = document.activeElement;
      restoreRef.current = active instanceof HTMLElement ? active : null;
      inputRef.current?.focus();
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    restoreRef.current?.focus();
    restoreRef.current = null;
    setQuery('');
    setHits([]);
    setStatus('idle');
    setError('');
    setIndexBuilding(false);
    setHighlight(0);
  }, [open]);

  useEffect(() => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    if (!open) return;
    if (trimmed.length === 0) {
      setHits([]);
      setStatus('idle');
      setError('');
      setIndexBuilding(false);
      setHighlight(0);
      return;
    }
    setHits([]);
    setStatus('loading');
    setError('');
    setIndexBuilding(false);
    setHighlight(0);
    const timer = window.setTimeout(() => {
      void searchMessages(trimmed)
        .then((result) => {
          if (requestSeqRef.current !== seq) return;
          setHits(result.items);
          setStatus(result.items.length === 0 ? 'empty' : 'results');
          setIndexBuilding(result.index_state.state === 'building');
        })
        .catch((error: unknown) => {
          if (requestSeqRef.current !== seq) return;
          setHits([]);
          setStatus('error');
          setError(error instanceof Error ? error.message : String(error));
          setIndexBuilding(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open, trimmed, retryTick]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-sd-index="${String(highlight)}"]`,
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, hits]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const moveHighlight = (delta: number): void => {
    if (hits.length === 0) return;
    setHighlight((previous) => {
      const next = previous + delta;
      if (next < 0) return hits.length - 1;
      if (next >= hits.length) return 0;
      return next;
    });
  };

  const openHit = (hit: SearchHit): void => {
    onOpenSession(hit.session_id);
    onClose();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (hits.length === 0) return;
      event.preventDefault();
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-sd-index]') !== null) return;
    const hit = hits[highlight];
    if (hit === undefined) return;
    event.preventDefault();
    openHit(hit);
  };

  const onBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div className="sd-backdrop" onMouseDown={onBackdropMouseDown}>
      <div
        className="sd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="搜索所有会话"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="sd-head">
          <input
            ref={inputRef}
            className="sd-input"
            type="text"
            value={query}
            placeholder="搜索所有会话"
            aria-label="搜索所有会话"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="sd-close" aria-label="关闭搜索" onClick={onClose}>
            ✕
          </button>
        </div>
        {status === 'results' && indexBuilding && (
          <div className="sd-building">索引构建中，结果可能不完整</div>
        )}
        <div className="sd-body">
          {status === 'idle' && <div className="sd-state">输入关键词搜索所有会话</div>}
          {status === 'loading' && <div className="sd-state">搜索中…</div>}
          {status === 'empty' && <div className="sd-state">没有匹配结果</div>}
          {status === 'error' && (
            <div className="sd-state sd-error" role="alert">
              <span className="sd-error-text">{error.length > 0 ? error : '搜索失败'}</span>
              <button
                type="button"
                className="sd-retry"
                onClick={() => setRetryTick((value) => value + 1)}
              >
                重试
              </button>
            </div>
          )}
          {status === 'results' && (
            <div className="sd-list" ref={listRef}>
              {hits.map((hit, index) => {
                const time = relativeTime(hit.time);
                return (
                  <button
                    key={`${hit.session_id}:${hit.agent_id}:${hit.role}:${String(hit.time)}:${String(index)}`}
                    type="button"
                    className={index === highlight ? 'sd-hit sd-hit-active' : 'sd-hit'}
                    data-sd-index={index}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => openHit(hit)}
                  >
                    <span className="sd-hit-head">
                      <span className="sd-hit-title">{displayTitle(hit.session_title)}</span>
                      <span className="sd-hit-meta">
                        <span className="sd-role">{ROLE_LABELS[hit.role]}</span>
                        {time.length > 0 && <span className="sd-hit-time">{time}</span>}
                      </span>
                    </span>
                    <span className="sd-snippet">{hit.snippet}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
