// 최소 RFC4180 CSV 인코드/파서(외부 의존성 없음). 용어사전 CSV 다운로드/업로드용.

/** 한 셀 인코딩: 쉼표·따옴표·개행·앞뒤공백 있으면 "..."로 감싸고 내부 " → "". */
function encodeCell(v: string): string {
  if (/[",\n\r]/.test(v) || /^\s|\s$/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** 행 배열 → CSV 문자열(CRLF). BOM 은 붙이지 않음(다운로드 시 클라가 prepend). */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => encodeCell(c ?? '')).join(',')).join('\r\n');
}

/** RFC4180 파서: 인용 필드(쉼표·개행·"" 이스케이프) 처리. 선행 BOM 제거. 완전 빈 행 무시. */
export function parseCsv(text: string): string[][] {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
