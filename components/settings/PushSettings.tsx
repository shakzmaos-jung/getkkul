'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  subscribePush,
  unsubscribePush,
  updatePushSlots,
  type SettingsState,
} from '@/app/settings/actions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { useToast } from '@/components/ui/ToastProvider';
import { detectOS, isStandaloneNow, canSubscribePush, type OS } from '@/lib/pwa/platform';
import { subscribeToPush, getExistingSubscription, unsubscribeFromPush } from '@/lib/pwa/push-client';
import { InstallIcon } from '@/components/pwa/InstallIcon';

const initial: SettingsState = {};

interface Props {
  vapidPublicKey: string;
  pushSlots: { s0730: boolean; s1130: boolean; s1730: boolean };
}

/** 푸시 구독 켜기/끄기 + 슬롯별 발송(멀티, 카드 선택 즉시 저장). */
export default function PushSettings({ vapidPublicKey, pushSlots }: Props) {
  const showToast = useToast();
  const [ready, setReady] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [env, setEnv] = useState<{ os: OS; standalone: boolean; supported: boolean }>({
    os: 'other',
    standalone: false,
    supported: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [, slotAction] = useActionState(async (prev: SettingsState, fd: FormData) => {
    const r = await updatePushSlots(prev, fd);
    showToast(r.ok ? '저장 완료되었습니다' : (r.error ?? '저장에 실패했습니다'));
    setSavingKey(null);
    return r;
  }, initial);

  useEffect(() => {
    const detected = {
      os: detectOS(navigator.userAgent),
      standalone: isStandaloneNow(),
      supported: 'serviceWorker' in navigator && 'PushManager' in window,
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 브라우저 환경 감지
    setEnv(detected);
    getExistingSubscription()
      .then((s) => setSubscribed(!!s))
      .finally(() => setReady(true));
  }, []);

  async function enable() {
    setBusy(true);
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setErr('알림 권한이 거부되었습니다. 브라우저/OS 설정에서 허용해 주세요.');
        return;
      }
      const keys = await subscribeToPush(vapidPublicKey);
      const r = await subscribePush(keys, navigator.userAgent);
      if (r.error) {
        setErr(r.error);
        return;
      }
      setSubscribed(true);
      showToast('푸시 알림이 켜졌습니다');
    } catch {
      setErr('푸시 구독에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setErr(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await unsubscribePush(endpoint);
      setSubscribed(false);
      showToast('푸시 알림이 꺼졌습니다');
    } catch {
      setErr('푸시 해제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const canPush = env.supported && canSubscribePush(env.os, env.standalone);
  const slots = [
    ['push_0730', '07:30', pushSlots.s0730],
    ['push_1130', '11:30', pushSlots.s1130],
    ['push_1730', '17:30', pushSlots.s1730],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* 구독 켜기/끄기 */}
      <div>
        {!ready ? (
          <p className="text-xs text-muted-foreground">확인 중…</p>
        ) : env.os === 'ios' && !env.standalone ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            iPhone/iPad는 먼저 <b className="text-foreground">홈 화면에 추가</b>(상단{' '}
            <InstallIcon size={13} className="inline-block align-text-bottom text-foreground" /> →
            iPhone 안내)한 뒤, 홈 화면 아이콘으로 열면 푸시를 켤 수 있어요.
          </p>
        ) : !canPush ? (
          <p className="text-xs text-muted-foreground">이 브라우저는 웹 푸시를 지원하지 않습니다.</p>
        ) : subscribed ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">
              푸시 알림 <b className="text-accent">켜짐</b>
            </span>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={disable}>
              {busy ? '처리 중…' : '끄기'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={enable}
            data-testid="enable-push"
          >
            {busy ? '처리 중…' : '푸시 알림 켜기'}
          </Button>
        )}
        {err && <p className="mt-2 text-xs text-danger">{err}</p>}
      </div>

      {/* 슬롯별 푸시(멀티) — 구독 없으면 비활성(AC-D1.3) */}
      <form action={slotAction} className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">받을 시각(푸시)</p>
        <div className="grid grid-cols-3 gap-2">
          {slots.map(([name, label, checked]) => (
            <label
              key={name}
              className={`relative flex items-center justify-center rounded-lg border border-border p-3 ${
                subscribed
                  ? 'cursor-pointer transition-colors hover:border-foreground/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <input
                type="checkbox"
                name={name}
                defaultChecked={checked}
                disabled={!subscribed}
                onChange={(e) => {
                  setSavingKey(name);
                  e.currentTarget.form?.requestSubmit();
                }}
                data-testid={`slot-${name}`}
                className="peer sr-only"
              />
              <span className="text-sm font-medium">{label}</span>
              {/* 저장 중엔 스피너, 완료되면 체크(peer-checked). 택일 렌더로 겹침 방지. */}
              {savingKey === name ? (
                <Spinner className="absolute right-1.5 top-1.5 text-muted-foreground" />
              ) : (
                <CheckIcon className="pointer-events-none absolute right-1.5 top-1.5 text-accent opacity-0 transition-opacity peer-checked:opacity-100" />
              )}
            </label>
          ))}
        </div>
      </form>
    </div>
  );
}
