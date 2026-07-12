import { redirect } from 'next/navigation';

// 루트 → 관제 홈. (인증 게이트는 proxy 에서 이미 처리됨.)
export default function Home() {
  redirect('/overview');
}
