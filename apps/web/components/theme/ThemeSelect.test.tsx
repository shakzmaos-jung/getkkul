import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ThemeSelect from './ThemeSelect';
import { ThemeProvider } from './ThemeProvider';

const { save } = vi.hoisted(() => ({ save: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/theme/actions', () => ({ saveThemePreference: save }));

afterEach(() => {
  cleanup();
  save.mockClear();
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
  document.documentElement.removeAttribute('data-theme');
});

function renderSelect(initial: 'system' | 'light' | 'dark' | 'paper' | 'grayscale' | 'nightshift' | null = null) {
  return render(
    <ThemeProvider initialPreference={initial}>
      <ThemeSelect />
    </ThemeProvider>,
  );
}

describe('ThemeSelect — 테마 선택 UI', () => {
  it('system + 5종 옵션을 모두 렌더한다', () => {
    renderSelect();
    for (const id of ['system', 'light', 'dark', 'paper', 'grayscale', 'nightshift']) {
      expect(screen.getByTestId(`theme-${id}`)).toBeTruthy();
    }
  });

  it('선택 시 data-theme 적용 + localStorage 저장 + DB 저장 호출 + aria-checked', () => {
    renderSelect(null);
    fireEvent.click(screen.getByTestId('theme-paper'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('paper');
    expect(localStorage.getItem('theme')).toBe('paper');
    expect(save).toHaveBeenCalledWith('paper');
    expect(screen.getByTestId('theme-paper').getAttribute('aria-checked')).toBe('true');
  });

  it('system 선택 시 OS 밝기로 해석(matchMedia stub=light → data-theme=light, 저장은 system)', () => {
    renderSelect('dark');
    fireEvent.click(screen.getByTestId('theme-system'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('system');
    expect(save).toHaveBeenCalledWith('system');
  });
});
