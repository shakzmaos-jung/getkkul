import type { Notifier } from '@/lib/notify/notify';
import { GmailNotifier } from '@/lib/notify/gmail';
import { ResendNotifier } from '@/lib/notify/resend';

/**
 * 환경에 따라 발송 구현을 선택한다. GMAIL 자격증명이 있으면 Gmail SMTP(무료, 임의 수신),
 * 없으면 Resend(테스트 발신). 상위 코드는 이 팩토리만 알고 구현체를 모른다(격리 경계 ②).
 */
export function createNotifier(): Notifier {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return new GmailNotifier();
  }
  return new ResendNotifier();
}
