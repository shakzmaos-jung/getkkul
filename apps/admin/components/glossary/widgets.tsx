'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GlossaryRow } from '@/lib/glossary/types';
import { EditDialog } from './EditDialog';

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  llm: { label: 'LLM', cls: 'bg-surface-2 text-ink-subtle' },
  admin: { label: '관리자', cls: 'bg-primary/20 text-primary' },
};

/** 용어사전 테이블 + 신규 등록. 행 '수정'→EditDialog(ko/en/정의/메모·일시정지·삭제·이력). 저장 후 재조회. */
export function GlossaryTable({ rows }: { rows: GlossaryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<GlossaryRow | null>(null);
  const [creating, setCreating] = useState(false);

  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const saved = () => {
    close();
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg border border-hairline bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30"
        >
          ＋ 새 용어
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-ink-subtle">조건에 맞는 용어가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-subtle">
              <tr className="border-b border-hairline">
                <th className="px-3 py-2 font-medium">용어</th>
                <th className="px-3 py-2 font-medium">정의</th>
                <th className="px-3 py-2 font-medium">메모</th>
                <th className="px-3 py-2 font-medium">출처</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">수정자</th>
                <th className="px-3 py-2 font-medium">수정일(KST)</th>
                <th className="px-3 py-2 font-medium" aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = SOURCE_BADGE[r.source] ?? SOURCE_BADGE.llm;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-hairline/50 align-top ${r.disabled ? 'opacity-60' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <div className="whitespace-nowrap font-medium text-ink">{r.termKo ?? '—'}</div>
                      {r.termEn && <div className="whitespace-nowrap text-xs text-ink-tertiary">{r.termEn}</div>}
                      {r.homonymCount > 0 && (
                        <span className="mt-0.5 inline-block rounded-pill bg-warn/15 px-1.5 py-0.5 text-xs text-warn">
                          동음이의 {r.homonymCount}
                        </span>
                      )}
                    </td>
                    <td className="max-w-80 whitespace-pre-wrap px-3 py-2 text-ink-subtle">{r.definition ?? '—'}</td>
                    <td className="max-w-40 whitespace-pre-wrap px-3 py-2 text-xs text-ink-tertiary">{r.note ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className={`rounded-pill px-2 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
                      {r.editCount > 1 && <span className="ml-1 text-xs text-ink-tertiary">·{r.editCount}회</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.disabled ? (
                        <span className="rounded-pill bg-warn/15 px-2 py-0.5 text-xs text-warn">일시정지</span>
                      ) : (
                        <span className="rounded-pill bg-ok/15 px-2 py-0.5 text-xs text-ok">사용중</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-subtle">
                      {r.editorEmail ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{r.updatedAtKst}</td>
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
      )}

      {(editing || creating) && <EditDialog row={editing} onClose={close} onSaved={saved} />}
    </>
  );
}
