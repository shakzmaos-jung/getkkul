import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LengthModeForm from '@/components/settings/LengthModeForm';
import type { LengthMode } from '@/lib/summary/format';

/** 요약 길이 설정 (SSR REQ-D2). */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: setting } = await supabase
    .from('user_settings')
    .select('summary_length')
    .eq('user_id', user.id)
    .maybeSingle();
  const current = (setting?.summary_length ?? 'normal') as LengthMode;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">설정</h1>
        <Link href="/" className="text-sm underline">
          홈
        </Link>
      </div>
      <LengthModeForm current={current} />
    </main>
  );
}
