'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ExamMaster,
  ExamMasterDetails,
  GeneralDetail,
  Regulation,
  CourseGroup,
  CourseYear,
} from '@/types/exam-master'
import {
  getExamMasterById,
  getGeneralDetails,
  getRegulations,
  getCourseGroups,
  getCourseYears,
  getExamMasterDetails as fetchExamMasterDetails,
  saveExamMasterDetails,
} from '@/services/exam-master'
import { GM_CODES } from '@/config/constants/ui'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastNotification({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
        type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {message}
    </div>
  )
}

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function ExamMasterDetailsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = Number(searchParams.get('examId'))

  // ── Exam data ───────────────────────────────────────────────────────────────
  const [exam, setExam] = useState<ExamMaster | null>(null)

  useEffect(() => {
    if (!examId || isNaN(examId)) {
      router.replace('/admin-examination-management/admin-exam-masters/exam-master')
      return
    }
    const stored = sessionStorage.getItem('examMasterDetails')
    if (stored) {
      setExam(JSON.parse(stored))
    } else {
      getExamMasterById(examId).then((result) => {
        if (result) setExam(result)
      })
    }
  }, [examId, router])

  // ── Reference data ──────────────────────────────────────────────────────────
  const [examFeeTypes, setExamFeeTypes] = useState<GeneralDetail[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([])
  const [courseYears, setCourseYears] = useState<CourseYear[]>([])
  const [examMasterDetails, setExamMasterDetails] = useState<ExamMasterDetails[]>([])
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
  const [filteredDetails, setFilteredDetails] = useState<ExamMasterDetails[]>([])
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formState, setFormState] = useState({
    regulationId: '',
    courseGroupId: '',
    courseYearId: '',
    examLabel: '',
    isBridgeCourse: false,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Filter helper ───────────────────────────────────────────────────────────
  const filterByTab = useCallback(
    (tabId: number | null) => {
      if (tabId === null) {
        setFilteredDetails([])
        return
      }
      setFilteredDetails(
        examMasterDetails.filter(
          (d) => d.examTypeCatId === tabId && d.isActive === true
        )
      )
    },
    [examMasterDetails]
  )

  // ── Load reference data when exam is ready ──────────────────────────────────
  useEffect(() => {
    if (!exam) return
    const courseId = exam.courseId!
    setLoadingRefs(true)

    Promise.all([
      getGeneralDetails(GM_CODES.EXAM_FEE_TYPE),
      getRegulations(courseId),
      getCourseGroups(courseId),
      getCourseYears(courseId),
      fetchExamMasterDetails(examId),
    ])
      .then(([allTypes, regs, groups, years, details]) => {
        // Filter exam fee types by exam flags
        const allowed: string[] = []
        if (exam.isRegularExam) allowed.push('Regular')
        if (exam.isSupplyExam) allowed.push('Supple')
        if (exam.isInternalExam) allowed.push('Internal')
        const filtered = allTypes.filter((t) => allowed.includes(t.generalDetailCode))
        setExamFeeTypes(filtered)
        if (filtered.length > 0) setSelectedTabId(filtered[0].generalDetailId)

        setRegulations(regs)
        setCourseGroups(groups)
        setCourseYears(years)
        setExamMasterDetails(details)
      })
      .finally(() => setLoadingRefs(false))
  }, [exam, examId])

  // ── Re-filter when tab or data changes ──────────────────────────────────────
  useEffect(() => {
    filterByTab(selectedTabId)
  }, [selectedTabId, filterByTab])

  // ── Form helpers ────────────────────────────────────────────────────────────
  const clearForm = useCallback(() => {
    setFormState({
      regulationId: '',
      courseGroupId: '',
      courseYearId: '',
      examLabel: '',
      isBridgeCourse: false,
    })
    setFormErrors({})
    setIsEditing(false)
    setEditingIndex(null)
  }, [])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!formState.regulationId) errors.regulationId = 'Required'
    if (!formState.courseGroupId) errors.courseGroupId = 'Required'
    if (!formState.courseYearId) errors.courseYearId = 'Required'
    if (!formState.examLabel.trim()) errors.examLabel = 'Required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Add ─────────────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!validate() || selectedTabId === null) return
    const regulationId = Number(formState.regulationId)
    const courseGroupId = Number(formState.courseGroupId)
    const courseYearId = Number(formState.courseYearId)

    const payload: ExamMasterDetails = {
      examMasterId: examId,
      examTypeCatId: selectedTabId,
      regulationId,
      regulationCode: regulations.find((r) => r.regulationId === regulationId)?.regulationName,
      courseGroupId,
      courseGroupCode: courseGroups.find((c) => c.courseGroupId === courseGroupId)?.groupCode,
      courseYearId,
      courseYearName: courseYears.find((y) => y.courseYearId === courseYearId)?.courseYearName,
      examLabel: formState.examLabel.trim(),
      isBridgeCourse: formState.isBridgeCourse,
      isActive: true,
    }
    setExamMasterDetails((prev) => [...prev, payload])
    clearForm()
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  function handleEdit(row: ExamMasterDetails) {
    const idx = examMasterDetails.findIndex((d) => d === row)
    if (idx === -1) return
    setFormState({
      regulationId: String(row.regulationId),
      courseGroupId: String(row.courseGroupId),
      courseYearId: String(row.courseYearId),
      examLabel: row.examLabel,
      isBridgeCourse: row.isBridgeCourse,
    })
    setIsEditing(true)
    setEditingIndex(idx)
  }

  function handleUpdate() {
    if (!validate() || editingIndex === null) return
    const regulationId = Number(formState.regulationId)
    const courseGroupId = Number(formState.courseGroupId)
    const courseYearId = Number(formState.courseYearId)

    setExamMasterDetails((prev) => {
      const updated = [...prev]
      updated[editingIndex] = {
        ...updated[editingIndex],
        regulationId,
        regulationCode: regulations.find((r) => r.regulationId === regulationId)?.regulationName,
        courseGroupId,
        courseGroupCode: courseGroups.find((c) => c.courseGroupId === courseGroupId)?.groupCode,
        courseYearId,
        courseYearName: courseYears.find((y) => y.courseYearId === courseYearId)?.courseYearName,
        examLabel: formState.examLabel.trim(),
        isBridgeCourse: formState.isBridgeCourse,
      }
      return updated
    })
    clearForm()
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  function handleDelete(row: ExamMasterDetails) {
    const idx = examMasterDetails.findIndex((d) => d === row)
    if (idx === -1) return
    setExamMasterDetails((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], isActive: false }
      return updated
    })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSaving(true)
    try {
      const result = await saveExamMasterDetails(examMasterDetails)
      setToast({ message: result.message || 'Saved successfully', type: 'success' })
      setTimeout(() => {
        router.push('/admin-examination-management/admin-exam-masters/exam-master')
      }, 1500)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ── Loading states ──────────────────────────────────────────────────────────
  if (!exam) return <PageSkeleton />
  if (loadingRefs) return <PageSkeleton />

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Exam Master Details
          </h1>
          <p className="text-sm text-slate-500">
            {exam.examName} &mdash; {exam.examMonthYr}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {examFeeTypes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No exam types configured for this exam.</p>
          </div>
        </div>
      ) : (
        <Tabs
          value={String(selectedTabId)}
          onValueChange={(v) => {
            setSelectedTabId(Number(v))
            clearForm()
          }}
        >
          <TabsList>
            {examFeeTypes.map((t) => (
              <TabsTrigger key={t.generalDetailId} value={String(t.generalDetailId)}>
                {t.generalDetailCode}
              </TabsTrigger>
            ))}
          </TabsList>

          {examFeeTypes.map((t) => (
            <TabsContent key={t.generalDetailId} value={String(t.generalDetailId)}>
              {/* Add / Edit form */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="font-semibold text-sm text-slate-700">
                  {isEditing ? 'Edit Exam Label' : 'Add Exam Label'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Regulation */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Regulation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formState.regulationId}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, regulationId: e.target.value }))
                      }
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.regulationId ? 'border-red-400' : 'border-slate-200'
                      }`}
                    >
                      <option value="">Select Regulation</option>
                      {regulations.map((r) => (
                        <option key={r.regulationId} value={r.regulationId}>
                          {r.regulationName}
                        </option>
                      ))}
                    </select>
                    {formErrors.regulationId && (
                      <p className="text-xs text-red-500">{formErrors.regulationId}</p>
                    )}
                  </div>

                  {/* Course Group */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Course Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formState.courseGroupId}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, courseGroupId: e.target.value }))
                      }
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.courseGroupId ? 'border-red-400' : 'border-slate-200'
                      }`}
                    >
                      <option value="">Select Course Group</option>
                      {courseGroups.map((c) => (
                        <option key={c.courseGroupId} value={c.courseGroupId}>
                          {c.groupCode}
                        </option>
                      ))}
                    </select>
                    {formErrors.courseGroupId && (
                      <p className="text-xs text-red-500">{formErrors.courseGroupId}</p>
                    )}
                  </div>

                  {/* Course Year */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Course Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formState.courseYearId}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, courseYearId: e.target.value }))
                      }
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.courseYearId ? 'border-red-400' : 'border-slate-200'
                      }`}
                    >
                      <option value="">Select Course Year</option>
                      {courseYears.map((y) => (
                        <option key={y.courseYearId} value={y.courseYearId}>
                          {y.courseYearName}
                        </option>
                      ))}
                    </select>
                    {formErrors.courseYearId && (
                      <p className="text-xs text-red-500">{formErrors.courseYearId}</p>
                    )}
                  </div>

                  {/* Exam Label */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Exam Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState.examLabel}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, examLabel: e.target.value }))
                      }
                      placeholder="Enter exam label"
                      className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.examLabel ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />
                    {formErrors.examLabel && (
                      <p className="text-xs text-red-500">{formErrors.examLabel}</p>
                    )}
                  </div>
                </div>

                {/* Bridge course checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isBridgeCourse"
                    checked={formState.isBridgeCourse}
                    onCheckedChange={(v) =>
                      setFormState((s) => ({ ...s, isBridgeCourse: !!v }))
                    }
                  />
                  <label htmlFor="isBridgeCourse" className="text-sm text-slate-700 cursor-pointer">
                    Is Bridge Course
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleUpdate}>Update</Button>
                      <Button variant="outline" onClick={clearForm}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleAdd}>Add</Button>
                  )}
                </div>
              </div>

              {/* Details table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        SI.No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Regulation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Course Group
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Course Year
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Exam Label
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Bridge Course
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
                            <p className="text-sm">No records found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3">{i + 1}</td>
                          <td className="px-4 py-3">
                            {row.regulationCode || row.regulationId}
                          </td>
                          <td className="px-4 py-3">
                            {row.courseGroupCode || row.courseGroupId}
                          </td>
                          <td className="px-4 py-3">
                            {row.courseYearName || row.courseYearId}
                          </td>
                          <td className="px-4 py-3">{row.examLabel}</td>
                          <td className="px-4 py-3">
                            {row.isBridgeCourse ? 'Yes' : 'No'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(row)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(row)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Save All */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ─── Page export (wrapped in Suspense for useSearchParams) ────────────────────

export default function ExamMasterDetailsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamMasterDetailsInner />
    </Suspense>
  )
}
