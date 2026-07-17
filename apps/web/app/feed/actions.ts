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
  type QASection,
} from '@/lib/qa/answer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { mapDigestRow, type ChannelMeta, type MappedDigest } from '@/lib/feed/map-digests';
import { consumeAiQuery } from '@/lib/membership/enforce';
import type { LengthMode } from '@/lib/summary/format';
import type { GlossaryEntry } from '@/lib/feed/render-terms';

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

/**
 * 콘텐츠 카드 👍/👎 피드백 저장(요약품질 REQ-F1). (user_id, video_id, length_mode, language=ko)
 * 단위로 upsert, rating=null 이면 취소(삭제). 재탭으로 변경·취소. RLS 로 본인 행만.
 */
export async function setContentFeedback(
  videoId: string,
  mode: string,
  rating: 'up' | 'down' | null,
  reason?: string,
): Promise<void> {
  if (!videoId || !isLengthMode(mode)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (rating === null) {
    // 토글 해제: 현재 상태만 삭제(이벤트 로그는 미기록).
    await supabase
      .from('content_feedback')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('length_mode', mode)
      .eq('language', 'ko');
    return;
  }

  // 현재 상태(카드 UI 토글) upsert.
  await supabase.from('content_feedback').upsert(
    {
      user_id: user.id,
      video_id: videoId,
      length_mode: mode,
      language: 'ko',
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,video_id,length_mode,language' },
  );

  // 이벤트 로그(추가전용, 어드민 이력). 사유는 싫어요에서만·200자 제한. best-effort(실패해도 UI 유지).
  const cleanReason = rating === 'down' && reason ? reason.slice(0, 200).trim() || null : null;
  await supabase.from('feedback_events').insert({
    user_id: user.id,
    video_id: videoId,
    length_mode: mode,
    language: 'ko',
    rating,
    reason: cleanReason,
  });
}

/**
 * 여러 영상의 용어 사전(하이브리드: 본문에 등장하는 정의 있는 전역 용어)을 한 번에 조회.
 * 반환 {videoId: [{term, definition}]}. 읽기 전용·즉시(사전계산, LLM 미호출).
 */
export async function fetchGlossaryForVideos(
  videoIds: string[],
): Promise<Record<string, GlossaryEntry[]>> {
  if (videoIds.length === 0) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data, error } = await supabase.rpc('get_video_glossary', { p_video_ids: videoIds });
  if (error || !data) return {};
  const map: Record<string, GlossaryEntry[]> = {};
  for (const r of data) {
    (map[r.video_id] ??= []).push({
      id: r.id,
      termKo: r.term_ko,
      termEn: r.term_en,
      definition: r.definition,
    });
  }
  return map;
}

/**
 * 특정 KST 일자의 다이제스트 카드 온디맨드 조회(하이브리드 프리로드 밖 날짜, plan F1).
 * get_feed_digests RPC(p_from=일자 00:00 KST, p_to=+1일)를 페이지와 동일 매핑으로 반환한다.
 */
export async function fetchDigestsForDate(
  dateKst: string,
): Promise<{ items: MappedDigest[] } | { error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKst)) return { error: '잘못된 날짜입니다.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 다음 날 00:00 KST (문자열 연산으로 월 경계 안전 처리)
  const [y, m, d] = dateKst.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const nextKst = next.toISOString().slice(0, 10);

  const [{ data: subs }, { data: setting }, { data: rows, error }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('channel_id, channel_title, channel_thumbnail, channel_handle, paused')
      .eq('user_id', user.id),
    supabase.from('user_settings').select('summary_length').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('get_feed_digests', {
      p_from: `${dateKst}T00:00:00+09:00`,
      p_to: `${nextKst}T00:00:00+09:00`,
    }),
  ]);
  if (error) return { error: '다이제스트를 불러오지 못했습니다.' };

  const globalMode = (setting?.summary_length ?? 'normal') as LengthMode;
  const channelById = new Map<string, ChannelMeta>(
    (subs ?? [])
      .filter((s) => !s.paused)
      .map((s) => [
        s.channel_id,
        { title: s.channel_title ?? '', thumbnail: s.channel_thumbnail, handle: s.channel_handle },
      ]),
  );
  const kstFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
  const items = (rows ?? [])
    .map((r) => mapDigestRow(r, channelById, globalMode, (iso) => kstFmt.format(new Date(iso))))
    .filter((v): v is MappedDigest => v !== null);
  return { items };
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
    // 전사가 없으면 한국어 요약 core_text 로 대체(long core_text 는 사실+인사이트 결합).
    const { data: sums } = await supabase
      .from('summaries')
      .select('core_text')
      .eq('video_id', videoId)
      .eq('language', 'ko');
    context = (sums ?? [])
      .map((s) => s.core_text ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
  if (!context) return null;
  if (context.length > MAX_CONTEXT_LEN) context = context.slice(0, MAX_CONTEXT_LEN);
  return { title: video?.title ?? '', context };
}

/**
 * 콘텐츠 Q&A (사용자 요청 기능). 이 영상의 맥락(전사 우선, 없으면 요약)에 근거해
 * 질문에 답한다. 단일 턴(질문 1 · 답변 1). 답변은 '길게(자세히)' 1종만 생성해 반환한다.
 */
export async function askAboutContent(
  videoId: string,
  question: string,
): Promise<{ ok: true; answer: QASection } | { ok: false; error: string }> {
  const v = validateQuestion(question);
  if (!v.ok) return { ok: false, error: v.error! };
  if (!videoId) return { ok: false, error: '잘못된 요청입니다.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // AI 질의 월 한도 집행(AC-D1.3). 원자적 소비 — 초과면 차단.
  const quota = await consumeAiQuery(user.id);
  if (!quota.allowed) {
    return {
      ok: false,
      error: `이번 주기 AI 질의 한도(${quota.limit}회)를 모두 사용했어요. 멤버십을 올리면 더 물어볼 수 있어요.`,
    };
  }

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
