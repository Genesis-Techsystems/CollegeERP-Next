import { redirect } from 'next/navigation'

type LegacyPostExamAliasProps = {
  params: {
    slug?: string[]
  }
}

export default function LegacyPostExamAliasPage({ params }: LegacyPostExamAliasProps) {
  const slug = params.slug ?? []
  const tail = slug.length > 0 ? `/${slug.join('/')}` : ''
  redirect(`/admin-examination-management/post-examination${tail}`)
}

