'use client';

import { useEffect, useState } from 'react';
import type { GlossaryRow, GlossaryHistoryRow, GlossarySnapshot } from '@/lib/glossary/types';
import {
  addGlossaryTerm,
  saveGlossaryTerm,
  setGlossaryDisabled,
  deleteGlossaryTerm,
  fetchGlossaryHistoryAction,
} from '@/lib/glossary/actions';

const ACTION_LABEL: Record<string, string> = {
  create: '등록',
  edit: '수정',
  disable: '일시정지',
  enable: '해제',
  delete: '삭제',
};
const FIELD_LABEL: Record<string, string> = { term_ko: '한글', term_en: '영어', definition: '정의' };
const INPUT = 'w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-ink-subtle';

function diffLines(before: GlossarySnapshot | null, after: GlossarySnapshot | null) {
  return (['term_ko', 'term_en', 'definition'] as const).flatMap((f) => {
    const b = before?.[f] ?? null;
    const a = after?.[f] ?? null;
    return b === a ? [] : [{ f, b, a }];
  });
}

/**
 * 용어 생성·수정 모달. row=null 이면 신규 등록. 한글/영어/정의/메모 편집(메모는 이력 없음).
 * 수정 모드: 일시정지/해제·삭제(인라인 확인)·그 용어 이력(등록/수정/일시정지/삭제). ESC·배경 클릭으로 닫힘.
 */
export function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: GlossaryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = row === null;
  const [termKo, setTermKo] = useState(row?.termKo ?? '');
  const [termEn, setTermEn] = useState(row?.termEn ?? '');
  const [definition, setDefinition] = useState(row?.definition ?? '');
  const [note, setNote] = useState(row?.note ?? '');
  const [aliasesText, setAliasesText] = useState((row?.aliases ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [history, setHistory] = useState<GlossaryHistoryRow[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!row) return;
    let alive = true;
    fetchGlossaryHistoryAction(row.id).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, [row]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) onSaved();
    else setError(r.error ?? '실패했습니다.');
  }

  const nameEmpty = !termKo.trim() && !termEn.trim();
  const save = () => {
    const aliases = aliasesText
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return run(() =>
      isCreate
        ? addGlossaryTerm(termKo, termEn, definition, note, aliases)
        : saveGlossaryTerm(row.id, termKo, termEn, definition, note, aliases),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isCreate ? '새 용어 등록' : `${row.termKo ?? row.termEn ?? ''} 수정`}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{isCreate ? '새 용어 등록' : '용어 수정'}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-ink-tertiary hover:text-ink">
            ✕
          </button>
        </div>

        {row && row.homonymCount > 0 && (
          <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
            같은 이름의 다른 뜻이 {row.homonymCount}개 있습니다 — 메모로 분야를 구분해 두면 좋습니다.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">한글 표기</label>
            <input value={termKo} onChange={(e) => setTermKo(e.target.value)} className={INPUT} placeholder="예: 엔캐리 트레이드" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">영어 표기</label>
            <input value={termEn} onChange={(e) => setTermEn(e.target.value)} className={INPUT} placeholder="예: Yen carry trade" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">다른 표기(Alias) · 쉼표/줄바꿈 구분</label>
            <input
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              className={INPUT}
              placeholder="예: 키미3, 키미 3, Kimi3, 키미쓰리"
            />
            <p className="mt-1 text-[11px] text-ink-tertiary">
              본문에 이 표기들이 나와도 같은 용어 툴팁이 뜹니다(툴팁엔 대표명 표시).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">정의</label>
            <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={4} className={`${INPUT} resize-y`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">메모 (이력 없음 · 관리자 참고)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} placeholder="이 뜻의 분야 등" />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-crit">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isCreate && (
            <button
              onClick={() => run(() => setGlossaryDisabled(row.id, !row.disabled))}
              disabled={busy}
              className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink disabled:opacity-40"
            >
              {row.disabled ? '사용 재개' : '일시정지'}
            </button>
          )}
          {!isCreate &&
            (confirmDelete ? (
              <span className="flex items-center gap-1.5 text-sm text-crit">
                삭제할까요?
                <button onClick={() => run(() => deleteGlossaryTerm(row.id))} disabled={busy} className="rounded-lg bg-crit/15 px-2 py-1 text-xs font-medium text-crit hover:bg-crit/25">
                  삭제
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1 text-xs text-ink-tertiary hover:text-ink">
                  취소
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="rounded-lg px-3 py-1.5 text-sm text-crit/80 hover:text-crit">
                삭제
              </button>
            ))}
          <div className="grow" />
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-ink-tertiary hover:text-ink">
            취소
          </button>
          <button
            onClick={save}
            disabled={busy || nameEmpty}
            className="rounded-lg border border-hairline bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30 disabled:opacity-40"
          >
            {busy ? '저장 중…' : isCreate ? '등록' : '저장'}
          </button>
        </div>

        {!isCreate && (
          <div className="mt-6 border-t border-hairline pt-4">
            <h3 className="mb-2 text-xs font-medium text-ink-subtle">수정 이력</h3>
            {history === null ? (
              <p className="text-xs text-ink-tertiary">불러오는 중…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-ink-tertiary">이력이 없습니다.</p>
            ) : (
              <ul className="space-y-2.5">
                {history.map((h) => {
                  const diffs = h.action === 'edit' ? diffLines(h.before, h.after) : [];
                  return (
                    <li key={h.id} className="text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-ink-subtle">
                        <span>{h.editedAtKst}</span>
                        <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-ink-tertiary">
                          {ACTION_LABEL[h.action] ?? h.action}
                        </span>
                        <span className="font-mono text-ink-tertiary">{h.editorEmail ?? '시스템'}</span>
                      </div>
                      {h.action === 'create' && h.after?.definition && (
                        <p className="mt-0.5 whitespace-pre-wrap text-ink-subtle">최초: {h.after.definition}</p>
                      )}
                      {diffs.map((d) => (
                        <p key={d.f} className="mt-0.5 whitespace-pre-wrap text-ink-subtle">
                          {FIELD_LABEL[d.f]}: <span className="text-ink-tertiary line-through">{d.b ?? '∅'}</span> → {d.a ?? '∅'}
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
