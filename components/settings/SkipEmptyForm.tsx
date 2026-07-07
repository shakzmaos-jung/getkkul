'use client';

import { useActionState, useState } from 'react';
import { updateSkipEmpty, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';

const initial: SettingsState = {};

/** 빈 슬롯(새 항목 없음) 시 발송 생략 토글. 카드 선택 즉시 자동 저장. */
export default function SkipEmptyForm({ skip }: { skip: { push: boolean; email: boolean } }) {
  const showToast = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [, formAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updateSkipEmpty(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSavingKey(null);
    return r;
  }, initial);

  const rows = [
    ['skip_empty_push', '푸시 생략', skip.push],
    ['skip_empty_email', '이메일 생략', skip.email],
  ] as const;

  return (
    <form action={formAction} className="grid grid-cols-2 gap-2">
      {rows.map(([name, label, checked]) => (
        <label
          key={name}
          className="relative flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border p-3 pr-7 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20"
        >
          <input
            type="checkbox"
            name={name}
            defaultChecked={checked}
            onChange={(e) => {
              setSavingKey(name);
              e.currentTarget.form?.requestSubmit();
            }}
            data-testid={name}
            className="peer sr-only"
          />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">새 항목 없을 때</span>
          {/* 저장 중엔 스피너, 완료되면 체크(peer-checked). 택일 렌더로 겹침 방지. */}
          {savingKey === name ? (
            <Spinner className="absolute right-2 top-2 text-muted-foreground" />
          ) : (
            <CheckIcon className="pointer-events-none absolute right-2 top-2 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
          )}
        </label>
      ))}
    </form>
  );
}
