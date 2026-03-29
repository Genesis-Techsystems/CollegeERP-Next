import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LoginCard } from './LoginCard'

export default async function LoginPage() {
  const session = await getSession()
  if (session.user) {
    redirect(session.user.defaultDashboardPath || '/dashboard')
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'hsl(220, 26%, 10%)' }}
    >

      {/* ── Ambient glows matching brand palette ────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 60% 50% at 10%  0%,  hsla(174,100%,39%,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 90% 100%, hsla(0,80%,70%,0.10)    0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80%  10%, hsla(33,100%,70%,0.07)  0%, transparent 60%)
          `,
        }}
      />

      {/* ── Dot grid ────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, hsla(210,40%,98%,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Card + footer ───────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[400px] animate-login-card-in">
        <LoginCard />
        <p className="mt-5 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Campus Connect · All rights reserved
        </p>
      </div>

    </div>
  )
}
