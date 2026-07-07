import type { NotifyMessage } from '@/lib/notify/notify';
import type { PushMessage } from '@/lib/notify/web-push';

/**
 * 크레딧 지급 알림 렌더링 (REQ-H). 기존 notify 레이어(이메일)와 push 레이어 재사용(AC-H1.1).
 * source_type 에 따라 문구가 다르다: referrer=내가 초대한 친구가 활성화, referee=가입 축하.
 */

export type AwardSourceType = 'referrer' | 'referee';

export interface AwardNotifyInput {
  amount: number;
  sourceType: AwardSourceType;
  /** 지급 후 사용 가능 잔액(표시용, 선택). */
  balance?: number;
  appBaseUrl?: string;
}

function won(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

function reasonLine(sourceType: AwardSourceType): string {
  return sourceType === 'referrer'
    ? '초대한 친구가 겟꿀을 활성화했어요.'
    : '겟꿀 친구추천으로 가입 크레딧이 적립됐어요.';
}

/** 지급 이메일 메시지. */
export function renderAwardEmail(input: AwardNotifyInput): NotifyMessage {
  const settingsUrl = `${input.appBaseUrl ?? ''}/settings`;
  const subject = `겟꿀 크레딧 ${won(input.amount)}이 적립됐어요`;
  const balanceLine =
    input.balance !== undefined ? `현재 사용 가능 크레딧: ${won(input.balance)}` : '';
  const text = [
    reasonLine(input.sourceType),
    `크레딧 ${won(input.amount)}이 적립됐습니다. (유효기간 5년, 만료 임박 순 사용)`,
    balanceLine,
    `크레딧 내역: ${settingsUrl}`,
  ]
    .filter(Boolean)
    .join('\n');
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">크레딧 ${won(input.amount)} 적립 🎉</h2>
      <p style="margin:0 0 4px">${reasonLine(input.sourceType)}</p>
      <p style="margin:0 0 4px">유효기간 5년, 향후 유료 결제 시 할인에 사용할 수 있어요.</p>
      ${input.balance !== undefined ? `<p style="margin:0 0 12px">현재 사용 가능 크레딧: <b>${won(input.balance)}</b></p>` : ''}
      <p><a href="${settingsUrl}">크레딧 내역 보기</a></p>
    </div>`.trim();
  return { subject, html, text };
}

/** 지급 푸시 메시지. */
export function renderAwardPush(input: AwardNotifyInput): PushMessage {
  return {
    title: `겟꿀 크레딧 ${won(input.amount)} 적립`,
    body: reasonLine(input.sourceType),
    url: `${input.appBaseUrl ?? ''}/settings`,
  };
}
