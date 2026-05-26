'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
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
          router.push('/hr-payroll/payroll/payroll-category')
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
    setSaving(true)
    try {
      await savePayrollCategory({
        collegeId,
        payrollCategoryId: mode === 'edit' ? payrollCategoryId : undefined,
        payrollCategoryName: payrollCategoryName.trim(),
        payrollCategoryCode: payrollCategoryCode.trim(),
        payrollCategoryType,
        valueType,
        value: valueType === 'N' ? Number(value) : value,
        isActive,
        reason: isActive ? 'active' : reason,
      })
      toastSuccess(mode === 'add' ? 'Payroll category created' : 'Payroll category updated')
      void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.payrollCategories() })
      router.push('/hr-payroll/payroll/payroll-category')
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'edit' && !payrollCategoryId) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">Missing payroll category id.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-category">Back</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <FilterCard title={title}>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <div className="space-y-6">
            <Select
              label="College"
              required
              className={FILTER_CARD_SELECT_CLASS}
              value={collegeId != null ? String(collegeId) : ''}
              onChange={handleCollegeChange}
              options={colleges}
              placeholder="College"
            />

            <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="space-y-2">
              <Label className="font-medium">Category Type</Label>
              <RadioGroup
                value={payrollCategoryType}
                onValueChange={(v) => setPayrollCategoryType(v as PayrollCategoryType)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="E" id="cat-e" />
                  <Label htmlFor="cat-e" className="font-normal cursor-pointer">
                    Earnings
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="D" id="cat-d" />
                  <Label htmlFor="cat-d" className="font-normal cursor-pointer">
                    Deductions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="M" id="cat-m" />
                  <Label htmlFor="cat-m" className="font-normal cursor-pointer">
                    Management Deductions
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Category Value</h3>
              <p className="text-xs text-muted-foreground">
                Specify how the payroll amount for this category is to be calculated. It can be a
                fixed amount or can be calculated using formulas based on other payroll categories.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="Value Type"
                  required
                  className={FILTER_CARD_SELECT_CLASS}
                  value={valueType}
                  onChange={(v) => setValueType((v ?? '') as ValueType)}
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
                  <div className="space-y-1.5 sm:col-span-2">
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
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-center">S.No</th>
                        <th className="p-2 text-left">Category Type</th>
                        <th className="p-2 text-left">Category Name</th>
                        <th className="p-2 text-left">Category Code</th>
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

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/hr-payroll/payroll/payroll-category">Back</Link>
              </Button>
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </FilterCard>
    </PageContainer>
  )
}
