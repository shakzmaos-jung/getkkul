import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { messages } from '@/lib/i18n';

export const metadata = { title: '서비스 소개' };

const a = messages.about;

/** 서비스 소개 화면 — 사이드 메뉴 '서비스 소개' 진입. 문구는 i18n(messages.about). */
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {/* 브랜드 + 태그라인 */}
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🍯</span>
          <h2 className="text-lg font-semibold tracking-tight">{a.brand}</h2>
        </div>
        <p className="mt-1 text-sm text-foreground/80">{a.tagline}</p>

        {/* 한 줄 소개 */}
        <Card className="mt-4 p-5 text-sm leading-relaxed text-foreground/85">{a.oneLiner}</Card>

        {/* 왜 만들었나 */}
        <section className="mt-6">
          <h3 className="mb-2 text-base font-semibold tracking-tight">{a.whyTitle}</h3>
          <Card className="flex flex-col gap-3 p-5 text-sm leading-relaxed text-muted-foreground">
            {a.why.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Card>
        </section>

        {/* 이런 분께 잘 맞아요 */}
        <section className="mt-6">
          <h3 className="mb-2 text-base font-semibold tracking-tight">{a.fitTitle}</h3>
          <div className="flex flex-col gap-2">
            {a.fit.map((f, i) => (
              <Card key={i} className="flex items-start gap-3 p-4">
                <span className="text-xl leading-none" aria-hidden>
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 겟꿀을 잘 쓰는 법 */}
        <section className="mt-6">
          <h3 className="mb-2 text-base font-semibold tracking-tight">{a.tipsTitle}</h3>
          <Card className="p-5">
            <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
              {a.tips.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-[1px] text-accent">
                    •
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </main>
    </div>
  );
}
