'use client';

import { useActionState } from 'react';
import { updateSummaryLength, type SettingsState } from '@/app/settings/actions';
import { Button } from '@/components/ui/Button';
import type { LengthMode } from '@/lib/summary/format';

const LABELS: Record<LengthMode, string> = {
  short: '짧게',
  normal: '보통',
  long: '길게',
};
const DESC: Record<LengthMode, string> = {
  short: '핵심 1~3문장',
  normal: '핵심 1~7문장',
  long: '핵심 1~12문장',
};

const initial: SettingsState = {};

export default function LengthModeForm({ current }: { current: LengthMode }) {
  const [state, formAction, pending] = useActionState(updateSummaryLength, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(LABELS) as LengthMode[]).map((mode) => (
          <label
            key={mode}
            className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="summary_length"
                value={mode}
                defaultChecked={current === mode}
                data-testid={`length-${mode}`}
                className="accent-foreground"
              />
              {LABELS[mode]}
            </span>
            <span className="pl-6 text-xs text-muted-foreground">{DESC[mode]}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending} data-testid="save-settings">
          {pending ? '저장 중…' : '저장'}
        </Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-accent">저장되었습니다.</p>}
      </div>
    </form>
  );
}
