/**
 * 알림 발송 격리 인터페이스 (SSR AC-F1.1, CLAUDE.md 격리 경계 ②).
 * v1은 이메일(Resend) 구현. 이후 텔레그램/카카오 구현체로 교체 시 상위 코드가 바뀌지 않는다.
 */

export interface NotifyTarget {
  email: string;
}

export interface NotifyMessage {
  subject: string;
  html: string;
  text: string;
}

export interface NotifyResult {
  id?: string;
}

export interface Notifier {
  send(target: NotifyTarget, message: NotifyMessage): Promise<NotifyResult>;
}
