import type { NotifyMessage } from '@/lib/notify/notify';
import type { PushMessage } from '@/lib/notify/web-push';

/**
 * 멤버십 결제/전환 알림 렌더링 (membership-spec §G). 결제 성공/실패·PoC 종료·7일전 안내.
 * 이메일·푸시 양 채널(dispatch 는 run-cycle 에서 기존 notify 레이어 재사용).
 */

export type BillingEvent = 'renewed' | 'downgraded_free' | 'grace_failed' | 'poc_end' | 'poc_warning';

export interface BillingNotifyInput {
  event: BillingEvent;
  planName: string;
  nextBillingText?: string;
  graceUntilText?: string;
  pocUntilText?: string;
  appBaseUrl?: string;
}

const url = (base?: string) => `${base ?? ''}/membership`;

function copy(input: BillingNotifyInput): { title: string; line: string } {
  switch (input.event) {
    case 'renewed':
      return {
        title: `겟꿀 멤버십 갱신 완료 (${input.planName})`,
        line: `멤버십이 갱신되었어요. 다음 결제일 ${input.nextBillingText ?? ''}.`,
      };
    case 'downgraded_free':
      return { title: '겟꿀 멤버십이 Free 로 전환됐어요', line: '해지/유예에 따라 Free 로 전환되었습니다. 데이터는 유지돼요.' };
    case 'grace_failed':
      return {
        title: '겟꿀 결제 실패 — 유예 중',
        line: `크레딧이 부족해 결제가 지연됐어요. ${input.graceUntilText ?? ''}까지 충전하지 않으면 Free 로 전환됩니다.`,
      };
    case 'poc_end':
      return { title: '겟꿀 PoC 무료 체험 종료', line: `무료 체험이 끝나 ${input.planName} 로 전환되었어요.` };
    case 'poc_warning':
      return {
        title: '겟꿀 무료 체험 곧 종료',
        line: `${input.pocUntilText ?? ''}에 무료 체험이 끝나요. 이후 크레딧이 있으면 결제로 전환, 없으면 Free 로 전환됩니다.`,
      };
  }
}

export function renderBillingEmail(input: BillingNotifyInput): NotifyMessage {
  const { title, line } = copy(input);
  const link = url(input.appBaseUrl);
  const text = [line, `멤버십 보기: ${link}`].join('\n');
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">${title}</h2>
      <p style="margin:0 0 12px">${line}</p>
      <p><a href="${link}">멤버십 보기</a></p>
    </div>`.trim();
  return { subject: title, html, text };
}

export function renderBillingPush(input: BillingNotifyInput): PushMessage {
  const { title, line } = copy(input);
  return { title, body: line, url: url(input.appBaseUrl) };
}
