/** 브라우저 푸시 구독 헬퍼(클라이언트 전용). 순수 변환 함수는 테스트 대상. */

export interface PushKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** VAPID base64url 공개키 → Uint8Array(applicationServerKey). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** SW 준비 후 푸시 구독 생성. 구독 정보(endpoint/keys) 반환(호출부가 서버 저장). */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushKeys> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint as string,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  };
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** 현재 구독 해제. 해제한 endpoint 반환(서버에서 삭제용), 없으면 null. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getExistingSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
