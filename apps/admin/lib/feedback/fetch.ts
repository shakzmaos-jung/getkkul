import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { FeedbackEvents } from './types';
import type { ParsedFeedbackQuery } from './derive';

/**
 * 좋아요/싫어요 이벤트 조회. **원문 이메일은 이 함수 안에서만** 다루고 maskEmail 로 마스킹해 반환
 * → 페이지/브라우저엔 마스킹된 값만 전달(개인정보 최소 노출).
 */
export async function fetchFeedbackEvents(q: ParsedFeedbackQuery): Promise<FeedbackEvents> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증(PII 보호)
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_feedback_events', {
    p_rating: q.rating ?? null,
    p_search: q.search ?? null,
    p_from: null,
    p_to: null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (error) throw new Error(`get_feedback_events 실패: ${error.message}`);
  if (!data) throw new Error('get_feedback_events 빈 응답');
  const raw = data as unknown as FeedbackEvents;
  return {
    total: raw.total,
    rows: raw.rows.map((r) => ({ ...r, email: maskEmail(r.email) })),
  };
}
