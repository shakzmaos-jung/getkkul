#!/usr/bin/env bash
# Stop hook — spec-sync 게이트 (EXECUTION-PLAN §10.3).
#
# 모드 스위치:
#   SPEC_SYNC_ENFORCE=0 → 리마인더(비차단). 마일스톤 미기록 시 넛지만 주고 종료는 허용.
#   SPEC_SYNC_ENFORCE=1 → 강제 차단(block). 기록 전까지 종료 불가.
# 사용자 결정(2026-07-12): 우선 **수동/승인 프로세스**로 운영(=리마인더). 검사 범위·수준을
#   충분히 이해한 뒤, 마일스톤마다 자동 강제로 전환할지 사용자에게 물어 옵트인한다.
SPEC_SYNC_ENFORCE=0
#
# 정상 턴에서는 거의 아무 일도 안 한다(git log 1회 + grep 1회, ~ms).
# tip 커밋이 마일스톤 완료 커밋("(M<n>)")인데 SYNC-LOG에 그 마일스톤의 spec-sync 기록이
# 없을 때만 동작. 마커가 append되면 자동 통과 → 무한 루프 없음(self-clearing).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

SUBJECT="$(git log -1 --format=%s 2>/dev/null || echo '')"
N="$(printf '%s' "$SUBJECT" | grep -oE '\(M[0-9]+\)' | grep -oE '[0-9]+' | head -1 || true)"
[ -z "${N:-}" ] && exit 0   # 마일스톤 커밋 아님 → 통과

LOG="docs/admin/SYNC-LOG.md"
if [ -f "$LOG" ] && grep -qF "spec-sync: M${N} done" "$LOG"; then
  exit 0   # 이미 기록됨 → 통과
fi

MSG="마일스톤 M${N} 커밋이 있으나 docs/admin/SYNC-LOG.md에 spec-sync 기록이 없습니다. spec-sync 서브에이전트(subagent_type: spec-sync)로 SOT(PRD/SSR/EXECUTION-PLAN)와 구현을 대조·분류하고, 결과를 사용자에게 보고해 승인받은 뒤 SYNC-LOG에 엔트리 + '<!-- spec-sync: M${N} done @ <sha> -->' 마커를 append하세요. 그리고 이번 마일스톤부터 이 게이트를 자동 강제(SPEC_SYNC_ENFORCE=1)로 전환할지 사용자에게 물어보세요."

if [ "$SPEC_SYNC_ENFORCE" = "1" ]; then
  # 강제: 종료 차단(JSON, exit 0). Claude가 reason을 읽고 spec-sync를 실행한다.
  printf '{"decision":"block","reason":"%s"}\n' "$MSG"
else
  # 리마인더: 비차단 넛지. 종료는 허용하되 컨텍스트로 상기시킨다.
  printf '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"%s"}}\n' "$MSG"
fi
exit 0
