import { describe, it, expect } from 'vitest';
import { isBotBlockError } from './health';

describe('isBotBlockError (유튜브 봇차단/쿠키 만료 감지)', () => {
  it('봇 확인 요구 메시지를 봇차단으로 본다', () => {
    expect(
      isBotBlockError(
        "ERROR: [youtube] abc: Sign in to confirm you're not a bot. Use --cookies ...",
      ),
    ).toBe(true);
  });

  it('쿠키 무효 경고를 봇차단으로 본다', () => {
    expect(
      isBotBlockError(
        'WARNING: [youtube] The provided YouTube account cookies are no longer valid.',
      ),
    ).toBe(true);
  });

  it('자막 없음 등 일반 실패는 봇차단이 아니다', () => {
    expect(isBotBlockError('ERROR: [youtube] abc: Video unavailable')).toBe(false);
    expect(isBotBlockError('no subtitles found')).toBe(false);
    expect(isBotBlockError('')).toBe(false);
  });
});
