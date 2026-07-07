'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLengthMode } from '@/lib/summary/format';
import {
  answerAboutContent,
  extractTerms,
  validateQuestion,
  MAX_CONTEXT_LEN,
  type QAAnswer,
} from '@/lib/qa/answer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

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

/** 영상 맥락 로드: 전사 우선, 없으면 한국어 요약(coreText + bullets). 맥락 길이 상한 적용. */
async function loadContentContext(
  supabase: SupabaseClient<Database>,
  videoId: string,
): Promise<{ title: string; context: string } | null> {
  const { data: video } = await supabase
    .from('videos')
    .select('title, transcript')
    .eq('id', videoId)
    .maybeSingle();
  let context = (video?.transcript ?? '').trim();
  if (!context) {
    const { data: sums } = await supabase
      .from('summaries')
      .select('core_text, body')
      .eq('video_id', videoId)
      .eq('language', 'ko');
    context = (sums ?? [])
      .map((s) => {
        const bullets =
          s.body && typeof s.body === 'object' && 'bullets' in s.body
            ? ((s.body as { bullets?: unknown }).bullets as string[]) ?? []
            : [];
        return [s.core_text ?? '', ...(Array.isArray(bullets) ? bullets : [])].join('\n');
      })
      .join('\n\n')
      .trim();
  }
  if (!context) return null;
  if (context.length > MAX_CONTEXT_LEN) context = context.slice(0, MAX_CONTEXT_LEN);
  return { title: video?.title ?? '', context };
}

/**
 * 콘텐츠 Q&A (사용자 요청 기능). 이 영상의 맥락(전사 우선, 없으면 요약)에 근거해
 * 질문에 답한다. 단일 턴(질문 1 · 답변 1). 답변은 짧게/보통/길게 3종을 한 번에 생성해 반환한다.
 */
export async function askAboutContent(
  videoId: string,
  question: string,
): Promise<{ ok: true; answer: QAAnswer } | { ok: false; error: string }> {
  const v = validateQuestion(question);
  if (!v.ok) return { ok: false, error: v.error! };
  if (!videoId) return { ok: false, error: '잘못된 요청입니다.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await loadContentContext(supabase, videoId);
  if (!ctx) return { ok: false, error: '이 콘텐츠의 맥락을 찾을 수 없습니다.' };

  try {
    const answer = await answerAboutContent({
      title: ctx.title,
      context: ctx.context,
      question: question.trim(),
    });
    return { ok: true, answer };
  } catch (e) {
    console.warn(`[qa] 답변 생성 실패: ${(e as Error).message}`);
    return { ok: false, error: '답변 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

/**
 * 콘텐츠에서 어려운 용어(칩 후보)를 추출한다. 영상 단위로 캐시(content_terms, 사용자 공유):
 * 한 번 추출하면 저장해두고 이후엔(다른 사용자 포함) 저장된 결과를 즉시 반환한다.
 * 없으면 빈 배열, 실패해도 빈 배열(칩 없이 진행).
 */
export async function extractContentTerms(videoId: string): Promise<string[]> {
  if (!videoId) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 캐시 우선(공유). 빈 배열도 캐시된 결과로 취급해 재계산하지 않는다.
  const { data: cached } = await supabase
    .from('content_terms')
    .select('terms')
    .eq('video_id', videoId)
    .maybeSingle();
  if (cached) return cached.terms ?? [];

  const ctx = await loadContentContext(supabase, videoId);
  if (!ctx) return [];

  let terms: string[] = [];
  try {
    terms = await extractTerms({ context: ctx.context });
  } catch (e) {
    console.warn(`[qa] 용어 추출 실패: ${(e as Error).message}`);
    return [];
  }

  // 공유 캐시에 저장(서비스 롤). 실패해도 결과는 반환.
  try {
    const admin = createAdminClient();
    await admin.from('content_terms').upsert({ video_id: videoId, terms }, { onConflict: 'video_id' });
  } catch (e) {
    console.warn(`[qa] 용어 캐시 저장 실패: ${(e as Error).message}`);
  }
  return terms;
}
