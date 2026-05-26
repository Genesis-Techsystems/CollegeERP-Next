/** Shared helpers for ERP module href / label → App Router mapping. */

export function normalizeLabelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function mapModuleTail(
  href: string,
  angularSegment: string,
  base: string,
  slugAliases: Record<string, string>,
  defaultSlug: string,
): string | null {
  const hrefLower = href.toLowerCase()
  if (!hrefLower.includes(angularSegment)) return null
  const idx = hrefLower.indexOf(angularSegment)
  const tail = href.slice(idx + angularSegment.length).replace(/^\/+/, '').split('?')[0]
  if (!tail) return `${base}/${defaultSlug}`
  const first = tail.split('/')[0]!.toLowerCase()
  const slug = slugAliases[first] ?? slugAliases[first.replace(/-/g, '')] ?? first
  const rest = tail.split('/').slice(1).join('/')
  return rest ? `${base}/${slug}/${rest}` : `${base}/${slug}`
}
