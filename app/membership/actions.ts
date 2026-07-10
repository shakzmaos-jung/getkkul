'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUpgrade, isPlanCode, type PlanCode } from '@/lib/membership/plans';
import { upgradePlan, scheduleChange, cancelScheduledChange } from '@/lib/membership/service';

export type PlanChangeResult =
  | { ok: true; applied: 'immediate' | 'scheduled' | 'noop' }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * 플랜 변경. 업그레이드=즉시 비례정산 적용, 다운그레이드/해지(Free)=다음 주기 예약.
 * (membership-spec §C2/§A/§E)
 */
export async function changePlan(toPlanRaw: string): Promise<PlanChangeResult> {
  if (!isPlanCode(toPlanRaw)) return { ok: false, error: '잘못된 플랜입니다.' };
  const toPlan = toPlanRaw as PlanCode;
  const user = await requireUser();

  const admin = createAdminClient();
  const { data: m } = await admin
    .from('membership')
    .select('plan_code')
    .eq('user_id', user.id)
    .single();
  if (!m) return { ok: false, error: '멤버십을 찾을 수 없습니다.' };
  const from = m.plan_code as PlanCode;
  if (from === toPlan) return { ok: true, applied: 'noop' };

  try {
    if (isUpgrade(from, toPlan)) {
      await upgradePlan(user.id, toPlan);
      revalidatePath('/membership');
      return { ok: true, applied: 'immediate' };
    }
    // 다운그레이드 또는 Free(해지). Free 로 내리면 해지 처리(status canceled).
    await scheduleChange(user.id, toPlan, toPlan === 'free');
    revalidatePath('/membership');
    return { ok: true, applied: 'scheduled' };
  } catch (e) {
    return { ok: false, error: (e as Error).message || '변경에 실패했습니다.' };
  }
}

/** 예약된 변경(다운/해지) 취소 (AC-A1.4). */
export async function cancelScheduled(): Promise<PlanChangeResult> {
  const user = await requireUser();
  try {
    await cancelScheduledChange(user.id);
    revalidatePath('/membership');
    return { ok: true, applied: 'noop' };
  } catch (e) {
    return { ok: false, error: (e as Error).message || '취소에 실패했습니다.' };
  }
}
