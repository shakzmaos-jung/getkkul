import type { PushNotifier } from '@/lib/notify/web-push';
import { WebPushNotifier } from '@/lib/notify/web-push';

/**
 * VAPID 환경변수가 모두 있으면 web-push 구현을 반환, 없으면 null(푸시 비활성).
 * 상위 코드(deliver)는 null 이면 푸시를 건너뛴다(격리 경계 ②).
 */
export function createPushNotifier(): PushNotifier | null {
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return null;
  }
  return new WebPushNotifier();
}
