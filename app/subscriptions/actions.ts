'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveChannel, ChannelResolveError } from '@/lib/youtube/resolve-channel';

export type AddSubscriptionState = {
  ok?: boolean;
  error?: string;
  addedTitle?: string;
};

/**
 * 채널 구독 추가 (SSR REQ-B1). 입력 해석 → channel_id/채널명 저장.
 * 중복(user_id+channel_id UNIQUE)은 안내로 처리한다(AC-B1.2). RLS 가 본인 행만 허용.
 */
export async function addSubscription(
  _prev: AddSubscriptionState,
  formData: FormData,
): Promise<AddSubscriptionState> {
  const input = String(formData.get('channel') ?? '').trim();
  if (!input) return { error: '채널 URL 또는 핸들을 입력해 주세요.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let channel;
  try {
    channel = await resolveChannel(input);
  } catch (e) {
    if (e instanceof ChannelResolveError) return { error: e.message }; // AC-B1.3
    return { error: '채널을 확인하는 중 오류가 발생했습니다.' };
  }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    channel_id: channel.channelId,
    channel_title: channel.title,
    channel_url: channel.url,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: `이미 구독 중인 채널입니다: ${channel.title}` }; // AC-B1.2
    }
    return { error: '구독 추가에 실패했습니다.' };
  }

  revalidatePath('/subscriptions');
  return { ok: true, addedTitle: channel.title };
}

/** 구독 삭제 (AC-B2.2). RLS 로 본인 행만 삭제된다. */
export async function removeSubscription(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('subscriptions').delete().eq('id', id);
  revalidatePath('/subscriptions');
}
