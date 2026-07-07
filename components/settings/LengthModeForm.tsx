'use client';

import { useActionState } from 'react';
import { updateSummaryLength, type SettingsState } from '@/app/settings/actions';
import { AutoSaveStatus } from '@/components/settings/AutoSaveStatus';
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
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(LABELS) as LengthMode[]).map((mode) => (
          <label
            key={mode}
            className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
          >
            <input
              type="radio"
              name="summary_length"
              value={mode}
              defaultChecked={current === mode}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              data-testid={`length-${mode}`}
              className="sr-only"
            />
            <span className="text-sm font-medium">{LABELS[mode]}</span>
            <span className="text-xs text-muted-foreground">{DESC[mode]}</span>
          </label>
        ))}
      </div>
      <AutoSaveStatus pending={pending} ok={state.ok} error={state.error} />
    </form>
  );
}
