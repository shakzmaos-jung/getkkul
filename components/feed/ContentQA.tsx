'use client';

import { useEffect, useState } from 'react';
import { askAboutContent } from '@/app/feed/actions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { MAX_QUESTION_LEN, type QAAnswer } from '@/lib/qa/answer';

const LENGTHS: { key: keyof QAAnswer; label: string }[] = [
  { key: 'short', label: '짧게' },
  { key: 'normal', label: '보통' },
  { key: 'long', label: '길게' },
];

function RobotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4M8 4h8" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M2 13v3M22 13v3" />
    </svg>
  );
}

/**
 * 콘텐츠 Q&A 다이얼로그. 로봇 아이콘 → 중앙 큰 다이얼로그.
 * 질문 1개 입력(최대 200자) → nano 모델 답변(짧게/보통/길게 3종). 단일 턴, 닫기로 종료.
 */
export default function ContentQA({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<QAAnswer | null>(null);
  const [len, setLen] = useState<keyof QAAnswer>('normal');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setQuestion('');
    setAnswer(null);
    setError(null);
    setLoading(false);
    setLen('normal');
  }

  async function send() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    const r = await askAboutContent(videoId, q);
    setLoading(false);
    if (r.ok) setAnswer(r.answer);
    else setError(r.error);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="이 콘텐츠에 질문하기"
        title="질문하기"
        data-testid="content-qa"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <RobotIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="콘텐츠 질문"
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <p className="text-sm font-medium leading-relaxed">
                이 콘텐츠에서 더 알고싶은 내용이 있으신가요? 이 콘텐츠의 맥락을 파악해서 답변 드리겠습니다.
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
              {!answer ? (
                <>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
                    maxLength={MAX_QUESTION_LEN}
                    disabled={loading}
                    rows={4}
                    placeholder="이 콘텐츠에 대해 궁금한 점을 입력하세요."
                    data-testid="qa-input"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {question.length}/{MAX_QUESTION_LEN}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={send}
                      disabled={loading || question.trim().length === 0}
                      data-testid="qa-send"
                    >
                      {loading ? <Spinner size={14} /> : '보내기'}
                    </Button>
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                </>
              ) : (
                <>
                  <div className="inline-flex self-start rounded-lg border border-border bg-card p-0.5">
                    {LENGTHS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setLen(o.key)}
                        data-testid={`qa-len-${o.key}`}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          len === o.key
                            ? 'bg-foreground text-background'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p
                    data-testid="qa-answer"
                    className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
                  >
                    {answer[len]}
                  </p>
                  <div className="mt-1 flex justify-end">
                    <Button type="button" variant="secondary" onClick={close}>
                      닫기
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
