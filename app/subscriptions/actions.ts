'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveChannel, ChannelResolveError, type ResolvedChannel } from '@/lib/youtube/resolve-channel';
import {
  resolveChannelSearch,
  searchChannelsApi,
  enrichCandidates,
  normalizeQuery,
  MIN_QUERY_CHARS,
  type ChannelCandidate,
} from '@/lib/youtube/search';
import type { Json } from '@/lib/database.types';
import { checkChannelLimit } from '@/lib/membership/enforce';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h (AC-C1.3)

/** 구독 확정/직접입력 채널을 검색 카탈로그에 축적한다(다음부터 로컬 적중, AC-B1.4). 실패해도 무시. */
async function accumulateCatalog(
  ch: ResolvedChannel,
  source: 'user_selected' | 'detected',
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('channel_catalog').upsert(
      {
        channel_id: ch.channelId,
        title: ch.title,
        handle: ch.handle,
        thumbnail_url: ch.thumbnail,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id' },
    );
  } catch (e) {
    console.warn(`[catalog] 축적 실패: ${(e as Error).message}`);
  }
}

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

  // 플랜 채널 한도 집행(AC-D1.1).
  const limit = await checkChannelLimit(user.id);
  if (!limit.allowed) {
    return { error: `채널 한도(${limit.limit}개)에 도달했어요. 멤버십을 올리면 더 추가할 수 있어요.` };
  }

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

  await accumulateCatalog(channel, 'user_selected');
  revalidatePath('/subscriptions');
  return { ok: true, addedTitle: channel.title };
}

export interface SearchCandidate extends ChannelCandidate {
  subscribed: boolean;
}
export interface SearchChannelsResult {
  candidates: SearchCandidate[];
  capped: boolean;
}

/**
 * 채널 제목 검색 (channel-search REQ-A/B/C). 로컬 카탈로그 → 캐시 → API 순으로 해결하며
 * 감지 쿼터를 상한(consume_search_api_units)으로 보호한다. 결과에 현재 사용자의 "구독됨"을 표시.
 */
export async function searchChannels(query: string): Promise<SearchChannelsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (normalizeQuery(query).length < MIN_QUERY_CHARS) return { candidates: [], capped: false };

  const admin = createAdminClient();
  const outcome = await resolveChannelSearch(query, {
    loadCatalog: async (q) => {
      const { data } = await admin
        .from('channel_catalog')
        .select('channel_id, title, handle, thumbnail_url, subscriber_hint')
        .ilike('title', `%${q}%`)
        .limit(10);
      return (data ?? []).map((r) => ({
        channelId: r.channel_id,
        title: r.title ?? '',
        thumbnail: r.thumbnail_url,
        handle: r.handle,
        subscriberHint: r.subscriber_hint == null ? null : Number(r.subscriber_hint),
      }));
    },
    loadCache: async (q) => {
      const { data } = await admin
        .from('channel_search_cache')
        .select('results, expires_at')
        .eq('query_norm', q)
        .maybeSingle();
      if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null;
      return (data.results as unknown as ChannelCandidate[]) ?? [];
    },
    apiSearch: async (q) => enrichCandidates(await searchChannelsApi(q)),
    saveCache: async (q, results) => {
      await admin.from('channel_search_cache').upsert(
        {
          query_norm: q,
          results: results as unknown as Json,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        },
        { onConflict: 'query_norm' },
      );
    },
    consumeUnits: async (units) => {
      const { data } = await admin.rpc('consume_search_api_units', { p_units: units });
      return data === true;
    },
  });

  // 현재 사용자의 구독 여부 표시(AC-A1.3).
  const ids = outcome.candidates.map((c) => c.channelId);
  let subscribed = new Set<string>();
  if (ids.length > 0) {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('channel_id')
      .eq('user_id', user.id)
      .in('channel_id', ids);
    subscribed = new Set((subs ?? []).map((s) => s.channel_id));
  }

  return {
    candidates: outcome.candidates.map((c) => ({ ...c, subscribed: subscribed.has(c.channelId) })),
    capped: outcome.capped,
  };
}

/**
 * 검색 후보(channelId)로 구독 저장 (AC-A1.2). channels.list(1유닛)로 상세 보강 후 저장 + 카탈로그 축적.
 * user_id+channel_id UNIQUE 로 멱등(AC-A1.3/S6).
 */
export async function addSubscriptionById(channelId: string): Promise<AddSubscriptionState> {
  if (!channelId) return { error: '채널을 선택해 주세요.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const limit = await checkChannelLimit(user.id);
  if (!limit.allowed) {
    return { error: `채널 한도(${limit.limit}개)에 도달했어요. 멤버십을 올리면 더 추가할 수 있어요.` };
  }

  let channel;
  try {
    // /channel/{id} URL 은 항상 kind='id' 로 파싱 → channels.list(1유닛).
    channel = await resolveChannel(`https://www.youtube.com/channel/${channelId}`);
  } catch (e) {
    if (e instanceof ChannelResolveError) return { error: e.message };
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
    if (error.code === '23505') return { error: `이미 구독 중인 채널입니다: ${channel.title}` };
    return { error: '구독 추가에 실패했습니다.' };
  }

  await accumulateCatalog(channel, 'user_selected');
  revalidatePath('/subscriptions');
  revalidatePath('/feed');
  revalidatePath('/');
  return { ok: true, addedTitle: channel.title };
}

/**
 * 구독 일시정지/해제. paused=true 면 해당 채널 다이제스트를 피드·홈·발송에서 제외한다.
 * 수동 정지는 pause_reason='manual'. 정지해제 시 수신 채널이 플랜 한도를 넘으면 차단한다
 * (다운그레이드 자동정지 채널은 업그레이드 시 자동 복원되므로 수동 해제 대상 아님).
 * RLS('own subs - update')로 본인 행만 갱신. 감지는 채널 공유라 전역 유지.
 */
export async function setSubscriptionPause(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const id = String(formData.get('id') ?? '');
  const paused = String(formData.get('paused') ?? '') === 'true';
  if (!id) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (paused) {
    await supabase
      .from('subscriptions')
      .update({ paused: true, active: false, pause_reason: 'manual' })
      .eq('id', id);
  } else {
    // 정지해제: 수신 채널(paused=false) 한도 초과면 차단.
    const check = await checkChannelLimit(user.id);
    if (!check.allowed) {
      return {
        ok: false,
        error: `플랜 한도(${check.limit}개)를 넘어 정지해제할 수 없어요. 다른 채널을 정지하거나 업그레이드하세요.`,
      };
    }
    // 정지해제 시 active_since=now 로 기준선 → 밀린 콘텐츠 일괄 노출 방지.
    await supabase
      .from('subscriptions')
      .update({ paused: false, active: true, pause_reason: null, active_since: new Date().toISOString() })
      .eq('id', id);
  }

  revalidatePath('/subscriptions');
  revalidatePath('/feed');
  revalidatePath('/');
  return { ok: true };
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
