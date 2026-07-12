#!/usr/bin/env bash
# Stop hook — spec-sync 게이트 (EXECUTION-PLAN §10.3).
# 정상 턴에서는 거의 아무 일도 안 한다(git log 1회 + grep 1회, ~ms).
# tip 커밋이 마일스톤 완료 커밋("(M<n>)")인데 docs/admin/SYNC-LOG.md에 그 마일스톤의
# spec-sync 기록이 없으면, 종료를 차단(block)하고 spec-sync 실행을 요구한다.
# spec-sync가 마커를 append하면 다음 종료 시 자동 통과 → 무한 루프 없음(self-clearing).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# git 저장소가 아니면 통과
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

SUBJECT="$(git log -1 --format=%s 2>/dev/null || echo '')"
# 마일스톤 태그 (M0) (M1) ... 추출
N="$(printf '%s' "$SUBJECT" | grep -oE '\(M[0-9]+\)' | grep -oE '[0-9]+' | head -1 || true)"
[ -z "${N:-}" ] && exit 0   # 마일스톤 커밋 아님 → 통과

LOG="docs/admin/SYNC-LOG.md"
if [ -f "$LOG" ] && grep -qF "spec-sync: M${N} done" "$LOG"; then
  exit 0   # 이미 기록됨 → 통과
fi

# 미기록 → 차단(JSON, exit 0). Claude가 reason을 읽고 spec-sync를 직접 실행한다.
printf '{"decision":"block","reason":"%s"}\n' \
  "마일스톤 M${N} 커밋이 있으나 docs/admin/SYNC-LOG.md에 spec-sync 기록이 없습니다. spec-sync 서브에이전트(subagent_type: spec-sync)를 실행해 SOT(PRD/SSR/EXECUTION-PLAN)와 구현을 대조·분류·기록하고, 마지막에 '<!-- spec-sync: M${N} done @ <sha> -->' 마커를 SYNC-LOG.md에 append한 뒤 종료하세요. 드리프트가 없으면 '결정/드리프트 없음' 엔트리라도 남겨 게이트를 통과시키세요."
exit 0
