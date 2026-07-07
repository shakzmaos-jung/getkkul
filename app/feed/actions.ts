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

/**
 * 다이제스트 북마크 토글. 있으면 삭제, 없으면 추가. RLS 로 본인 행만.
 * 반환값은 토글 후 북마크 여부(클라이언트 낙관적 UI 확정용).
 */
export async function toggleBookmark(videoId: string, next: boolean): Promise<{ bookmarked: boolean }> {
  if (!videoId) return { bookmarked: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (next) {
    await supabase
      .from('bookmarks')
      .upsert({ user_id: user.id, video_id: videoId }, { onConflict: 'user_id,video_id' });
  } else {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('video_id', videoId);
  }
  return { bookmarked: next };
}
