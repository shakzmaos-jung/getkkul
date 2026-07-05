'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLengthMode } from '@/lib/summary/format';

/**
 * 다이제스트 카드별 요약 길이 선택을 영상별·계정 단위로 저장 (최신값 upsert).
 * default 는 user_settings.summary_length, 기록이 있으면 이 값을 사용. RLS 로 본인 행만.
 */
export async function setVideoLength(videoId: string, mode: string): Promise<void> {
  if (!isLengthMode(mode) || !videoId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('user_video_prefs')
    .upsert(
      { user_id: user.id, video_id: videoId, length_mode: mode, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' },
    );
}
