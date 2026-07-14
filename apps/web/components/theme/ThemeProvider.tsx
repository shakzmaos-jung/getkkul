'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  resolveApplied,
  isThemePreference,
  DEFAULT_PREFERENCE,
  type ThemePreference,
} from '@/lib/theme/resolve';
import { saveThemePreference } from '@/lib/theme/actions';

const STORAGE_KEY = 'theme';

interface ThemeCtx {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme 는 ThemeProvider 안에서만 사용');
  return c;
}

function apply(pref: ThemePreference) {
  const prefersDark =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  document.documentElement.setAttribute('data-theme', resolveApplied(pref, prefersDark));
}

/**
 * 테마 상태·적용·지속. 선호는 localStorage(무깜빡임 캐시) + DB(user_settings.theme, 기기 간 유지)에 저장.
 * 초기 선호 우선순위: SSR 주입(DB, 로그인 시) > localStorage > 'system'. 부트스트랩 스크립트(layout)와 동일 규칙.
 * 'system' 이면 OS 밝기 변화에 실시간 추종. data-theme 는 부트스트랩이 먼저 세팅하므로 재적용해도 깜빡임 없음.
 */
export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference | null;
  children: React.ReactNode;
}) {
  const [preference, setPref] = useState<ThemePreference>(initialPreference ?? DEFAULT_PREFERENCE);

  // 마운트: SSR 값 없으면 localStorage 로 보정, data-theme 재적용 + localStorage 동기화.
  useEffect(() => {
    let pref = initialPreference;
    if (pref == null) {
      try {
        const ls = localStorage.getItem(STORAGE_KEY);
        if (isThemePreference(ls)) pref = ls;
      } catch {
        /* noop */
      }
    }
    const resolved = pref ?? DEFAULT_PREFERENCE;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (resolved !== preference) setPref(resolved);
    apply(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // system: OS 밝기 변화 추종.
  useEffect(() => {
    if (preference !== 'system') return;
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  function setPreference(p: ThemePreference) {
    setPref(p);
    apply(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* noop */
    }
    // DB 동기화(로그인 시). 실패는 무시 — localStorage 로 이 기기에선 유지됨.
    void saveThemePreference(p).catch(() => {});
  }

  return <Ctx.Provider value={{ preference, setPreference }}>{children}</Ctx.Provider>;
}
