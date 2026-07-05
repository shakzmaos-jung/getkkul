'use client';

import { useActionState } from 'react';
import { addSubscription, type AddSubscriptionState } from '@/app/subscriptions/actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: AddSubscriptionState = {};

export default function AddSubscriptionForm() {
  const [state, formAction, pending] = useActionState(addSubscription, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="channel"
          type="text"
          required
          placeholder="@handle 또는 채널 URL"
          data-testid="channel-input"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          data-testid="add-subscription"
          className="shrink-0"
        >
          {pending ? '추가 중…' : '구독 추가'}
        </Button>
      </div>
      {state.error && (
        <p data-testid="add-error" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-accent">추가됨: {state.addedTitle}</p>}
    </form>
  );
}
