'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { useToast } from '@/components/ui/ToastProvider';
import ContentQA from '@/components/feed/ContentQA';
import { setVideoLength, setContentFeedback } from '@/app/feed/actions';
import { hms, computeReading } from '@/lib/summary/reading';
import { formatKstDateTime } from '@/lib/time';
import type { LengthMode, Sentence } from '@/lib/summary/format';
import type { ModeSummary, FeedbackRating } from '@/lib/feed/map-digests';

interface Props {
  videoId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelHandle: string | null;
  title: string;
  url: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  initialMode: LengthMode;
  summaries: Partial<Record<LengthMode, ModeSummary>>;
  feedback: Partial<Record<LengthMode, FeedbackRating>>;
  bookmarked: boolean;
  onToggleBookmark: (next: boolean) => void;
}

/** long 문장 렌더 — 핵심(key) 문장은 밑줄 강조(REQ-E1 하이라이트). */
function HiSentence({ s }: { s: Sentence }) {
  return (
    <span className={s.key ? 'underline decoration-accent decoration-2 underline-offset-4' : undefined}>
      {s.text}{' '}
    </span>
  );
}

const MODES: { mode: LengthMode; label: string }[] = [
  { mode: 'short', label: '짧게' },
  { mode: 'normal', label: '보통' },
  { mode: 'long', label: '길게' },
];

// 길이 전환 시 인디케이터 이동 시간(ms). 이동 완료 후 본문 반영.
const SLIDE_MS = 150;

/** published_at → KST yyyy-mm-dd (딥링크 date 파라미터용). */
function kstDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(iso));
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function SummaryCard({
  videoId,
  channelTitle,
  channelThumbnail,
  channelHandle,
  title,
  url,
  publishedAt,
  durationSeconds,
  initialMode,
  summaries,
  feedback,
  bookmarked,
  onToggleBookmark,
}: Props) {
  const showToast = useToast();
  // 영상 길이: {n}시간 {n}분 {n}초(정확).
  const duration = durationSeconds && durationSeconds > 0 ? hms(durationSeconds) : '';
  const [mode, setMode] = useState<LengthMode>(initialMode); // 본문에 반영되는 길이
  const [visual, setVisual] = useState<LengthMode>(initialMode); // 인디케이터/강조(즉시 이동)
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const shown: ModeSummary =
    summaries[mode] ?? summaries.normal ?? summaries.short ?? summaries.long ?? { coreText: '' };
  const hasBody = shown.coreText.trim().length > 0;

  // 적응형 깊이: 제공되는 가장 깊은 모드(미제공 안내 문구용, AC-C1.3).
  const highestProvided = [...MODES].reverse().find((o) => summaries[o.mode] && !summaries[o.mode]!.notProvided);

  // 피드백(👍/👎): 현재 모드 기준. 낙관적 로컬 상태(재탭 취소·변경, AC-F1.1).
  const [fb, setFb] = useState<Partial<Record<LengthMode, FeedbackRating>>>(feedback);
  function rate(r: FeedbackRating) {
    const next: FeedbackRating | null = fb[mode] === r ? null : r;
    setFb((prev) => ({ ...prev, [mode]: next ?? undefined }));
    startTransition(() => setContentFeedback(videoId, mode, next));
  }

  // 시간 절약 어필: 표시 본문(coreText) 글자수 → 읽는 시간, 영상 대비 압축률(홈 목록과 공용 계산).
  const { readText, compressionPct } = computeReading(shown.coreText, durationSeconds);

  // 복사/표시 공용 메타(플레인 텍스트). 압축률은 앞 파이프 없이 띄워 붙인다.
  const metaBase = [duration && `원본 영상 ${duration}`, hasBody && `읽는 시간 ${readText}`]
    .filter(Boolean)
    .join(' | ');
  const metaText =
    compressionPct !== null ? `${metaBase}  (압축률 ${compressionPct.toFixed(1)}%)` : metaBase;

  const visualIndex = Math.max(0, MODES.findIndex((o) => o.mode === visual));

  function pick(m: LengthMode) {
    if (m === visual) return;
    setVisual(m); // 인디케이터 즉시 이동(0.15초 슬라이드)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 이동 완료 후 본문 반영 + 저장.
      setMode(m);
      startTransition(() => setVideoLength(videoId, m));
    }, SLIDE_MS);
  }

  async function copyBody() {
    // 상단 메타(채널·제목·업데이트·영상길이·압축분량·압축률) + 빈 줄 + 표시 본문.
    const channelLine = channelTitle
      ? channelHandle
        ? `${channelTitle} ${channelHandle}`
        : channelTitle
      : '';
    const header = [
      channelLine,
      title,
      publishedAt ? `업데이트 ${formatKstDateTime(publishedAt)}` : '',
      metaText,
    ].filter(Boolean);
    const body = shown.coreText;
    // 본문 마지막 줄에서 한 줄 띄우고 마케팅 훅.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const hook = `Powered by 겟꿀\n유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드립니다\n\n지금 시간 절약하러 가기 -> ${origin}/login`;
    const text = `${header.join('\n')}\n\n${body}\n\n${hook}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* 클립보드 실패해도 토스트로 안내 */
    }
    showToast('본문이 복사되었습니다');
  }

  async function shareCard() {
    const date = kstDate(publishedAt);
    const path = `/feed${date ? `?date=${date}` : ''}#d-${videoId}`;
    const link = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    // 모바일이면 OS 공유 시트(카카오톡/문자 등)로 바로 전달, 아니면 복사 + 토스트.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: title, url: link });
        return;
      } catch {
        return; // 사용자가 공유 시트를 닫음
      }
    }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* noop */
    }
    showToast('링크가 복사되었습니다');
  }

  return (
    <Card id={`d-${videoId}`} data-testid="summary-card" className="scroll-mt-20 p-5">
      {/* 헤더: 채널정보(좌) + 복사·원본·공유 아이콘(우) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {channelTitle && <ChannelAvatar src={channelThumbnail} title={channelTitle} size={20} />}
          <div className="flex min-w-0 items-baseline gap-1.5">
            {channelTitle && (
              <p data-testid="channel-label" className="truncate text-xs font-medium text-muted-foreground">
                {channelTitle}
              </p>
            )}
            {channelHandle && (
              <span className="truncate text-[11px] text-muted-foreground/60">{channelHandle}</span>
            )}
          </div>
        </div>

        {/* 아이콘 순서: 원본 › 복사 › 공유 › 북마크 */}
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="원본 영상"
            title="원본 영상"
            data-testid="original-video"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLinkIcon />
          </a>
          <button
            type="button"
            onClick={copyBody}
            aria-label="본문 복사"
            title="본문 복사"
            data-testid="copy-body"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            onClick={shareCard}
            aria-label="카드 공유"
            title="공유"
            data-testid="share-card"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            onClick={() => onToggleBookmark(!bookmarked)}
            aria-label="북마크"
            aria-pressed={bookmarked}
            title={bookmarked ? '북마크 해제' : '북마크'}
            data-testid="bookmark"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted ${
              bookmarked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
          <ContentQA videoId={videoId} />
        </div>
      </div>

      {/* 길이 선택: 카드 폭 전체 균등 3분할 + 슬라이드 인디케이터(0.15초) */}
      <div
        role="group"
        aria-label="요약 길이"
        className="relative mt-3 grid grid-cols-3 rounded-lg border border-border bg-card p-0.5"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-md bg-foreground transition-transform duration-150 ease-out"
          style={{ width: 'calc((100% - 0.25rem) / 3)', transform: `translateX(${visualIndex * 100}%)` }}
        />
        {MODES.map((o) => {
          const active = o.mode === visual;
          const disabled = !summaries[o.mode];
          return (
            <button
              key={o.mode}
              type="button"
              disabled={disabled}
              data-testid={`card-length-${o.mode}`}
              onClick={() => pick(o.mode)}
              className={`relative z-10 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* 제목 + 업데이트 */}
      <h3 className="mt-3 text-[17px] font-semibold leading-snug tracking-tight">{title}</h3>
      {publishedAt && (
        <p className="mt-1 text-xs text-muted-foreground">업데이트 {formatKstDateTime(publishedAt)}</p>
      )}

      {/* 시간 절약 어필: 영상 길이 | 압축 분량 | (압축률) */}
      {(duration || hasBody) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {duration && (
            <span>
              원본 영상 <span className="tabular-nums text-foreground/70">{duration}</span>
            </span>
          )}
          {duration && hasBody && <span aria-hidden>|</span>}
          {hasBody && (
            <span>
              읽는 시간 <span className="tabular-nums text-foreground/70">{readText}</span>
            </span>
          )}
          {compressionPct !== null && (
            <span className="ml-1 font-semibold text-accent" data-testid="compression-rate">
              (압축률 {compressionPct.toFixed(1)}%)
            </span>
          )}
        </p>
      )}

      {/* 본문: 미제공 안내 / long 2단락(핵심 사실·인사이트, 핵심문장 밑줄) / 평면 요약 */}
      {shown.notProvided ? (
        <p
          data-testid="summary-not-provided"
          className="mt-3 rounded-lg bg-muted/50 px-3 py-4 text-sm text-muted-foreground"
        >
          이 영상은 내용이 짧아 ‘{highestProvided?.label ?? '짧게'}’까지만 제공해요.
        </p>
      ) : mode === 'long' && shown.long ? (
        <div
          data-testid="summary-body"
          className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80"
        >
          {shown.long.facts.length > 0 && (
            <section data-testid="long-facts">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                핵심 사실
              </h4>
              <p>
                {shown.long.facts.map((s, i) => (
                  <HiSentence key={i} s={s} />
                ))}
              </p>
            </section>
          )}
          {shown.long.insights.length > 0 && (
            <section data-testid="long-insights">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                맥락·인사이트
              </h4>
              <p>
                {shown.long.insights.map((s, i) => (
                  <HiSentence key={i} s={s} />
                ))}
              </p>
            </section>
          )}
        </div>
      ) : (
        <p data-testid="summary-body" className="mt-3 text-sm leading-relaxed text-foreground/80">
          {shown.coreText}
        </p>
      )}

      {/* 피드백: 이 요약 어때요? 👍/👎 (제공 모드에서만) */}
      {!shown.notProvided && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
          <span className="mr-1 text-xs text-muted-foreground">이 요약 어때요?</span>
          <button
            type="button"
            onClick={() => rate('up')}
            aria-label="좋아요"
            aria-pressed={fb[mode] === 'up'}
            data-testid="feedback-up"
            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm transition-colors hover:bg-muted ${
              fb[mode] === 'up' ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => rate('down')}
            aria-label="별로예요"
            aria-pressed={fb[mode] === 'down'}
            data-testid="feedback-down"
            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm transition-colors hover:bg-muted ${
              fb[mode] === 'down' ? 'bg-danger/15 text-danger' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👎
          </button>
        </div>
      )}
    </Card>
  );
}
