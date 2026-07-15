import { describe, it, expect } from 'vitest';
import { VERSION_HISTORY, CURRENT_VERSION, prUrl } from './data';

function cmpSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

describe('VERSION_HISTORY 무결성', () => {
  it('최신순(내림차순) 정렬 + 버전 유니크', () => {
    const versions = VERSION_HISTORY.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < VERSION_HISTORY.length; i++) {
      expect(cmpSemver(versions[i - 1], versions[i])).toBeGreaterThan(0);
    }
  });

  it('필수 필드 형식 + 비어있지 않음 + prs 양수', () => {
    for (const e of VERSION_HISTORY) {
      expect(e.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['major', 'minor', 'patch', 'baseline']).toContain(e.type);
      for (const f of [e.summary, e.dev, e.nonDev, e.userImpact]) {
        expect(f.trim().length).toBeGreaterThan(0);
      }
      for (const n of e.prs) expect(n).toBeGreaterThan(0);
    }
  });

  it('type 이 이전 릴리스 대비 semver 델타와 일치', () => {
    for (let i = 0; i < VERSION_HISTORY.length - 1; i++) {
      const cur = VERSION_HISTORY[i];
      const prev = VERSION_HISTORY[i + 1];
      if (cur.type === 'baseline') continue;
      const [cM, cm] = cur.version.split('.').map(Number);
      const [pM, pm] = prev.version.split('.').map(Number);
      if (cM > pM) expect(cur.type).toBe('major');
      else if (cm > pm) expect(cur.type).toBe('minor');
      else expect(cur.type).toBe('patch');
    }
  });

  it('CURRENT_VERSION 은 최신 엔트리 + prUrl', () => {
    expect(CURRENT_VERSION).toBe(VERSION_HISTORY[0].version);
    expect(prUrl(117)).toBe('https://github.com/shakzmaos-jung/getkkul/pull/117');
  });
});
