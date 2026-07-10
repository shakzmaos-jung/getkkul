import { describe, it, expect } from 'vitest';
import {
  backoffMinutes,
  nextRetryAtIso,
  classifyFailure,
  shouldRetry,
  planFailure,
  MAX_RETRIES,
} from './retry-policy';

const NOW = '2026-07-08T00:00:00.000Z';

describe('backoffMinutes (감쇠 백오프)', () => {
  it('30 → 60 → 120 → 240 → 360(상한)', () => {
    expect(backoffMinutes(1)).toBe(30);
    expect(backoffMinutes(2)).toBe(60);
    expect(backoffMinutes(3)).toBe(120);
    expect(backoffMinutes(4)).toBe(240);
    expect(backoffMinutes(5)).toBe(360);
    expect(backoffMinutes(6)).toBe(360); // 상한 유지
  });
});

describe('nextRetryAtIso', () => {
  it('현재 + 백오프(분) 후 ISO', () => {
    expect(nextRetryAtIso(1, NOW)).toBe('2026-07-08T00:30:00.000Z');
    expect(nextRetryAtIso(3, NOW)).toBe('2026-07-08T02:00:00.000Z');
  });
});

describe('classifyFailure (영구/일시 구분, AC-B1.4)', () => {
  it('삭제·비공개 등은 permanent', () => {
    expect(classifyFailure('ERROR: Private video. Sign in...')).toBe('permanent');
    expect(classifyFailure('Video unavailable')).toBe('permanent');
    expect(classifyFailure('This video has been removed by the uploader')).toBe('permanent');
    expect(classifyFailure('This video is members-only content')).toBe('permanent');
  });
  it('오디오 25MB 초과(Whisper 413·사전 가드)는 permanent(무한 재시도 방지)', () => {
    expect(
      classifyFailure('Whisper 413: {"error":{"message":"413: Maximum content size limit (26214400) exceeded'),
    ).toBe('permanent');
    expect(classifyFailure('audio too large: 26248340 bytes (Whisper 26214400 한도 초과)')).toBe(
      'permanent',
    );
  });
  it('봇차단·네트워크·타임아웃은 transient(기본)', () => {
    expect(classifyFailure('Sign in to confirm you are not a bot')).toBe('transient');
    expect(classifyFailure('HTTP Error 429: Too Many Requests')).toBe('transient');
    expect(classifyFailure('network timeout')).toBe('transient');
    expect(classifyFailure('')).toBe('transient');
  });
});

describe('planFailure (실패 처리 결정, AC-B1.1/B1.3)', () => {
  it('일시 실패는 pending 재큐 + 백오프', () => {
    const p = planFailure(0, 'timeout', NOW);
    expect(p.status).toBe('pending');
    expect(p.retry_count).toBe(1);
    expect(p.failure_kind).toBe('transient');
    expect(p.next_retry_at).toBe('2026-07-08T00:30:00.000Z');
    expect(p.last_error).toBe('timeout');
  });

  it('영구 사유는 즉시 종점 failed', () => {
    const p = planFailure(0, 'Private video', NOW);
    expect(p.status).toBe('failed');
    expect(p.failure_kind).toBe('permanent');
    expect(p.next_retry_at).toBeNull();
  });

  it('최대 재시도 도달 시 종점 failed', () => {
    const p = planFailure(MAX_RETRIES - 1, 'timeout', NOW); // → retry_count = MAX
    expect(p.retry_count).toBe(MAX_RETRIES);
    expect(p.status).toBe('failed');
    expect(p.failure_kind).toBe('transient'); // 사유는 일시지만 횟수 소진으로 종점
    expect(p.next_retry_at).toBeNull();
  });

  it('last_error 는 500자로 자른다', () => {
    const p = planFailure(0, 'x'.repeat(1000), NOW);
    expect(p.last_error.length).toBe(500);
  });
});

describe('shouldRetry (재획득 자격)', () => {
  it('도래한 일시 실패는 재시도', () => {
    expect(
      shouldRetry({ retry_count: 1, next_retry_at: '2026-07-07T23:00:00Z', failure_kind: 'transient' }, NOW),
    ).toBe(true);
  });
  it('아직 도래 전이면 대기', () => {
    expect(
      shouldRetry({ retry_count: 1, next_retry_at: '2026-07-08T01:00:00Z', failure_kind: 'transient' }, NOW),
    ).toBe(false);
  });
  it('영구/최대 초과는 재시도 안 함', () => {
    expect(shouldRetry({ retry_count: 1, next_retry_at: null, failure_kind: 'permanent' }, NOW)).toBe(false);
    expect(shouldRetry({ retry_count: MAX_RETRIES, next_retry_at: null, failure_kind: 'transient' }, NOW)).toBe(false);
  });
  it('next_retry_at 없으면(신규) 즉시 대상', () => {
    expect(shouldRetry({ retry_count: 0, next_retry_at: null, failure_kind: null }, NOW)).toBe(true);
  });
});
