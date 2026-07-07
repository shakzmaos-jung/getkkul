'use client';

import { useActionState, useState } from 'react';
import { updateSummaryLength, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';
import type { LengthMode } from '@/lib/summary/format';

const LABELS: Record<LengthMode, string> = { short: '짧게', normal: '보통', long: '길게' };
const DESC: Record<LengthMode, string> = {
  short: '핵심 1~3문장',
  normal: '핵심 1~7문장',
  long: '핵심 1~12문장',
};

const initial: SettingsState = {};

export default function LengthModeForm({ current }: { current: LengthMode }) {
  const showToast = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [, formAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updateSummaryLength(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSavingKey(null);
    return r;
  }, initial);

  return (
    <form action={formAction} className="grid grid-cols-3 gap-2">
      {(Object.keys(LABELS) as LengthMode[]).map((mode) => (
        <label
          key={mode}
          className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-3 pr-7 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20"
        >
          <input
            type="radio"
            name="summary_length"
            value={mode}
            defaultChecked={current === mode}
            onChange={(e) => {
              setSavingKey(mode);
              e.currentTarget.form?.requestSubmit();
            }}
            data-testid={`length-${mode}`}
            className="peer sr-only"
          />
          <span className="text-sm font-medium">{LABELS[mode]}</span>
          <span className="text-xs text-muted-foreground">{DESC[mode]}</span>
          {/* 저장 중엔 스피너, 완료되면 체크(peer-checked). 둘이 겹치지 않게 택일 렌더. */}
          {savingKey === mode ? (
            <Spinner className="absolute right-2 top-2 text-muted-foreground" />
          ) : (
            <CheckIcon className="pointer-events-none absolute right-2 top-2 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
          )}
        </label>
      ))}
    </form>
  );
}
