// 관제 어드민 13개 모듈 (좌측 GNB 순서, EXECUTION-PLAN §4).
// icon: 사이드바 접힘 상태에서 아이콘만 표시.
export type AdminModule = {
  id: string;
  path: string;
  label: string;
  desc: string;
  milestone: string;
  icon: string;
  /** 사이드바 라벨 옆 상태 뱃지(선택). 예: '일시적 미사용'. */
  badge?: string;
};

export const MODULES: readonly AdminModule[] = [
  { id: 'overview', path: '/overview', label: '관제 홈', desc: '서비스 신호등 · 오늘 배치 · KPI 6종', milestone: 'M2', icon: '🏠' },
  { id: 'health', path: '/health', label: '서비스 헬스', desc: '업타임 · 에러 · 라이브 로그 · 배포', milestone: 'M?', icon: '🩺' },
  { id: 'pipeline', path: '/pipeline', label: '파이프라인', desc: '4단계 배치 · 채널별 처리 · 재시도 큐', milestone: 'M3', icon: '🔀' },
  { id: 'growth', path: '/growth', label: '그로스', desc: '구독자 · 활성화 · 리텐션 · 레퍼럴', milestone: 'M5', icon: '📈' },
  { id: 'cost', path: '/cost', label: '비용 · 쿼터', desc: 'LLM 비용 · 토큰 · 쿼터 · 예산', milestone: 'M4', icon: '💰' },
  { id: 'security', path: '/security', label: '보안', desc: '시크릿 · 의존성 · 헤더 · IDOR', milestone: 'M6', icon: '🛡️' },
  { id: 'alerts', path: '/alerts', label: '알림 · 인시던트', desc: '규칙 · 인시던트 · 포스트모템', milestone: 'M7', icon: '🔔' },
  { id: 'ops', path: '/ops', label: '운영 데이터', desc: '채널 · 구독자 · 다이제스트 · 수동 실행', milestone: 'M8', icon: '🗂️' },
  { id: 'feedback', path: '/feedback', label: '피드백', desc: '좋아요 · 싫어요 이벤트 이력', milestone: 'M9', icon: '👍' },
  { id: 'versions', path: '/versions', label: '버전 히스토리', desc: '릴리스별 변경 · 3단계 설명 · PR', milestone: 'M10', icon: '🏷️' },
  { id: 'send-history', path: '/send-history', label: '발송 이력', desc: '이메일 · 푸시 슬롯 발송 로그', milestone: 'M11', icon: '📨' },
  { id: 'glossary', path: '/glossary', label: '용어사전', desc: '용어 정의 조회 · 수정 · 이력', milestone: 'M12', icon: '📚', badge: '일시적 미사용' },
  { id: 'membership', path: '/membership', label: '멤버십 이력', desc: '구독 · 결제 · 업그레이드 이력', milestone: 'M13', icon: '💳' },
] as const;
