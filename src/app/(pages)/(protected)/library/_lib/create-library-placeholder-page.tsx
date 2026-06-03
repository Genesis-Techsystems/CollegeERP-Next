'use client'

import { LibraryScreenPlaceholder } from '../_components/LibraryScreenPlaceholder'
import { getLibraryRoute } from './library-routes'

/** Factory for Angular library routes not yet fully implemented. */
export function createLibraryPlaceholderPage(slug: string) {
  const route = getLibraryRoute(slug)
  return function LibraryPlaceholderPage() {
    return <LibraryScreenPlaceholder title={route.title} description={route.description} />
  }
}
