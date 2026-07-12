import { deliverAll } from '@/lib/delivery/deliver';
import { resolveDeliverySlot } from '@/lib/delivery/digest';
import { runReferralActivations } from '@/lib/referral/run-activations';

/**
 * 발송 진입점 (ADR-0005). pg_cron 이 07:30/11:30/17:30 KST 에 정시 디스패치한다.
 * wall-clock 가드: 실행 시각이 슬롯 허용창(±SLOT_TOLERANCE_MIN) 밖이면 발송하지 않는다
 * (지연 크론·수동 실행 off-slot 차단). DELIVER_FORCE=true 로 가드 우회(테스트용).
 * 스킵된 영상은 다음 슬롯에서 미발송분으로 다시 선택돼 이월된다.
 */
async function main() {
  const { slot, offsetMin, withinWindow } = resolveDeliverySlot(new Date());
  const forced = process.env.DELIVER_FORCE === 'true';
  if (!withinWindow && !forced) {
    console.log(
      `[deliver] off-slot (최근접 ${slot}, ${offsetMin}분 벗어남) — 발송 스킵. 내용은 다음 슬롯으로 이월.`,
    );
    return;
  }
  console.log(`[deliver] slot=${slot} (offset ${offsetMin}분)${forced ? ' [forced]' : ''}`);

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
