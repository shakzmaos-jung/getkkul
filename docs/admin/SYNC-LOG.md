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

### [2026-07-12T06:15Z] M0 · (모노레포 구조)
- 분류: 결정(intentional)
- 어긋난 내용: §M0 산출물은 `packages/db·domain`에 supabase 클라이언트·순수로직을 **이관**한다고 명시했으나, 구현은 packages를 **빈 스캐폴드**로만 두고 앱을 `apps/web`로 verbatim 이동했다(내부 import 0). 증거: `packages/*/src/index.ts`(빈 export), 커밋 a5fef5f.
- 원인/근거: M0 불변조건 "회귀 0"과 상충. 이관은 `createPipelineClient`(비-server-only)/`admin.ts`(server-only) 분리(13모듈+3스크립트 의존)를 흔들어 라이브 파이프라인 회귀 위험. 또 domain/pricing은 M4 신규, ui/Linear 토큰은 M1 신규라 원래 추출 대상 아님.
- 조치: **ADR-A7 생성**(`docs/adr/A7-monorepo-packages-skeleton-first.md`) · **EXECUTION-PLAN §M0 갱신**(스켈레톤 우선 명시). 추출은 소비 마일스톤에서 JIT.
- 트레이서빌리티: M0는 SSR 트레이스 표에 REQ 없음(표는 M1부터). 본 결정은 ADR-A7로 등록.
- 커밋: a5fef5f (구현) · (본 엔트리 = spec-sync 활성화 커밋)

### [2026-07-12T06:15Z] M0 · REQ-SY-1 / AC-SY-1a (Sync 훅 기법)
- 분류: 결정(intentional) — 스펙 정정
- 어긋난 내용: §10.3은 Stop hook 무한루프 방지를 `stop_hook_active` 가드로 명시했으나, 현행 Claude Code(v2.1.205+)에 그 필드는 **존재하지 않는다**. 또 Stop hook은 서브에이전트를 직접 스폰할 수 없다.
- 원인/근거: 문서 작성 시점 이후 훅 스펙 변경(공식 docs 확인).
- 조치: **self-clearing 게이트**로 구현 — tip 커밋이 `(M<n>)`인데 SYNC-LOG에 `spec-sync: M<n> done` 마커가 없으면 block, 마커가 append되면 자동 통과(무한루프 불가). Stop hook은 차단 사유로 spec-sync 서브에이전트 실행을 지시(직접 스폰 대신). §10.3의 `stop_hook_active` 문구는 후속 갱신 권고.
- 트레이서빌리티: `.claude/hooks/spec-sync-gate.sh`·`spec-sync-flag.sh`·`.claude/settings.json`·`.claude/agents/spec-sync.md`. (테스트: 훅 4종 수동 검증 — block/pass/flag scope.)
- 커밋: (본 엔트리 = spec-sync 활성화 커밋)

### [2026-07-12T06:15Z] M0 · (버전 표기)
- 분류: 드리프트(unintended, 경미)
- 어긋난 내용: 어드민 SOT(PRD/SSR/EXECUTION-PLAN) 헤더가 "v0.6.0 기준"이라 적혀 있으나 리포는 이미 **v0.7.0**(PR #83·#84 등 크레딧/파이프라인 작업으로 진행).
- 원인/근거: SOT는 작성 시점 스냅샷. 표기가 뒤처짐(기능 영향 없음).
- 조치: 스냅샷 성격이라 정정은 선택적. 본 로그로 기록만 남김. 이후 어드민 SOT 개정 시 헤더 갱신 권고.
- 트레이서빌리티: 해당 없음.
- 커밋: (기록만)

<!-- spec-sync: M0 done @ a5fef5f -->

