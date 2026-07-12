import { describe, it, expect } from 'vitest';
import { isAfterActiveSince, activeSinceByChannel } from './active-window';

describe('isAfterActiveSince', () => {
  const since = '2026-07-07T09:00:00.000Z';

  it('기준선 없으면(NULL/undefined) 전체 허용', () => {
    expect(isAfterActiveSince('2020-01-01T00:00:00.000Z', null)).toBe(true);
    expect(isAfterActiveSince('2020-01-01T00:00:00.000Z', undefined)).toBe(true);
  });

  it('기준선 이후 감지된 영상만 허용(경계 포함)', () => {
    expect(isAfterActiveSince('2026-07-07T09:00:00.000Z', since)).toBe(true); // 동시각 포함
    expect(isAfterActiveSince('2026-07-07T10:00:00.000Z', since)).toBe(true);
    expect(isAfterActiveSince('2026-07-07T08:59:59.000Z', since)).toBe(false); // 기준선 이전=제외
  });
});

describe('activeSinceByChannel', () => {
  it('channel_id → active_since 맵', () => {
    const m = activeSinceByChannel([
      { channel_id: 'A', active_since: null },
      { channel_id: 'B', active_since: '2026-07-07T09:00:00.000Z' },
    ]);
    expect(m.get('A')).toBeNull();
    expect(m.get('B')).toBe('2026-07-07T09:00:00.000Z');
  });
});
