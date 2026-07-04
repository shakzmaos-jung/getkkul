'use client';

import { useActionState } from 'react';
import { addSubscription, type AddSubscriptionState } from '@/app/subscriptions/actions';

const initialState: AddSubscriptionState = {};

export default function AddSubscriptionForm() {
  const [state, formAction, pending] = useActionState(addSubscription, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="channel"
          type="text"
          required
          placeholder="@handle 또는 채널 URL"
          data-testid="channel-input"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          data-testid="add-subscription"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? '추가 중…' : '구독 추가'}
        </button>
      </div>
      {state.error && (
        <p data-testid="add-error" className="text-sm text-red-500">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-600">추가됨: {state.addedTitle}</p>
      )}
    </form>
  );
}
