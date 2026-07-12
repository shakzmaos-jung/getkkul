/**
 * 이메일 마스킹(개인정보 보호). 로컬부·도메인부 각각 첫 글자만 남기고 나머지는 `*`.
 * 예: chess.jung@ppoint.kr → c*********@p********
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '친구';
  const at = email.indexOf('@');
  if (at <= 0 || at === email.length - 1) return email; // 형식 이상은 방어적으로 원문
  const mask = (s: string) => s[0] + '*'.repeat(Math.max(0, s.length - 1));
  return `${mask(email.slice(0, at))}@${mask(email.slice(at + 1))}`;
}
