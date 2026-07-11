# ADR-0011 — 사이드 메뉴(우측 패널) 재설계: 상호작용 유형 통일 + 프로필/계정

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-11
- **결정자**: Chess (운영자)
- **관련 스펙**: `docs/sidemenu-redesign-spec.md`(REQ-A~H, V1~V7)

## 맥락

`SideMenu.tsx` 가 조악. 원인: (1) 한 리스트에 상호작용 3종 혼재(서비스소개·개발자정보=아코디언, 설정·라이선스=이동, 테마=인라인 토글), (2) 프로필·계정·로그아웃 부재, (3) 앱 버전 부재, (4) 모든 행 동일 스타일이라 위계·그룹 없음.

## 결정

패널을 위→아래로 **프로필 카드 → "메뉴" 그룹 → "화면" 그룹 → "계정" 그룹 → 메타 푸터**로 재구성하고 상호작용을 유형별로 통일한다.

- **아코디언 폐지**: 서비스 소개·개발자 정보를 제자리 아코디언이 아니라 **이동 대상 화면**(`/about`, `/developer` 신규 라우트)으로. 설정(`/settings`)·라이선스(`/licenses`)와 함께 **네 항목 모두 아이콘+라벨+chevron 이동 패턴**으로 통일(AC-B1.1).
- **프로필 카드**: 아바타·이름·이메일·플랜 배지(`planBadgeText`, 멤버십 없으면 '무료' 폴백). 탭 시 `/account`(신규 화면 — 프로필+로그아웃+계정삭제). 데이터는 브라우저 세션(getSession) + membership(RLS own-row) 로 첫 열림 시 로드.
- **다크모드**: "화면" 그룹 인라인 토글(기존 `ThemeToggle` 재사용).
- **로그아웃**: "계정" 그룹. 기존 세션 종료 로직(supabase.auth.signOut + /login) + `ConfirmDialog`.
- **버전**: `next.config` 가 `package.json` version 을 `NEXT_PUBLIC_APP_VERSION` 로 빌드 주입(하드코딩 금지). 푸터에 "getkkul v{version}" + "© 2026 getkkul · Made in Seoul".
- **RememberLogo TODO** 플레이스홀더 → `/developer` 의 깔끔한 명함 아이콘("리멤버 프로필")으로 교체.

## 보존 (회귀 금지)

포커스 트랩·ESC·오버레이 탭·우측 스와이프 닫기, transform 200ms 슬라이드(블러 없음), 44px 터치, 라이트/다크 — 전부 유지(REQ-H1).

## 결과

- 신규 파일: `app/about/page.tsx`, `app/developer/page.tsx`, `app/account/page.tsx`, `components/ui/UserAvatar.tsx`, `lib/membership/plan-badge.ts`. 변경: `SideMenu.tsx`(전면 재설계), `next.config.ts`(버전 주입), `lib/nav/tabs.ts`(헤더 타이틀).
- V1~V7 테스트로 커버(아코디언 0개·프로필→/account·버전 package.json 기반·로그아웃 확인·닫기 보존).

## 대안 (반려)

- 서비스소개·개발자정보를 패널 내 개선된 아코디언 유지: 상호작용 혼재 지속 → 반려(일관성이 핵심 요구).
