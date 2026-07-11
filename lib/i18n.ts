/**
 * 표시 문구 단일 소스(i18n). 하드코딩 금지 — 문구는 messages/ko.json 에서 관리하고
 * 컴포넌트는 이 객체를 통해 참조한다. 현재 한국어 단일 로케일.
 */
import ko from '@/messages/ko.json';

export const messages = ko;
export type Messages = typeof ko;
