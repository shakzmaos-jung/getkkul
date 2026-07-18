'use client';

import { useEffect, useState } from 'react';
import type { CorrectionRow, CorrectionForm } from '@/lib/corrections/types';
import { saveCorrection } from '@/lib/corrections/actions';

const INPUT =
  'w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-ink-subtle';

const FORM_OPTIONS: { value: CorrectionForm; label: string }[] = [
  { value: 'ko', label: '한글' },
  { value: 'en', label: '영어' },
  { value: 'hybrid', label: '하이브리드 한글(Latin)' },
];

/**
 * 자동 교정 수정 다이얼로그. 교정 표기·표기형·메모를 편집한다(원문·근거는 읽기 전용 참고).
 * 저장 시 method='admin' 로 승격 — 파이프라인 재적재가 덮지 않는다. 메모는 추후 학습데이터.
 */
export function EditCorrectionDialog({
  row,
  onClose,
  onSaved,
}: {
  row: CorrectionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [corrected, setCorrected] = useState(row.corrected);
  const [form, setForm] = useState<CorrectionForm>(row.form);
  const [memo, setMemo] = useState(row.adminMemo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await saveCorrection(row.id, corrected, form, memo);
    setBusy(false);
    if (r.ok) onSaved();
    else setError(r.error ?? '저장에 실패했습니다.');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="교정 수정"
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">교정 수정</h2>
          <button onClick={onClose} aria-label="닫기" className="text-ink-tertiary hover:text-ink">
            ✕
          </button>
        </div>

        {/* 읽기 전용 맥락 */}
        <div className="mb-3 space-y-1 rounded-lg bg-surface-2 px-3 py-2 text-xs">
          <p className="text-ink-subtle">
            원문 표기: <span className="font-medium text-ink">{row.original}</span>
          </p>
          {row.reason && <p className="text-ink-tertiary">자동 근거: {row.reason}</p>}
          {row.videoTitle && (
            <p className="truncate text-ink-tertiary">콘텐츠: {row.videoTitle}</p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">교정 표기</label>
            <input
              value={corrected}
              onChange={(e) => setCorrected(e.target.value)}
              className={INPUT}
              placeholder="예: 키미 K3(Kimi K3)"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">표기형</label>
            <select value={form} onChange={(e) => setForm(e.target.value as CorrectionForm)} className={INPUT}>
              {FORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">
              메모 (이력 없음 · 교정 품질 향상 학습용)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className={`${INPUT} resize-y`}
              placeholder="왜 이렇게 교정했는지 · 분야 맥락 등"
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-crit">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-ink-tertiary hover:text-ink">
            취소
          </button>
          <button
            onClick={save}
            disabled={busy || !corrected.trim()}
            className="rounded-lg border border-hairline bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30 disabled:opacity-40"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
