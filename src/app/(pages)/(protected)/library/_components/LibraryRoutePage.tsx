'use client'

import { getLibraryRoute } from '../_lib/library-routes'
import { LibraryScreenPlaceholder } from './LibraryScreenPlaceholder'

type LibraryRoutePageProps = { slug: string }

/** Handles library menu slugs that do not have a dedicated `page.tsx` yet. */
export function LibraryRoutePage({ slug }: Readonly<LibraryRoutePageProps>) {
  const route = getLibraryRoute(slug)
  return <LibraryScreenPlaceholder title={route.title} description={route.description} />
}
