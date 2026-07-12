'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { detectOS, isStandaloneNow, type OS } from '@/lib/pwa/platform';
import { InstallIcon } from '@/components/pwa/InstallIcon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 상단 "앱 설치" 진입점 + OS 선택 다이얼로그(REQ-B). standalone 이면 숨김. */
export default function InstallButton() {
  const [env, setEnv] = useState<{ standalone: boolean; os: OS }>({
    standalone: false,
    os: 'other',
  });
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 브라우저 환경 감지(SSR 후 클라이언트 전용)
    setEnv({ standalone: isStandaloneNow(), os: detectOS(navigator.userAgent) });
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (env.standalone) return null; // 이미 설치됨(AC-B1.2)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="install-app"
        aria-label="앱 설치"
        title="앱 설치"
        className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <InstallIcon size={18} />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <InstallDialog os={env.os} deferred={deferred} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

function InstallDialog({
  os,
  deferred,
  onClose,
}: {
  os: OS;
  deferred: BeforeInstallPromptEvent | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'android' | 'ios'>(os === 'ios' ? 'ios' : 'android');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function androidInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="앱 설치"
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">겟꿀 앱 설치</h2>
        <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
          {(['android', 'ios'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-testid={`install-tab-${t}`}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t === 'android' ? 'Android' : 'iPhone/iPad'}
              {os === t && ' ·'}
            </button>
          ))}
        </div>

        <div className="mt-4 text-sm">
          {tab === 'android' ? (
            deferred ? (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground">
                  아래 버튼을 누르면 앱이 홈 화면(바탕화면)에 설치됩니다.
                </p>
                <button
                  type="button"
                  onClick={androidInstall}
                  data-testid="android-install"
                  className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  다운로드하기
                </button>
              </div>
            ) : (
              <p className="leading-relaxed text-muted-foreground">
                브라우저 메뉴(⋮)에서 <b className="text-foreground">앱 설치</b> 또는{' '}
                <b className="text-foreground">홈 화면에 추가</b>를 선택하세요.
              </p>
            )
          ) : (
            <ol className="flex flex-col gap-2 text-muted-foreground">
              <li>
                1. 하단(사파리)의 <b className="text-foreground">공유 버튼</b>{' '}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block align-text-bottom text-foreground"
                  aria-hidden
                >
                  <path d="M12 3v12" />
                  <path d="m8 7 4-4 4 4" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>{' '}
                을 누릅니다.
              </li>
              <li>
                2. 메뉴에서 <b className="text-foreground">홈 화면에 추가</b>를 선택합니다.
              </li>
              <li>
                3. <b className="text-foreground">추가</b>를 누르면 설치 완료. 홈 화면 아이콘으로
                열면 푸시 알림도 켤 수 있어요.
              </li>
            </ol>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-muted"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
