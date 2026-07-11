# ADR-0013 — 다이제스트 요약: 정보 계층 재정의 + 피드백 루프

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-12
- **결정자**: Chess (운영자)
- **관련 스펙**: `docs/summary-quality-spec.md`(REQ-A~F, S1~S7), `docs/summary-prompt.md`
- **관련 코드**: `lib/summary/format.ts`·`summarize.ts`·`get-or-create-summary.ts`, `lib/feed/map-digests.ts`, `components/feed/SummaryCard.tsx`

## 맥락

기존 요약은 (1) 길이 역전(long < normal < short), (2) 문장 수 기준이라 깊이가 안 늘어남, (3) 전사 용어 오류 전파(S&P500→SMP 500), (4) 빈약 콘텐츠도 항상 3종 생성, (5) 얇은 long 프롬프트의 문제가 있었다. 다이제스트는 getkkul 의 핵심 지불가치다.

## 결정

요약을 "문장 수"에서 **정보 계층(깊이)**으로 재정의한다.

- **정보 계층**: short=TL;DR / normal=핵심+맥락 / long=**2단락**(① 핵심 사실 ② 맥락·인사이트), 문장별 핵심 하이라이트(`{text,key}`). `summaries.body` 에 `{facts, insights}` jsonb 저장.
- **단조성**: 문장 수 범위 검증을 폐지하고 정보량(공백 제외 글자수) 기준 short ≤ normal ≤ long 검증으로 교체. 위반 시 상위 모드를 미제공으로 낮춰(`resolveProvidedCeiling`) 역전을 사용자에게 노출하지 않는다(S1 무결점).
- **적응형 깊이**: 모델이 같은 호출에서 `depthCeiling` 을 판정. 빈약 콘텐츠는 상위 모드를 `body.notProvided=true` 로 저장하고 카드에서 "제공 안 함" 안내. 억지 생성 금지.
- **보수적 용어 교정**: 채널 도메인 힌트(channel_catalog/subscriptions title + content_terms)를 프롬프트에 주입해 명백한 오인식만 교정. 없던 개체 삽입 금지, 불확실 시 원문 유지(S4 무결점).
- **피드백 루프**: 콘텐츠 카드 하단 👍/👎 를 `content_feedback(user,video,mode,language)` 에 저장(재탭 취소·변경). `get_content_feedback_metrics()`(service_role) 로 집계 → 사람이 프롬프트 개정(HOTL) → 회귀 테스트.
- **프롬프트 버전 관리**: `PROMPT_VERSION` 상수 + `summaries.prompt_version` 컬럼 + `docs/summary-prompt.md` 이력. 개선 전후 비교 가능.
- **비용/호출**: 3종은 전사 1회 전송 단일 호출 유지(REQ-CO1). 모드별 reasoning_effort 분리는 단일 호출 제약상 불가 → long 을 포함하므로 호출 전체를 `reasoning_effort='low'` 로 둔다(💰 영상당 0.05→0.15센트, 무시 가능). Batch 미사용(실시간 우선). STT 유료 API 유지·관측.

## 대안 & 기각

- **모드별 개별 호출(모드별 effort 분리)**: 전사 3회 전송·3콜 → 비용·지연 증가, REQ-CO1(1회 전송) 위배. 기각.
- **long-우선 생성 후 압축 파생**: 초기엔 단일 호출+단조성 방어로 충분(스펙 AC-B1.3). 품질 미달 관측 시 재검토.
- **문장 수 하한 유지**: 깊이 왜곡의 원인 → 폐지.
- **G절 확장(용어툴팁·타임스탬프·on-demand)**: 이번 범위 제외(S1~S7 미채점, 후속 태스크).

## 영향

- `LENGTH_SPECS`·문장수 `validateSummaryFormat` 폐지. 단일 모드 `summarize()`/`getOrCreateSummary()`(미사용)도 제거.
- RPC `get_feed_digests`/`get_bookmarked_digests` 가 `body` 전체 + 본인 `feedback` 를 반환.
- 기존 캐시 요약은 새 구조로 **전량 재생성**(운영자 결정).
