/**
 * WebVTT 자막 → 평문 텍스트 변환 (SSR C2). 순수 함수 — 단위 테스트 대상.
 * yt-dlp 가 덤프한 자막(자동자막 포함)에서 헤더·타임스탬프·인라인 태그를 제거하고
 * 연속 중복 줄(롤링 자동자막 특성)을 합쳐 요약 입력용 텍스트를 만든다.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => HTML_ENTITIES[m] ?? m);
}

// 롤링 자동자막 부분겹침 병합 임계: 겹치는 어절 ≥2 이면서 공백 제외 글자수 ≥4.
// (단일 어절·"네 네" 같은 짧은 반복 오병합 방지, 실제 겹침 구간만 병합.)
const MIN_OVERLAP_WORDS = 2;
const MIN_OVERLAP_CHARS = 4;

/**
 * 직전 유지줄의 접미(tail)와 새 줄의 접두(head)가 겹치면 병합한 문자열, 아니면 null.
 * 유튜브 자동자막은 직전 큐의 뒷부분 어절이 다음 큐 앞부분에 반복(슬라이딩)되어 전사가 부풀므로,
 * 겹친 어절을 한 번만 남기고 이어붙여 입력 토큰을 줄인다.
 */
function mergeRollingOverlap(prev: string, next: string): string | null {
  const pw = prev.split(/\s+/).filter(Boolean);
  const nw = next.split(/\s+/).filter(Boolean);
  const maxK = Math.min(pw.length, nw.length);
  for (let k = maxK; k >= MIN_OVERLAP_WORDS; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (pw[pw.length - k + i] !== nw[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    if (nw.slice(0, k).join('').length < MIN_OVERLAP_CHARS) continue; // 짧은 겹침 오병합 방지
    const remainder = nw.slice(k);
    return remainder.length > 0 ? `${prev} ${remainder.join(' ')}` : prev;
  }
  return null;
}

export function vttToText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === 'WEBVTT') continue;
    if (/^(Kind|Language|NOTE|STYLE|REGION):/i.test(line)) continue;
    if (line.startsWith('NOTE')) continue;
    // 타임스탬프 큐 라인: "00:00:00.000 --> 00:00:02.000 ..."
    if (line.includes('-->')) continue;
    // 큐 식별자(순수 숫자 또는 짧은 id)
    if (/^\d+$/.test(line)) continue;

    // 인라인 타임스탬프/태그 제거: <00:00:01.000>, <c>, </c> 등 → 이후 HTML 엔티티 디코드
    const text = decodeEntities(raw.replace(/<[^>]+>/g, '')).trim();
    if (!text) continue;

    if (out.length > 0) {
      const prev = out[out.length - 1];
      // 완전동일(롤링 자막 중복) 건너뜀
      if (prev === text) continue;
      // 부분겹침(접미–접두) 병합
      const merged = mergeRollingOverlap(prev, text);
      if (merged !== null) {
        out[out.length - 1] = merged;
        continue;
      }
    }
    out.push(text);
  }

  return out.join('\n').trim();
}
