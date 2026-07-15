import { describe, it, expect } from 'vitest';
import { parseVersionQuery, filterVersions, versionQueryString } from './derive';
import type { VersionEntry } from './types';

const E = (over: Partial<VersionEntry>): VersionEntry => ({
  version: '0.1.0',
  date: '2026-07-11',
  type: 'patch',
  prs: [1],
  summary: 's',
  dev: 'd',
  nonDev: 'n',
  userImpact: 'u',
  ...over,
});

describe('versions derive', () => {
  it('parseVersionQuery: type 화이트리스트 + q trim', () => {
    expect(parseVersionQuery({})).toEqual({ type: undefined, search: undefined });
    expect(parseVersionQuery({ type: 'minor', q: '  home  ' })).toEqual({ type: 'minor', search: 'home' });
    expect(parseVersionQuery({ type: 'bogus' }).type).toBeUndefined();
    expect(parseVersionQuery({ type: ['patch', 'minor'] }).type).toBe('patch');
  });

  it('filterVersions: type + 검색(대소문자 무시, 여러 필드)', () => {
    const list = [
      E({ version: '0.12.0', type: 'minor', summary: '싫어요 모달' }),
      E({ version: '0.11.3', type: 'patch', dev: 'flex stretch' }),
    ];
    expect(filterVersions(list, { type: 'minor' }).map((e) => e.version)).toEqual(['0.12.0']);
    expect(filterVersions(list, { search: '싫어요' }).map((e) => e.version)).toEqual(['0.12.0']);
    expect(filterVersions(list, { search: 'FLEX' }).map((e) => e.version)).toEqual(['0.11.3']);
    expect(filterVersions(list, {})).toHaveLength(2);
  });

  it('versionQueryString: 빈 값 생략', () => {
    expect(versionQueryString({})).toBe('');
    expect(versionQueryString({ type: 'patch', search: 'x' })).toBe('?type=patch&q=x');
  });
});
