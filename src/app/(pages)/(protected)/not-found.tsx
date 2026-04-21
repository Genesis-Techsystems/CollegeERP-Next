'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 404 handler inside the (protected) layout — renders WITH the sidebar intact.
 * Shows a slide-up toast and navigates back after 3 s.
 */
export default function NotFound() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 50)
    const redirect = setTimeout(() => {
      if (window.history.length > 1) {
        router.back()
        return
      }
      if (window.location.pathname.includes('readmission-application')) {
        router.replace('/admin-student-information-system/student-re-admission')
        return
      }
      router.replace('/dashboard')
    }, 3000)

    return () => {
      clearTimeout(show)
      clearTimeout(redirect)
    }
  }, [router])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        transform: visible ? 'translateY(0)' : 'translateY(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div
        className="flex items-start gap-3 rounded-lg border shadow-lg px-4 py-3 text-sm"
        style={{
          background: 'hsl(var(--background))',
          borderColor: 'hsl(var(--border))',
          color: 'hsl(var(--foreground))',
          minWidth: '260px',
          maxWidth: '340px',
        }}
      >
        <span style={{ color: 'hsl(var(--destructive))', fontWeight: 600, fontSize: '1rem', lineHeight: 1.2 }}>
          404
        </span>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '2px' }}>Page not found</p>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
            Taking you back…
          </p>
        </div>
      </div>
    </div>
  )
}
