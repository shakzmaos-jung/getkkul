'use client';

import { useEffect, useState } from 'react';
import type { GlossaryRow, GlossaryHistoryRow } from '@/lib/glossary/types';
import { updateGlossaryDefinition, fetchGlossaryHistoryAction } from '@/lib/glossary/actions';

/**
 * 용어 정의 수정 모달(어드민 최초 WRITE). textarea 로 정의 편집 → updateGlossaryDefinition.
 * 열릴 때 그 용어의 수정 이력을 지연 조회(등록/수정자·일시). ESC·배경 클릭으로 닫힘.
 */
export function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: GlossaryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [definition, setDefinition] = useState(row.definition ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GlossaryHistoryRow[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    fetchGlossaryHistoryAction(row.term).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, [row.term]);

  async function save() {
    setSaving(true);
    setError(null);
    const r = await updateGlossaryDefinition(row.term, definition);
    setSaving(false);
    if (r.ok) onSaved();
    else setError(r.error ?? '저장에 실패했습니다.');
  }

  const dirty = definition.trim() !== (row.definition ?? '').trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${row.term} 정의 수정`}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{row.term}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-ink-tertiary hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink-tertiary">
          정의를 수정하면 출처가 <span className="text-primary">관리자</span>로 표시되고, 이후 파이프라인이 이 용어를 다시 정의하지 않습니다.
        </p>

        <label htmlFor="glossary-def" className="mb-1.5 block text-xs font-medium text-ink-subtle">
          정의
        </label>
        <textarea
          id="glossary-def"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-ink-subtle"
          autoFocus
        />

        {error && <p className="mt-2 text-xs text-crit">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-ink-tertiary hover:text-ink">
            취소
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty || !definition.trim()}
            className="rounded-lg border border-hairline bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30 disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>

        <div className="mt-6 border-t border-hairline pt-4">
          <h3 className="mb-2 text-xs font-medium text-ink-subtle">수정 이력</h3>
          {history === null ? (
            <p className="text-xs text-ink-tertiary">불러오는 중…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-ink-tertiary">이력이 없습니다.</p>
          ) : (
            <ul className="space-y-2.5">
              {history.map((h) => (
                <li key={h.id} className="text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-ink-subtle">
                    <span>{h.editedAtKst}</span>
                    <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-ink-tertiary">
                      {h.newSource === 'admin' ? '관리자' : 'LLM'}
                    </span>
                    <span className="font-mono text-ink-tertiary">{h.editorEmail ?? '시스템'}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink-subtle">
                    {h.oldDefinition ? (
                      <>
                        <span className="text-ink-tertiary line-through">{h.oldDefinition}</span>
                        {' → '}
                      </>
                    ) : (
                      <span className="text-ink-tertiary">최초 등록: </span>
                    )}
                    {h.newDefinition}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
