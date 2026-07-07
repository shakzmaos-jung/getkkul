import { deliverAll } from '@/lib/delivery/deliver';
import { slotForKstHour } from '@/lib/delivery/digest';
import { runReferralActivations } from '@/lib/referral/run-activations';

/**
 * 발송 진입점 (ADR-0005, GitHub Actions KST 3슬롯 스케줄).
 * 현재 KST 시각으로 슬롯을 판정해 사용자별 다이제스트를 발송한다.
 */
async function main() {
  const kstHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  const slot = slotForKstHour(kstHour);
  console.log(`[deliver] KST ${kstHour}시 → slot=${slot}`);

  const r = await deliverAll(slot);
  console.log(
    `[deliver] users=${r.users} sent=${r.sent} push=${r.pushSent} empty=${r.empty} failed=${r.failed}`,
  );

  // 발송으로 요약 수신 카운트가 갱신된 뒤 추천 활성화·지급을 스윕한다(REQ-C/D/H).
  // 개별 referral 실패가 전체 잡을 막지 않도록 격리한다(CLAUDE.md 회복력).
  try {
    const a = await runReferralActivations();
    console.log(
      `[referral] pending=${a.pending} activated=${a.activated} grants=${a.grantsIssued} email=${a.emailsSent} push=${a.pushSent} failed=${a.failed}`,
    );
  } catch (e) {
    console.error('[referral] 활성화 스윕 실패(발송은 완료):', (e as Error).message);
  }
}

main().catch((e) => {
  console.error('[deliver] fatal:', e);
  process.exit(1);
});
