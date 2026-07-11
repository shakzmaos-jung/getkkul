'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { isPublicPath } from '@/lib/supabase/route-access';

const ToastCtx = createContext<(message: string) => void>(() => {});

/** 하단에서 튀어오르는 토스트(2.5초). 어디서나 useToast()로 호출. */
export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  // 하단 GNB(높이 4.5rem + safe-area) 가 있는 화면에선 그 위로 띄워 겹치지 않게 한다.
  const hasBottomNav = !isPublicPath(pathname);

  const showToast = useCallback((message: string) => {
    setMsg(message);
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 transition-transform duration-300 ease-out ${
              hasBottomNav
                ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)]'
                : 'pb-[max(1rem,env(safe-area-inset-bottom))]'
            } ${show ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
              {msg}
            </div>
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}
