import { deliverAll } from '@/lib/delivery/deliver';
import { slotForKstHour } from '@/lib/delivery/digest';

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
}

main().catch((e) => {
  console.error('[deliver] fatal:', e);
  process.exit(1);
});
