// 관제 어드민 8개 모듈 (좌측 GNB 순서, EXECUTION-PLAN §4).
// M1 에선 라우트 + 빈 상태만. 각 모듈 구현은 M2~M8.
export type AdminModule = {
  id: string;
  path: string;
  label: string;
  desc: string;
  milestone: string;
};

export const MODULES: readonly AdminModule[] = [
  { id: 'overview', path: '/overview', label: '관제 홈', desc: '서비스 신호등 · 오늘 배치 · KPI 6종', milestone: 'M2' },
  { id: 'health', path: '/health', label: '서비스 헬스', desc: '업타임 · 에러 · 라이브 로그 · 배포', milestone: 'M?' },
  { id: 'pipeline', path: '/pipeline', label: '파이프라인', desc: '4단계 배치 · 채널별 처리 · 재시도 큐', milestone: 'M3' },
  { id: 'growth', path: '/growth', label: '그로스', desc: '구독자 · 활성화 · 리텐션 · 레퍼럴', milestone: 'M5' },
  { id: 'cost', path: '/cost', label: '비용 · 쿼터', desc: 'LLM 비용 · 토큰 · 쿼터 · 예산', milestone: 'M4' },
  { id: 'security', path: '/security', label: '보안', desc: '시크릿 · 의존성 · 헤더 · IDOR', milestone: 'M6' },
  { id: 'alerts', path: '/alerts', label: '알림 · 인시던트', desc: '규칙 · 인시던트 · 포스트모템', milestone: 'M7' },
  { id: 'ops', path: '/ops', label: '운영 데이터', desc: '채널 · 구독자 · 다이제스트 · 수동 실행', milestone: 'M8' },
] as const;
