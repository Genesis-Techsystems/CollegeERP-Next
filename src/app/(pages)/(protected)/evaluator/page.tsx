import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isEvaluatorRole } from '@/config/constants/app'
import { EvaluatorPortal } from './_components/EvaluatorPortal'

/**
 * Evaluator portal — the ExamDigit evaluator vertical ported into CollegeERP.
 * Access is gated server-side to evaluator-type accounts; everyone else is sent
 * to their normal dashboard.
 */
export default async function EvaluatorPage() {
  const session = await getSession()
  const user = session.user
  if (!user) redirect('/login')
  if (!isEvaluatorRole(user.userRole, user.roleName)) redirect('/dashboard')

  return <EvaluatorPortal />
}
