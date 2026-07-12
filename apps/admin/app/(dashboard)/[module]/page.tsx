import { notFound } from 'next/navigation';
import { MODULES } from '@/lib/modules';
import { EmptyModule } from '@/components/EmptyModule';

// 8개 모듈을 단일 동적 라우트로 처리(빈 상태). 미등록 경로는 404.
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const found = MODULES.find((m) => m.id === module);
  if (!found) notFound();
  return <EmptyModule id={found.id} />;
}
