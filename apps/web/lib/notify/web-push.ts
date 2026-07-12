import webpush from 'web-push';

/**
 * 푸시 알림 채널(SSR 부록 F). 이메일 Notifier 와 병렬. 타깃=구독 목록, 메시지=title/body/url.
 * 발송 결과에 무효 구독(404/410=gone) 표시 → 호출부가 삭제(AC-C1.5).
 */
export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

export interface PushSendResult {
  endpoint: string;
  ok: boolean;
  statusCode?: number;
  gone: boolean; // 404/410 → 만료·무효 구독, 삭제 대상
}

export interface PushNotifier {
  send(subs: PushSubscriptionRecord[], message: PushMessage): Promise<PushSendResult[]>;
}

/** 발송 실패 상태코드가 만료·무효(404/410)인지. */
export function classifyPushGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export class WebPushNotifier implements PushNotifier {
  constructor() {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT as string,
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
  }

  async send(subs: PushSubscriptionRecord[], message: PushMessage): Promise<PushSendResult[]> {
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      url: message.url ?? '/',
    });
    // 개별 구독 실패가 서로/전체를 막지 않음(AC-E1.5).
    return Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          return { endpoint: s.endpoint, ok: true, gone: false };
        } catch (e) {
          const statusCode = (e as { statusCode?: number }).statusCode;
          return { endpoint: s.endpoint, ok: false, statusCode, gone: classifyPushGone(statusCode) };
        }
      }),
    );
  }
}
