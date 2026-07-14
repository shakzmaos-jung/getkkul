import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SubscriptionRowActions from './SubscriptionRowActions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/app/subscriptions/actions', () => ({
  removeSubscription: vi.fn(),
  setSubscriptionPause: vi.fn(),
}));
vi.mock('@/components/ui/ToastProvider', () => ({ useToast: () => vi.fn() }));

afterEach(cleanup);

describe('SubscriptionRowActions (구독 행 액션)', () => {
  it('정지된 채널(멤버십 자동정지 포함)은 [정지해제] 버튼을 노출한다 — 수동 해제 정책', () => {
    // 자동정지 여부(pause_reason)와 무관하게 버튼을 노출한다. 한도 초과 해제는 서버가 차단.
    render(<SubscriptionRowActions id="s1" paused title="채널" />);
    const btn = screen.getByTestId('toggle-pause-subscription');
    expect(btn.textContent).toContain('정지해제');
  });

  it('수신중 채널은 [일시정지] 버튼을 노출한다', () => {
    render(<SubscriptionRowActions id="s2" paused={false} title="채널" />);
    const btn = screen.getByTestId('toggle-pause-subscription');
    expect(btn.textContent).toContain('일시정지');
  });
});
