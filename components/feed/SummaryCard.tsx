'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { useToast } from '@/components/ui/ToastProvider';
import { setVideoLength } from '@/app/feed/actions';
import { formatDuration } from '@/lib/youtube/duration';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

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
}

const MODES: { mode: LengthMode; label: string }[] = [
  { mode: 'short', label: '짧게' },
  { mode: 'normal', label: '보통' },
  { mode: 'long', label: '길게' },
];

// 한국어 평균 독서 속도(자/분). 압축 분량·압축률 산정 기준.
const CHARS_PER_MIN = 500;
// 길이 전환 시 인디케이터 이동 시간(ms). 이동 완료 후 본문 반영.
const SLIDE_MS = 150;

/** 초를 10초 단위로 올림(허용 초: 10/20/30/40/50, 최소 10초). 예 73초 → 80초. */
function ceil10(sec: number): number {
  return Math.max(10, Math.ceil(sec / 10) * 10);
}

/** 초 → "N시간 N분 N초"(0 단위 생략). 압축 분량 표시용(10초 단위 올림). */
function humanizeSec(sec: number): string {
  const t = ceil10(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  if (s > 0) parts.push(`${s}초`);
  return parts.length > 0 ? parts.join(' ') : '0초';
}

/** 영상 업데이트 일시(published_at, UTC)를 KST yyyy-mm-dd hh:mm 으로. */
function formatKstDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

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
}: Props) {
  const showToast = useToast();
  const duration = formatDuration(durationSeconds);
  const [mode, setMode] = useState<LengthMode>(initialMode); // 본문에 반영되는 길이
  const [visual, setVisual] = useState<LengthMode>(initialMode); // 인디케이터/강조(즉시 이동)
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const shown = summaries[mode] ??
    summaries.normal ??
    summaries.short ??
    summaries.long ?? { coreText: '', bullets: [] };
  const hasBullets = shown.bullets.length > 0;
  const hasBody = shown.coreText.length > 0 || hasBullets;

  // 시간 절약 어필: 표시 본문 글자수 → 읽는 시간, 영상 대비 압축률.
  const bodyPlain = [shown.coreText, ...shown.bullets].join(' ').replace(/\s+/g, '');
  const readSeconds = bodyPlain.length > 0 ? (bodyPlain.length / CHARS_PER_MIN) * 60 : 0;
  const compressionPct =
    durationSeconds && durationSeconds > 0 && readSeconds > 0
      ? Math.max(0, Math.min(99.9, (1 - readSeconds / durationSeconds) * 100))
      : null;
  const readText = humanizeSec(readSeconds);

  // 복사/표시 공용 메타 한 줄(플레인 텍스트).
  const metaText = [
    duration && `영상 길이 ${duration}`,
    hasBody && `압축 분량 ${readText}`,
    compressionPct !== null && `(압축률 ${compressionPct.toFixed(1)}%)`,
  ]
    .filter(Boolean)
    .join(' | ');

  const visualIndex = Math.max(0, MODES.findIndex((o) => o.mode === visual));

  function pick(m: LengthMode) {
    if (m === visual) return;
    setVisual(m); // 인디케이터 즉시 이동(0.15초 슬라이드)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 이동 완료 후 본문 반영 + 저장.
      setExpanded(false);
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
    const body = [shown.coreText, ...shown.bullets.map((b) => `- ${b}`)]
      .filter(Boolean)
      .join('\n');
    const text = `${header.join('\n')}\n\n${body}`;
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

        <div className="flex shrink-0 items-center gap-1">
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
            onClick={shareCard}
            aria-label="카드 공유"
            title="공유"
            data-testid="share-card"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShareIcon />
          </button>
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
              영상 길이 <span className="tabular-nums text-foreground/70">{duration}</span>
            </span>
          )}
          {duration && hasBody && <span aria-hidden>|</span>}
          {hasBody && (
            <span>
              압축 분량 <span className="tabular-nums text-foreground/70">{readText}</span>
            </span>
          )}
          {compressionPct !== null && <span aria-hidden>|</span>}
          {compressionPct !== null && (
            <span className="font-semibold text-accent" data-testid="compression-rate">
              (압축률 {compressionPct.toFixed(1)}%)
            </span>
          )}
        </p>
      )}

      {hasBullets ? (
        /* 본문/상세 영역을 탭하면 접기·펼치기 (메인 본문·상세 영역 터치 토글). */
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          data-testid="summary-body"
          className="mt-3 -mx-1 cursor-pointer select-none rounded-md px-1 py-0.5 transition-colors hover:bg-muted/40"
        >
          <p className="text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>
          {expanded && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {shown.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>
      )}

      {hasBullets && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid="toggle-bullets"
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? '접기 ▴' : '상세 보기 ▾'}
        </button>
      )}
    </Card>
  );
}
