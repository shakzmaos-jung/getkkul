'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotifier } from '@/lib/notify/create-notifier';
import {
  generateOtp,
  hashOtp,
  isValidEmail,
  isOtpCooldownActive,
  nextOtpAttemptState,
  OTP_TTL_MS,
} from '@/lib/delivery/otp';

export type EmailState = {
  ok?: boolean;
  error?: string;
  step: 'request' | 'verify';
};

async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * 수신 이메일 변경 흐름 디스패처 (SSR 확장 기능). intent: request | verify | cancel.
 * step 을 반환값으로 실어 클라이언트가 useEffect 없이 단계를 렌더한다.
 * delivery_email/otp 는 service_role(admin)로만 write.
 */
export async function manageDeliveryEmail(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const intent = String(formData.get('intent') ?? 'request');
  if (intent === 'cancel') return { step: 'request' };

  const user = await requireUser();
  const admin = createAdminClient();

  if (intent === 'verify') {
    const code = String(formData.get('code') ?? '').trim();
    const { data: s } = await admin
      .from('user_settings')
      .select('pending_email, otp_hash, otp_expires_at, otp_attempts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!s?.pending_email || !s.otp_hash || !s.otp_expires_at) {
      return { error: '진행 중인 인증이 없습니다.', step: 'request' };
    }
    if (new Date(s.otp_expires_at).getTime() < Date.now()) {
      return { error: '인증 코드가 만료되었습니다. 다시 요청해 주세요.', step: 'request' };
    }
    if (hashOtp(code) !== s.otp_hash) {
      // 시도 상한(8a): 초과 시 pending 을 무효화해 6자리 코드 브루트포스를 차단한다.
      const { attempts, exhausted } = nextOtpAttemptState(s.otp_attempts ?? 0);
      if (exhausted) {
        await admin
          .from('user_settings')
          .update({ pending_email: null, otp_hash: null, otp_expires_at: null, otp_attempts: 0 })
          .eq('user_id', user.id);
        return { error: '인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.', step: 'request' };
      }
      await admin.from('user_settings').update({ otp_attempts: attempts }).eq('user_id', user.id);
      return { error: '인증 코드가 올바르지 않습니다.', step: 'verify' };
    }

    const { error } = await admin
      .from('user_settings')
      .update({
        delivery_email: s.pending_email,
        pending_email: null,
        otp_hash: null,
        otp_expires_at: null,
        otp_attempts: 0,
      })
      .eq('user_id', user.id);
    if (error) return { error: '저장에 실패했습니다.', step: 'verify' };

    revalidatePath('/settings');
    return { ok: true, step: 'request' };
  }

  // intent === 'request'
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!isValidEmail(email)) {
    return { error: '올바른 이메일 형식이 아닙니다.', step: 'request' };
  }

  // 재요청 쿨다운(8b): 직전 요청이 60초 이내면 차단 → 임의 주소로의 인증메일 폭탄 방지.
  const { data: prev } = await admin
    .from('user_settings')
    .select('otp_requested_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (isOtpCooldownActive(prev?.otp_requested_at, Date.now())) {
    return { error: '잠시 후 다시 시도해 주세요. 인증 메일은 1분에 한 번 보낼 수 있어요.', step: 'request' };
  }

  const code = generateOtp();
  // otp_requested_at 을 발송 전에 기록 → 발송 실패로 반복 호출해도 쿨다운이 걸린다.
  const { error } = await admin
    .from('user_settings')
    .update({
      pending_email: email,
      otp_hash: hashOtp(code),
      otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otp_requested_at: new Date().toISOString(),
      otp_attempts: 0,
    })
    .eq('user_id', user.id);
  if (error) return { error: '요청 저장에 실패했습니다.', step: 'request' };

  try {
    await createNotifier().send(
      { email },
      {
        subject: '겠꿀 수신 이메일 인증 코드',
        text: `겠꿀 수신 이메일 인증 코드: ${code}\n10분 내에 입력해 주세요.`,
        html: `<div style="font-family:sans-serif"><p>겠꿀 수신 이메일 인증 코드</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p style="color:#6b7280">10분 내에 입력해 주세요.</p></div>`,
      },
    );
  } catch {
    return { error: '인증 메일 발송에 실패했습니다. 이메일 주소를 확인해 주세요.', step: 'request' };
  }

  return { step: 'verify' };
}

/** 수신 이메일을 구글 계정 기본값으로 되돌린다. */
export async function resetDeliveryEmail(): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();
  await admin
    .from('user_settings')
    .update({
      delivery_email: null,
      pending_email: null,
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
    })
    .eq('user_id', user.id);
  revalidatePath('/settings');
}
