'use client';

import { useActionState } from 'react';
import { updateSummaryLength, type SettingsState } from '@/app/settings/actions';
import type { LengthMode } from '@/lib/summary/format';

const LABELS: Record<LengthMode, string> = {
  short: '짧게',
  normal: '보통',
  long: '길게',
};

const initial: SettingsState = {};

export default function LengthModeForm({ current }: { current: LengthMode }) {
  const [state, formAction, pending] = useActionState(updateSummaryLength, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">요약 길이</legend>
        {(Object.keys(LABELS) as LengthMode[]).map((mode) => (
          <label key={mode} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="summary_length"
              value={mode}
              defaultChecked={current === mode}
              data-testid={`length-${mode}`}
            />
            {LABELS[mode]}
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        data-testid="save-settings"
        className="w-fit rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? '저장 중…' : '저장'}
      </button>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">저장되었습니다.</p>}
    </form>
  );
}
