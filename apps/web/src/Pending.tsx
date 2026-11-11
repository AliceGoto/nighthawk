import { useState, type ReactElement } from 'react';

import type { QuestionItem } from './api';

export interface ApprovalItem {
  id: string;
  sessionId: string;
  toolName: string;
  action: string;
  display: unknown;
}

export interface QuestionPrompt {
  id: string;
  sessionId: string;
  questions: QuestionItem[];
}

export function ApprovalCard({
  item,
  onResolve,
}: {
  item: ApprovalItem;
  onResolve: (decision: 'approved' | 'rejected', scope?: 'session') => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div className="pending-card">
      <div className="pending-head">
        <span className="pending-kind">需要批准</span>
        <span className="pending-tool">{item.toolName}</span>
        <span className="pending-action">{item.action}</span>
      </div>
      {item.display !== undefined && (
        <button type="button" className="pending-toggle" onClick={() => setOpen((value) => !value)}>
          {open ? '收起参数' : '查看参数'}
        </button>
      )}
      {open && <pre className="pending-input">{JSON.stringify(item.display, null, 2)}</pre>}
      <div className="pending-actions">
        <button type="button" className="approve" onClick={() => onResolve('approved')}>
          允许
        </button>
        <button type="button" onClick={() => onResolve('approved', 'session')}>
          本会话总是允许
        </button>
        <button type="button" className="reject" onClick={() => onResolve('rejected')}>
          拒绝
        </button>
      </div>
    </div>
  );
}

export function QuestionCard({
  item,
  onAnswer,
  onDismiss,
}: {
  item: QuestionPrompt;
  onAnswer: (answers: Record<string, unknown>) => void;
  onDismiss: () => void;
}): ReactElement {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});

  const toggle = (question: QuestionItem, optionId: string): void => {
    setSelected((previous) => {
      const current = previous[question.id] ?? [];
      if (question.multi_select === true) {
        return {
          ...previous,
          [question.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...previous, [question.id]: [optionId] };
    });
  };

  const complete = item.questions.every((question) => {
    const picks = selected[question.id] ?? [];
    const text = (other[question.id] ?? '').trim();
    return picks.length > 0 || (question.allow_other === true && text.length > 0);
  });

  const submit = (): void => {
    const answers: Record<string, unknown> = {};
    for (const question of item.questions) {
      const picks = selected[question.id] ?? [];
      const text = (other[question.id] ?? '').trim();
      if (text.length > 0 && question.allow_other === true && picks.length === 0) {
        answers[question.id] = { kind: 'other', text };
      } else if (question.multi_select === true) {
        answers[question.id] =
          text.length > 0
            ? { kind: 'multi_with_other', option_ids: picks, other_text: text }
            : { kind: 'multi', option_ids: picks };
      } else {
        answers[question.id] = { kind: 'single', option_id: picks[0] };
      }
    }
    onAnswer(answers);
  };

  return (
    <div className="pending-card">
      <div className="pending-head">
        <span className="pending-kind">需要确认</span>
      </div>
      {item.questions.map((question) => (
        <div className="question" key={question.id}>
          {question.header !== undefined && <div className="question-header">{question.header}</div>}
          <div className="question-text">{question.question}</div>
          <div className="question-options">
            {question.options.map((option) => {
              const active = (selected[question.id] ?? []).includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={active ? 'question-option active' : 'question-option'}
                  onClick={() => toggle(question, option.id)}
                >
                  <span>{option.label}</span>
                  {option.description !== undefined && (
                    <span className="question-option-desc">{option.description}</span>
                  )}
                </button>
              );
            })}
          </div>
          {question.allow_other === true && (
            <input
              className="question-other"
              value={other[question.id] ?? ''}
              placeholder={question.other_label ?? '其他回答'}
              onChange={(event) =>
                setOther((previous) => ({ ...previous, [question.id]: event.target.value }))
              }
            />
          )}
        </div>
      ))}
      <div className="pending-actions">
        <button type="button" className="approve" disabled={!complete} onClick={submit}>
          提交
        </button>
        <button type="button" onClick={onDismiss}>
          忽略
        </button>
      </div>
    </div>
  );
}
