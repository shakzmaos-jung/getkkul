# Changelog

이 프로젝트의 주요 변경 사항을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/),
버전 규칙은 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따른다. 정책 근거는
`docs/adr/0012-versioning-policy.md` 참고.

## [Unreleased]

## [0.4.0] - 2026-07-13

### Changed
- **요약 표현 개선**(ADR-0014): 요점/핵심/심층을 **불릿 배열**로 생성·표시(항목마다 줄바꿈).
- 요점↔핵심 차이 명확화(깊이 재정의): 요점=무엇+핵심사실(10~30초) / 핵심=맥락·개념 누락 없이 핵심사실 / 심층=핵심+수치·예시+맥락·인사이트.
- 라벨 의역: 짧게/보통/길게 → **요점 / 핵심 / 심층**(설정·카드 공용).
- 이메일 다이제스트도 불릿 줄바꿈 반영.

### Removed
- 요약 핵심문장 **하이라이트(밑줄)** 제거.

## [0.3.0] - 2026-07-12

### Changed
- **다이제스트 요약 품질 재설계**(ADR-0013): 길이 모드를 문장 수 → **정보 계층**으로 재정의.
  긴 요약은 [핵심 사실] + [맥락·인사이트] 2단락 + 핵심 문장 하이라이트로 표시.
- 길이 역전 제거: 단조성(short ≤ normal ≤ long) 검증·방어. 빈약한 영상은 적응형으로
  상위 모드를 "제공 안 함" 안내.
- 전사 용어 보수적 교정(채널 도메인 힌트), 과교정 방지.

### Added
- 콘텐츠 카드 하단 **👍/👎 피드백**(재탭 취소·변경) + 운영자 집계 지표.
- 프롬프트 버전 관리(`prompt_version`) 및 회귀 테스트, `docs/summary-prompt.md`.

## [0.2.0] - 2026-07-11

### Added
- 발송 슬롯 **21:30 KST** 추가(이메일·푸시). 설정 화면에 21:30 선택 카드.
- 사이드패널 "메뉴"에 **친구 초대 & 크레딧**(`/referral`) 진입점.
- 버전 관리 체계 도입: `CHANGELOG.md`, git 태그(`vX.Y.Z`), 정책 ADR-0012.

### Changed
- 다이제스트 발송 정시성 개선: Supabase **pg_cron 정시 디스패치** + 실행 시각 가드로
  07:30/11:30/17:30/21:30 **±수분** 발송, off-slot(지연 크론·수동 실행) 발송 차단.
- 설정 화면: '영상 길이 필터' 카드를 '요약 길이' 바로 아래로 이동.
- 사이드패널 '화면' 그룹의 테마 토글 라벨 '다크 모드' → **'테마'**(라이트↔다크 전환에 맞춤).

## [0.1.0] - 초기 베이스라인

- 유튜브 채널 구독·영상 감지·전사·요약·하루 정시 발송(이메일/웹푸시).
- 멤버십/크레딧·친구 초대(추천) 시스템, PWA, 설정·다이제스트·홈 화면.

[Unreleased]: https://github.com/shakzmaos-jung/getkkul/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.4.0
[0.3.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.3.0
[0.2.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.2.0
