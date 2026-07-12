'use client';

import { useEffect } from 'react';

/** /sw.js 서비스워커 등록(PWA 설치·푸시 전제). 실패는 무시(비지원 환경). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
