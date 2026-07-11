import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';

const REPO_URL = 'https://github.com/shakzmaos-jung/getkkul';
const REMEMBER_URL = 'https://link.rmbr.in/79cmk2';

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

// 리멤버 프로필(명함) 링크 — 기존 RememberLogo TODO 플레이스홀더를 깔끔한 명함 아이콘으로 교체.
function ProfileCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M6 16c0-1.1 1.3-2 2-2s2 .9 2 2M14 10h4M14 14h3" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.79 24 12.5 24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

export const metadata = { title: '개발자 정보' };

const LINK =
  'inline-flex min-h-[40px] w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground';

/** 개발자 정보 화면 — 사이드 메뉴 '개발자 정보' 진입(아코디언 아님, AC-D1.3). */
export default function DeveloperPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-5">
          <div className="text-base font-semibold tracking-tight">정상화</div>
          <p className="mt-0.5 text-sm text-muted-foreground">프로덕트 빌더 with AI</p>

          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
            <a href="mailto:shakzmaos@gmail.com" className={LINK}>
              <MailIcon />
              shakzmaos@gmail.com
            </a>
            <a href={REMEMBER_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
              <ProfileCardIcon />
              리멤버 프로필
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
              <GithubIcon />
              GitHub 레포지터리
            </a>
          </div>
        </Card>
      </main>
    </div>
  );
}
