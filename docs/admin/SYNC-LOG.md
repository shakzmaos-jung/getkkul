# SYNC-LOG — SOT↔코드 동기화 내역 (getkkul 관제 어드민)

> **성격**: append-only 감사 추적. 구현이 SOT(PRD/SSR/EXECUTION-PLAN)와 갈릴 때마다 `spec-sync` 서브에이전트(EXECUTION-PLAN §10)가 여기에 엔트리를 추가한다. **엔트리를 지우거나 수정하지 말 것**(정정은 새 엔트리로).
> **목적**: "PRD→SSR→SDD→TDD→배포를 한 큐로 0→1" 개발에서 문서와 구현이 어떻게·왜 달라졌는지의 완전한 기록. 이 로그의 밀도·해상도가 실험 품질의 지표다.

## 기록 규칙
- **트리거**: 각 마일스톤 종료 시(Stop hook) 자동. + 스펙 참조 파일 변경 시(PostToolUse) "미검토 변경" 플래그.
- **분류 두 갈래**:
  - `결정(intentional)` — 더 나은 설계 판단 → **ADR 생성(ADR-A7+) + 해당 SOT 갱신** 후 기록.
  - `드리프트(unintended)` — 근거 없이 스펙과 다름 → **코드 수정 또는 스펙 정정** 후 기록.
- **필수 필드**: 일시(UTC) · 마일스톤 · 영향 REQ/AC · 어긋난 내용 · 분류 · 조치(ADR/스펙/코드) · 커밋 SHA.
- 마일스톤 릴리스 시 해당 구간 요약을 CHANGELOG / PR 본문에 링크.

## 엔트리 형식
```
### [YYYY-MM-DDTHH:MMZ] Mx · REQ-XX-n
- 분류: 결정 | 드리프트
- 어긋난 내용: (SOT는 A라고 했으나 구현은 B)
- 원인/근거: (왜 갈렸는가)
- 조치: ADR-A? 생성 | SSR §… 갱신 | 코드 … 수정
- 트레이서빌리티: (REQ↔AC↔테스트↔구현 갱신 여부)
- 커밋: <sha>
```

---

## 로그

### [예시 · 2026-07-1?T??:??Z] M4 · REQ-CO-1 / AC-CO-1a
- 분류: 결정(intentional)
- 어긋난 내용: SSR은 비용 USD를 "가격표 × summarize stats 토큰"으로 명시했으나, 구현 중 프롬프트 캐시 토큰이 별도 계상됨을 발견.
- 원인/근거: gpt-5-nano 응답의 cached_tokens를 반영해야 실비용과 일치.
- 조치: ADR-A7 생성(캐시 토큰 단가 반영) · SSR AC-CO-1a 갱신 · `pricing/llm-prices.ts`에 cached 단가 추가.
- 트레이서빌리티: cost.test에 cached-token 케이스 추가.
- 커밋: (예시)

<!-- 실제 엔트리는 spec-sync가 여기 아래로 append -->
