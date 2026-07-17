'use client';

import { useActionState, useState } from 'react';
import { updateTermTooltips, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';

const initial: SettingsState = {};

/** 용어 정의 툴팁 on/off 토글. 선택 즉시 자동 저장. */
export default function TermTooltipsForm({ enabled }: { enabled: boolean }) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [, formAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updateTermTooltips(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSaving(false);
    return r;
  }, initial);

  return (
    <form action={formAction}>
      <label className="relative flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border p-3 pr-7 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20">
        <input
          type="checkbox"
          name="term_tooltips"
          defaultChecked={enabled}
          onChange={(e) => {
            setSaving(true);
            e.currentTarget.form?.requestSubmit();
          }}
          data-testid="term_tooltips"
          className="peer sr-only"
        />
        <span className="text-sm font-medium">용어 정의 툴팁 표시</span>
        <span className="text-xs text-muted-foreground">본문의 어려운 용어에 점선 표시 · 클릭 시 정의</span>
        {saving ? (
          <Spinner className="absolute right-2 top-2 text-muted-foreground" />
        ) : (
          <CheckIcon className="pointer-events-none absolute right-2 top-2 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
        )}
      </label>
    </form>
  );
}
