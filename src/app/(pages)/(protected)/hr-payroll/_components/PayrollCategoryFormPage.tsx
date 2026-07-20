'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getPayrollCategoryById,
  listActiveCollegesForGeneralSettings,
  listPayrollCategoriesByCollege,
  savePayrollCategory,
} from '@/services'
import { useQueryClient } from '@tanstack/react-query'

type CatRow = Record<string, unknown>
type PayrollCategoryType = 'E' | 'D' | 'M'
type ValueType = '' | 'N' | 'F'

const LIST_HREF = '/hr-payroll/payroll/payroll-category'

function categoryTypeLabel(t: unknown): string {
  if (t === 'E') return 'Earning'
  if (t === 'D') return 'Deductions'
  if (t === 'M') return 'Management Deductions'
  return String(t ?? '')
}

type PayrollCategoryFormPageProps = { mode: 'add' | 'edit' }

export function PayrollCategoryFormPage({ mode }: PayrollCategoryFormPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const payrollCategoryId = Number(searchParams.get('payrollCategoryId') ?? 0)

  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [collegeCategories, setCollegeCategories] = useState<CatRow[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [payrollCategoryName, setPayrollCategoryName] = useState('')
  const [payrollCategoryCode, setPayrollCategoryCode] = useState('')
  /** Angular default: `payrollCategoryType: ['E']` */
  const [payrollCategoryType, setPayrollCategoryType] = useState<PayrollCategoryType>('E')
  const [valueType, setValueType] = useState<ValueType>('')
  const [value, setValue] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  const title = mode === 'add' ? 'Add Payroll Category' : 'Edit Payroll Category'

  const loadCollegeCategories = useCallback(async (cid: number) => {
    try {
      const rows = await listPayrollCategoriesByCollege(cid)
      setCollegeCategories(rows)
    } catch (e) {
      toastError(e, 'Failed to load categories for college')
      setCollegeCategories([])
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const list = await listActiveCollegesForGeneralSettings()
        setColleges(
          list.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
      } catch (e) {
        toastError(e, 'Failed to load colleges')
      }
    })()
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !payrollCategoryId) return
    void (async () => {
      setLoading(true)
      try {
        const row = await getPayrollCategoryById(payrollCategoryId)
        if (!row) {
          toastError(null, 'Payroll category not found')
          router.push(LIST_HREF)
          return
        }
        const cid = Number(row.collegeId ?? 0)
        setCollegeId(cid || null)
        setPayrollCategoryName(String(row.payrollCategoryName ?? ''))
        setPayrollCategoryCode(String(row.payrollCategoryCode ?? ''))
        setPayrollCategoryType((row.payrollCategoryType as PayrollCategoryType) ?? 'E')
        setValueType((row.valueType as ValueType) ?? '')
        setValue(row.value != null ? String(row.value) : '')
        setIsActive(row.isActive !== false)
        setReason(String(row.reason ?? 'active'))
        if (cid) await loadCollegeCategories(cid)
      } catch (e) {
        toastError(e, 'Failed to load payroll category')
      } finally {
        setLoading(false)
      }
    })()
  }, [mode, payrollCategoryId, router, loadCollegeCategories])

  const handleCollegeChange = (v: string | null) => {
    const cid = v ? Number(v) : null
    setCollegeId(cid)
    if (cid) void loadCollegeCategories(cid)
    else setCollegeCategories([])
  }

  const handleSave = async () => {
    if (!collegeId || !payrollCategoryName.trim() || !payrollCategoryCode.trim() || !valueType) {
      toastError(null, 'Please fill all required fields')
      return
    }
    // Angular add/update posts form value to POST payrollcategory
    const payload: Record<string, unknown> = {
      collegeId,
      payrollCategoryName: payrollCategoryName.trim(),
      payrollCategoryCode: payrollCategoryCode.trim(),
      payrollCategoryType,
      valueType,
      value: valueType === 'N' ? (value === '' ? null : Number(value)) : value,
      isActive: mode === 'edit' ? isActive : true,
      reason: mode === 'edit' ? (isActive ? 'active' : reason) : 'active',
    }
    if (mode === 'edit') payload.payrollCategoryId = payrollCategoryId

    setSaving(true)
    try {
      await savePayrollCategory(payload)
      toastSuccess(mode === 'add' ? 'Payroll category created' : 'Payroll category updated')
      void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.payrollCategories() })
      router.push(LIST_HREF)
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    // Angular goBack() → location.back(); fall back to list if no history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(LIST_HREF)
  }

  if (mode === 'edit' && !payrollCategoryId) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">Missing payroll category id.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={LIST_HREF}>Back</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        {/* Angular: computer icon + table-heads title + accent rule */}
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
            <Monitor className="h-4 w-4 shrink-0" aria-hidden />
            {title}
          </h1>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-5 p-4 sm:p-5">
            {/* College — Angular fxFlex ~20% */}
            <div className="max-w-xs">
              <Select
                label="College"
                required
                value={collegeId != null ? String(collegeId) : ''}
                onChange={handleCollegeChange}
                options={colleges}
                placeholder="College"
              />
            </div>

            {/* Name + Code — Angular same row, ~25% each */}
            <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Payroll Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={payrollCategoryName}
                  onChange={(e) => setPayrollCategoryName(e.target.value)}
                  placeholder="Payroll Category Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Payroll Category Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={payrollCategoryCode}
                  onChange={(e) => setPayrollCategoryCode(e.target.value)}
                  placeholder="Payroll Category Code"
                />
              </div>
            </div>

            {/* Category Type : + radios (Angular default Earnings) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[15px] font-medium">Category Type :</span>
              <RadioGroup
                value={payrollCategoryType}
                onValueChange={(v) => setPayrollCategoryType(v as PayrollCategoryType)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="E" id="cat-e" />
                  <Label htmlFor="cat-e" className="cursor-pointer font-normal">
                    Earnings
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="D" id="cat-d" />
                  <Label htmlFor="cat-d" className="cursor-pointer font-normal">
                    Deductions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="M" id="cat-m" />
                  <Label htmlFor="cat-m" className="cursor-pointer font-normal">
                    Management Deductions
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Category Value */}
            <div className="space-y-3">
              <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
                Category Value
              </h2>
              <p className="max-w-3xl font-mono text-[12px] leading-relaxed text-[#9e9e9e]">
                Specify how the payroll amount for this category is to be calculated. It can be
                fixed amount or can be calculated using formulas based on other payroll categories.
              </p>

              <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
                <Select
                  label="Value Type"
                  required
                  value={valueType}
                  onChange={(v) => {
                    setValueType((v ?? '') as ValueType)
                    setValue('')
                  }}
                  options={[
                    { value: 'N', label: 'Numeric' },
                    { value: 'F', label: 'Formula' },
                  ]}
                  placeholder="Select"
                />
                {valueType === 'N' ? (
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Amount"
                    />
                  </div>
                ) : null}
                {valueType === 'F' ? (
                  <div className="space-y-1.5">
                    <Label>Formula</Label>
                    <Input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Formula"
                    />
                  </div>
                ) : null}
              </div>

              {valueType === 'F' && collegeCategories.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-[#c3d9ff]">
                        <th className="p-2 text-center font-medium">S.No</th>
                        <th className="p-2 text-left font-medium">Category Type</th>
                        <th className="p-2 text-left font-medium">Category Name</th>
                        <th className="p-2 text-left font-medium">Category Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collegeCategories.map((row, idx) => (
                        <tr key={String(row.payrollCategoryId ?? idx)} className="border-b">
                          <td className="p-2 text-center">{idx + 1}</td>
                          <td className="p-2">{categoryTypeLabel(row.payrollCategoryType)}</td>
                          <td className="p-2">{String(row.payrollCategoryName ?? '')}</td>
                          <td className="p-2">{String(row.payrollCategoryCode ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {mode === 'edit' ? (
              <ActiveStatusField
                isActive={isActive}
                reason={reason}
                onActiveChange={(v) => setIsActive(v === true)}
                onReasonChange={setReason}
              />
            ) : null}

            {/* Angular form-btn: Back (amber) + Save (primary), right-aligned */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                className="bg-[#f0ad4e] text-black hover:bg-[#ec9c2c]"
                onClick={goBack}
              >
                Back
              </Button>
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
