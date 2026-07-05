const REPO_URL = 'https://github.com/shakzmaos-jung/getkkul';

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.79 24 12.5 24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

/** 홈·각 메뉴 하단 공용 푸터. 2열 그리드(좌: 서비스 / 우: 제작자) — 헤더 행 정렬. */
export default function AppFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-6">
          {/* 좌: 서비스 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🍯</span>
              <span className="text-base font-semibold tracking-tight">겟꿀</span>
            </div>
            <p className="text-sm text-foreground/80">구독한 콘텐츠의 핵심만</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              관심 유튜브 채널을 대신 감시해 요약해드립니다
            </p>
          </div>

          {/* 우: 제작자 */}
          <div className="flex flex-col gap-1.5">
            <div className="text-base font-semibold tracking-tight">정상화</div>
            <p className="text-sm text-foreground/80">프로덕트 빌더 / Product-led. Agent-built.</p>
            <a
              href="mailto:shakzmaos@gmail.com"
              className="w-fit text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              shakzmaos@gmail.com
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon />
              GitHub 레포지터리
            </a>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">© 2026 getkkul. Made in Seoul</p>
      </div>
    </footer>
  );
}
