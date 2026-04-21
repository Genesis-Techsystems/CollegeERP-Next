import { redirect } from 'next/navigation'

type LegacyPostExamsAliasProps = {
  params: {
    slug?: string[]
  }
}

export default function LegacyPostExamsAliasPage({ params }: LegacyPostExamsAliasProps) {
  const slug = params.slug ?? []
  const tail = slug.length > 0 ? `/${slug.join('/')}` : ''
  redirect(`/admin-examination-management/post-examination${tail}`)
}

