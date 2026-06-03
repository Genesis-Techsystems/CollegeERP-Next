import { AttendanceRoutePage } from '../_components/AttendanceRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')
  return <AttendanceRoutePage slug={slug} />
}
