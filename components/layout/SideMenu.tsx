'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';

const REPO_URL = 'https://github.com/shakzmaos-jung/getkkul';
const REMEMBER_URL = 'https://link.rmbr.in/79cmk2';

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

// TODO: 리멤버 공식 로고(SVG/PNG)로 교체 예정 — 현재는 명함형 플레이스홀더 아이콘.
function RememberLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM8 7.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 16H4v-.75c0-1.33 2.67-2 4-2s4 .67 4 2V16zm2-1h6v-1.5h-6V15zm0-3h6v-1.5h-6V12zm0-3h6V7.5h-6V9z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.79 24 12.5 24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 우측 슬라이드 인 사이드 메뉴. 하단 GNB 와 짝을 이루는 유틸리티 허브.
 * 내용(위→아래): 서비스 소개 · 개발자 정보 · 설정 진입 · 테마 토글 · 카피라이트.
 * 오버레이 탭 / ESC / 우측 스와이프로 닫힌다. 열림 시 포커스 트랩(패널 내부 순환).
 * 애니메이션은 transform(translate-x) 기반 200ms ease-out — 블러 없이 가볍고 민첩하게.
 */
export default function SideMenu({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // ESC 닫기 + 포커스 트랩(Tab 순환) + 열림 시 첫 요소 포커스.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      );

    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    // 우측(닫는 방향)으로 60px 이상 스와이프하면 닫는다.
    if (e.touches[0].clientX - touchStartX.current > 60) {
      touchStartX.current = null;
      onClose();
    }
  }

  return (
    <>
      {/* dim 오버레이 — 열림 시 페이드 인, 탭하면 닫힘. 닫힘 시 이벤트/포커스 차단. */}
      <div
        onClick={onClose}
        aria-hidden
        data-testid="menu-overlay"
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* 패널 — 항상 마운트, translate-x 로 인/아웃 애니메이션(양방향 재생). */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        aria-hidden={!open}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className={`fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        {/* 헤더: 닫기 버튼 */}
        <div className="flex items-center justify-end border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            data-testid="menu-close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {/* (1) 서비스 소개 */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🍯</span>
              <span className="text-base font-semibold tracking-tight">겟꿀</span>
            </div>
            <p className="text-sm text-foreground/80">구독한 콘텐츠의 핵심만</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              관심 유튜브 채널을 대신 감시해 요약해드립니다
            </p>
          </section>

          {/* (2) 개발자 정보 */}
          <section className="flex flex-col gap-1.5 border-t border-border pt-5">
            <div className="text-sm font-semibold tracking-tight">정상화</div>
            <p className="text-xs text-foreground/80">프로덕트 빌더 with AI</p>
            <a
              href="mailto:shakzmaos@gmail.com"
              className="inline-flex min-h-[36px] w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <MailIcon />
              shakzmaos@gmail.com
            </a>
            <a
              href={REMEMBER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RememberLogo />
              chess.jung@ppoint.kr
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon />
              GitHub 레포지터리
            </a>
          </section>

          {/* (3) 설정 진입 */}
          <section className="border-t border-border pt-5">
            <Link
              href="/settings"
              onClick={onClose}
              data-testid="menu-settings"
              className="inline-flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-1 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <SettingsIcon />
              설정
            </Link>
          </section>

          {/* (4) 라이트/다크 모드 토글 */}
          <div className="flex min-h-[44px] items-center justify-between border-t border-border pt-5">
            <span className="text-sm font-medium text-foreground">라이트 / 다크 모드</span>
            <ThemeToggle />
          </div>

          {/* (5) 카피라이트 — 하단 고정 */}
          <p className="mt-auto pt-5 text-xs text-muted-foreground">
            © 2026 getkkul · Made in Seoul
          </p>
        </div>
      </aside>
    </>
  );
}
