'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Table, type TableColumn } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createFeeSchStructure,
  createScholarshipValue,
  deleteScholarshipValue,
  getFeeSchStructureById,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  listCourseYearsForFeeStructure,
  listScholarshipTypes,
  listScholarshipValuesByStructure,
  updateFeeSchStructure,
  updateScholarshipValue,
} from '@/services'
import type { FeeCategory } from '@/types/fee-category'
import type { FeeParticular } from '@/types/fee-particular'
import type { FeeStructureCourseYearTab, FeeStructureParticularLine } from '@/types/fee-structure'
import type { ScholarshipType, ScholarshipValueRow } from '@/types/scholarship'

const LIST_PATH = '/scholarship-management/scholarship-value'
const EMPTY_SCHOLARSHIP_TYPES: ScholarshipType[] = []
const EMPTY_SCHOLARSHIP_VALUES: ScholarshipValueRow[] = []
const EMPTY_FEE_CATEGORIES: FeeCategory[] = []
const EMPTY_FEE_PARTICULARS: FeeParticular[] = []

function mapValueToLine(
  v: ScholarshipValueRow,
  feeCategories: FeeCategory[],
  feeParticulars: FeeParticular[],
): SchParticularLine {
  const feeCategoryId = Number(v.feeCategoryId ?? 0)
  const feeParticularsId = Number(v.feeParticularsId ?? 0)
  const category = feeCategories.find((c) => c.feeCategoryId === feeCategoryId)
  const particular = feeParticulars.find((p) => p.feeParticularsId === feeParticularsId)
  return {
    scholarshipValueId: v.scholarshipValueId,
    feeCategoryId,
    feeParticularsId,
    courseYearId: Number(v.courseYearId ?? 0),
    yearNo: Number(v.yearNo ?? 0) || undefined,
    feeAmount: Number(v.scholarshipAmount ?? v.feeAmount ?? 0),
    priority: 0,
    categoryName: v.categoryName || category?.categoryName,
    particularName: v.particularName ?? v.particularsName ?? particular?.particularsName,
    isActive: true,
  }
}

const headerSchema = z.object({
  scholarshipTypeId: z.number().min(1, 'Scholarship type is required'),
  scholarshipAmount: z.coerce.number().min(0, 'Scholarship amount is required'),
  scholarshipTypeDesc: z.string().optional(),
  isForLateral: z.boolean().optional(),
})

type HeaderValues = z.infer<typeof headerSchema>

type SchParticularLine = FeeStructureParticularLine & {
  scholarshipValueId?: number
  yearNo?: number
}

function lineMatchesCourseYearTab(line: SchParticularLine, tab: FeeStructureCourseYearTab): boolean {
  const courseYearId = Number(line.courseYearId ?? 0)
  if (courseYearId > 0 && courseYearId === tab.courseYearId) return true
  const yearNo = Number(line.yearNo ?? 0)
  if (yearNo > 0 && yearNo === tab.yearNo) return true
  return false
}

type ParticularDraft = {
  feeCategoryId: string | null
  feeParticularsId: string | null
  scholarshipAmount: string
}

const EMPTY_DRAFT: ParticularDraft = {
  feeCategoryId: null,
  feeParticularsId: null,
  scholarshipAmount: '0',
}

export type ScholarshipStructureFormProps = {
  mode: 'add' | 'edit'
  feeSchStructureId?: number
  universityId?: number
  collegeId?: number
  courseId?: number
  batchId?: number
  academicYearId?: number
}

export function ScholarshipStructureForm({
  mode,
  feeSchStructureId,
  universityId: universityIdProp,
  collegeId: collegeIdProp,
  courseId: courseIdProp,
  batchId: batchIdProp,
  academicYearId: academicYearIdProp,
}: Readonly<ScholarshipStructureFormProps>) {
  const router = useRouter()
  const isEditing = mode === 'edit'

  const [yearTabs, setYearTabs] = useState<FeeStructureCourseYearTab[]>([])
  const [activeYearTab, setActiveYearTab] = useState('')
  const [particularOpen, setParticularOpen] = useState(true)
  const [draft, setDraft] = useState<ParticularDraft>(EMPTY_DRAFT)
  const [removedValueIds, setRemovedValueIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const hydratedHeaderKeyRef = useRef<string | null>(null)
  const hydratedYearTabsKeyRef = useRef<string | null>(null)
  const addYearTabsCourseIdRef = useRef<number | null>(null)

  const {
    data: structure,
    isLoading: structureLoading,
    isFetched: structureFetched,
  } = useQuery({
    queryKey: QK.feeSchStructures.detail(feeSchStructureId ?? 0),
    queryFn: () => getFeeSchStructureById(feeSchStructureId!),
    enabled: isEditing && !!feeSchStructureId,
  })

  const {
    data: existingValuesData,
    isLoading: valuesLoading,
    isFetched: valuesFetched,
  } = useQuery({
    queryKey: QK.feeSchStructures.values(feeSchStructureId ?? 0),
    queryFn: () => listScholarshipValuesByStructure(feeSchStructureId!),
    enabled: isEditing && !!feeSchStructureId,
  })
  const existingValues = existingValuesData ?? EMPTY_SCHOLARSHIP_VALUES
  const existingValuesKey = useMemo(
    () => existingValues.map((v) => v.scholarshipValueId).join(','),
    [existingValuesData],
  )

  const collegeId = structure?.collegeId ?? collegeIdProp ?? 0
  const courseId = structure?.courseId ?? courseIdProp ?? 0
  const batchId = structure?.batchId ?? batchIdProp
  const academicYearId = structure?.academicYearId ?? academicYearIdProp
  const universityId = structure?.universityId ?? universityIdProp ?? 0
  const { data: scholarshipTypesData } = useQuery({
    queryKey: QK.scholarshipTypes.list(),
    queryFn: listScholarshipTypes,
  })
  const scholarshipTypes = scholarshipTypesData ?? EMPTY_SCHOLARSHIP_TYPES

  const { data: feeCategoriesData } = useQuery({
    queryKey: ['scholarshipStructure', 'feeCategories', collegeId],
    queryFn: () => listFeeCategoriesByCollege(collegeId),
    enabled: collegeId > 0,
  })
  const feeCategories = feeCategoriesData ?? EMPTY_FEE_CATEGORIES

  const { data: feeParticularsData } = useQuery({
    queryKey: ['scholarshipStructure', 'feeParticulars', collegeId],
    queryFn: () => listFeeParticularsByCollege(collegeId),
    enabled: collegeId > 0,
  })
  const feeParticulars = feeParticularsData ?? EMPTY_FEE_PARTICULARS

  const typeOptions = useMemo(
    () =>
      scholarshipTypes
        .filter((t) => t.isActive)
        .map((t) => ({
          value: String(t.scholarshipTypeId),
          label: t.scholarshipTypeCode ?? t.scholarshipTypeDesc,
        })),
    [scholarshipTypes],
  )

  const categoryOptions = useMemo(
    () =>
      [...feeCategories]
        .sort((a, b) => (a.categoryName ?? '').localeCompare(b.categoryName ?? ''))
        .map((c) => ({ value: String(c.feeCategoryId), label: c.categoryName })),
    [feeCategories],
  )

  const particularOptions = useMemo(
    () =>
      feeParticulars.map((p) => ({
        value: String(p.feeParticularsId),
        label: p.particularsName,
      })),
    [feeParticulars],
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<HeaderValues>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      scholarshipTypeId: undefined,
      scholarshipAmount: 0,
      scholarshipTypeDesc: '',
      isForLateral: false,
    },
  })

  const loadYearTabs = useCallback(
    async (nextCourseId: number, lateral: boolean, values: SchParticularLine[]) => {
      const tabs = await listCourseYearsForFeeStructure(nextCourseId, lateral)
      if (values.length === 0) {
        setYearTabs(tabs)
        if (tabs.length > 0) setActiveYearTab(String(tabs[0].courseYearId))
        return
      }
      const merged = tabs.map((tab) => {
        const lines = values
          .filter((v) => lineMatchesCourseYearTab(v, tab))
          .map((v) => ({
            scholarshipValueId: v.scholarshipValueId,
            feeCategoryId: Number(v.feeCategoryId ?? 0),
            feeParticularsId: Number(v.feeParticularsId ?? 0),
            feeAmount: Number(v.scholarshipAmount ?? v.feeAmount ?? 0),
            priority: 0,
            categoryName: v.categoryName,
            particularName: v.particularName ?? v.particularsName,
            isActive: true,
          }))
        return { ...tab, particulars: lines }
      })
      setYearTabs(merged)
      if (merged.length > 0) setActiveYearTab(String(merged[0].courseYearId))
    },
    [],
  )

  const structureId = structure?.feeSchStructureId
  const editStructureReady =
    isEditing &&
    structureFetched &&
    valuesFetched &&
    !structureLoading &&
    !valuesLoading &&
    !!structure &&
    !!structureId

  useEffect(() => {
    if (!isEditing) {
      hydratedHeaderKeyRef.current = null
      hydratedYearTabsKeyRef.current = null
      return
    }
    if (!editStructureReady || !structure) return

    const headerKey = String(structureId)
    if (hydratedHeaderKeyRef.current !== headerKey) {
      hydratedHeaderKeyRef.current = headerKey

      const typeId =
        structure.scholarshipTypeId ??
        scholarshipTypes.find(
          (t) =>
            t.scholarshipTypeCode === structure.scholarshipType ||
            t.scholarshipTypeDesc === structure.scholarshipTypeDesc,
        )?.scholarshipTypeId

      reset({
        scholarshipTypeId: typeId,
        scholarshipAmount: structure.scholarshipAmount ?? 0,
        scholarshipTypeDesc:
          structure.scholarshipTypeDesc ??
          scholarshipTypes.find((t) => t.scholarshipTypeId === typeId)?.scholarshipTypeDesc ??
          '',
        isForLateral: structure.isForLateral ?? false,
      })
    }
  }, [isEditing, editStructureReady, structure, structureId, scholarshipTypes, reset])

  useEffect(() => {
    if (!isEditing || !editStructureReady || !structure?.courseId) return

    const yearTabsKey = `${structureId}:${existingValuesKey}:${feeCategories.length}:${feeParticulars.length}`
    if (hydratedYearTabsKeyRef.current === yearTabsKey) return
    hydratedYearTabsKeyRef.current = yearTabsKey

    const lines = existingValues.map((v) => mapValueToLine(v, feeCategories, feeParticulars))
    void loadYearTabs(structure.courseId, structure.isForLateral ?? false, lines)
  }, [
    isEditing,
    editStructureReady,
    structure?.courseId,
    structure?.isForLateral,
    structureId,
    existingValuesKey,
    existingValuesData,
    feeCategories.length,
    feeParticulars.length,
    loadYearTabs,
  ])

  useEffect(() => {
    if (isEditing || !courseId) return
    if (addYearTabsCourseIdRef.current === courseId) return
    addYearTabsCourseIdRef.current = courseId
    void loadYearTabs(courseId, false, [])
  }, [isEditing, courseId, loadYearTabs])

  function addParticularToYear(yearKey: string) {
    if (!draft.feeCategoryId || !draft.feeParticularsId) {
      toastError(new Error('Select fee category and particular'))
      return
    }
    const amount = Number(draft.scholarshipAmount)
    if (!Number.isFinite(amount)) {
      toastError(new Error('Enter a valid scholarship amount'))
      return
    }
    const category = feeCategories.find((c) => String(c.feeCategoryId) === draft.feeCategoryId)
    const particular = feeParticulars.find((p) => String(p.feeParticularsId) === draft.feeParticularsId)
    const line: SchParticularLine = {
      feeCategoryId: Number(draft.feeCategoryId),
      feeParticularsId: Number(draft.feeParticularsId),
      feeAmount: amount,
      priority: 0,
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
  }

  function removeParticular(yearKey: string, index: number) {
    setYearTabs((prev) =>
      prev.map((y) => {
        if (String(y.courseYearId) !== yearKey) return y
        const target = y.particulars[index] as SchParticularLine | undefined
        if (target?.scholarshipValueId) {
          setRemovedValueIds((ids) => [...ids, target.scholarshipValueId!])
        }
        return { ...y, particulars: y.particulars.filter((_, i) => i !== index) }
      }),
    )
  }

  async function persistValues(structureId: number, header: HeaderValues) {
    const base = {
      feeSchStructureId: structureId,
      collegeId,
      courseId,
      batchId: batchId ?? undefined,
      academicYearId: academicYearId ?? undefined,
      isActive: true,
      reason: 'active',
    }

    for (const id of removedValueIds) {
      await deleteScholarshipValue(id)
    }

    for (const tab of yearTabs) {
      for (const raw of tab.particulars) {
        const line = raw as SchParticularLine
        const payload = {
          ...base,
          feeCategoryId: line.feeCategoryId,
          feeParticularsId: line.feeParticularsId,
          courseYearId: tab.courseYearId,
          scholarshipAmount: line.feeAmount,
        }
        if (line.scholarshipValueId) {
          await updateScholarshipValue(line.scholarshipValueId, payload)
        } else {
          await createScholarshipValue(payload)
        }
      }
    }

    await updateFeeSchStructure(structureId, {
      scholarshipTypeId: header.scholarshipTypeId,
      scholarshipAmount: header.scholarshipAmount,
      scholarshipTypeDesc: header.scholarshipTypeDesc,
      isForLateral: header.isForLateral ?? false,
      isActive: true,
      reason: 'active',
    })
  }

  async function onSubmit(header: HeaderValues) {
    if (!collegeId || !courseId) {
      toastError(new Error('College and course are required'))
      return
    }
    setSaving(true)
    try {
      if (isEditing && feeSchStructureId) {
        await persistValues(feeSchStructureId, header)
        toastSuccess('Scholarship structure updated')
      } else {
        const created = await createFeeSchStructure({
          universityId,
          collegeId,
          courseId,
          batchId: batchId ?? undefined,
          academicYearId: academicYearId ?? undefined,
          scholarshipTypeId: header.scholarshipTypeId,
          scholarshipAmount: header.scholarshipAmount,
          scholarshipTypeDesc: header.scholarshipTypeDesc,
          isForLateral: header.isForLateral ?? false,
          isActive: true,
          reason: 'active',
        })
        const structureId = Number(created.feeSchStructureId)
        if (!structureId) throw new Error('Structure id missing from create response')
        await persistValues(structureId, header)
        toastSuccess('Scholarship structure created')
      }
      router.push(LIST_PATH)
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} scholarship structure`)
    } finally {
      setSaving(false)
    }
  }

  const loading = isEditing && (!editStructureReady || structureLoading || valuesLoading)
  const title = isEditing ? 'Edit ScholarShip Structure' : 'Add ScholarShip Structure'

  const tableColumns: TableColumn<SchParticularLine>[] = [
    { id: 'si', label: 'Sl.No', width: 56, render: (_, i) => i + 1 },
    { id: 'cat', label: 'Fee Category', render: (row) => row.categoryName ?? '—' },
    { id: 'part', label: 'Fee Particular', render: (row) => row.particularName ?? '—' },
    {
      id: 'amt',
      label: 'Fee Amount',
      render: (row) => Number(row.feeAmount ?? 0).toFixed(2),
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 72,
      render: (row, index) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive"
          aria-label="Remove particular"
          onClick={() => removeParticular(activeYearTab, index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading scholarship structure…</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit(onSubmit, () => {
            toastError(new Error('Please fill in all required fields'))
          })()
        }}
        className="space-y-5"
      >
        <div className="app-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h1 className="text-[15px] font-semibold leading-tight text-[#5da394]">{title}</h1>
          </div>
          <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Controller
              name="scholarshipTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Scholarship Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    const nextId = v ? Number(v) : undefined
                    field.onChange(nextId)
                    const selected = scholarshipTypes.find((t) => t.scholarshipTypeId === nextId)
                    setValue('scholarshipTypeDesc', selected?.scholarshipTypeDesc ?? '', {
                      shouldDirty: false,
                    })
                  }}
                  options={typeOptions}
                  placeholder="Select scholarship type"
                  searchable
                  error={errors.scholarshipTypeId?.message}
                />
              )}
            />
            <div className="space-y-1">
              <Label className="text-[12px]">Scholarship Amount *</Label>
              <Input type="number" min={0} className="h-9 text-[12px]" {...register('scholarshipAmount')} />
              {errors.scholarshipAmount && (
                <p className="text-xs text-red-500">{errors.scholarshipAmount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Scholarship Type Description</Label>
              <Input className="h-9 text-[12px]" readOnly {...register('scholarshipTypeDesc')} />
            </div>
            <Controller
              name="isForLateral"
              control={control}
              render={({ field }) => (
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isForLateral"
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <Label htmlFor="isForLateral" className="text-[13px] font-normal">
                      Is For Lateral
                    </Label>
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        {courseId > 0 && yearTabs.length > 0 ? (
          <FilterCard title="Select Scholarship Structure course years" defaultOpen>
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
                const lines = tab.particulars as SchParticularLine[]
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
                            onChange={(v) => setDraft((d) => ({ ...d, feeParticularsId: v }))}
                            options={particularOptions}
                            searchable
                          />
                          <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-[#334155]">
                              ScholarShip Amount *
                            </Label>
                            <Input
                              type="number"
                              className="h-9 text-[13px]"
                              value={draft.scholarshipAmount}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, scholarshipAmount: e.target.value }))
                              }
                            />
                          </div>
                          <div className="flex items-end justify-end gap-2 pb-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDraft(EMPTY_DRAFT)}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addParticularToYear(yearKey)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Table columns={tableColumns} rows={lines} emptyText="No particulars added." embedded />
                  </TabsContent>
                )
              })}
            </Tabs>
          </FilterCard>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button type="submit" disabled={saving}>
            Save
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
