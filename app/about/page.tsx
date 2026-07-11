import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';

export const metadata = { title: '서비스 소개' };

/** 서비스 소개 화면 — 사이드 메뉴 '서비스 소개' 진입(아코디언 아님, AC-D1.2). */
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🍯</span>
          <h2 className="text-lg font-semibold tracking-tight">겟꿀</h2>
        </div>
        <p className="mt-1 text-sm text-foreground/80">구독한 콘텐츠의 핵심만</p>

        <Card className="mt-4 flex flex-col gap-3 p-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            관심 있는 유튜브 채널을 대신 감시해, 새 영상이 올라오면 핵심을 요약해 드립니다. 하루 네 번(아침
            07:30 · 점심 11:30 · 저녁 17:30 · 밤 21:30) 정시에 이메일과 앱 푸시로 밀어드려요.
          </p>
          <p>
            긴 영상을 처음부터 끝까지 보지 않아도, 짧게 · 보통 · 길게 원하는 분량으로 핵심만 빠르게 확인할 수
            있습니다.
          </p>
          <p>겟꿀은 당신의 소중한 시간을 아껴, 정말 볼 가치가 있는 콘텐츠에 집중하도록 돕습니다.</p>
        </Card>
      </main>
    </div>
  );
}
