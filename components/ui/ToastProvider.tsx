'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ToastCtx = createContext<(message: string) => void>(() => {});

/** 하단에서 튀어오르는 토스트(2.5초). 어디서나 useToast()로 호출. */
export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  const showToast = useCallback((message: string) => {
    setMsg(message);
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
              show ? 'translate-y-0' : 'translate-y-full'
            }`}
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
