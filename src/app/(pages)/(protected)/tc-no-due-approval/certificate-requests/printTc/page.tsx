'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getStudentCertificatePrintDetails } from '@/services'
import type { TcStudentCertificatePrintRow } from '@/types/tc-no-due'
import { toastError } from '@/lib/toast'
import { format } from 'date-fns'

export default function PrintTcPage() {
  const searchParams = useSearchParams()
  const studentId = Number(searchParams.get('studentId') ?? 0)
  const collegeId = Number(searchParams.get('collegeId') ?? 0)
  const [details, setDetails] = useState<TcStudentCertificatePrintRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId || !collegeId) {
      setLoading(false)
      return
    }
    void getStudentCertificatePrintDetails(collegeId, studentId)
      .then(setDetails)
      .catch((e) => toastError(e, 'Failed to load TC print data'))
      .finally(() => setLoading(false))
  }, [studentId, collegeId])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading transfer certificate…</p>
      </PageContainer>
    )
  }

  if (!details) {
    return (
      <PageContainer>
        <p className="text-sm text-amber-700">No print data found for this student.</p>
      </PageContainer>
    )
  }

  const today = format(new Date(), 'dd/MM/yyyy')

  return (
    <PageContainer className="space-y-4 print:p-0">
      <div className="flex gap-2 print:hidden">
        <Button type="button" onClick={handlePrint}>
          Print
        </Button>
      </div>

      <div className="mx-auto max-w-3xl rounded border bg-white p-8 text-sm print:border-0 print:p-0">
        <h1 className="mb-6 text-center text-lg font-bold uppercase">Transfer Certificate</h1>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-2/5 py-1 font-medium">Admission No.</td>
              <td className="py-1">{details.admission_number ?? '—'}</td>
              <td className="py-1 text-right">{today}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Roll No.</td>
              <td className="py-1" colSpan={2}>{details.roll_number ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Student name</td>
              <td className="py-1" colSpan={2}>{details.student_name ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Father name</td>
              <td className="py-1" colSpan={2}>{details.father_name ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Mother name</td>
              <td className="py-1" colSpan={2}>{details.mother_name ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Date of birth</td>
              <td className="py-1" colSpan={2}>{details.date_of_birth ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Gender</td>
              <td className="py-1" colSpan={2}>{details.gender ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Admission date</td>
              <td className="py-1" colSpan={2}>{details.adminssion_Date ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Date of leaving</td>
              <td className="py-1" colSpan={2}>{details.Date_of_Leaving ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Class at leaving</td>
              <td className="py-1" colSpan={2}>{details.Class_at_the_time_of_leaving ?? '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Branch</td>
              <td className="py-1" colSpan={2}>{details.Branch ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
