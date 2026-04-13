import { redirect } from 'next/navigation'

type LegacyPreExamAliasProps = {
  params: {
    slug?: string[]
  }
}

export default function LegacyPreExamAliasPage({ params }: LegacyPreExamAliasProps) {
  const slug = params.slug ?? []
  const tail = slug.length > 0 ? `/${slug.join('/')}` : ''
  redirect(`/admin-examination-management/pre-examination${tail}`)
}

