'use client';

import { useEffect, useState } from 'react';
import type { GlossaryRow, GlossarySourceRow } from '@/lib/glossary/types';
import { fetchGlossarySources } from '@/lib/glossary/actions';

function fmtDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const label = (r: GlossaryRow) => [r.termKo, r.termEn].filter(Boolean).join(' · ') || '(이름 없음)';

/** 용어가 도출된 소스 콘텐츠(영상 요약 + 메타) 조회 모달. 읽기 전용. EditDialog 셸 재사용. */
export function ContentDialog({ row, onClose }: { row: GlossaryRow; onClose: () => void }) {
  const [sources, setSources] = useState<GlossarySourceRow[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    fetchGlossarySources(row.id).then((s) => {
      if (alive) setSources(s);
    });
    return () => {
      alive = false;
    };
  }, [row.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${label(row)} 도출 콘텐츠`}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            {label(row)}
            <span className="ml-2 text-xs font-normal text-ink-tertiary">
              도출 콘텐츠{sources ? ` ${sources.length}개` : ''}
            </span>
          </h2>
          <button onClick={onClose} aria-label="닫기" className="text-ink-tertiary hover:text-ink">
            ✕
          </button>
        </div>

        {sources === null ? (
          <p className="text-xs text-ink-tertiary">불러오는 중…</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-ink-subtle">이 용어가 도출된 콘텐츠가 없습니다.</p>
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
