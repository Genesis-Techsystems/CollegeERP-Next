import { NotificationsRoutePage } from '../_components/NotificationsRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')
  return <NotificationsRoutePage slug={slug} />
}
