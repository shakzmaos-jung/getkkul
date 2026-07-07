'use client';

import { useEffect, useState } from 'react';
import { askAboutContent, extractContentTerms } from '@/app/feed/actions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { MAX_QUESTION_LEN, type QAAnswer } from '@/lib/qa/answer';

const LENGTHS: { key: keyof QAAnswer; label: string }[] = [
  { key: 'short', label: '짧게' },
  { key: 'normal', label: '보통' },
  { key: 'long', label: '길게' },
];

/** 트리거 아이콘: 그라데이션 스파클(AI 느낌). */
function AiSparkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="gk-ai-spark" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F59E0B" />
          <stop offset="0.55" stopColor="#F472B6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8L12 16.5l-1.8-5.2L5 9.5l5.2-1.8z" fill="url(#gk-ai-spark)" />
      <path d="M18.6 14l.85 2.5 2.5.85-2.5.85-.85 2.5-.85-2.5-2.5-.85 2.5-.85z" fill="url(#gk-ai-spark)" />
    </svg>
  );
}

/** 컨시어지 꿀벌: 동글동글 + 안경 + 말하는 애니메이션. */
function BeeMascot({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="gk-bee shrink-0" aria-hidden>
      <defs>
        <clipPath id="gk-bee-body">
          <ellipse cx="32" cy="37" rx="19" ry="17" />
        </clipPath>
        <linearGradient id="gk-bee-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* 날개 */}
      <ellipse cx="21" cy="20" rx="9" ry="12" fill="#ffffff" opacity="0.75" transform="rotate(-22 21 20)" />
      <ellipse cx="43" cy="20" rx="9" ry="12" fill="#ffffff" opacity="0.75" transform="rotate(22 43 20)" />
      {/* 더듬이 */}
      <path d="M26 13 Q23 6 19 5" stroke="#4b3b2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M38 13 Q41 6 45 5" stroke="#4b3b2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="18.5" cy="4.5" r="2.3" fill="#4b3b2a" />
      <circle cx="45.5" cy="4.5" r="2.3" fill="#4b3b2a" />
      {/* 몸통 + 줄무늬 */}
      <ellipse cx="32" cy="37" rx="19" ry="17" fill="url(#gk-bee-grad)" />
      <g clipPath="url(#gk-bee-body)">
        <rect x="11" y="41" width="42" height="6" fill="#4b3b2a" opacity="0.85" />
        <rect x="11" y="51" width="42" height="6" fill="#4b3b2a" opacity="0.85" />
      </g>
      {/* 볼터치 */}
      <circle cx="20" cy="39" r="3" fill="#FB7185" opacity="0.55" />
      <circle cx="44" cy="39" r="3" fill="#FB7185" opacity="0.55" />
      {/* 안경 */}
      <path d="M30 31 Q32 29.5 34 31" stroke="#4b3b2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="32" r="6" fill="#ffffff" stroke="#4b3b2a" strokeWidth="2" />
      <circle cx="39" cy="32" r="6" fill="#ffffff" stroke="#4b3b2a" strokeWidth="2" />
      {/* 눈 */}
      <circle cx="25" cy="32" r="2.1" fill="#3b2f24" />
      <circle cx="39" cy="32" r="2.1" fill="#3b2f24" />
      {/* 입(말하는 애니메이션) */}
      <ellipse className="gk-bee-mouth" cx="32" cy="43" rx="2.4" ry="1.7" fill="#7a3b2e" />
    </svg>
  );
}

/**
 * 콘텐츠 Q&A 다이얼로그. 컨시어지 꿀벌이 안내하고, 어려운 용어 칩(단일 선택) + 직접 입력.
 * 질문 1개(최대 200자) → nano 답변(짧게/보통/길게). 단일 턴, 화면 안에 담고 내부 스크롤.
 */
export default function ContentQA({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<QAAnswer | null>(null);
  const [len, setLen] = useState<keyof QAAnswer>('normal');
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[] | null>(null); // null=분석 중
  const [manual, setManual] = useState(false);

  // 열릴 때 용어 추출(1회). terms 는 열기 전/닫을 때 null(분석 중)로 초기화되어 있다.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    extractContentTerms(videoId).then((t) => {
      if (alive) setTerms(t);
    });
    return () => {
      alive = false;
    };
  }, [open, videoId]);

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
    setTerms(null);
    setManual(false);
  }

  async function send(override?: string) {
    const q = (override ?? question).trim();
    if (!q || loading) return;
    setQuestion(q);
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
        title="AI에게 질문하기"
        data-testid="content-qa"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
      >
        <AiSparkIcon />
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
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-card to-card shadow-xl"
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
                <BeeMascot size={56} />
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
              ) : loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <Spinner size={22} className="text-accent" />
                  <p className="text-sm text-muted-foreground">답변을 준비하고 있어요…</p>
                </div>
              ) : (
                <>
                  {/* 용어 칩(단일 선택) + 직접 입력 칩 */}
                  {!manual &&
                    (terms === null ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Spinner size={12} /> 콘텐츠에서 용어를 찾는 중…
                      </div>
                    ) : (
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
                          onClick={() => setManual(true)}
                          data-testid="qa-manual-chip"
                          className="rounded-full border border-accent bg-accent/15 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
                        >
                          직접 입력하기
                        </button>
                      </div>
                    ))}

                  {/* 입력(우하단 내부에 글자수) */}
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
                      maxLength={MAX_QUESTION_LEN}
                      rows={4}
                      placeholder="이 콘텐츠에 대해 궁금한 점을 입력하세요."
                      data-testid="qa-input"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pb-7 text-sm outline-none focus:border-foreground/40"
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
