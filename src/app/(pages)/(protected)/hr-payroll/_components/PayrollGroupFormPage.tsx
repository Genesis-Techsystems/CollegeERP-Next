'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  Layers,
  Plus,
  Wallet,
  X,
} from 'lucide-react'
import { EmptyState } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getPayrollGroupById,
  listActiveCollegesForGeneralSettings,
  listPayrollCategoriesByCollege,
  listPaymentFrequencies,
  savePayrollGroup,
} from '@/services'
import { useQueryClient } from '@tanstack/react-query'

type CatRow = Record<string, unknown> & {
  payrollCategoryId?: number
  sortOrder?: string | number
  payrollCategoryGroupId?: number
  payrollCategoryType?: string
}

const WEEKLY_DAYS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const BIWEEKLY_DAYS = Array.from({ length: 15 }, (_, i) => i + 1)
const CATEGORY_TYPES: Array<'E' | 'D' | 'M'> = ['E', 'D', 'M']

const LIST_BACK_HREF = '/hr-payroll/payroll/payroll-group'

function categoryTypeLabel(t: unknown): string {
  if (t === 'E') return 'Earnings'
  if (t === 'D') return 'Deductions'
  if (t === 'M') return 'Management Deductions'
  return String(t ?? '')
}

function categoryTypeBadgeClass(t: unknown): string {
  if (t === 'E') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (t === 'D') return 'bg-amber-50 text-amber-900 border-amber-200'
  if (t === 'M') return 'bg-violet-50 text-violet-900 border-violet-200'
  return 'bg-muted text-muted-foreground'
}

function rowMatchesSearch(row: CatRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    row.payrollCategoryName,
    row.payrollCategoryCode,
    row.value,
    categoryTypeLabel(row.payrollCategoryType),
  ]
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ')
  return hay.includes(q)
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string
  description?: string
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'app-card overflow-hidden',
        className,
      )}
    >
      <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          {Icon ? (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-[hsl(var(--card-title))]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function CategoryTableShell({
  title,
  count,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  empty,
}: {
  title: string
  count: number
  search?: string
  onSearchChange?: (q: string) => void
  searchPlaceholder?: string
  children: ReactNode
  empty: ReactNode
}) {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">{title}</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">
            {count}
          </Badge>
        </div>
        {onSearchChange ? (
          <SearchInput
            className="w-full max-w-[200px]"
            placeholder={searchPlaceholder ?? 'Search…'}
            value={search ?? ''}
            onChange={onSearchChange}
          />
        ) : null}
      </div>
      <div className="flex-1 overflow-auto">
        {count === 0 ? (
          <div className="p-4">{empty}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function CategoryRowsTable({
  rows,
  mode,
  onRemove,
  onAdd,
  onSortOrderChange,
}: {
  rows: CatRow[]
  mode: 'selected' | 'available'
  onRemove?: (row: CatRow, index: number) => void
  onAdd?: (row: CatRow) => void
  onSortOrderChange?: (index: number, sortOrder: string) => void
}) {
  return (
    <table className="w-full text-[12px]">
      <thead className="sticky top-0 z-[1] bg-slate-50">
        <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <th className="px-3 py-2">Category</th>
          <th className="px-3 py-2">Code</th>
          <th className="px-3 py-2">Value</th>
          {mode === 'selected' ? <th className="px-3 py-2 w-24">Order</th> : null}
          <th className="px-3 py-2 w-20 text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORY_TYPES.map((type) => {
          const typed = rows.filter((r) => r.payrollCategoryType === type)
          if (typed.length === 0) return null
          return (
            <Fragment key={type}>
              <tr className="bg-slate-100/80">
                <td colSpan={mode === 'selected' ? 5 : 4} className="px-3 py-1.5">
                  <span
                    className={cn(
                      'inline-flex rounded border px-2 py-0.5 text-[11px] font-medium',
                      categoryTypeBadgeClass(type),
                    )}
                  >
                    {categoryTypeLabel(type)}
                  </span>
                </td>
              </tr>
              {typed.map((row) => {
                const index = rows.indexOf(row)
                const id = String(row.payrollCategoryId ?? index)
                return (
                  <tr
                    key={id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {String(row.payrollCategoryName ?? '')}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {String(row.payrollCategoryCode ?? '')}
                    </td>
                    <td className="px-3 py-2">{String(row.value ?? '—')}</td>
                    {mode === 'selected' && onSortOrderChange ? (
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-16 text-[12px]"
                          placeholder="—"
                          value={String(row.sortOrder ?? '')}
                          onChange={(e) => onSortOrderChange(index, e.target.value)}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right">
                      {mode === 'selected' && onRemove ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => onRemove(row, index)}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      ) : null}
                      {mode === 'available' && onAdd ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => onAdd(row)}
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

type PayrollGroupFormPageProps = { mode: 'add' | 'edit' }

export function PayrollGroupFormPage({ mode }: PayrollGroupFormPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)

  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [frequencies, setFrequencies] = useState<SelectOption[]>([])
  const [freqCodeById, setFreqCodeById] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [payrollGroupName, setPayrollGroupName] = useState('')
  const [paymentFrequency, setPaymentFrequency] = useState<number | null>(null)
  const [payslipGenerationDay, setPayslipGenerationDay] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  const [selectedCategories, setSelectedCategories] = useState<CatRow[]>([])
  const [availableCategories, setAvailableCategories] = useState<CatRow[]>([])
  const [deletedCategories, setDeletedCategories] = useState<CatRow[]>([])
  const [availableSearch, setAvailableSearch] = useState('')

  const paymentFreqCode = paymentFrequency != null ? freqCodeById[paymentFrequency] ?? '' : ''

  const payslipDayOptions = useMemo((): SelectOption[] => {
    let days: number[] = []
    if (paymentFreqCode === 'WEEKLY') days = WEEKLY_DAYS
    else if (paymentFreqCode === 'BIWEEKLY') days = BIWEEKLY_DAYS
    else if (paymentFreqCode === 'MONTHLY') days = MONTHLY_DAYS
    return days.map((d) => ({ value: String(d), label: String(d) }))
  }, [paymentFreqCode])

  const payslipHint = useMemo(() => {
    if (paymentFreqCode === 'WEEKLY') return 'Day of the week (1 = Monday through 7 = Sunday).'
    if (paymentFreqCode === 'BIWEEKLY') return 'Day within the bi-weekly cycle (1–15).'
    if (paymentFreqCode === 'MONTHLY') return 'Day of the month when payslips are generated (1–31).'
    return null
  }, [paymentFreqCode])

  const filteredAvailable = useMemo(
    () => availableCategories.filter((r) => rowMatchesSearch(r, availableSearch)),
    [availableCategories, availableSearch],
  )

  const loadAvailableForCollege = useCallback(
    async (cid: number, selected: CatRow[]) => {
      const all = await listPayrollCategoriesByCollege(cid)
      const selectedIds = new Set(selected.map((s) => Number(s.payrollCategoryId)))
      setAvailableCategories(
        all
          .filter((c) => !selectedIds.has(Number(c.payrollCategoryId)))
          .map((c) => ({ ...c, sortOrder: c.sortOrder ?? '' })),
      )
    },
    [],
  )

  useEffect(() => {
    void (async () => {
      try {
        const [collegeList, freqList] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          listPaymentFrequencies(),
        ])
        setColleges(
          collegeList.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
        setFrequencies(
          freqList.map((f) => ({
            value: String(f.generalDetailId ?? f.generalDetailID),
            label: String(f.generalDetailDisplayName ?? f.generalDetailCode ?? ''),
          })),
        )
        const codeMap: Record<number, string> = {}
        for (const f of freqList) {
          const id = Number(f.generalDetailId ?? f.generalDetailID)
          if (id) codeMap[id] = String(f.generalDetailCode ?? '')
        }
        setFreqCodeById(codeMap)
      } catch (e) {
        toastError(e, 'Failed to load form data')
      }
    })()
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !payrollGroupId) return
    void (async () => {
      setLoading(true)
      try {
        const group = await getPayrollGroupById(payrollGroupId)
        if (!group) {
          toastError(null, 'Payroll group not found')
          router.push(LIST_BACK_HREF)
          return
        }
        const cid = Number(group.collegeId ?? 0)
        const selected = (Array.isArray(group.payrollCategoryGroups)
          ? (group.payrollCategoryGroups as CatRow[])
          : []
        ).map((c) => ({ ...c, sortOrder: c.sortOrder ?? '' }))
        setCollegeId(cid || null)
        setPayrollGroupName(String(group.payrollGroupName ?? ''))
        setPaymentFrequency(Number(group.paymentFrequency) || null)
        setPayslipGenerationDay(
          group.payslipGenerationDay != null ? Number(group.payslipGenerationDay) : null,
        )
        setIsActive(group.isActive !== false)
        setReason(String(group.reason ?? 'active'))
        setSelectedCategories(selected)
        if (cid) await loadAvailableForCollege(cid, selected)
      } catch (e) {
        toastError(e, 'Failed to load payroll group')
      } finally {
        setLoading(false)
      }
    })()
  }, [mode, payrollGroupId, router, loadAvailableForCollege])

  const handleCollegeChange = (v: string | null) => {
    const cid = v ? Number(v) : null
    setCollegeId(cid)
    setSelectedCategories([])
    setDeletedCategories([])
    setAvailableSearch('')
    if (cid) void loadAvailableForCollege(cid, [])
    else setAvailableCategories([])
  }

  const addCategory = (item: CatRow) => {
    const id = Number(item.payrollCategoryId)
    setSelectedCategories((prev) => [...prev, { ...item, sortOrder: '' }])
    setAvailableCategories((prev) => prev.filter((c) => Number(c.payrollCategoryId) !== id))
  }

  const removeCategory = (item: CatRow, index: number) => {
    setSelectedCategories((prev) => prev.filter((_, i) => i !== index))
    setAvailableCategories((prev) => [...prev, item])
    if (item.payrollCategoryGroupId) {
      setDeletedCategories((prev) => [...prev, { ...item, isActive: false }])
    }
  }

  const updateSortOrder = (index: number, sortOrder: string) => {
    setSelectedCategories((prev) =>
      prev.map((row, i) => (i === index ? { ...row, sortOrder } : row)),
    )
  }

  const handleSave = async () => {
    if (!collegeId || !payrollGroupName.trim() || !paymentFrequency) {
      toastError(null, 'Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const groups = [...selectedCategories]
      if (mode === 'edit') groups.push(...deletedCategories)
      await savePayrollGroup({
        collegeId,
        payrollGroupName: payrollGroupName.trim(),
        empSalType: 'Salaried',
        paymentFrequency,
        payslipGenerationDay,
        isActive,
        reason: isActive ? 'active' : reason,
        payrollCategoryGroups: groups,
        ...(mode === 'edit' ? { payrollGroupId } : {}),
      })
      toastSuccess(mode === 'add' ? 'Payroll group created' : 'Payroll group updated')
      void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.payrollGroups() })
      router.push(LIST_BACK_HREF)
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'add' ? 'Add Payroll Group' : 'Edit Payroll Group'

  if (mode === 'edit' && !payrollGroupId) {
    return (
      <PageContainer>
        <EmptyState
          title="Payroll group not specified"
          description="Open this page from the payroll groups list to edit a group."
          action={{ label: 'Back to list', onClick: () => router.push(LIST_BACK_HREF) }}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push(LIST_BACK_HREF)}
            aria-label="Back to payroll groups"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))] inline-flex items-center gap-2">
              <Layers className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure salary preferences and assign payroll categories for this group.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
          <Link href={LIST_BACK_HREF}>Cancel</Link>
        </Button>
      </div>

      {loading ? (
        <div className="app-card px-4 py-12 text-center text-sm text-muted-foreground">
          Loading payroll group…
        </div>
      ) : (
        <>
          <FormSection
            title="Group details"
            description="College and display name for this payroll group."
            icon={Layers}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
              <Select
                label="College"
                required
                value={collegeId != null ? String(collegeId) : ''}
                onChange={handleCollegeChange}
                options={colleges}
                placeholder="Select college"
                searchable
              />
              <div className="space-y-1.5">
                <Label htmlFor="payroll-group-name">
                  Payroll group name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payroll-group-name"
                  value={payrollGroupName}
                  onChange={(e) => setPayrollGroupName(e.target.value)}
                  placeholder="e.g. Teaching Staff — Monthly"
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Salary preference"
            description="Payment schedule and payslip generation settings (salaried employees)."
            icon={Wallet}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-sal-type">Employee salary type</Label>
                <Input id="emp-sal-type" value="Salaried" disabled className="bg-muted/40" />
              </div>
              <Select
                label="Payment frequency"
                required
                value={paymentFrequency != null ? String(paymentFrequency) : ''}
                onChange={(v) => {
                  setPaymentFrequency(v ? Number(v) : null)
                  setPayslipGenerationDay(null)
                }}
                options={frequencies}
                placeholder="Select frequency"
              />
              {payslipDayOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <Select
                    label="Payslip generation date"
                    value={payslipGenerationDay != null ? String(payslipGenerationDay) : ''}
                    onChange={(v) => setPayslipGenerationDay(v ? Number(v) : null)}
                    options={payslipDayOptions}
                    placeholder="Select day"
                  />
                  {payslipHint ? (
                    <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {payslipHint}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            title="Payroll categories"
            description="Add categories from the right panel. Set sort order for payslip line items."
          >
            {!collegeId ? (
              <EmptyState
                title="Select a college first"
                description="Choose a college above to load payroll categories available for assignment."
                className="py-10"
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <CategoryTableShell
                  title="Selected categories"
                  count={selectedCategories.length}
                  empty={
                    <EmptyState
                      title="No categories selected"
                      description="Use Add on the available list to build this payroll group."
                      className="py-8"
                    />
                  }
                >
                  <CategoryRowsTable
                    rows={selectedCategories}
                    mode="selected"
                    onRemove={removeCategory}
                    onSortOrderChange={updateSortOrder}
                  />
                </CategoryTableShell>

                <CategoryTableShell
                  title="Available categories"
                  count={filteredAvailable.length}
                  search={availableSearch}
                  onSearchChange={setAvailableSearch}
                  searchPlaceholder="Search categories…"
                  empty={
                    <EmptyState
                      title={
                        availableCategories.length === 0
                          ? 'No categories for this college'
                          : 'No matches'
                      }
                      description={
                        availableCategories.length === 0
                          ? 'Create payroll categories for this college before assigning them to a group.'
                          : 'Try a different search term.'
                      }
                      className="py-8"
                    />
                  }
                >
                  <CategoryRowsTable
                    rows={filteredAvailable}
                    mode="available"
                    onAdd={addCategory}
                  />
                </CategoryTableShell>
              </div>
            )}
          </FormSection>

          {mode === 'edit' ? (
            <FormSection title="Status" description="Deactivate to stop using this group in payroll runs.">
              <ActiveStatusField
                isActive={isActive}
                reason={reason}
                onActiveChange={(v) => setIsActive(v === true)}
                onReasonChange={setReason}
              />
            </FormSection>
          ) : null}
        </>
      )}

      {!loading ? (
        <div className="app-card sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-slate-200 px-4 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={LIST_BACK_HREF}>Back</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save payroll group'}
          </Button>
        </div>
      ) : null}
    </PageContainer>
  )
}
