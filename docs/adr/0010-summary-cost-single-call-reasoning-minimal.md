# ADR-0010 — 요약 비용 최적화: 단일 호출 3종 생성 + reasoning minimal (gpt-5-nano 유지)

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-11
- **결정자**: Chess (운영자)
- **관련 스펙**: REQ-CO1~CO5 (WO-COST-001), SSR AC-D2.3, ADR-0001(요약 프로바이더 격리)

## 맥락

요약 LLM 비용이 과다. 실측 분석 결과 **입력(전사) 토큰이 지배적**인데:

- 영상당 short/normal/long **3개 API 호출**로 전사를 3회 재전송(형식 재시도 시 최악 9회).
- `vttToText` dedup 이 **완전동일 인접줄만** 처리 → 유튜브 롤링 자동자막(~50% 부분겹침)은 대부분 안 걸려 전사가 부풀음.
- `reasoning_effort: 'low'` 로 reasoning 토큰(출력 과금)이 매 호출 발생.

작업지시서(WO-COST-001)는 프로바이더를 **Gemini 2.5 Flash-Lite** 로 전환 제안. 그러나 실측 pricing(2026):
`gpt-5-nano` 입력 **$0.05/1M** vs `gemini-2.5-flash-lite` 입력 **$0.10/1M(2배)**, 출력 동일 $0.40/1M.
→ **입력 지배 워크로드에서 Gemini 는 오히려 더 비쌈** + 새 외부 의존성 + 구조화출력(json_schema) 부분지원 리스크.

## 결정

1. **프로바이더는 `gpt-5-nano` 유지**(Gemini 전환 **반려**). reasoning 토큰은 `reasoning_effort` `'low'`→**`'minimal'`** 로 최소화.
2. **전사 1회 전송으로 3종을 단일 호출 생성**(`summarizeAllModes`). 저장은 기존대로 모드별 3행(스키마 불변).
3. 형식 미달 교정 재시도에는 **전사 미포함**(직전 JSON 만으로 재정형).
4. **VTT 부분겹침 병합**(접미–접두 ≥2어절 + 글자수 가드)으로 자동자막 입력 축소.
5. 각 요약 호출의 `usage`(prompt/completion tokens·calls)를 관측성 stats 에 기록(전사 원문·키 미로그).

## 결과

- SSR AC-D2.3: "(모드,언어) 조합별 1회 연산" → **"영상·언어당 1회 호출로 3종 동시 생성·캐시"**.
- `GEMINI_API_KEY`·프로바이더 킬스위치 **불필요**(전환 미채택). 롤백은 `reasoning_effort` `'low'` 원복 커밋.
- 기대: 자동자막 소스 입력 토큰 대폭 감소(전사 3×→1× + dedup). 배포 후 usage 로그로 정량 확인.

## 대안 (반려)

- **Gemini 전환**: 입력 단가 2배·의존성·구조화출력 리스크 → 반려.
- **Batch API**: 신선도 SLA(업로드→노출 ≤30~60분)와 24h 턴어라운드 충돌 → 미채택.
