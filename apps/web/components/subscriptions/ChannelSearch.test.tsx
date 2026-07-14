import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ChannelSearch from './ChannelSearch';

// vi.hoisted: mock 팩토리보다 먼저 초기화돼야 참조 가능(호출 검증용 스파이).
const { searchChannels, addSubscriptionById, toast } = vi.hoisted(() => ({
  searchChannels: vi.fn(),
  addSubscriptionById: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/subscriptions/actions', () => ({ searchChannels, addSubscriptionById }));
vi.mock('@/components/ui/ToastProvider', () => ({ useToast: () => toast }));

type Cand = {
  channelId: string;
  title: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberHint: number | null;
  subscribed: boolean;
};
function cand(over: Partial<Cand> = {}): Cand {
  return {
    channelId: 'c1',
    title: '슈카월드',
    handle: '@syuka',
    thumbnail: null,
    subscriberHint: null,
    subscribed: false,
    ...over,
  };
}

async function searchWith(candidates: Cand[]) {
  searchChannels.mockResolvedValue({ candidates, capped: false });
  render(<ChannelSearch />);
  fireEvent.change(screen.getByTestId('channel-search'), { target: { value: '슈카' } });
  fireEvent.click(screen.getByTestId('channel-search-submit'));
  await screen.findByTestId('channel-candidates');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChannelSearch (채널 검색 결과 UX)', () => {
  it('등록 성공 → "채널 등록이 완료되었습니다" 안내 + 검색 결과 목록 자동 닫힘', async () => {
    addSubscriptionById.mockResolvedValue({ ok: true, addedTitle: '슈카월드' });
    await searchWith([cand()]);
    fireEvent.click(screen.getByTestId('candidate-add'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('채널 등록이 완료되었습니다'));
    await waitFor(() => expect(screen.queryByTestId('channel-candidates')).toBeNull());
  });

  it('이미 구독 중 후보의 "구독됨" 클릭 → "이미 등록된 채널입니다" 안내(목록 유지)', async () => {
    await searchWith([cand({ subscribed: true })]);
    fireEvent.click(screen.getByTestId('candidate-subscribed'));
    expect(toast).toHaveBeenCalledWith('이미 등록된 채널입니다');
    expect(screen.getByTestId('channel-candidates')).toBeTruthy();
  });

  it('추가 시 서버가 already 반환 → "이미 등록된 채널입니다" 안내', async () => {
    addSubscriptionById.mockResolvedValue({ error: '이미 구독 중인 채널입니다: 슈카월드', already: true });
    await searchWith([cand()]);
    fireEvent.click(screen.getByTestId('candidate-add'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('이미 등록된 채널입니다'));
  });

  it('닫기 버튼 → 채널을 고르지 않아도 검색 결과 목록을 닫을 수 있다', async () => {
    await searchWith([cand()]);
    fireEvent.click(screen.getByTestId('channel-candidates-close'));
    await waitFor(() => expect(screen.queryByTestId('channel-candidates')).toBeNull());
  });
});
