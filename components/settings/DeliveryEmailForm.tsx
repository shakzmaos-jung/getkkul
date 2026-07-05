'use client';

import { useActionState } from 'react';
import {
  manageDeliveryEmail,
  resetDeliveryEmail,
  type EmailState,
} from '@/app/settings/email-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initial: EmailState = { step: 'request' };

export default function DeliveryEmailForm({
  current,
  isDefault,
}: {
  current: string;
  isDefault: boolean;
}) {
  const [state, action, pending] = useActionState(manageDeliveryEmail, initial);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        현재 수신 이메일:{' '}
        <span className="font-medium" data-testid="current-delivery-email">
          {current}
        </span>
        {isDefault && <span className="text-muted-foreground"> (구글 계정 기본)</span>}
      </p>

      {state.step === 'verify' ? (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="intent" value="verify" />
          <p className="text-sm text-muted-foreground">새 이메일로 보낸 6자리 코드를 입력하세요.</p>
          <div className="flex gap-2">
            <Input
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="000000"
              data-testid="otp-code"
              className="w-32 tracking-[0.3em]"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={pending}
              data-testid="verify-otp"
              className="shrink-0"
            >
              {pending ? '확인 중…' : '확인'}
            </Button>
            <Button type="submit" name="intent" value="cancel" variant="secondary" formNoValidate>
              취소
            </Button>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
        </form>
      ) : (
        <>
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="intent" value="request" />
            <div className="flex gap-2">
              <Input
                name="email"
                type="email"
                required
                placeholder="새 수신 이메일"
                data-testid="new-email"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={pending}
                data-testid="send-otp"
                className="shrink-0"
              >
                {pending ? '전송 중…' : '인증 코드 보내기'}
              </Button>
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            {state.ok && <p className="text-sm text-accent">수신 이메일이 변경되었습니다.</p>}
          </form>
          {!isDefault && (
            <form action={resetDeliveryEmail}>
              <button
                type="submit"
                className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
              >
                구글 계정 이메일로 되돌리기
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
