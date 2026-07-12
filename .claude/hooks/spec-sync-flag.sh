#!/usr/bin/env bash
# PostToolUse (Edit|Write) — 경량·비차단 관찰 훅 (EXECUTION-PLAN §10.3).
# SOT/스펙 참조 문서가 바뀌면 spec-sync가 검토할 수 있게 대기 로그에 한 줄 남긴다.
# 절대 차단하지 않는다(항상 exit 0). 실패해도 조용히 통과(best-effort).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

FILE="$(python3 -c 'import sys,json
try:
    d=json.load(sys.stdin); ti=d.get("tool_input",{})
    print(ti.get("file_path") or ti.get("path") or "")
except Exception:
    print("")' 2>/dev/null || true)"
[ -z "${FILE:-}" ] && exit 0

case "$FILE" in
  */SYNC-LOG.md) exit 0 ;;  # 자기 참조 노이즈 방지
  *docs/admin/*|*docs/adr/*|*docs/PRD.md|*docs/SSR.md|*CLAUDE.md)
    TS="$(date -u +%Y-%m-%dT%H:%MZ 2>/dev/null || echo '')"
    printf -- '- [%s] SOT/참조 문서 변경(미검토): %s\n' "$TS" "${FILE#"$PWD"/}" \
      >> .claude/spec-sync-pending.log 2>/dev/null || true
    ;;
esac
exit 0
