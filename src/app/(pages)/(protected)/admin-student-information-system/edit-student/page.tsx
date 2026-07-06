'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, Home, Loader2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { toastError } from '@/lib/toast'
import { fetchStudentDetail } from '@/services'
import { EditStudentForm } from './EditStudentForm'
import type { AnyRow } from './edit-student-utils'

export default function EditStudentPage() {
  const searchParams = useSearchParams()
  const studentId = Number(searchParams.get('studentId') ?? 0)
  const check = Number(searchParams.get('check') ?? 1)

  const [student, setStudent] = useState<AnyRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const detail = await fetchStudentDetail(studentId)
        if (!cancelled) setStudent(detail)
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load student')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [studentId])

  return (
    <PageContainer className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-primary">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Student</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit Student</span>
      </nav>

      <PageHeader title="Edit Student" subtitle="Student Information System" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading student details…
        </div>
      ) : !student ? (
        <div className="app-card p-6 text-center text-sm text-muted-foreground">
          Student not found. Return to{' '}
          <Link href="/admin-student-information-system/students-list" className="text-primary underline">
            Student Details
          </Link>
          .
        </div>
      ) : (
        <EditStudentForm initialData={student} check={check} />
      )}
    </PageContainer>
  )
}
