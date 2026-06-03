'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

type PayrollPayslipWorkflowPageProps = {
  mode: 'generate' | 'view'
}

/** Generate / view payslip screens — full salary calculator UI pending migration. */
export function PayrollPayslipWorkflowPage({ mode }: PayrollPayslipWorkflowPageProps) {
  const searchParams = useSearchParams()
  const title = mode === 'generate' ? 'Generate Payslip' : 'View Payslip'
  const employeeId = searchParams.get('employeeId')
  const payrollGroupId = searchParams.get('payrollGroupId')

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Angular route parameters are preserved. Employee {employeeId ?? '—'}, payroll group{' '}
          {payrollGroupId ?? '—'}. The interactive payslip calculator (earnings, deductions, LOP,
          calculate payroll) will be wired in a follow-up pass.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/hr-payroll/payroll/payslip-for-employees">Back to Payslip For Employees</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
