import { describe, it, expect } from 'vitest';
import { parseChannelInput } from './parse-channel-input';

describe('parseChannelInput (REQ-B1)', () => {
  it('원시 채널 id 를 인식한다', () => {
    expect(parseChannelInput('UCX6OQ3DkcsbYNE6H8uQQuVA')).toEqual({
      kind: 'id',
      channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
    });
  });

  it('/channel/UC... URL 에서 id 를 뽑는다', () => {
    expect(
      parseChannelInput('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA'),
    ).toEqual({ kind: 'id', channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA' });
  });

  it('@handle (맨 토큰 / URL) 을 핸들로 인식한다', () => {
    expect(parseChannelInput('@mrbeast')).toEqual({ kind: 'handle', handle: 'mrbeast' });
    expect(parseChannelInput('https://youtube.com/@mrbeast')).toEqual({
      kind: 'handle',
      handle: 'mrbeast',
    });
    expect(parseChannelInput('mrbeast')).toEqual({ kind: 'handle', handle: 'mrbeast' });
  });

  it('프로토콜 없는 URL 도 처리한다', () => {
    expect(parseChannelInput('www.youtube.com/@mrbeast')).toEqual({
      kind: 'handle',
      handle: 'mrbeast',
    });
  });

  it('레거시 /user, /c 를 각각 분류한다', () => {
    expect(parseChannelInput('https://www.youtube.com/user/PewDiePie')).toEqual({
      kind: 'username',
      username: 'PewDiePie',
    });
    expect(parseChannelInput('https://www.youtube.com/c/LinusTechTips')).toEqual({
      kind: 'custom',
      custom: 'LinusTechTips',
    });
  });

  // AC-B1.4: 개별 영상 URL·재생목록 거부
  it('개별 영상 URL 을 거부한다', () => {
    expect(parseChannelInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ').kind).toBe('reject');
    expect(parseChannelInput('https://youtu.be/dQw4w9WgXcQ').kind).toBe('reject');
    expect(parseChannelInput('https://www.youtube.com/shorts/abc123').kind).toBe('reject');
  });

  it('재생목록을 거부한다', () => {
    const r = parseChannelInput('https://www.youtube.com/playlist?list=PL1234567890');
    expect(r).toEqual({ kind: 'reject', reason: 'playlist' });
    // 채널 URL 이어도 list= 파라미터가 있으면 재생목록으로 거부
    expect(parseChannelInput('https://www.youtube.com/@x?list=PLabc')).toEqual({
      kind: 'reject',
      reason: 'playlist',
    });
  });

  it('빈 입력·유튜브 외 도메인·이상값을 거부한다', () => {
    expect(parseChannelInput('   ')).toEqual({ kind: 'reject', reason: 'empty' });
    expect(parseChannelInput('https://vimeo.com/channel/abc').kind).toBe('reject');
    expect(parseChannelInput('@ab')).toEqual({ kind: 'reject', reason: 'invalid' }); // 너무 짧음
  });
});
