'use client';

import { useActionState, useState } from 'react';
import { updateExcludeLong, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { messages } from '@/lib/i18n';

const initial: SettingsState = {};
const t = messages.settings.durationFilter;

/** 영상 길이 필터. 2분 미만=항상 제외(잠금), 2시간 이상=토글(선택 즉시 자동 저장). */
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
    <form action={formAction} className="grid grid-cols-2 gap-2">
      {/* 2분 미만: 항상 적용(잠금) + ⓘ 탭 툴팁 */}
      <div className="relative flex cursor-not-allowed flex-col gap-0.5 rounded-lg border border-accent/30 bg-accent/10 p-3 pr-8 opacity-70">
        <span className="text-sm font-medium">{t.shortTitle}</span>
        <span className="text-xs text-muted-foreground">{t.shortHint}</span>
        <span className="absolute right-2 top-2 opacity-100">
          <InfoTooltip label={t.shortTooltipLabel} text={t.shortTooltip} />
        </span>
      </div>

      {/* 2시간 이상: 사용자 토글 + ⓘ 탭 툴팁 */}
      <label className="relative flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border p-3 pr-7 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20">
        <input
          type="checkbox"
          name="exclude_over_2h"
          defaultChecked={excludeOver2h}
          onChange={(e) => {
            setSaving(true);
            e.currentTarget.form?.requestSubmit();
          }}
          data-testid="exclude-over-2h"
          className="peer sr-only"
        />
        <span className="flex items-center gap-1 text-sm font-medium">
          {t.longTitle}
          <InfoTooltip label={t.longTooltipLabel} text={t.longTooltip} />
        </span>
        <span className="text-xs text-muted-foreground">{t.longHint}</span>
        {/* 저장 중엔 스피너, 완료되면 체크(peer-checked). 택일 렌더로 겹침 방지. */}
        {saving ? (
          <Spinner className="absolute right-2 top-2 text-muted-foreground" />
        ) : (
          <CheckIcon className="pointer-events-none absolute right-2 top-2 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
        )}
      </label>
    </form>
  );
}
