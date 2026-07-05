# ADR 0006 — 영상별·계정 단위 요약 길이 선택 저장

- 상태: 채택 (2026-07-05)
- 맥락: 다이제스트 카드마다 요약 길이(짧게/보통/길게)를 선택할 수 있어야 하고, 사용자가 특정 영상에서 바꾼 선택은 최신값으로 유지되어야 한다. default 는 `user_settings.summary_length`.

## 결정

- 신규 테이블 `public.user_video_prefs(user_id, video_id, length_mode, updated_at)` 추가. PK=(user_id, video_id), FK cascade(auth.users, videos), RLS `user_id = auth.uid()`.
- 저장 범위는 **영상별·계정 단위**(사용자 승인). 브라우저 localStorage 대안은 기기 간 미동기화로 배제. 전역 단일값 갱신 대안은 영상별 구분 불가로 배제.
- 요약은 3개 모드를 파이프라인이 미리 생성(ADR 관련 없음, 기존 `summarizePending` all-modes)하므로 카드 전환이 즉시 반영된다.
- default 우선순위: `user_video_prefs`(영상 기록) → `user_settings.summary_length`(전역) → 존재하는 아무 모드.

## 영향

- 스키마 변경(에스컬레이션 대상)이나 사용자 승인으로 진행. RLS 로 타 사용자 접근 차단.
- 발송(이메일) 다이제스트는 여전히 전역 `summary_length` 사용(영상별 override 는 웹 열람 전용).
