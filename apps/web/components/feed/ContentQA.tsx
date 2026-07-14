'use client';

import { useEffect, useState } from 'react';
import { askAboutContent, extractContentTerms } from '@/app/feed/actions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { MAX_QUESTION_LEN, type QASection } from '@/lib/qa/answer';

type Mode = 'choose' | 'chips' | 'manual';

/**
 * 컬러풀한 "AI" 배지. trigger(카드 상단, 눈에 띄게) / hero(다이얼로그 헤더, 꿀벌 대체) 두 크기.
 */
function AiBadge({ variant }: { variant: 'trigger' | 'hero' }) {
  if (variant === 'hero') {
    return (
      <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-violet-500 text-xl font-extrabold tracking-wide text-white shadow-md">
        AI
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          className="absolute -right-1 -top-1 text-amber-300 drop-shadow"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2l1.7 5 5 1.7-5 1.7L12 15l-1.7-5-5-1.7 5-1.7z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-violet-500 px-2 text-xs font-bold tracking-wide text-white shadow-sm">
      AI
    </span>
  );
}

/**
 * 콘텐츠 Q&A 다이얼로그. 컨시어지 꿀벌 안내 → [본문에서 단어 추출 | 직접 입력하기].
 * 추출은 영상 단위 공유 캐시(빠른 재조회). 답변은 '용어 정의' + '이 콘텐츠에서의 의미와 인사이트'.
 */
export default function ContentQA({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<QASection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

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
    setMode('choose');
    setQuestion('');
    setAnswer(null);
    setError(null);
    setLoading(false);
    setTerms([]);
    setExtracting(false);
  }

  async function runExtract() {
    if (extracting) return;
    setExtracting(true);
    const t = await extractContentTerms(videoId);
    setTerms(t);
    setExtracting(false);
    setMode('chips');
  }

  async function send(override?: string) {
    const q = (override ?? question).trim();
    if (!q || loading) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    const r = await askAboutContent(videoId, q);
    setLoading(false);
    if (r.ok) {
      setAnswer(r.answer);
    } else {
      setError(r.error);
      setMode('manual'); // 실패 시 입력창 + 오류 노출(재시도 가능)
    }
  }

  const section = answer;
  const hasDef = !!section?.definition.trim();
  const hasIns = !!section?.insight.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="이 콘텐츠에 질문하기"
        title="AI에게 질문하기"
        data-testid="content-qa"
        className="inline-flex items-center rounded-lg transition-transform hover:scale-110"
      >
        <AiBadge variant="trigger" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="콘텐츠 질문"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더: 꿀벌 + 말풍선 */}
            <div className="relative shrink-0 border-b border-border/70 p-4">
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-start gap-3 pr-6">
                <AiBadge variant="hero" />
                <div className="rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-2.5">
                  <p className="text-sm font-medium leading-relaxed">
                    이 콘텐츠에서 더 알고싶은 내용이 있으신가요? 이 콘텐츠의 맥락을 파악해서 답변
                    드리겠습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 본문(내부 스크롤) */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
              {answer ? (
                <>
                  <div data-testid="qa-answer" className="flex flex-col gap-3">
                    {hasDef && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold text-accent">용어 정의</h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {section!.definition}
                        </p>
                      </div>
                    )}
                    {hasIns && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold text-accent">
                          이 콘텐츠에서의 의미와 인사이트
                        </h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {section!.insight}
                        </p>
                      </div>
                    )}
                    {!hasDef && !hasIns && (
                      <p className="text-sm text-muted-foreground">답변을 생성하지 못했어요.</p>
                    )}
                  </div>

                  <div className="mt-1 flex justify-end">
                    <Button type="button" variant="secondary" onClick={close}>
                      닫기
                    </Button>
                  </div>
                </>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <Spinner size={22} className="text-accent" />
                  <p className="text-sm text-muted-foreground">답변을 준비하고 있어요…</p>
                </div>
              ) : mode === 'choose' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={extracting}
                    onClick={runExtract}
                    data-testid="qa-extract"
                  >
                    {extracting ? <Spinner size={14} /> : '본문에서 단어 추출'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={extracting}
                    onClick={() => setMode('manual')}
                    data-testid="qa-manual-btn"
                  >
                    직접 입력하기
                  </Button>
                </div>
              ) : mode === 'chips' ? (
                <div className="flex flex-col gap-2">
                  {terms.length === 0 && (
                    <p className="text-xs text-muted-foreground">추출된 어려운 용어가 없어요.</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {terms.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => send(t)}
                        data-testid="qa-term-chip"
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMode('manual')}
                      data-testid="qa-manual-chip"
                      className="rounded-full border border-accent bg-accent/15 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
                    >
                      직접 입력하기
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
                      maxLength={MAX_QUESTION_LEN}
                      rows={4}
                      autoFocus
                      placeholder="이 콘텐츠에 대해 궁금한 점을 입력하세요."
                      data-testid="qa-input"
                      /* 폰트 16px 이상: iOS 가 인풋 포커스 시 화면을 자동 확대(줌인)하는 것을 방지 */
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pb-7 text-base outline-none focus:border-foreground/40"
                    />
                    <span className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-muted-foreground">
                      {question.length}/{MAX_QUESTION_LEN}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => send()}
                      disabled={question.trim().length === 0}
                      data-testid="qa-send"
                    >
                      보내기
                    </Button>
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
