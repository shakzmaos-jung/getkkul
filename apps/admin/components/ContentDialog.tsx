'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlossarySourceRow } from '@/lib/glossary/types';

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * 소스 콘텐츠(영상 요약 + 메타) 조회 모달. 읽기 전용·재사용.
 * `fetcher` 로 조회 방식을 주입한다(용어사전: 도출 소스 여러 건, 교정 로그: video_id 단건).
 * 열릴 때(마운트) 1회 지연 조회 — 다이얼로그는 열 때마다 새로 마운트되므로 마운트 의존으로 충분.
 */
export function ContentDialog({
  title,
  countNoun = '콘텐츠',
  fetcher,
  onClose,
}: {
  title: string;
  countNoun?: string;
  fetcher: () => Promise<GlossarySourceRow[]>;
  onClose: () => void;
}) {
  const [sources, setSources] = useState<GlossarySourceRow[] | null>(null);
  // 다이얼로그는 열 때마다 새로 마운트되므로 최초 fetcher 를 고정 캡처해 1회 조회한다(재렌더 시 재조회 방지).
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    fetcherRef.current().then((s) => {
      if (alive) setSources(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} ${countNoun}`}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            {title}
            <span className="ml-2 text-xs font-normal text-ink-tertiary">
              {countNoun}
              {sources ? ` ${sources.length}개` : ''}
            </span>
          </h2>
          <button onClick={onClose} aria-label="닫기" className="text-ink-tertiary hover:text-ink">
            ✕
          </button>
        </div>

        {sources === null ? (
          <p className="text-xs text-ink-tertiary">불러오는 중…</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-ink-subtle">표시할 콘텐츠가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {sources.map((s) => (
              <li key={s.videoId} className="rounded-lg border border-hairline p-3">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.thumbnail}
                    alt=""
                    className="h-[54px] w-24 shrink-0 rounded-md bg-surface-2 object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <a
                      href={s.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-sm font-medium text-primary hover:underline"
                    >
                      {s.title ?? s.ytId}
                    </a>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {s.channelTitle ?? '—'}
                      {s.channelHandle ? ` · ${s.channelHandle}` : ''}
                    </p>
                    <p className="text-xs text-ink-tertiary">
                      {s.publishedAtKst ?? '—'}
                      {s.durationSeconds ? ` · ${fmtDuration(s.durationSeconds)}` : ''}
                    </p>
                  </div>
                </div>
                {(s.headline || s.coreText) && (
                  <div className="mt-3 border-t border-hairline/50 pt-3">
                    {s.headline && <p className="mb-1 text-sm font-medium text-ink">{s.headline}</p>}
                    {s.coreText && (
                      <p className="whitespace-pre-line text-xs leading-relaxed text-ink-subtle">
                        {s.coreText}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
