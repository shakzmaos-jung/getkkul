import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import AccountActions from '@/components/account/AccountActions';
import { planBadgeText } from '@/lib/membership/plan-badge';

export const metadata = { title: '계정' };

/** 계정 화면 — 사이드 메뉴 프로필 카드 진입(AC-C1.3). 프로필 + 로그아웃 + 계정 삭제. */
export default async function AccountPage() {
  const supabase = await createClient();
  // proxy 가 세션을 검증했으므로 getSession(네트워크 없음)으로 사용자 정보만 읽는다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.full_name as string) ?? (meta.name as string) ?? user.email?.split('@')[0] ?? '사용자';
  const avatarUrl = (meta.avatar_url as string) ?? null;

  const { data: m } = await supabase
    .from('membership')
    .select('plan_code, status, poc_free_until')
    .eq('user_id', user.id)
    .maybeSingle();
  const badge = planBadgeText(m ?? null);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Card className="flex items-center gap-3 p-5">
          <UserAvatar name={name} src={avatarUrl} size={48} />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            <span className="mt-1.5 inline-block rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              {badge}
            </span>
          </div>
        </Card>

        <div className="mt-6">
          <AccountActions />
        </div>
      </main>
    </div>
  );
}
