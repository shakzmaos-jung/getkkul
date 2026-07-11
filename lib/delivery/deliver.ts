import { createPipelineClient } from '@/lib/pipeline/supabase';
import { createNotifier } from '@/lib/notify/create-notifier';
import { createPushNotifier } from '@/lib/notify/create-push-notifier';
import { activeSinceByChannel, isAfterActiveSince } from '@/lib/subscriptions/active-window';
import { passesDurationFilters } from '@/lib/youtube/duration';
import { PLANS, type PlanCode } from '@/lib/membership/plans';
import type { Notifier } from '@/lib/notify/notify';
import type { PushNotifier, PushSubscriptionRecord } from '@/lib/notify/web-push';
import type { LengthMode } from '@/lib/summary/format';
import { SLOT_CODES, type SlotCode } from '@/lib/time';
import {
  selectDigestVideos,
  renderDigest,
  type DigestVideo,
  type DigestSelection,
} from '@/lib/delivery/digest';
import { slotPushEnabled, shouldSendEmptyAware, renderPushMessage } from '@/lib/delivery/push-routing';

/**
 * 사용자별 다이제스트 발송 (SSR REQ-E/F). 준비된(done+요약) 미발송 영상을 담아 발송.
 * 멱등성: deliveries UNIQUE(user_id, video_id) upsert. 빈 슬롯도 "새 소식 없음" 발송(E2.3).
 * 발송 실패는 failed 기록 → 다음 슬롯 재시도(E3.3). 개별 사용자 실패가 전체를 막지 않음(H6).
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface DeliverResult {
  users: number;
  sent: number; // 이메일(새 항목) 발송 사용자 수
  empty: number; // 새 항목 없는데 "새 소식 없음"을 발송한 수
  failed: number;
  pushSent: number; // 푸시(새 항목) 발송 사용자 수
}

export async function deliverAll(
  slot: SlotCode,
  deps: {
    supabase?: SupabaseClient;
    notifier?: Notifier;
    pushNotifier?: PushNotifier | null;
    nowIso?: string;
  } = {},
): Promise<DeliverResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const notifier = deps.notifier ?? createNotifier();
  const pushNotifier =
    deps.pushNotifier !== undefined ? deps.pushNotifier : createPushNotifier();
  const nowIso = deps.nowIso ?? new Date().toISOString();
  const appBaseUrl = process.env.APP_BASE_URL;

  const { data: users, error } = await supabase.from('profiles').select('id, email');
  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);

  // 수신 설정: 이메일 주소·슬롯 + 푸시 슬롯 토글 + 빈 슬롯 생략.
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select(
      'user_id, delivery_email, delivery_slots, push_slot_0730, push_slot_1130, push_slot_1730, push_slot_2130, skip_empty_push, skip_empty_email',
    );
  const settingsByUser = new Map((settingsRows ?? []).map((s) => [s.user_id, s]));

  // 유효 푸시 구독(사용자별). 서비스롤이라 전체 조회 가능.
  const { data: subRows } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth');
  const subsByUser = new Map<string, PushSubscriptionRecord[]>();
  for (const r of subRows ?? []) {
    const list = subsByUser.get(r.user_id) ?? [];
    list.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
    subsByUser.set(r.user_id, list);
  }

  // 멤버십 다이제스트 월 한도(AC-D1.2): 현재 주기 사용량 기준 남은 수만큼만 신규 발송.
  const { data: mems } = await supabase
    .from('membership')
    .select('user_id, plan_code, period_start, created_at');
  const memByUser = new Map((mems ?? []).map((m) => [m.user_id, m]));
  const { data: usageRows } = await supabase
    .from('membership_usage')
    .select('user_id, period_start, digest_used');
  const usageByKey = new Map(
    (usageRows ?? []).map((u) => [`${u.user_id}:${u.period_start}`, u.digest_used]),
  );
  /** 남은 다이제스트 수(멤버십 없으면 null=무제한, 기존 동작 유지). */
  function digestRemaining(userId: string): number | null {
    const m = memByUser.get(userId);
    if (!m) return null;
    const limit = PLANS[m.plan_code as PlanCode].digestLimit;
    const used = usageByKey.get(`${userId}:${m.period_start}`) ?? 0;
    return Math.max(0, limit - used);
  }

  let sent = 0;
  let empty = 0;
  let failed = 0;
  let pushSent = 0;

  for (const user of users ?? []) {
    const setting = settingsByUser.get(user.id);
    // 이메일: 설정 없으면 3회 전체 수신(기존 동작). 슬롯 미포함이면 이메일 비활성.
    const userSlots = setting?.delivery_slots ?? SLOT_CODES;
    const emailActive = userSlots.includes(slot);

    // 푸시: notifier 있고, 슬롯 토글 on, 유효 구독 보유(AC-E1.1/D1.3).
    const subs = subsByUser.get(user.id) ?? [];
    const pushSettings = {
      push_slot_0730: setting?.push_slot_0730 ?? false,
      push_slot_1130: setting?.push_slot_1130 ?? false,
      push_slot_1730: setting?.push_slot_1730 ?? false,
      push_slot_2130: setting?.push_slot_2130 ?? false,
    };
    const pushActive = !!pushNotifier && subs.length > 0 && slotPushEnabled(pushSettings, slot);

    if (!emailActive && !pushActive) continue;

    const recipient = setting?.delivery_email ?? user.email;
    let selection: DigestSelection | null = null;
    try {
      const candidates = await candidateVideos(
        supabase,
        user.id,
        memByUser.get(user.id)?.created_at ?? null,
      );
      selection = selectDigestVideos(candidates);
      // 월 한도 초과분은 발송 보류(overflow 로 이월 표시). 한도 0이면 신규 없음.
      const remaining = digestRemaining(user.id);
      if (remaining !== null && selection.items.length > remaining) {
        const dropped = selection.items.length - remaining;
        selection = {
          ...selection,
          items: selection.items.slice(0, remaining),
          overflow: selection.overflow + dropped,
        };
      }
      const hasItems = selection.items.length > 0;

      const skipEmail = setting?.skip_empty_email ?? true;
      const skipPush = setting?.skip_empty_push ?? true;
      const sendEmail = emailActive && !!recipient && shouldSendEmptyAware(hasItems, skipEmail);
      const sendPush = pushActive && shouldSendEmptyAware(hasItems, skipPush);

      let emailOk = false;
      let emailErr = false;
      let pushOk = false;

      // 이메일(빈 슬롯은 skip_empty_email 에 따름, AC-E1.4)
      if (sendEmail) {
        try {
          await notifier.send({ email: recipient as string }, renderDigest(selection, { appBaseUrl }));
          emailOk = true;
        } catch (e) {
          emailErr = true;
          console.warn(`[deliver] email ${user.email} 실패: ${(e as Error).message}`);
        }
      }

      // 푸시(독립·격리, AC-E1.3/E1.5). 무효 구독(404/410) 삭제(AC-C1.5).
      if (sendPush) {
        try {
          const results = await pushNotifier!.send(subs, renderPushMessage(selection, { appBaseUrl }));
          const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
          if (gone.length > 0) {
            await supabase.from('push_subscriptions').delete().in('endpoint', gone);
          }
          pushOk = results.some((r) => r.ok);
        } catch (e) {
          console.warn(`[deliver] push ${user.id} 실패: ${(e as Error).message}`);
        }
      }

      // 원장 기록(공유 멱등성): 새 항목을 한 채널이라도 발송했으면 delivered 로 표시.
      if (hasItems && (emailOk || pushOk)) {
        await supabase.from('deliveries').upsert(
          selection.items.map((v) => ({
            user_id: user.id,
            video_id: v.videoId,
            slot,
            channel: emailOk ? ('email' as const) : ('push' as const),
            status: 'sent' as const,
            sent_at: nowIso,
          })),
          { onConflict: 'user_id,video_id' },
        );
        if (emailOk) sent++;
        if (pushOk) pushSent++;
        // 다이제스트 월 사용량 증가(발송 성공분, AC-D1.2/D1.4).
        const m = memByUser.get(user.id);
        if (m) {
          const key = `${user.id}:${m.period_start}`;
          const next = (usageByKey.get(key) ?? 0) + selection.items.length;
          usageByKey.set(key, next);
          await supabase
            .from('membership_usage')
            .upsert(
              { user_id: user.id, period_start: m.period_start, digest_used: next },
              { onConflict: 'user_id,period_start' },
            );
        }
      } else if (hasItems && emailErr) {
        // 이메일 실패 + 푸시 미전달 → failed 기록(다음 슬롯 재시도, E3.3).
        failed++;
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
      } else if (!hasItems && (emailOk || pushOk)) {
        empty++; // "새 소식 없음" 발송(skip 꺼진 사용자)
      }
    } catch (e) {
      failed++;
      console.warn(`[deliver] ${user.email} 처리 실패: ${(e as Error).message}`);
    }
  }

  return { users: (users ?? []).length, sent, empty, failed, pushSent };
}

/** 해당 사용자에게 아직 발송되지 않은, 요약이 준비된 done 영상(오래된 순). */
async function candidateVideos(
  supabase: SupabaseClient,
  userId: string,
  membershipStart: string | null,
): Promise<DigestVideo[]> {
  const { data: setting } = await supabase
    .from('user_settings')
    .select('summary_length, exclude_over_2h')
    .eq('user_id', userId)
    .maybeSingle();
  const mode = (setting?.summary_length ?? 'normal') as LengthMode;
  const excludeOver2h = setting?.exclude_over_2h ?? true;

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
    .select('id, title, url, channel_id, created_at, published_at, duration_seconds')
    .eq('status', 'done')
    .in('channel_id', channelIds)
    .order('published_at', { ascending: true });
  // 멤버십 시작(업로드시점) 이후 + 정지해제 기준선 이후 + 영상 길이 필터(2분미만 항상 제외, 2시간이상 옵션).
  const videoRows = (videos ?? [])
    .filter(
      (v) =>
        membershipStart == null ||
        (v.published_at != null && new Date(v.published_at) >= new Date(membershipStart)),
    )
    .filter((v) => isAfterActiveSince(v.created_at, sinceByChannel.get(v.channel_id)))
    .filter((v) => passesDurationFilters(v.duration_seconds, excludeOver2h));
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
        durationSeconds: v.duration_seconds,
      };
    });
}
