import { describe, it, expect } from 'vitest';
import { validateQuestion, buildMessages, MAX_QUESTION_LEN } from './answer';

describe('validateQuestion (질문 유효성)', () => {
  it('빈 질문은 거부', () => {
    expect(validateQuestion('   ').ok).toBe(false);
  });
  it('200자 이내는 허용', () => {
    expect(validateQuestion('a'.repeat(MAX_QUESTION_LEN)).ok).toBe(true);
  });
  it('200자 초과는 거부', () => {
    const r = validateQuestion('a'.repeat(MAX_QUESTION_LEN + 1));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('200');
  });
});

describe('buildMessages', () => {
  it('맥락과 질문을 메시지에 담는다', () => {
    const msgs = buildMessages('제목', '맥락내용', '질문내용');
    expect(msgs[0].role).toBe('system');
    expect(String(msgs[1].content)).toContain('맥락내용');
    expect(String(msgs[1].content)).toContain('질문내용');
    expect(String(msgs[1].content)).toContain('제목');
  });
});
