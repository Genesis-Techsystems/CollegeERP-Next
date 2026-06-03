'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { NoticeAlert } from '@/common/components/feedback'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
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
import { PageContainer } from '@/components/layout'
import { scheduleNavigation } from '@/lib/schedule-navigation'

function PageSkeleton() {
  return (
    <PageContainer className="space-y-4">
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
    </PageContainer>
  )
}

function ExamMasterDetailsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = Number(searchParams.get('examId'))

  const [exam, setExam] = useState<ExamMaster | null>(null)

  useEffect(() => {
    if (!examId || Number.isNaN(examId)) {
      return scheduleNavigation(() => {
        router.replace('/admin-examination-management/admin-exam-masters/exam-master')
      })
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

  const [examFeeTypes, setExamFeeTypes] = useState<GeneralDetail[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([])
  const [courseYears, setCourseYears] = useState<CourseYear[]>([])
  const [examMasterDetails, setExamMasterDetails] = useState<ExamMasterDetails[]>([])
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
  const [filteredDetails, setFilteredDetails] = useState<ExamMasterDetails[]>([])
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [saving, setSaving] = useState(false)

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

  const filterByTab = useCallback(
    (tabId: number | null) => {
      if (tabId === null) {
        setFilteredDetails([])
        return
      }
      setFilteredDetails(examMasterDetails.filter((d) => d.examTypeCatId === tabId && d.isActive === true))
    },
    [examMasterDetails]
  )

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
        const allowed: string[] = []
        if (exam.isRegularExam) allowed.push('Regular')
        if (exam.isSupplyExam) allowed.push('Supple')
        if (exam.isInternalExam) allowed.push('Internal')
        const filtered = allTypes.filter((t) => allowed.includes(t.generalDetailCode ?? ''))
        setExamFeeTypes(filtered)
        if (filtered.length > 0) setSelectedTabId(filtered[0].generalDetailId)

        setRegulations(regs)
        setCourseGroups(groups)
        setCourseYears(years)
        setExamMasterDetails(details)
      })
      .finally(() => setLoadingRefs(false))
  }, [exam, examId])

  useEffect(() => {
    filterByTab(selectedTabId)
  }, [selectedTabId, filterByTab])

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

  function handleAdd() {
    if (!validate() || selectedTabId === null) return
    const regulationId = Number(formState.regulationId)
    const courseGroupId = Number(formState.courseGroupId)
    const courseYearId = Number(formState.courseYearId)

    const payload: ExamMasterDetails = {
      examMasterId: examId,
      examTypeCatId: selectedTabId,
      regulationId,
      regulationCode: regulations.find((r) => r.regulationId === regulationId)?.regulationName ?? '',
      courseGroupId,
      courseGroupCode: courseGroups.find((c) => c.courseGroupId === courseGroupId)?.groupCode ?? '',
      courseYearId,
      courseYearName: courseYears.find((y) => y.courseYearId === courseYearId)?.courseYearName ?? '',
      examLabel: formState.examLabel.trim(),
      isBridgeCourse: formState.isBridgeCourse,
      isActive: true,
    }
    setExamMasterDetails((prev) => [...prev, payload])
    clearForm()
  }

  function handleEdit(row: ExamMasterDetails) {
    const idx = examMasterDetails.indexOf(row)
    if (idx === -1) return
    setFormState({
      regulationId: String(row.regulationId ?? ''),
      courseGroupId: String(row.courseGroupId ?? ''),
      courseYearId: String(row.courseYearId ?? ''),
      examLabel: row.examLabel ?? '',
      isBridgeCourse: row.isBridgeCourse ?? false,
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

  function handleDelete(row: ExamMasterDetails) {
    const idx = examMasterDetails.indexOf(row)
    if (idx === -1) return
    setExamMasterDetails((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], isActive: false }
      return updated
    })
  }

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

  if (!exam) return <PageSkeleton />
  if (loadingRefs) return <PageSkeleton />

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <div>
            <h1 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam Master Details</h1>
            <p className="text-[12px] text-muted-foreground">
              {exam.examName} &mdash; {exam.examMonthYr}
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <NoticeAlert
          type={toast.type}
          title={toast.message}
          showIcon
          action={(
            <Button type="button" size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setToast(null)}>
              Close
            </Button>
          )}
        />
      )}

      {examFeeTypes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
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
          {examFeeTypes.map((t) => (
            <TabsContent key={t.generalDetailId} value={String(t.generalDetailId)}>
              <div className="app-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[14px] text-[hsl(var(--card-title))]">{isEditing ? 'Edit Exam Label' : 'Add Exam Label'}</h3>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                    {t.generalDetailCode}
                  </span>
                </div>
                <hr className="border-border" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="regulationId" className="text-xs font-medium text-slate-600">
                      Regulation <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="regulationId"
                      value={formState.regulationId}
                      onChange={(e) => setFormState((s) => ({ ...s, regulationId: e.target.value }))}
                      className={`h-8 w-full rounded-md border px-2.5 text-[12px] bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.regulationId ? 'border-red-400' : 'border-border'
                      }`}
                    >
                      <option value="">Select Regulation</option>
                      {regulations.map((r) => (
                        <option key={r.regulationId} value={r.regulationId}>
                          {r.regulationName}
                        </option>
                      ))}
                    </select>
                    {formErrors.regulationId && <p className="text-xs text-red-500">{formErrors.regulationId}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="courseGroupId" className="text-xs font-medium text-slate-600">
                      Course Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="courseGroupId"
                      value={formState.courseGroupId}
                      onChange={(e) => setFormState((s) => ({ ...s, courseGroupId: e.target.value }))}
                      className={`h-8 w-full rounded-md border px-2.5 text-[12px] bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.courseGroupId ? 'border-red-400' : 'border-border'
                      }`}
                    >
                      <option value="">Select Course Group</option>
                      {courseGroups.map((c) => (
                        <option key={c.courseGroupId} value={c.courseGroupId}>
                          {c.groupCode}
                        </option>
                      ))}
                    </select>
                    {formErrors.courseGroupId && <p className="text-xs text-red-500">{formErrors.courseGroupId}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="courseYearId" className="text-xs font-medium text-slate-600">
                      Course Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="courseYearId"
                      value={formState.courseYearId}
                      onChange={(e) => setFormState((s) => ({ ...s, courseYearId: e.target.value }))}
                      className={`h-8 w-full rounded-md border px-2.5 text-[12px] bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.courseYearId ? 'border-red-400' : 'border-border'
                      }`}
                    >
                      <option value="">Select Course Year</option>
                      {courseYears.map((y) => (
                        <option key={y.courseYearId} value={y.courseYearId}>
                          {y.courseYearName}
                        </option>
                      ))}
                    </select>
                    {formErrors.courseYearId && <p className="text-xs text-red-500">{formErrors.courseYearId}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="examLabel" className="text-xs font-medium text-slate-600">
                      Exam Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="examLabel"
                      type="text"
                      value={formState.examLabel}
                      onChange={(e) => setFormState((s) => ({ ...s, examLabel: e.target.value }))}
                      placeholder="Enter exam label"
                      className={`h-8 w-full rounded-md border px-2.5 text-[12px] shadow-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        formErrors.examLabel ? 'border-red-400' : 'border-border'
                      }`}
                    />
                    {formErrors.examLabel && <p className="text-xs text-red-500">{formErrors.examLabel}</p>}
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <p className="text-xs font-medium text-slate-600">Bridge Course&nbsp;</p>
                    <label htmlFor="isBridgeCourse" className="h-8 inline-flex items-center gap-2 rounded-md border border-border px-2.5 text-[12px] text-slate-700 cursor-pointer whitespace-nowrap">
                      <Checkbox
                        id="isBridgeCourse"
                        checked={formState.isBridgeCourse}
                        onCheckedChange={(v) => setFormState((s) => ({ ...s, isBridgeCourse: !!v }))}
                      />
                      Is Bridge Course
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button className="h-8 text-[12px]" onClick={handleUpdate}>Update</Button>
                      <Button variant="outline" className="h-8 text-[12px]" onClick={clearForm}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button className="h-8 text-[12px]" onClick={handleAdd}>Add</Button>
                  )}
                </div>
              </div>

              <div className="app-card overflow-hidden mt-4">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">SI.No</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Regulation</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Course Group</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Course Year</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Exam Label</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Bridge Course</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-black uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
                            <p className="text-sm">No records found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((row, i) => (
                        <tr key={`${row.examMasterDetailsId ?? 'new'}-${row.regulationId ?? ''}-${row.courseGroupId ?? ''}-${row.courseYearId ?? ''}-${i}`} className="border-b border-slate-100 hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-2.5">{i + 1}</td>
                          <td className="px-4 py-2.5">{row.regulationCode || row.regulationId}</td>
                          <td className="px-4 py-2.5">{row.courseGroupCode || row.courseGroupId}</td>
                          <td className="px-4 py-2.5">{row.courseYearName || row.courseYearId}</td>
                          <td className="px-4 py-2.5">{row.examLabel}</td>
                          <td className="px-4 py-2.5">{row.isBridgeCourse ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-8 text-[12px]" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button className="h-8 text-[12px]" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>
    </PageContainer>
  )
}

export default function ExamMasterDetailsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamMasterDetailsInner />
    </Suspense>
  )
}

