import type { Notifier, NotifyMessage, NotifyResult, NotifyTarget } from '@/lib/notify/notify';

/**
 * Resend 이메일 구현 (SSR AC-F1.3). 외부 SDK 없이 HTTP API 사용.
 * from 주소는 검증된 도메인 또는 테스트 발신(onboarding@resend.dev).
 */
export class ResendNotifier implements Notifier {
  private apiKey: string;
  private from: string;

  constructor(opts: { apiKey?: string; from?: string } = {}) {
    const apiKey = opts.apiKey ?? process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY 가 필요합니다.');
    this.apiKey = apiKey;
    // 빈 문자열은 미설정으로 취급해 테스트 발신으로 폴백
    this.from = opts.from || process.env.DELIVERY_FROM_EMAIL || 'getkkul <onboarding@resend.dev>';
  }

  async send(target: NotifyTarget, message: NotifyMessage): Promise<NotifyResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [target.email],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id };
  }
}
