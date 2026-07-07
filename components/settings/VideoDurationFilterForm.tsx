'use client';

import { useActionState } from 'react';
import { updateExcludeLong, type SettingsState } from '@/app/settings/actions';
import { Button } from '@/components/ui/Button';

const initial: SettingsState = {};

/** 영상 길이 필터. 1분 미만=항상 제외(비활성), 2시간 이상=토글(기본 제외). */
export default function VideoDurationFilterForm({ excludeOver2h }: { excludeOver2h: boolean }) {
  const [state, formAction, pending] = useActionState(updateExcludeLong, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* 1분 미만: 항상 적용(변경 불가) */}
      <label className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border p-3 opacity-60">
        <input type="checkbox" defaultChecked disabled className="accent-foreground" />
        <span className="text-sm font-medium">1분 미만 영상 제외</span>
        <span className="ml-auto text-xs text-muted-foreground">항상 적용</span>
      </label>

      {/* 2시간 이상: 사용자 토글 */}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-muted">
        <input
          type="checkbox"
          name="exclude_over_2h"
          defaultChecked={excludeOver2h}
          data-testid="exclude-over-2h"
          className="accent-foreground"
        />
        <span className="text-sm font-medium">2시간 이상 영상 제외</span>
      </label>

      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending} data-testid="save-duration-filter">
          {pending ? '저장 중…' : '저장'}
        </Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-accent">저장되었습니다.</p>}
      </div>
    </form>
  );
}
