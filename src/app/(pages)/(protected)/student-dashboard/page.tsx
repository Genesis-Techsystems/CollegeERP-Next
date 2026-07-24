import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStudentRole } from '@/config/constants/app'
import { StudentDashboardPage } from './_components/StudentDashboardPage'

/**
 * Angular `student-dashboard` route.
 * Gated to STUDENT / MSTUDENT — everyone else stays on `/dashboard`.
 */
export default async function StudentDashboardRoute() {
  const session = await getSession()
  const user = session.user
  if (!user) redirect('/login')
  if (!isStudentRole(user.userRole)) redirect('/dashboard')

  return <StudentDashboardPage />
}
