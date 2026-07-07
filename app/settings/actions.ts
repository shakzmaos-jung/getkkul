'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLengthMode, type LengthMode } from '@/lib/summary/format';
import { SLOT_CODES } from '@/lib/time';

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
