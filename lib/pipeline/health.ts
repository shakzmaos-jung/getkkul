/**
 * yt-dlp 에러 메시지가 유튜브 봇차단(로그인 쿠키 만료/무효)인지 판별한다.
 * 자막 없음 등 일반 실패와 구분해, 쿠키 갱신이 필요한 상황만 알림으로 승격한다.
 */
export function isBotBlockError(message: string): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('not a bot') ||
    m.includes('sign in to confirm') ||
    m.includes('cookies are no longer valid') ||
    m.includes('no longer valid')
  );
}
