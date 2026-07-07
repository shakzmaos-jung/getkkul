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
    channel_thumbnail: channel.thumbnail,
    channel_handle: channel.handle,
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

/**
 * 구독 일시정지/해제. paused=true 면 해당 채널 다이제스트를 피드·홈·발송에서 제외한다.
 * RLS('own subs - update')로 본인 행만 갱신된다. 감지는 채널 공유라 전역 유지.
 */
export async function setSubscriptionPause(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const paused = String(formData.get('paused') ?? '') === 'true';
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 정지해제 시 active_since=now 로 기준선을 세운다 → 일시정지 동안 밀린 콘텐츠가
  // 피드·홈·발송에 한꺼번에 노출/발송되지 않고, 정지해제 이후 감지된 영상만 제공된다.
  // 일시정지는 paused=true 로 채널을 통째 제외(active_since 는 유지). RLS('own subs - update').
  const patch = paused
    ? { paused: true }
    : { paused: false, active_since: new Date().toISOString() };
  await supabase.from('subscriptions').update(patch).eq('id', id);

  revalidatePath('/subscriptions');
  revalidatePath('/feed');
  revalidatePath('/');
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
  revalidatePath('/feed');
  revalidatePath('/');
}
