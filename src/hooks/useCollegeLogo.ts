'use client'

import { useEffect, useState } from 'react'
import { getCollegeById } from '@/services'
import { MINIO_URL } from '@/config/constants/api'
import { useSessionContext } from '@/context/SessionContext'

/** Default placeholder served from public/ (Angular: default_logo.png). */
export const DEFAULT_COLLEGE_LOGO = '/assets/images/avatars/default_logo.png'

function toLogoUrl(path: string): string {
  if (/^(https?:\/\/|data:|\/)/i.test(path)) return path
  return `${MINIO_URL}${path.replace(/^\/+/, '')}`
}

/**
 * Resolve the dynamic college logo URL the way Angular does on the
 * pre-examination print pages:
 *
 *   this.Logo = collegesLogo.filter(c => c.collegeId == selectedCollegeId)[0]?.logo
 *   <img [src]="MINIO + Logo">
 *
 * Given the SELECTED college id, returns `MINIO_URL + college.logo`. Falls back
 * to the logged-in user's `collegeLogo` (login DTO) and finally to the default
 * placeholder, so the `<img>` always has a usable src.
 */
export function useCollegeLogo(collegeId: number | null | undefined): string {
  const { user } = useSessionContext()
  const sessionLogo = user?.collegeLogo ? toLogoUrl(user.collegeLogo) : ''
  const [url, setUrl] = useState<string>(sessionLogo || DEFAULT_COLLEGE_LOGO)

  useEffect(() => {
    let cancelled = false
    const fallback = sessionLogo || DEFAULT_COLLEGE_LOGO
    if (!collegeId) {
      setUrl(fallback)
      return
    }
    getCollegeById(collegeId)
      .then((college) => {
        if (cancelled) return
        const logo = college?.logo
        setUrl(logo ? toLogoUrl(String(logo)) : fallback)
      })
      .catch(() => {
        if (!cancelled) setUrl(fallback)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId, sessionLogo])

  return url
}
