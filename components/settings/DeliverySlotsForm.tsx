'use client';

import { useActionState, useState } from 'react';
import { updateDeliverySlots, type SettingsState } from '@/app/settings/actions';
import { useToast } from '@/components/ui/ToastProvider';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { SLOT_CODES, SEND_SLOTS_KST, type SlotCode } from '@/lib/time';

const initial: SettingsState = {};

/** 수신할 발송 슬롯(07:30/11:30/17:30) 멀티 선택. 카드 선택 즉시 자동 저장. */
export default function DeliverySlotsForm({ current }: { current: SlotCode[] }) {
  const showToast = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const checked = new Set(current);
  const [, formAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updateDeliverySlots(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSavingKey(null);
    return r;
  }, initial);

  return (
    <form action={formAction} className="grid grid-cols-3 gap-2">
      {SLOT_CODES.map((code, i) => (
        <label
          key={code}
          className="relative flex cursor-pointer items-center justify-center rounded-lg border border-border p-3 transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20"
        >
          <input
            type="checkbox"
            name="slots"
            value={code}
            defaultChecked={checked.has(code)}
            onChange={(e) => {
              setSavingKey(code);
              e.currentTarget.form?.requestSubmit();
            }}
            data-testid={`slot-${code}`}
            className="peer sr-only"
          />
          <CheckIcon className="pointer-events-none absolute right-1.5 top-1.5 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
          <span className="text-sm font-medium">{SEND_SLOTS_KST[i]}</span>
          {savingKey === code && (
            <Spinner className="absolute right-1.5 top-1.5 text-muted-foreground" />
          )}
        </label>
      ))}
    </form>
  );
}
