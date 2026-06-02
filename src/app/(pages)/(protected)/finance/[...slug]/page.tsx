import { FinanceRoutePage } from '../_components/FinanceRoutePage'

type PageProps = { params: Promise<{ slug: string[] }> }

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params
  const slug = segments.join('/')
  return <FinanceRoutePage slug={slug} />
}
