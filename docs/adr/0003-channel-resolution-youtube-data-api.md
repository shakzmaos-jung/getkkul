# ADR-0003 — 채널 식별: YouTube Data API v3

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-05
- **결정자**: Chess (운영자)
- **관련 스펙**: SSR REQ-B1 (AC-B1.1~B1.4), PRD §13

## 맥락

채널 구독(M2)은 사용자가 입력한 "채널 URL 또는 핸들"을 `channel_id`(UC...)로 해석하고
채널명을 저장해야 한다(AC-B1.1). 유튜브 채널 RSS 감지(M3)는 `channel_id` 를 요구하지만,
핸들(`@name`)·커스텀 URL은 그대로는 RSS 에 쓸 수 없다.

이 해석 방식은 외부 의존성 추가이자 유튜브 접근 방식이라 에스컬레이션 대상이었다.

## 결정

핸들/URL → `channel_id` + 채널명 해석에 **YouTube Data API v3** (앱 레벨 API 키 1개)를 사용한다.

- 근거: 해석은 구독 추가 시 1회뿐인 희소 호출이라 견고성이 우선. 공식 API 는 채널명·존재
  검증을 함께 제공하고(AC-B1.1/B1.3), HTML 파싱과 달리 마크업 변경에 깨지지 않는다.
- 무료 쿼터(10,000 units/day, channels.list=1 unit)로 신뢰 그룹 규모에는 충분.
- **감지(M3)는 여전히 무료 RSS 피드**(`feeds/videos.xml?channel_id=`)를 사용한다.
  Data API 는 *일회성 해석에만* 쓴다 — PRD §13 "감지는 RSS로" 원칙과 충돌하지 않는다.

## 격리

해석은 `resolveChannel(input)` 단일 인터페이스 뒤에 격리한다. 상위 구독 로직은 구현을
모른다. 추후 필요 시 HTML 파싱 폴백이나 다른 소스로 교체 가능(가역적 결정).

## 지원 입력 형태 (v1)

- 원시 `UC...` id
- `youtube.com/channel/UC...`
- `@handle` / `youtube.com/@handle`
- (best-effort) `youtube.com/user/legacy`, `youtube.com/c/custom`
- **거부**: 개별 영상 URL(`watch?v=`, `youtu.be/`), 재생목록(`list=`) → AC-B1.4

## 결과

- 환경변수 `YOUTUBE_API_KEY` 추가 (서버 전용). Google Cloud 에서 "YouTube Data API v3"
  활성화 후 API 키 발급 필요.
- `.env.example` / secrets 목록에 반영.
