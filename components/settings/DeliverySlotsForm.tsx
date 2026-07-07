'use client';

import { useActionState } from 'react';
import { updateDeliverySlots, type SettingsState } from '@/app/settings/actions';
import { Button } from '@/components/ui/Button';
import { SLOT_CODES, SEND_SLOTS_KST, type SlotCode } from '@/lib/time';

const initial: SettingsState = {};

/** 수신할 발송 슬롯(07:30/11:30/17:30) 멀티 체크. 선택한 시각에만 이메일을 받는다. */
export default function DeliverySlotsForm({ current }: { current: SlotCode[] }) {
  const [state, formAction, pending] = useActionState(updateDeliverySlots, initial);
  const checked = new Set(current);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {SLOT_CODES.map((code, i) => (
          <label
            key={code}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-muted"
          >
            <input
              type="checkbox"
              name="slots"
              value={code}
              defaultChecked={checked.has(code)}
              data-testid={`slot-${code}`}
              className="accent-foreground"
            />
            <span className="text-sm font-medium">{SEND_SLOTS_KST[i]}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        선택한 시각에만 이메일을 받습니다. 모두 해제하면 이메일 없이 앱에서만 열람합니다.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending} data-testid="save-slots">
          {pending ? '저장 중…' : '저장'}
        </Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-accent">저장되었습니다.</p>}
      </div>
    </form>
  );
}
