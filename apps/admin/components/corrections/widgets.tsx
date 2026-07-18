'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CorrectionRow } from '@/lib/corrections/types';
import { fetchContentByVideoId } from '@/lib/corrections/actions';
import { ContentDialog } from '@/components/ContentDialog';
import { EditCorrectionDialog } from './EditCorrectionDialog';

const FORM_LABEL: Record<string, string> = { ko: '한글', en: '영어', hybrid: '하이브리드' };
const METHOD_BADGE: Record<string, { label: string; cls: string }> = {
  llm: { label: '자동', cls: 'bg-surface-2 text-ink-subtle' },
  admin: { label: '관리자', cls: 'bg-primary/20 text-primary' },
};

/** 오타 교정 로그 테이블. '보기'→콘텐츠 모달, '수정'→교정 편집(표기·표기형·메모). 저장 후 재조회. */
export function CorrectionTable({ rows }: { rows: CorrectionRow[] }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<CorrectionRow | null>(null);
  const [editing, setEditing] = useState<CorrectionRow | null>(null);

  if (rows.length === 0) {
    return <div className="text-sm text-ink-subtle">조건에 맞는 교정 로그가 없습니다.</div>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-subtle">
            <tr className="border-b border-hairline">
              <th className="px-3 py-2 font-medium">콘텐츠</th>
              <th className="px-3 py-2 font-medium">원문 → 교정</th>
              <th className="px-3 py-2 font-medium">표기형</th>
              <th className="px-3 py-2 font-medium">방식</th>
              <th className="px-3 py-2 font-medium">근거</th>
              <th className="px-3 py-2 font-medium">관리자 메모</th>
              <th className="px-3 py-2 font-medium">시각(KST)</th>
              <th className="px-3 py-2 font-medium" aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const badge = METHOD_BADGE[r.method] ?? METHOD_BADGE.llm;
              return (
                <tr key={r.id} className="border-b border-hairline/50 align-top">
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setViewing(r)}
                      className="rounded-lg border border-hairline bg-surface-1 px-2.5 py-1 text-xs text-ink-subtle hover:text-ink"
                    >
                      보기
                    </button>
                    {r.videoTitle && (
                      <div className="mt-1 max-w-44 truncate text-[11px] text-ink-tertiary" title={r.videoTitle}>
                        {r.videoTitle}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-ink-tertiary line-through">{r.original}</span>
                    <span className="mx-1 text-ink-tertiary">→</span>
                    <span className="font-medium text-ink">{r.corrected}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs text-ink-subtle">
                      {FORM_LABEL[r.form] ?? r.form}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={`rounded-pill px-2 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td className="max-w-56 whitespace-pre-wrap px-3 py-2 text-xs text-ink-subtle">
                    {r.reason ?? '—'}
                  </td>
                  <td className="max-w-44 whitespace-pre-wrap px-3 py-2 text-xs text-ink-tertiary">
                    {r.adminMemo ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">
                    {r.atKst}
                    {r.method === 'admin' && r.updatedAtKst && (
                      <div className="text-[11px] text-ink-tertiary">수정 {r.updatedAtKst}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-lg border border-hairline bg-surface-1 px-2.5 py-1 text-xs text-ink-subtle hover:text-ink"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewing && (
        <ContentDialog
          title={viewing.corrected}
          fetcher={() => fetchContentByVideoId(viewing.videoId)}
          onClose={() => setViewing(null)}
        />
      )}
      {editing && (
        <EditCorrectionDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
