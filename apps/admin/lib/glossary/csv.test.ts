import { describe, it, expect } from 'vitest';
import { toCsv, parseCsv } from './csv';

describe('csv', () => {
  it('toCsv: 쉼표·따옴표·개행 인용', () => {
    expect(toCsv([['a', 'b,c', 'd"e', 'f\ng']])).toBe('a,"b,c","d""e","f\ng"');
  });

  it('parseCsv ∘ toCsv 왕복(인용·이스케이프)', () => {
    const data = [
      ['id', '대표(한글)', 'Alias'],
      ['1', 'a,b', 'x;y'],
      ['2', 'x"y', ''],
    ];
    expect(parseCsv(toCsv(data))).toEqual(data);
  });

  it('parseCsv: BOM 제거 + 빈 행 무시', () => {
    expect(parseCsv(String.fromCharCode(0xfeff) + 'a,b\r\n\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('parseCsv: 인용 필드 내 개행 보존', () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([['a', 'line1\nline2', 'c']]);
  });
});
