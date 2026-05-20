import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function RootPage() {
  const session = await getSession()

  if (session?.user) {
    redirect(session.user.defaultDashboardPath || '/dashboard')
  }

  redirect('/login')
}
