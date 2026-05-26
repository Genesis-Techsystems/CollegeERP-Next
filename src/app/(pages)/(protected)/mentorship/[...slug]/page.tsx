import { MentorshipRoutePage } from '../_components/MentorshipRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')
  return <MentorshipRoutePage slug={slug} />
}
