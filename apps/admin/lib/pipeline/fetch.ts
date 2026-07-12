import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { PipelineStatus, ChannelProcessing } from './types';

/** 파이프라인 상태 (AC-PI-1a/c). date 미지정 시 오늘 KST. */
export async function fetchPipelineStatus(date?: string): Promise<PipelineStatus> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    'get_pipeline_status',
    date ? { p_date: date } : {},
  );
  if (error) throw new Error(`get_pipeline_status 실패: ${error.message}`);
  if (!data) throw new Error('get_pipeline_status 빈 응답');
  return data as unknown as PipelineStatus;
}

/** 채널별 처리 현황 (AC-PI-1b). 구독된 채널만. */
export async function fetchChannelProcessing(): Promise<ChannelProcessing> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_channel_processing');
  if (error) throw new Error(`get_channel_processing 실패: ${error.message}`);
  if (!data) throw new Error('get_channel_processing 빈 응답');
  return data as unknown as ChannelProcessing;
}
