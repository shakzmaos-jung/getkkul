'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrCreateSummary } from '@/lib/summary/get-or-create-summary';
import { isLengthMode } from '@/lib/summary/format';

export interface TranslatedSummary {
  headline: string;
  coreText: string;
  bullets: string[];
}

/**
 * 요약 영어 전환 (SSR REQ-D3). 온디맨드 생성·캐시(language='en').
 * 인증 + 구독 채널 접근 검증 후, service_role(admin)로 생성/조회.
 */
export async function translateSummary(
  videoId: string,
  mode: string,
): Promise<TranslatedSummary> {
  if (!isLengthMode(mode)) throw new Error('유효하지 않은 길이 모드입니다.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 접근 검증: 사용자가 이 영상의 채널을 구독 중인지
  const { data: video } = await supabase
    .from('videos')
    .select('channel_id')
    .eq('id', videoId)
    .single();
  if (!video) throw new Error('영상을 찾을 수 없습니다.');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('channel_id', video.channel_id)
    .maybeSingle();
  if (!sub) throw new Error('접근 권한이 없습니다.');

  const en = await getOrCreateSummary(createAdminClient(), videoId, mode, 'en');
  return { headline: en.headline, coreText: en.coreText, bullets: en.bullets };
}
