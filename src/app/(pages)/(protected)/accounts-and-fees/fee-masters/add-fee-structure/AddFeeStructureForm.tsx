'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FilterCard, FILTER_CARD_SELECT_CLASS, ConfirmDialog } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Table, type TableColumn } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GM_CODES } from '@/config/constants/ui'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createCollegeFeeStructure,
  getCourseGroups,
  listAcademicYearsByUniversity,
  listBatchesByCourse,
  listCollegesActive,
  listCourseYearsForFeeStructure,
  listCoursesByUniversity,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  listQuotaOptions,
} from '@/services'
import type {
  FeeStructureCourseGroupSelection,
  FeeStructureCourseYearTab,
  FeeStructureParticularLine,
} from '@/types/fee-structure'

type CourseGroupRow = FeeStructureCourseGroupSelection & {
  groupCode?: string
  checked: boolean
}

type ParticularDraft = {
  feeCategoryId: string | null
  feeParticularsId: string | null
  feeAmount: string
  priority: string
  lateralFeeAmount: string
}

const EMPTY_DRAFT: ParticularDraft = {
  feeCategoryId: null,
  feeParticularsId: null,
  feeAmount: '0',
  priority: '0',
  lateralFeeAmount: '0',
}

const FEE_STRUCTURE_LIST = '/accounts-and-fees/fee-masters/fee-structure'

function toOption(
  rows: Array<Record<string, unknown>>,
  valueKey: string,
  labelKey: string,
) {
  return rows.map((r) => ({
    value: String(r[valueKey] ?? ''),
    label: String(r[labelKey] ?? r[valueKey] ?? ''),
  }))
}

export function AddFeeStructureForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAcademicFee = searchParams.get('isAcademicFee') === 'true'
  const initialCollegeId = searchParams.get('cId')
  const initialCourseId = searchParams.get('courseId')
  const initialBatchId = searchParams.get('batchId')
  const initialAcademicYearId = searchParams.get('aId')

  const [structureName, setStructureName] = useState('')
  const [quotaId, setQuotaId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(initialCollegeId)
  const [courseId, setCourseId] = useState<string | null>(initialCourseId)
  const [batchId, setBatchId] = useState<string | null>(initialBatchId)
  const [academicYearId, setAcademicYearId] = useState<string | null>(initialAcademicYearId)
  const [isLateral, setIsLateral] = useState(false)
  const [universityId, setUniversityId] = useState(0)

  const [courseGroups, setCourseGroups] = useState<CourseGroupRow[]>([])
  const [yearTabs, setYearTabs] = useState<FeeStructureCourseYearTab[]>([])
  const [activeYearTab, setActiveYearTab] = useState('')
  const [particularOpen, setParticularOpen] = useState(true)
  const [draft, setDraft] = useState<ParticularDraft>(EMPTY_DRAFT)
  const [showLateralAmount, setShowLateralAmount] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ yearKey: string; index: number } | null>(null)

  const { data: colleges = [] } = useQuery({
    queryKey: ['addFeeStructure', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: quotas = [] } = useQuery({
    queryKey: ['addFeeStructure', 'quotas'],
    queryFn: listQuotaOptions,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['addFeeStructure', 'courses', universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['addFeeStructure', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: isAcademicFee && universityId > 0,
  })

  const { data: batches = [] } = useQuery({
    queryKey: ['addFeeStructure', 'batches', courseId],
    queryFn: () => listBatchesByCourse(Number(courseId)),
    enabled: !isAcademicFee && !!courseId,
  })

  const collegeNum = Number(collegeId ?? 0)

  const { data: feeCategories = [] } = useQuery({
    queryKey: ['addFeeStructure', 'feeCategories', collegeNum],
    queryFn: () => listFeeCategoriesByCollege(collegeNum),
    enabled: collegeNum > 0,
  })

  const { data: feeParticulars = [] } = useQuery({
    queryKey: ['addFeeStructure', 'feeParticulars', collegeNum],
    queryFn: () => listFeeParticularsByCollege(collegeNum),
    enabled: collegeNum > 0,
  })

  const sortedCategories = useMemo(
    () =>
      [...feeCategories].sort((a, b) =>
        (a.categoryName ?? '').localeCompare(b.categoryName ?? '', undefined, { sensitivity: 'base' }),
      ),
    [feeCategories],
  )

  const collegeOptions = useMemo(() => toOption(colleges, 'collegeId', 'collegeCode'), [colleges])
  const quotaOptions = useMemo(
    () =>
      quotas.map((q) => ({
        value: String(q.generalDetailId ?? ''),
        label: String(q.generalDetailDisplayName ?? q.generalDetailName ?? ''),
      })),
    [quotas],
  )
  const courseOptions = useMemo(() => toOption(courses, 'courseId', 'courseCode'), [courses])
  const batchOptions = useMemo(() => toOption(batches, 'batchId', 'batchName'), [batches])
  const academicYearOptions = useMemo(
    () => toOption(academicYears, 'academicYearId', 'academicYear'),
    [academicYears],
  )
  const categoryOptions = useMemo(
    () =>
      sortedCategories.map((c) => ({
        value: String(c.feeCategoryId),
        label: c.categoryName,
      })),
    [sortedCategories],
  )
  const particularOptions = useMemo(
    () =>
      feeParticulars.map((p) => ({
        value: String(p.feeParticularsId),
        label: p.particularsName,
      })),
    [feeParticulars],
  )

  const detailsReady = isAcademicFee
    ? !!collegeId && !!courseId && !!academicYearId
    : !!collegeId && !!courseId && !!batchId

  const syncUniversity = useCallback(
    (nextCollegeId: string | null) => {
      const college = colleges.find((c) => String(c.collegeId) === nextCollegeId)
      setUniversityId(Number(college?.universityId ?? college?.fk_university_id ?? 0))
    },
    [colleges],
  )

  useEffect(() => {
    if (collegeId && colleges.length > 0) syncUniversity(collegeId)
  }, [collegeId, colleges, syncUniversity])

  const loadCourseDependents = useCallback(
    async (nextCourseId: string, lateral: boolean) => {
      const cid = Number(nextCourseId)
      if (!cid) {
        setCourseGroups([])
        setYearTabs([])
        return
      }
      const [groups, years] = await Promise.all([
        getCourseGroups(cid),
        listCourseYearsForFeeStructure(cid, lateral),
      ])
      setCourseGroups(
        groups.map((g) => ({
          ...g,
          courseGroupId: Number(g.courseGroupId),
          groupCode: String(g.groupCode ?? ''),
          checked: false,
          collegeId: collegeNum,
          quotaId: Number(quotaId ?? 0) || undefined,
        })),
      )
      setYearTabs(years)
      if (years.length > 0) setActiveYearTab(String(years[0].courseYearId))
    },
    [collegeNum, quotaId],
  )

  useEffect(() => {
    if (courseId) void loadCourseDependents(courseId, isLateral)
  }, [courseId, isLateral, loadCourseDependents])

  const saveMutation = useMutation({
    mutationFn: createCollegeFeeStructure,
    onSuccess: () => {
      toastSuccess('Fee structure saved successfully.')
      goBack()
    },
    onError: (e: Error) => {
      toastError(e.message ?? 'Failed to save fee structure.')
    },
  })

  function goBack() {
    if (isAcademicFee && collegeId && academicYearId) {
      router.push(
        `${FEE_STRUCTURE_LIST}?cId=${collegeId}&aId=${academicYearId}&isAcademicFee=true`,
      )
      return
    }
    if (collegeId && courseId && batchId) {
      router.push(
        `${FEE_STRUCTURE_LIST}?cId=${collegeId}&courseId=${courseId}&batchId=${batchId}&isAcademicFee=false`,
      )
      return
    }
    router.push(FEE_STRUCTURE_LIST)
  }

  function selectedParticular(particularId: string | null) {
    if (!particularId) {
      setShowLateralAmount(false)
      return
    }
    const row = feeParticulars.find((p) => String(p.feeParticularsId) === particularId)
    setShowLateralAmount(row?.particularsCode === GM_CODES.SPECIAL_FEE)
  }

  function addParticularToYear(yearKey: string) {
    const tab = yearTabs.find((y) => String(y.courseYearId) === yearKey)
    if (!tab) return
    if (!draft.feeCategoryId || !draft.feeParticularsId) {
      toastError('Select fee category and particular.')
      return
    }
    const amount = Number(draft.feeAmount)
    if (!Number.isFinite(amount)) {
      toastError('Enter a valid fee amount.')
      return
    }
    const category = feeCategories.find((c) => String(c.feeCategoryId) === draft.feeCategoryId)
    const particular = feeParticulars.find((p) => String(p.feeParticularsId) === draft.feeParticularsId)
    const line: FeeStructureParticularLine = {
      feeCategoryId: Number(draft.feeCategoryId),
      feeParticularsId: Number(draft.feeParticularsId),
      feeAmount: amount,
      priority: Number(draft.priority) || 0,
      lateralFeeAmount: Number(draft.lateralFeeAmount) || 0,
      categoryName: category?.categoryName,
      particularName: particular?.particularsName,
      isActive: true,
    }
    setYearTabs((prev) =>
      prev.map((y) =>
        String(y.courseYearId) === yearKey ? { ...y, particulars: [...y.particulars, line] } : y,
      ),
    )
    setDraft(EMPTY_DRAFT)
    setShowLateralAmount(false)
  }

  function removeParticular(yearKey: string, index: number) {
    setYearTabs((prev) =>
      prev.map((y) =>
        String(y.courseYearId) === yearKey
          ? { ...y, particulars: y.particulars.filter((_, i) => i !== index) }
          : y,
      ),
    )
    setDeleteTarget(null)
  }

  function buildPayload() {
    const now = new Date()
    const college = colleges.find((c) => String(c.collegeId) === collegeId)
    const course = courses.find((c) => String(c.courseId) === courseId)
    const batch = batches.find((b) => String(b.batchId) === batchId)
    const ay = academicYears.find((a) => String(a.academicYearId) === academicYearId)

    const particulars: FeeStructureParticularLine[] = []
    yearTabs.forEach((tab) => {
      tab.particulars.forEach((p) => {
        particulars.push({
          ...p,
          fromDate: now,
          toDate: now,
          collegeId: collegeNum,
          courseYearId: tab.courseYearId,
          courseYearName: tab.courseYearName,
          feeLabel: tab.feeLabel,
          bankAccountTypeId: null,
          cashAccountTypeId: null,
          mappingAccountTypeId: null,
          isActive: true,
        })
      })
    })

    return {
      collegeId: collegeNum,
      courseId: Number(courseId),
      batchId: isAcademicFee ? null : Number(batchId),
      academicYearId: isAcademicFee ? Number(academicYearId) : null,
      quotaId: Number(quotaId),
      classGroupName: structureName.trim(),
      isLateral,
      isActive: true,
      isAcademicFee,
      activefromdate: now,
      activetodate: now,
      feeStructureParticularDTOs: particulars,
      feeStructureCourseyrDTOs: courseGroups.filter((g) => g.checked),
      college: college?.collegeCode ? String(college.collegeCode) : undefined,
      course: course?.courseCode ? String(course.courseCode) : undefined,
      batch: batch?.batchName ? String(batch.batchName) : undefined,
      academicYear: ay?.academicYear ? String(ay.academicYear) : undefined,
    }
  }

  function validateBeforeSave(): string | null {
    if (!structureName.trim()) return 'Fee structure name is required.'
    if (!quotaId) return 'Quota is required.'
    if (!collegeId) return 'College is required.'
    if (!courseId) return 'Course is required.'
    if (isAcademicFee && !academicYearId) return 'Academic year is required.'
    if (!isAcademicFee && !batchId) return 'Batch is required.'
    if (courseGroups.filter((g) => g.checked).length === 0) {
      return 'Select at least one course group (branch).'
    }
    const totalParticulars = yearTabs.reduce((n, t) => n + t.particulars.length, 0)
    if (totalParticulars === 0) return 'Add at least one fee particular.'
    return null
  }

  function handleSaveClick() {
    const err = validateBeforeSave()
    if (err) {
      toastError(err)
      return
    }
    setPreviewOpen(true)
  }

  function confirmSave() {
    saveMutation.mutate(buildPayload())
    setPreviewOpen(false)
  }

  const particularTableColumns: TableColumn<FeeStructureParticularLine>[] = [
    { id: 'si', label: 'SI.No', width: 8, render: (_, i) => i + 1 },
    { id: 'categoryName', label: 'Fee Category', width: 22 },
    { id: 'particularName', label: 'Fee Particular', width: 22 },
    { id: 'feeAmount', label: 'Fee Amount', width: 14 },
    { id: 'lateralFeeAmount', label: 'Lateral Fee Amount', width: 16 },
    { id: 'priority', label: 'Priority', width: 10 },
    {
      id: 'actions',
      label: 'Actions',
      width: 8,
      type: 'action',
      render: (_row, index) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive"
          aria-label="Remove particular"
          onClick={() => setDeleteTarget({ yearKey: activeYearTab, index })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  const preview = previewOpen ? buildPayload() : null
  const checkedGroupCodes = courseGroups
    .filter((g) => g.checked)
    .map((g) => g.groupCode)
    .join(', ')

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Add Fee Structure">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#334155]">Fee Structure Name *</Label>
              <Input
                className="h-9 text-[13px]"
                value={structureName}
                onChange={(e) => setStructureName(e.target.value)}
                placeholder="Fee structure name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Quota"
              required
              value={quotaId}
              onChange={setQuotaId}
              options={quotaOptions}
              searchable
            />
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v)
                setCourseId(null)
                setBatchId(null)
                setAcademicYearId(null)
                syncUniversity(v)
              }}
              options={collegeOptions}
              searchable
            />
            {isAcademicFee ? (
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Academic Year"
                required
                value={academicYearId}
                onChange={setAcademicYearId}
                options={academicYearOptions}
                searchable
                disabled={!collegeId}
              />
            ) : null}
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Course"
              required
              value={courseId}
              onChange={(v) => {
                setCourseId(v)
                setBatchId(null)
              }}
              options={courseOptions}
              searchable
              disabled={!collegeId}
            />
            {!isAcademicFee ? (
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Batch"
                required
                value={batchId}
                onChange={setBatchId}
                options={batchOptions}
                searchable
                disabled={!courseId}
              />
            ) : null}
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#334155]">
                <Checkbox checked={isLateral} onCheckedChange={(v) => setIsLateral(v === true)} />
                Is For Lateral
              </label>
            </div>
          </div>
        </div>
      </FilterCard>

      {detailsReady && courseGroups.length > 0 ? (
        <FilterCard title="Select Fee Structure course years" defaultOpen>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {courseGroups.map((group) => (
                <label
                  key={group.courseGroupId}
                  className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#334155]"
                >
                  <Checkbox
                    checked={group.checked}
                    onCheckedChange={(v) => {
                      const checked = v === true
                      setCourseGroups((prev) =>
                        prev.map((g) =>
                          g.courseGroupId === group.courseGroupId
                            ? { ...g, checked, quotaId: Number(quotaId ?? 0) || undefined }
                            : g,
                        ),
                      )
                    }}
                  />
                  {group.groupCode}
                </label>
              ))}
            </div>

            {yearTabs.length > 0 ? (
              <Tabs value={activeYearTab} onValueChange={setActiveYearTab}>
                <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
                  {yearTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.courseYearId}
                      value={String(tab.courseYearId)}
                      className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-[#c9a227] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {tab.feeLabel}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {yearTabs.map((tab) => {
                  const yearKey = String(tab.courseYearId)
                  return (
                    <TabsContent key={yearKey} value={yearKey} className="mt-4 space-y-4">
                      <Collapsible open={particularOpen} onOpenChange={setParticularOpen}>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[13px] font-semibold text-[#334155]"
                          >
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add Category &amp; Particulars
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${particularOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-3 rounded-md border border-slate-200 p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Select
                              className={FILTER_CARD_SELECT_CLASS}
                              label="Fee Category"
                              required
                              value={draft.feeCategoryId}
                              onChange={(v) => setDraft((d) => ({ ...d, feeCategoryId: v }))}
                              options={categoryOptions}
                              searchable
                            />
                            <Select
                              className={FILTER_CARD_SELECT_CLASS}
                              label="Fee Particular"
                              required
                              value={draft.feeParticularsId}
                              onChange={(v) => {
                                setDraft((d) => ({ ...d, feeParticularsId: v }))
                                selectedParticular(v)
                              }}
                              options={particularOptions}
                              searchable
                            />
                            <div className="space-y-1.5">
                              <Label className="text-[13px] font-medium text-[#334155]">Fee Amount *</Label>
                              <Input
                                type="number"
                                className="h-9 text-[13px]"
                                value={draft.feeAmount}
                                onChange={(e) => setDraft((d) => ({ ...d, feeAmount: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[13px] font-medium text-[#334155]">Priority</Label>
                              <Input
                                type="number"
                                className="h-9 text-[13px]"
                                value={draft.priority}
                                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                              />
                            </div>
                            {showLateralAmount ? (
                              <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#334155]">
                                  Lateral Fee Amount
                                </Label>
                                <Input
                                  type="number"
                                  className="h-9 text-[13px]"
                                  value={draft.lateralFeeAmount}
                                  onChange={(e) =>
                                    setDraft((d) => ({ ...d, lateralFeeAmount: e.target.value }))
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDraft(EMPTY_DRAFT)
                                setShowLateralAmount(false)
                              }}
                            >
                              Clear
                            </Button>
                            <Button type="button" size="sm" onClick={() => addParticularToYear(yearKey)}>
                              Add
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Table
                        embedded
                        rows={tab.particulars}
                        columns={particularTableColumns}
                        emptyText="No particulars added for this year."
                        pageSize={0}
                      />
                    </TabsContent>
                  )
                })}
              </Tabs>
            ) : (
              <p className="text-[13px] text-slate-600">No fee years configured for this course.</p>
            )}
          </div>
        </FilterCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button type="button" onClick={handleSaveClick} disabled={saveMutation.isPending}>
          Save
        </Button>
      </div>

      {preview ? (
        <ConfirmDialog
          open={previewOpen}
          title="Save fee structure?"
          description={`${preview.classGroupName} — ${preview.college ?? ''} / ${preview.course ?? ''}${
            preview.batch ? ` / ${preview.batch}` : ''
          }${preview.academicYear ? ` / ${preview.academicYear}` : ''}. Groups: ${
            checkedGroupCodes || '—'
          }. Particulars: ${preview.feeStructureParticularDTOs.length}.`}
          confirmLabel="Save"
          confirmVariant="default"
          isLoading={saveMutation.isPending}
          onConfirm={confirmSave}
          onCancel={() => setPreviewOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove particular?"
        description="This line will be removed from the fee structure."
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteTarget) removeParticular(deleteTarget.yearKey, deleteTarget.index)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
