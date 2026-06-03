import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LoginCard } from './LoginCard'

export default async function LoginPage() {
  const session = await getSession()
  if (session.user) {
    redirect(session.user.defaultDashboardPath || '/dashboard')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-[hsl(var(--background))]">
      <div className="relative z-10 w-full max-w-[440px] animate-login-card-in">
        <LoginCard />
        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Campus Connect · All rights reserved
        </p>
      </div>
    </div>
  )
}
