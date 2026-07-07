'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLengthMode, type LengthMode } from '@/lib/summary/format';
import { SLOT_CODES } from '@/lib/time';
import { savePushSubscription, deletePushSubscription } from '@/lib/pwa/subscriptions';
import type { PushKeys } from '@/lib/pwa/push-client';

export type SettingsState = { ok?: boolean; error?: string };

/** 요약 길이 모드 변경 (SSR REQ-D2). RLS 로 본인 user_settings 만 수정. */
export async function updateSummaryLength(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const mode = String(formData.get('summary_length') ?? '');
  if (!isLengthMode(mode)) {
    return { error: '유효하지 않은 길이 모드입니다.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_settings')
    .update({ summary_length: mode as LengthMode })
    .eq('user_id', user.id);

  if (error) return { error: '설정 저장에 실패했습니다.' };

  revalidatePath('/settings');
  return { ok: true };
}

/**
 * 수신할 발송 슬롯(멀티) 변경. 체크된 슬롯만 저장(유효값·고정 순서). 빈 선택이면 이메일 발송 없음.
 * 발송 파이프라인은 현재 슬롯이 이 배열에 포함된 사용자에게만 전송한다. RLS 로 본인 행만 수정.
 */
export async function updateDeliverySlots(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const raw = formData.getAll('slots').map(String);
  const slots = SLOT_CODES.filter((c) => raw.includes(c)); // 유효값만 + 정렬 순서 고정

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_settings')
    .update({ delivery_slots: slots })
    .eq('user_id', user.id);

  if (error) return { error: '설정 저장에 실패했습니다.' };

  revalidatePath('/settings');
  return { ok: true };
}

/**
 * 영상 길이 필터. "2시간 이상 제외"(exclude_over_2h) 토글만 저장한다.
 * "1분 미만 제외"는 항상 적용되는 정책이라 저장하지 않는다(코드 상수). RLS 로 본인 행만 수정.
 */
export async function updateExcludeLong(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const excludeOver2h = formData.get('exclude_over_2h') != null; // 체크 시에만 전송됨

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_settings')
    .update({ exclude_over_2h: excludeOver2h })
    .eq('user_id', user.id);

  if (error) return { error: '설정 저장에 실패했습니다.' };

  revalidatePath('/settings');
  revalidatePath('/feed');
  revalidatePath('/');
  return { ok: true };
}

/** 푸시 구독 저장(클라이언트가 subscribe 후 직접 호출, AC-C1.3). */
export async function subscribePush(
  sub: PushKeys,
  userAgent: string | null,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const r = await savePushSubscription(supabase, user.id, sub, userAgent);
  if (!r.ok) return { error: '구독 저장에 실패했습니다.' };
  revalidatePath('/settings');
  return { ok: true };
}

/** 푸시 구독 해제(AC-C1.4). */
export async function unsubscribePush(endpoint: string): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const r = await deletePushSubscription(supabase, user.id, endpoint);
  if (!r.ok) return { error: '구독 해제에 실패했습니다.' };
  revalidatePath('/settings');
  return { ok: true };
}

/** 슬롯별 푸시 on/off 저장(AC-D1.2). */
export async function updatePushSlots(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('user_settings')
    .update({
      push_slot_0730: formData.get('push_0730') != null,
      push_slot_1130: formData.get('push_1130') != null,
      push_slot_1730: formData.get('push_1730') != null,
    })
    .eq('user_id', user.id);
  if (error) return { error: '설정 저장에 실패했습니다.' };
  revalidatePath('/settings');
  return { ok: true };
}

/** 빈 슬롯 생략 토글 저장(AC-D2.2). */
export async function updateSkipEmpty(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase
    .from('user_settings')
    .update({
      skip_empty_push: formData.get('skip_empty_push') != null,
      skip_empty_email: formData.get('skip_empty_email') != null,
    })
    .eq('user_id', user.id);
  if (error) return { error: '설정 저장에 실패했습니다.' };
  revalidatePath('/settings');
  return { ok: true };
}
