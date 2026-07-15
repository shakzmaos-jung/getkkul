import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DislikeFeedbackModal from './DislikeFeedbackModal';

afterEach(cleanup);

describe('DislikeFeedbackModal (싫어요 사유 모달)', () => {
  it('open=false 면 렌더하지 않는다', () => {
    render(<DislikeFeedbackModal open={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('dislike-reason-input')).toBeNull();
  });

  it('타이틀·부제·카운터(0/200) 표시, 보내기는 빈 입력에도 활성', () => {
    render(<DislikeFeedbackModal open onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('어떤 점이 아쉬우셨나요?')).toBeTruthy();
    expect(screen.getByText(/더 좋은 요약과 서비스로 보답/)).toBeTruthy();
    expect(screen.getByText('0/200')).toBeTruthy();
    const submit = screen.getByTestId('dislike-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false); // 텍스트 입력 없이 제출 가능(요청)
  });

  it('입력 시 카운터 갱신 + 보내기 → onSubmit(사유 trim)', () => {
    const onSubmit = vi.fn();
    render(<DislikeFeedbackModal open onSubmit={onSubmit} onClose={vi.fn()} />);
    const input = screen.getByTestId('dislike-reason-input');
    fireEvent.change(input, { target: { value: '  bad summary  ' } });
    expect(screen.getByText('15/200')).toBeTruthy(); // 공백 포함 원문 길이
    fireEvent.click(screen.getByTestId('dislike-submit'));
    expect(onSubmit).toHaveBeenCalledWith('bad summary'); // 양끝 공백 제거
  });

  it('빈 입력으로 보내기 → onSubmit("")', () => {
    const onSubmit = vi.fn();
    render(<DislikeFeedbackModal open onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('dislike-submit'));
    expect(onSubmit).toHaveBeenCalledWith('');
  });

  it('닫기 → onClose(취소), onSubmit 미호출', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<DislikeFeedbackModal open onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('dislike-close'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('200자 초과 입력은 잘린다', () => {
    render(<DislikeFeedbackModal open onSubmit={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByTestId('dislike-reason-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'a'.repeat(250) } });
    expect(input.value.length).toBe(200);
    expect(screen.getByText('200/200')).toBeTruthy();
  });
});
