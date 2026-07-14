import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { ProfileAvatar } from '@/components/settings/ProfileAvatar';
import { messages } from '@/lib/i18n';

const REPO_URL = 'https://github.com/shakzmaos-jung/getkkul';
// 프로필 이미지 경로(교체 용이). public/profile.png 를 추가하면 자동 표시, 없으면 '정' 이니셜 폴백.
const PROFILE_IMAGE_SRC = '/profile.png';

const d = messages.developer;

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
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

/** 개발자 정보 화면 — 사이드 메뉴 '개발자 정보' 진입. 문구는 i18n(messages.developer). */
export default function DeveloperPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-5">
          {/* 프로필 이미지(플레이스홀더) + 이름 */}
          <div className="flex flex-col items-center text-center">
            <ProfileAvatar src={PROFILE_IMAGE_SRC} initial="정" alt={d.profileAlt} size={104} />
            <p className="mt-3 text-xs text-muted-foreground">{d.madeByLabel}</p>
            <div className="text-lg font-semibold tracking-tight">{d.name}</div>
          </div>

          {/* 소개 */}
          <p className="mt-4 text-sm font-medium leading-relaxed text-foreground/85">{d.role}</p>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            {d.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* 연락처 */}
          <div className="mt-5 flex flex-col gap-1 border-t border-border pt-4">
            <a href={`mailto:${d.links.email}`} className={LINK}>
              <MailIcon />
              {d.links.email}
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
              <GithubIcon />
              {d.links.github}
            </a>
          </div>
        </Card>
      </main>
    </div>
  );
}
