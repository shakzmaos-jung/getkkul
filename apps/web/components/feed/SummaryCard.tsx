'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { useToast } from '@/components/ui/ToastProvider';
import ContentQA from '@/components/feed/ContentQA';
import { setVideoLength, setContentFeedback } from '@/app/feed/actions';
import { hms, computeReading } from '@/lib/summary/reading';
import { formatKstDateTime } from '@/lib/time';
import { type LengthMode } from '@/lib/summary/format';
import { messages } from '@/lib/i18n';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  VIEW_ENUM,
  viewContent,
  viewAvailable,
  resolveInitialView,
  type CardView,
} from '@/lib/feed/card-views';
import type { ModeSummary, FeedbackRating } from '@/lib/feed/map-digests';

const CV = messages.feed.cardViews;
const VIEWS: { view: CardView; label: string }[] = [
  { view: 'simple', label: CV.simple },
  { view: 'detail', label: CV.detail },
  { view: 'full', label: CV.full },
];

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

/** 불릿 목록 — 항목마다 줄바꿈(요약품질 개선: 짧게/보통 불릿 가독성). */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((p, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[2px] text-muted-foreground">
            •
          </span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

// 뷰 전환 시 인디케이터 이동 시간(ms). 이동 완료 후 본문 반영.
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

  // 초기 뷰: pref/global enum → 뷰(미가용이면 첫 제공 뷰).
  const startView = resolveInitialView(summaries, initialMode);
  const [view, setView] = useState<CardView>(startView); // 본문에 반영되는 뷰
  const [visual, setVisual] = useState<CardView>(startView); // 인디케이터(즉시 이동)
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const { bullets, text: viewText } = viewContent(summaries, view);
  const hasBody = viewText.trim().length > 0;
  const detailUnavailable = !viewAvailable(summaries, 'detail'); // 자세히·인사이트 미제공 안내용

  // 피드백(👍/👎): 자세히·인사이트는 같은 long 요약 → enum 기준(공유). 낙관적 로컬 상태.
  const fbEnum = VIEW_ENUM[view];
  const [fb, setFb] = useState<Partial<Record<LengthMode, FeedbackRating>>>(feedback);
  function rate(r: FeedbackRating) {
    const next: FeedbackRating | null = fb[fbEnum] === r ? null : r;
    setFb((prev) => ({ ...prev, [fbEnum]: next ?? undefined }));
    startTransition(() => setContentFeedback(videoId, fbEnum, next));
  }

  // 시간 절약 어필: 현재 뷰 텍스트 글자수 → 읽는 시간, 영상 대비 압축률.
  const { readText, compressionPct } = computeReading(viewText, durationSeconds);

  // 복사/표시 공용 메타(플레인 텍스트). 압축률은 앞 파이프 없이 띄워 붙인다.
  const metaBase = [duration && `원본 영상 ${duration}`, hasBody && `읽는 시간 ${readText}`]
    .filter(Boolean)
    .join(' | ');
  const metaText =
    compressionPct !== null ? `${metaBase}  (압축률 ${compressionPct.toFixed(1)}%)` : metaBase;

  const visualIndex = Math.max(0, VIEWS.findIndex((o) => o.view === visual));

  function pick(v: CardView) {
    if (v === visual) return;
    setVisual(v); // 인디케이터 즉시 이동(0.15초 슬라이드)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 이동 완료 후 본문 반영 + pref 저장(enum).
      setView(v);
      startTransition(() => setVideoLength(videoId, VIEW_ENUM[v]));
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
    const body = viewText;
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

      {/* 뷰 선택(간단히/자세히/인사이트): 균등 3분할 + 슬라이드 인디케이터(0.15초) */}
      <div
        role="group"
        aria-label="요약 보기"
        className="relative mt-3 grid grid-cols-3 rounded-lg border border-border bg-card p-0.5"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-md bg-foreground transition-transform duration-150 ease-out"
          style={{ width: 'calc((100% - 0.25rem) / 3)', transform: `translateX(${visualIndex * 100}%)` }}
        />
        {VIEWS.map((o) => {
          const active = o.view === visual;
          const disabled = !viewAvailable(summaries, o.view);
          return (
            <button
              key={o.view}
              type="button"
              disabled={disabled}
              data-testid={`card-view-${o.view}`}
              onClick={() => pick(o.view)}
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

      {/* 본문: 현재 뷰(간단히=요점 불릿 / 자세히=핵심 사실 / 인사이트=맥락·인사이트) */}
      {bullets.length > 0 ? (
        <div data-testid="summary-body" className="mt-3 text-sm leading-relaxed text-foreground/80">
          <Bullets items={bullets} />
        </div>
      ) : (
        <p
          data-testid="summary-body"
          className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80"
        >
          {viewText}
        </p>
      )}

      {/* 자세히·인사이트 미제공(콘텐츠 빈약) 안내 */}
      {detailUnavailable && (
        <p data-testid="views-unavailable" className="mt-2 text-xs text-muted-foreground">
          {CV.unavailable}
        </p>
      )}

      {/* 피드백: 이 요약 어때요? 👍/👎 + 활용 안내 툴팁 */}
      {hasBody && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
          <span className="mr-0.5 text-xs text-muted-foreground">{CV.feedbackTitle}</span>
          <InfoTooltip label={CV.feedbackTooltipLabel} text={CV.feedbackTooltip} />
          <button
            type="button"
            onClick={() => rate('up')}
            aria-label="좋아요"
            aria-pressed={fb[fbEnum] === 'up'}
            data-testid="feedback-up"
            className={`ml-1 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm transition-colors hover:bg-muted ${
              fb[fbEnum] === 'up' ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => rate('down')}
            aria-label="별로예요"
            aria-pressed={fb[fbEnum] === 'down'}
            data-testid="feedback-down"
            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm transition-colors hover:bg-muted ${
              fb[fbEnum] === 'down' ? 'bg-danger/15 text-danger' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👎
          </button>
        </div>
      )}
    </Card>
  );
}
