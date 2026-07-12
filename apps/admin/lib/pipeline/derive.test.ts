import { describe, it, expect } from 'vitest';
import {
  channelTotals,
  retryQueueTotal,
  formatDuration,
  deliverySuccessRate,
  deliverStageSubLabel,
} from './derive';
import type { ChannelRow, PipelineStage, RetryQueue } from './types';

const ch = (over: Partial<ChannelRow>): ChannelRow => ({
  channelId: 'UC',
  channelTitle: 't',
  channelThumbnail: null,
  channelHandle: null,
  new: 0,
  summarized: 0,
  pending: 0,
  processing: 0,
  failed: 0,
  ...over,
});

describe('channelTotals (AC-PI-1b 집계)', () => {
  it('채널별 신규/요약/대기/처리중/실패를 합산', () => {
    const totals = channelTotals([
      ch({ new: 1, summarized: 10, pending: 2 }),
      ch({ new: 3, summarized: 5, failed: 1, processing: 2 }),
    ]);
    expect(totals).toEqual({ new: 4, summarized: 15, pending: 2, processing: 2, failed: 1 });
  });
  it('빈 목록은 0', () => {
    expect(channelTotals([])).toEqual({ new: 0, summarized: 0, pending: 0, processing: 0, failed: 0 });
  });
});

describe('retryQueueTotal', () => {
  it('네 종류 합', () => {
    const rq: RetryQueue = { dueNow: 1, waiting: 2, permanentFailures: 7, exhaustedTransient: 4, samples: [] };
    expect(retryQueueTotal(rq)).toBe(14);
  });
});

describe('formatDuration', () => {
  it('null/미기록은 —', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
  });
  it('초·분 표기', () => {
    expect(formatDuration(14)).toBe('14초');
    expect(formatDuration(60)).toBe('1분');
    expect(formatDuration(95)).toBe('1분 35초');
  });
});

describe('deliverySuccessRate (AC-PI-1c)', () => {
  const stage = (counts: Record<string, number>): PipelineStage => ({
    key: 'deliver',
    label: '발송',
    ok: true,
    durationSec: null,
    counts,
  });
  it('발송 성공률 = sent/(sent+failed)', () => {
    expect(deliverySuccessRate(stage({ delivered: 3, failures: 0 }))).toBe(1);
    expect(deliverySuccessRate(stage({ delivered: 3, failures: 1 }))).toBe(0.75);
  });
  it('발송 없으면 null(0으로 나누지 않음)', () => {
    expect(deliverySuccessRate(stage({ delivered: 0, failures: 0 }))).toBeNull();
  });
  it('발송 외 단계는 null', () => {
    const detect: PipelineStage = { key: 'detect', label: '탐지', ok: true, durationSec: 14, counts: {} };
    expect(deliverySuccessRate(detect)).toBeNull();
  });
});

describe('deliverStageSubLabel (AC-PI-1c 렌더 문자열 — StageTimeline이 표시)', () => {
  const deliver = (counts: Record<string, number>): PipelineStage => ({
    key: 'deliver',
    label: '발송',
    ok: true,
    durationSec: null,
    counts,
  });
  it('성공률 + 실패 건수 문자열', () => {
    expect(deliverStageSubLabel(deliver({ delivered: 3, failures: 0 }))).toBe('성공률 100% · 실패 0');
    expect(deliverStageSubLabel(deliver({ delivered: 3, failures: 1 }))).toBe('성공률 75% · 실패 1');
  });
  it('발송 없으면 null(표시 안 함)', () => {
    expect(deliverStageSubLabel(deliver({ delivered: 0, failures: 0 }))).toBeNull();
  });
  it('발송 외 단계는 null', () => {
    expect(
      deliverStageSubLabel({ key: 'summarize', label: '요약', ok: true, durationSec: 12, counts: {} }),
    ).toBeNull();
  });
});
