import { redirect } from 'next/navigation'
import { ModuleRoutePage } from '@/app/(pages)/(protected)/_lib/erp-module-mirror/ModuleRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')

  const tcMirrorRoutes: Record<string, string> = {
    'transfer-certificate': '/tc-no-due-approval/transfer-certificate',
    'send-no-due-approval-request': '/tc-no-due-approval/send-no-due-approval-request',
    'certificate-requests': '/tc-no-due-approval/certificate-requests',
    'certificate-requests/printTc': '/tc-no-due-approval/certificate-requests/printTc',
    'certificates-issued-list': '/tc-no-due-approval/certificates-issued-list',
    'certificate-request-report': '/tc-no-due-approval/certificate-request-report',
  }

  const tcRoute = tcMirrorRoutes[slug]
  if (tcRoute) {
    redirect(tcRoute)
  }

  return <ModuleRoutePage moduleId="certificates" slug={slug} />
}
