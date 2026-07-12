import { createHash } from 'node:crypto';

/**
 * 어뷰징 방지용 이메일 정규화 + 단방향 해시 (AC-I1.1, L4).
 * 재가입 어뷰징을 잡으려면 "같은 사람"을 표현해야 하므로, 표기 변형(대소문자,
 * Gmail 점/plus 태그)을 흡수해 정규화한 뒤 sha256 으로 복호 불가하게 저장·비교한다.
 * 원문 이메일은 저장하지 않는다(개인정보 최소수집).
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * 이메일을 비교 가능한 정규형으로 바꾼다.
 * - 공백 제거 + 소문자화(모든 도메인)
 * - `+tag` 서브어드레싱 제거(모든 도메인)
 * - Gmail(googlemail 포함): local 부분의 점 제거 + 도메인을 gmail.com 으로 통일
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed; // '@' 없음/형식 이상 → 있는 그대로(해시만 목적)

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  // +tag 서브어드레싱 제거(공통).
  const plus = local.indexOf('+');
  if (plus !== -1) local = local.slice(0, plus);

  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  return `${local}@${domain}`;
}

/**
 * 정규화 이메일을 sha256 hex 로 해시한다. 선택적 pepper(서버 비밀)를 앞에 붙여
 * 무지개표/역추적을 어렵게 할 수 있다(기본 ''; 배포 후 pepper 변경 금지 — 재가입 매칭 깨짐).
 */
export function hashEmail(normalized: string, pepper = ''): string {
  return createHash('sha256').update(`${pepper}${normalized}`).digest('hex');
}

/** 원문 이메일 → 정규화 → 해시 (편의 래퍼). */
export function normalizedEmailHash(email: string, pepper = ''): string {
  return hashEmail(normalizeEmail(email), pepper);
}
