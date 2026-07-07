import { describe, it, expect } from 'vitest';
import { renderAwardEmail, renderAwardPush } from './award-notify';

describe('renderAwardEmail (AC-H1.1 지급 이메일)', () => {
  it('금액과 사유(추천인)를 담는다', () => {
    const m = renderAwardEmail({ amount: 2000, sourceType: 'referrer', appBaseUrl: 'https://x' });
    expect(m.subject).toContain('2,000원');
    expect(m.text).toContain('초대한 친구');
    expect(m.html).toContain('2,000원');
    expect(m.html).toContain('https://x/settings');
  });

  it('피추천인 문구와 잔액 표시', () => {
    const m = renderAwardEmail({ amount: 2000, sourceType: 'referee', balance: 4000 });
    expect(m.text).toContain('가입 크레딧');
    expect(m.text).toContain('4,000원');
  });
});

describe('renderAwardPush (AC-H1.1 지급 푸시)', () => {
  it('title/body/url 구성', () => {
    const p = renderAwardPush({ amount: 2000, sourceType: 'referee', appBaseUrl: 'https://x' });
    expect(p.title).toContain('2,000원');
    expect(p.url).toBe('https://x/settings');
  });
});
