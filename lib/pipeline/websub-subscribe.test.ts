import { describe, it, expect } from 'vitest';
import { needsResubscribe, buildHubParams } from './websub-subscribe';

const NOW = new Date('2026-07-09T00:00:00Z').getTime();

describe('needsResubscribe (AC-A2.2 리스 갱신)', () => {
  it('상태 없음/비활성이면 (재)구독', () => {
    expect(needsResubscribe(undefined, NOW)).toBe(true);
    expect(needsResubscribe({ status: 'pending', lease_expires_at: null }, NOW)).toBe(true);
    expect(needsResubscribe({ status: 'expired', lease_expires_at: null }, NOW)).toBe(true);
  });
  it('active + 리스 여유(>2일)면 스킵', () => {
    const far = new Date(NOW + 5 * 24 * 3600 * 1000).toISOString();
    expect(needsResubscribe({ status: 'active', lease_expires_at: far }, NOW)).toBe(false);
  });
  it('active 라도 만료 임박(≤2일)이면 재구독', () => {
    const soon = new Date(NOW + 1 * 24 * 3600 * 1000).toISOString();
    expect(needsResubscribe({ status: 'active', lease_expires_at: soon }, NOW)).toBe(true);
  });
});

describe('buildHubParams (허브 요청 파라미터)', () => {
  it('subscribe: 필수 파라미터 + lease', () => {
    const s = buildHubParams('UC_x', 'https://cb/api/webhooks/youtube', 'tok', 'sec', 'subscribe');
    const p = new URLSearchParams(s);
    expect(p.get('hub.mode')).toBe('subscribe');
    expect(p.get('hub.callback')).toBe('https://cb/api/webhooks/youtube');
    expect(p.get('hub.topic')).toContain('channel_id=UC_x');
    expect(p.get('hub.verify_token')).toBe('tok');
    expect(p.get('hub.secret')).toBe('sec');
    expect(p.get('hub.lease_seconds')).toBe('432000');
  });
  it('unsubscribe: lease 없음', () => {
    const p = new URLSearchParams(buildHubParams('UC_x', 'cb', 't', 's', 'unsubscribe'));
    expect(p.get('hub.mode')).toBe('unsubscribe');
    expect(p.get('hub.lease_seconds')).toBeNull();
  });
});
