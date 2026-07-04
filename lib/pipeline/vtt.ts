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

    // 직전 줄과 동일하면(롤링 자막 중복) 건너뜀
    if (out.length > 0 && out[out.length - 1] === text) continue;
    out.push(text);
  }

  return out.join('\n').trim();
}
