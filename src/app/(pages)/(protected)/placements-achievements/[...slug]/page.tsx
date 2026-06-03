import { ModuleRoutePage } from '@/app/(pages)/(protected)/_lib/erp-module-mirror/ModuleRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')
  return <ModuleRoutePage moduleId="placements-achievements" slug={slug} />
}
