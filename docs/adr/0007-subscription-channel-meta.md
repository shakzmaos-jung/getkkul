# ADR 0007 — 구독 채널 표시 메타(아바타·핸들)

- 상태: 채택 (2026-07-05)
- 맥락: 다이제스트·구독채널에 채널명만 표시되어, 채널 아바타(이미지)와 @핸들을 함께 보여주고 싶다.

## 결정

- `subscriptions`에 nullable 컬럼 2개 추가: `channel_thumbnail`(아바타 URL), `channel_handle`(@핸들). 사용자 승인(에스컬레이션).
- 매 렌더 API 조회 대신 **구독 시점 저장 + 기존 채널 1회 백필**(YouTube Data API `channels.list?part=snippet` → `thumbnails`, `customUrl`).
- `resolveChannel` 이 thumbnail·handle 을 함께 반환하도록 확장(격리 경계 유지).
- 표시는 `ChannelAvatar`(썸네일 없으면 이니셜 폴백) + 채널명 + @핸들. 이미지는 plain `<img>`(yt3.googleusercontent.com), next/image 최적화 미사용.

## 영향

- 추가 컬럼은 nullable 이라 기존 로직 무영향. 썸네일 URL 은 변할 수 있어 필요 시 재백필 가능.
- YouTube API 쿼터: 구독 추가 시 1회 + 백필 1회(배치 50개/요청)로 미미.
