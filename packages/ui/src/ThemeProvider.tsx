'use client';

// ThemeProvider — `<html data-theme>` 를 제어한다(EXECUTION-PLAN §3.1).
// 초기 테마는 서버에서 layout 의 <html data-theme={...}> 로 세팅(FOUC 방지),
// 이 클라이언트 Provider 가 이후 전환(setTheme)을 담당한다. 출시엔 linear 하나뿐이지만
// 멀티테마 전환 경로를 아키텍처로 내장한다(REQ-DS-3).
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_THEME, isThemeId, type ThemeId } from './theme/registry';

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
}) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = (id: ThemeId) => {
    if (isThemeId(id)) setThemeState(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
