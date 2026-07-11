# Changelog

이 프로젝트의 주요 변경 사항을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/),
버전 규칙은 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따른다. 정책 근거는
`docs/adr/0012-versioning-policy.md` 참고.

## [Unreleased]

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

[Unreleased]: https://github.com/shakzmaos-jung/getkkul/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.2.0
