import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseChannelFeed } from '@/lib/pipeline/rss';
import { verifyWebSubSignature, isValidChallenge } from '@/lib/pipeline/websub';

/**
 * YouTube WebSub(PubSubHubbub) 콜백 (pipeline-reliability REQ-A, G).
 * - GET: 허브의 구독 확인 요청. verify_token 일치 시 hub.challenge 를 그대로 에코(AC-A1.1).
 * - POST: 신규/수정 영상 알림. HMAC 서명 검증 후 Atom 파싱 → 구독 채널이면 videos(pending) upsert
 *   (video_id UNIQUE 로 멱등, AC-A1.3). 새 영상이 등록되면 즉시 파이프라인을 dispatch(G) — 배치 대기 없음.
 * 공개 라우트(route-access PUBLIC_PATH_PREFIXES '/api/webhooks'). 인증 대신 HMAC 로 보호(I3).
 * yt-dlp/ffmpeg 를 못 도는 서버리스이므로, 무거운 전사는 dispatch 로 워커(GitHub Actions)에 위임.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');
  const expected = process.env.WEBSUB_VERIFY_TOKEN ?? '';

  if (!isValidChallenge(mode, verifyToken, challenge, expected)) {
    return new NextResponse('invalid verification', { status: 404 });
  }

  // 허브 확인 성공 → 구독 상태 기록(active + 리스 만료시각). 실패해도 challenge 는 에코해야 확정됨.
  try {
    const topic = searchParams.get('hub.topic');
    const channelId = topic ? new URL(topic).searchParams.get('channel_id') : null;
    if (channelId) {
      const leaseSec = Number(searchParams.get('hub.lease_seconds') ?? '0');
      const admin = createAdminClient();
      await admin.from('websub_subscriptions').upsert(
        {
          channel_id: channelId,
          status: mode === 'subscribe' ? ('active' as const) : ('unsubscribed' as const),
          subscribed_at: mode === 'subscribe' ? new Date().toISOString() : null,
          lease_expires_at:
            mode === 'subscribe' && leaseSec > 0
              ? new Date(Date.now() + leaseSec * 1000).toISOString()
              : null,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id' },
      );
    }
  } catch (e) {
    console.warn(`[websub] 구독 상태 기록 실패: ${(e as Error).message}`);
  }

  return new NextResponse(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
}

export async function POST(request: Request) {
  const secret = process.env.WEBSUB_SECRET ?? '';
  const body = await request.text();

  if (!verifyWebSubSignature(body, request.headers.get('x-hub-signature'), secret)) {
    return new NextResponse('invalid signature', { status: 403 });
  }

  try {
    const parsed = parseChannelFeed(body);
    const channelId = parsed.channelId;
    // 알 수 없는/미구독 채널 또는 videoId 없는 알림(삭제 등)은 무시하고 ack(AC-A1.4).
    if (!channelId || parsed.videos.length === 0) {
      return new NextResponse(null, { status: 204 });
    }

    const admin = createAdminClient();
    const { data: sub } = await admin
      .from('subscriptions')
      .select('channel_id')
      .eq('channel_id', channelId)
      .limit(1)
      .maybeSingle();
    if (!sub) return new NextResponse(null, { status: 204 }); // 미구독 채널 무시

    const rows = parsed.videos.map((v) => ({
      channel_id: channelId,
      video_id: v.videoId,
      title: v.title,
      url: v.url,
      published_at: v.publishedAt || null,
      status: 'pending' as const,
    }));
    const { data: inserted } = await admin
      .from('videos')
      .upsert(rows, { onConflict: 'video_id', ignoreDuplicates: true })
      .select('video_id');

    // 새 영상이 실제로 등록됐을 때만 즉시 처리 트리거(수정 재핑엔 dispatch 안 함, G/멱등).
    if ((inserted ?? []).length > 0) {
      await admin.rpc('dispatch_pipeline');
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.warn(`[websub] 처리 실패: ${(e as Error).message}`);
    // 허브에 200 이 아니어도 재전송되므로, 파싱/일시 오류는 5xx 로 응답해 재전송 유도.
    return new NextResponse('processing error', { status: 500 });
  }
}
