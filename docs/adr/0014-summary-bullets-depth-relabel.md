# ADR-0014 — 요약 표현: 불릿 구조 · 깊이 재정의 · 하이라이트 폐지 · 라벨 의역

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-13
- **결정자**: Chess (운영자)
- **관련**: ADR-0013(정보 계층 재정의), `docs/summary-prompt.md`, `lib/summary/*`, `components/feed/SummaryCard.tsx`

## 맥락

v0.3.0(ADR-0013) 출시 후 실사용 피드백:
1. 요점/핵심 카드가 모델이 넣은 `- ` 대시 불릿을 `coreText` 한 문자열에 담아, 렌더 시 줄바꿈 없이 뭉쳐 보임(모델의 대시 삽입도 비일관).
2. 요점 vs 핵심 차이가 너무 미미.
3. 하이라이트(밑줄)가 산만.
4. '짧게/보통/길게'가 문장 수 뉘앙스 → 정보 양·깊이를 못 드러냄.

## 결정

- **불릿 구조화**: 각 모드를 문자열 배열로 생성·저장한다. `short/normal.body.points`, `long.body.{facts,insights}` (문자열 배열). `core_text` 는 불릿을 `\n` 으로 결합한 정본 평문(이메일·복사·읽기시간·QA 호환). 카드는 배열을 불릿 `<ul>`(항목별 줄바꿈)로 렌더.
- **깊이 재정의**(프롬프트): 요점=이 영상이 무엇을 다뤘나 + 핵심 사실(10~30초) / 핵심=맥락·주요 개념 누락 없이 핵심 사실(완결적) / 심층=핵심 사실을 부가 사실·수치·예시로 확장한 facts + 맥락·인사이트 insights. 단조성(요점 ≤ 핵심 ≤ 심층) 유지.
- **하이라이트 폐지**: long 문장의 `{text,key}` 하이라이트(ADR-0013 REQ-E)를 철회. facts/insights 는 평문 문자열 배열. (매핑은 구버전 `{text,key}` 를 문자열로 정규화해 하위호환.)
- **라벨 의역**: 짧게/보통/길게 → **요점 / 핵심 / 심층**. `lib/summary/format.ts` `MODE_LABELS`/`MODE_DESC` 단일 소스(카드·설정 공용). 설정의 "핵심 1~N문장" 설명도 깊이 설명으로 교체.
- **이메일**: `renderDigest` HTML 이 `core_text` 의 `\n` 을 `<br>` 로 렌더(불릿 줄바꿈).

## 영향

- `format.ts` `Sentence`·`hasHighlight` 제거, `StructuredSummaries` points/facts/insights = `string[]`. `summarize.ts` 스키마·프롬프트·PROMPT_VERSION(`sq-2026-07-13.1`). 저장/매핑/렌더/이메일 반영.
- SSR AC-D2.1 재정의, 하이라이트 AC(REQ-E) 철회.
- 라이브 요약(컷오프 이후 ~65개) 전량 재생성. pre-cutoff 구버전은 폴백(`whitespace-pre-line`)으로 줄바꿈 포함 정상 렌더.
- 피드백 루프(content_feedback)·적응형 깊이(depthCeiling)·보수적 교정은 ADR-0013 그대로 유지.
