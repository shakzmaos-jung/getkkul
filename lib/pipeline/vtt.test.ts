import { describe, it, expect } from 'vitest';
import { vttToText } from './vtt';

describe('vttToText (C2 자막 정제)', () => {
  it('헤더·타임스탬프·큐번호를 제거하고 본문만 남긴다', () => {
    const vtt = `WEBVTT
Kind: captions
Language: ko

1
00:00:00.000 --> 00:00:02.000
안녕하세요

2
00:00:02.000 --> 00:00:04.000 align:start position:0%
반갑습니다`;
    expect(vttToText(vtt)).toBe('안녕하세요\n반갑습니다');
  });

  it('인라인 타임스탬프/태그를 제거한다', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
<00:00:00.500><c>오늘은</c> <00:00:01.000><c>주식</c> 이야기`;
    expect(vttToText(vtt)).toBe('오늘은 주식 이야기');
  });

  it('롤링 자동자막의 연속 중복 줄을 합친다', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:01.000
첫 문장

00:00:01.000 --> 00:00:02.000
첫 문장

00:00:02.000 --> 00:00:03.000
둘째 문장`;
    expect(vttToText(vtt)).toBe('첫 문장\n둘째 문장');
  });

  it('HTML 엔티티를 디코드한다', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
&gt;&gt; 안녕 &amp; 반가워 &#39;오늘&#39;`;
    expect(vttToText(vtt)).toBe(">> 안녕 & 반가워 '오늘'");
  });

  it('빈 자막은 빈 문자열', () => {
    expect(vttToText('WEBVTT\n\n')).toBe('');
  });
});
