'use client';

import { useActionState, useState } from 'react';
import { updateExcludeLong, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';

const initial: SettingsState = {};

/** 영상 길이 필터. 1분 미만=항상 제외(잠금), 2시간 이상=토글(선택 즉시 자동 저장). */
export default function VideoDurationFilterForm({ excludeOver2h }: { excludeOver2h: boolean }) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [, formAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updateExcludeLong(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSaving(false);
    return r;
  }, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* 1분 미만: 항상 적용(변경 불가) */}
      <label className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 opacity-60">
        <input type="checkbox" defaultChecked disabled className="sr-only" />
        <span className="text-sm font-medium">1분 미만 영상 제외</span>
        <span className="ml-auto text-xs text-muted-foreground">항상 적용</span>
      </label>

      {/* 2시간 이상: 사용자 토글 */}
      <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
        <input
          type="checkbox"
          name="exclude_over_2h"
          defaultChecked={excludeOver2h}
          onChange={(e) => {
            setSaving(true);
            e.currentTarget.form?.requestSubmit();
          }}
          data-testid="exclude-over-2h"
          className="sr-only"
        />
        <span className="text-sm font-medium">2시간 이상 영상 제외</span>
        {saving && <Spinner className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </label>
    </form>
  );
}
