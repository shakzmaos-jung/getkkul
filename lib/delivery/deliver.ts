import { createPipelineClient } from '@/lib/pipeline/supabase';
import { createNotifier } from '@/lib/notify/create-notifier';
import { activeSinceByChannel, isAfterActiveSince } from '@/lib/subscriptions/active-window';
import type { Notifier } from '@/lib/notify/notify';
import type { LengthMode } from '@/lib/summary/format';
import { SLOT_CODES, type SlotCode } from '@/lib/time';
import {
  selectDigestVideos,
  renderDigest,
  type DigestVideo,
  type DigestSelection,
} from '@/lib/delivery/digest';

/**
 * 사용자별 다이제스트 발송 (SSR REQ-E/F). 준비된(done+요약) 미발송 영상을 담아 발송.
 * 멱등성: deliveries UNIQUE(user_id, video_id) upsert. 빈 슬롯도 "새 소식 없음" 발송(E2.3).
 * 발송 실패는 failed 기록 → 다음 슬롯 재시도(E3.3). 개별 사용자 실패가 전체를 막지 않음(H6).
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface DeliverResult {
  users: number;
  sent: number;
  empty: number;
  failed: number;
}

export async function deliverAll(
  slot: SlotCode,
  deps: { supabase?: SupabaseClient; notifier?: Notifier; nowIso?: string } = {},
): Promise<DeliverResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const notifier = deps.notifier ?? createNotifier();
  const nowIso = deps.nowIso ?? new Date().toISOString();
  const appBaseUrl = process.env.APP_BASE_URL;

  const { data: users, error } = await supabase.from('profiles').select('id, email');
  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);

  // 검증된 수신 이메일(delivery_email) + 수신 슬롯(delivery_slots) 매핑.
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, delivery_email, delivery_slots');
  const deliveryEmailByUser = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, s.delivery_email]),
  );
  const slotsByUser = new Map(
    (settingsRows ?? []).map((s) => [s.user_id, s.delivery_slots]),
  );

  let sent = 0;
  let empty = 0;
  let failed = 0;

  for (const user of users ?? []) {
    // 현재 슬롯을 수신하도록 선택한 사용자에게만 발송. 설정 행이 없으면 3회 전체 수신(기존 동작).
    const userSlots = slotsByUser.get(user.id) ?? SLOT_CODES;
    if (!userSlots.includes(slot)) continue;

    const recipient = deliveryEmailByUser.get(user.id) ?? user.email;
    if (!recipient) continue;
    let selection: DigestSelection | null = null;
    try {
      const candidates = await candidateVideos(supabase, user.id);
      selection = selectDigestVideos(candidates);
      const message = renderDigest(selection, { appBaseUrl });

      if (selection.items.length === 0) {
        await notifier.send({ email: recipient }, message); // 항상 발송(E2.3)
        empty++;
        continue;
      }

      await notifier.send({ email: recipient }, message);
      await supabase.from('deliveries').upsert(
        selection.items.map((v) => ({
          user_id: user.id,
          video_id: v.videoId,
          slot,
          channel: 'email' as const,
          status: 'sent' as const,
          sent_at: nowIso,
        })),
        { onConflict: 'user_id,video_id' },
      );
      sent++;
    } catch (e) {
      failed++;
      console.warn(`[deliver] ${user.email} 실패: ${(e as Error).message}`);
      // 담았던 영상을 failed 로 기록 → 다음 슬롯 재시도 대상(E3.3).
      if (selection && selection.items.length > 0) {
        const { error: failErr } = await supabase.from('deliveries').upsert(
          selection.items.map((v) => ({
            user_id: user.id,
            video_id: v.videoId,
            slot,
            channel: 'email' as const,
            status: 'failed' as const,
          })),
          { onConflict: 'user_id,video_id' },
        );
        if (failErr) console.warn(`[deliver] failed 기록 실패: ${failErr.message}`);
      }
    }
  }

  return { users: (users ?? []).length, sent, empty, failed };
}

/** 해당 사용자에게 아직 발송되지 않은, 요약이 준비된 done 영상(오래된 순). */
async function candidateVideos(
  supabase: SupabaseClient,
  userId: string,
): Promise<DigestVideo[]> {
  const { data: setting } = await supabase
    .from('user_settings')
    .select('summary_length')
    .eq('user_id', userId)
    .maybeSingle();
  const mode = (setting?.summary_length ?? 'normal') as LengthMode;

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id, active_since')
    .eq('user_id', userId)
    .eq('paused', false); // 일시정지 채널은 발송에서 제외
  const activeSubs = subs ?? [];
  const sinceByChannel = activeSinceByChannel(activeSubs);
  const channelIds = [...new Set(activeSubs.map((s) => s.channel_id))];
  if (channelIds.length === 0) return [];

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, url, channel_id, created_at')
    .eq('status', 'done')
    .in('channel_id', channelIds)
    .order('published_at', { ascending: true });
  // 정지해제 기준선 이후 감지된 영상만 — 일시정지 동안 밀린 분이 한꺼번에 발송되지 않도록.
  const videoRows = (videos ?? []).filter((v) =>
    isAfterActiveSince(v.created_at, sinceByChannel.get(v.channel_id)),
  );
  if (videoRows.length === 0) return [];
  const videoIds = videoRows.map((v) => v.id);

  const { data: sums } = await supabase
    .from('summaries')
    .select('video_id, headline, core_text')
    .eq('length_mode', mode)
    .eq('language', 'ko')
    .in('video_id', videoIds);
  const sumMap = new Map((sums ?? []).map((s) => [s.video_id, s]));

  const { data: dels } = await supabase
    .from('deliveries')
    .select('video_id')
    .eq('user_id', userId)
    .eq('status', 'sent');
  const alreadySent = new Set((dels ?? []).map((d) => d.video_id));

  return videoRows
    .filter((v) => sumMap.has(v.id) && !alreadySent.has(v.id))
    .map((v) => {
      const s = sumMap.get(v.id)!;
      return {
        videoId: v.id,
        title: v.title ?? '',
        url: v.url ?? '',
        headline: s.headline ?? v.title ?? '',
        coreText: s.core_text ?? '',
      };
    });
}
