'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { planBadgeText } from '@/lib/membership/plan-badge';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'shrink-0',
  };
}
const SettingsIcon = () => (
  <svg {...iconProps()}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const AboutIcon = () => (
  <svg {...iconProps()}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
const DeveloperIcon = () => (
  <svg {...iconProps()}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </svg>
);
const LicenseIcon = () => (
  <svg {...iconProps()}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </svg>
);
const MoonIcon = () => (
  <svg {...iconProps()}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const ChevronRight = () => (
  <svg {...iconProps()} className="shrink-0 text-muted-foreground">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const CloseIcon = () => (
  <svg {...iconProps()} width={20} height={20}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// "메뉴" 그룹 — 네 항목 모두 동일한 이동 패턴(아이콘 + 라벨 + chevron, AC-B1.1/D1.5).
const MENU_ITEMS = [
  { href: '/settings', label: '설정', Icon: SettingsIcon, testid: 'menu-settings' },
  { href: '/about', label: '서비스 소개', Icon: AboutIcon, testid: 'menu-about' },
  { href: '/developer', label: '개발자 정보', Icon: DeveloperIcon, testid: 'menu-developer' },
  { href: '/licenses', label: '오픈소스 라이선스', Icon: LicenseIcon, testid: 'menu-licenses' },
];

const NAV_ROW =
  'flex min-h-[44px] w-full items-center justify-between px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted';

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{children}</div>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Profile {
  name: string;
  email: string;
  avatarUrl: string | null;
  badge: string;
}

/**
 * 우측 슬라이드 인 사이드 메뉴(재설계, ADR-0011). 위→아래:
 * 프로필 카드(→/account, 로그아웃·계정삭제는 계정 화면 내) → "메뉴" 그룹(설정·서비스소개·개발자정보·라이선스,
 * 전부 이동) → "화면" 그룹(다크토글) → 메타 푸터(버전·카피라이트). 아코디언 폐지(상호작용 유형 통일).
 * 오버레이 탭 / ESC / 우측 스와이프로 닫힘. 열림 시 포커스 트랩. transform 200ms 슬라이드.
 */
export default function SideMenu({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // ESC 닫기 + 포커스 트랩(Tab 순환) + 열림 시 첫 요소 포커스 — 보존(AC-H1.1).
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

  // 첫 열림 시 프로필(이름·이메일·아바타·플랜 배지) 1회 로드. 실패해도 조용히 무시(폴백 렌더).
  useEffect(() => {
    if (!open || profile) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const u = session?.user;
        if (!u || cancelled) return;
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const name =
          (meta.full_name as string) ?? (meta.name as string) ?? u.email?.split('@')[0] ?? '사용자';
        const { data: m } = await supabase
          .from('membership')
          .select('plan_code, status, poc_free_until')
          .eq('user_id', u.id)
          .maybeSingle();
        if (cancelled) return;
        setProfile({
          name,
          email: u.email ?? '',
          avatarUrl: (meta.avatar_url as string) ?? null,
          badge: planBadgeText(m ?? null),
        });
      } catch {
        /* 세션/네트워크 실패 → 폴백 렌더 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, profile]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    if (e.touches[0].clientX - touchStartX.current > 60) {
      touchStartX.current = null;
      onClose();
    }
  }

  return (
    <>
      {/* dim 오버레이 */}
      <div
        onClick={onClose}
        aria-hidden
        data-testid="menu-overlay"
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* 패널 — 항상 마운트, translate-x 슬라이드(200ms, 블러 없음, AC-H1.2) */}
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

        <div className="flex flex-1 flex-col gap-5 p-4">
          {/* 프로필 카드 (→ /account) */}
          <Link
            href="/account"
            onClick={onClose}
            data-testid="menu-profile"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
          >
            <UserAvatar name={profile?.name ?? '?'} src={profile?.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {profile?.name ?? '내 계정'}
              </div>
              {profile?.email && (
                <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
              )}
              <span className="mt-1 inline-block rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                {profile?.badge ?? '무료'}
              </span>
            </div>
            <ChevronRight />
          </Link>

          {/* "메뉴" 그룹 — 4항목 동일 이동 패턴 */}
          <section>
            <GroupLabel>메뉴</GroupLabel>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {MENU_ITEMS.map(({ href, label, Icon, testid }) => (
                <Link key={href} href={href} onClick={onClose} data-testid={testid} className={NAV_ROW}>
                  <span className="flex items-center gap-2.5">
                    <Icon />
                    {label}
                  </span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          </section>

          {/* "화면" 그룹 — 다크모드 인라인 토글 */}
          <section>
            <GroupLabel>화면</GroupLabel>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className={NAV_ROW}>
                <span className="flex items-center gap-2.5">
                  <MoonIcon />
                  다크 모드
                </span>
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* 메타 푸터 — 버전(package.json 주입) + 카피라이트 */}
          <div className="mt-auto pt-2 text-center text-xs text-muted-foreground">
            <div data-testid="menu-version">getkkul v{APP_VERSION}</div>
            <div className="mt-1">© 2026 getkkul · Made in Seoul</div>
          </div>
        </div>
      </aside>
    </>
  );
}
