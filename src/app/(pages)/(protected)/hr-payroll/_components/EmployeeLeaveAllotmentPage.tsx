'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Loader2, User } from 'lucide-react'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import { toastError, toastSuccess } from '@/lib/toast'
import { useSessionContext } from '@/context/SessionContext'
import {
  buildLeaveAllotmentTypeRows,
  getLeaveYears,
  listActiveCollegesForGeneralSettings,
  listLeaveEntitlementsForEmployee,
  listLeaveTypesForEntitlement,
  saveLeaveEntitlements,
  searchEmployeesForHr,
  type LeaveAllotmentTypeRow,
} from '@/services'
import type { SessionUser } from '@/types/user'

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function isStaffOrPrincipal(user: SessionUser | null | undefined): boolean {
  if (user?.isPrincipal) return true
  return (
    readStorage('isPRINCIPAL') === 'true' ||
    readStorage('isPrincipal') === 'true' ||
    readStorage('dataSecStaff') === 'true'
  )
}

function employeeOptionLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return name + num || String(row.employeeId ?? '')
}

export function EmployeeLeaveAllotmentPage() {
  const { user } = useSessionContext()
  const sessionCollegeId = user?.collegeId ?? Number(readStorage('collegeId') || 0)
  const isPrincipal = user?.isPrincipal ?? readStorage('isPRINCIPAL') === 'true'
  const showCollegeContext = isStaffOrPrincipal(user)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [leaveYear, setLeaveYear] = useState<string | null>(null)
  const [collegeCode, setCollegeCode] = useState('')

  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [collegeRows, setCollegeRows] = useState<Record<string, unknown>[]>([])
  const [years, setYears] = useState<SelectOption[]>([])

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, unknown> | null>(null)

  const [allotmentRows, setAllotmentRows] = useState<LeaveAllotmentTypeRow[]>([])
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [allotmentLoading, setAllotmentLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const organizationId = useMemo(() => {
    if (typeof globalThis.window === 'undefined') return 0
    return Number(globalThis.localStorage.getItem('organizationId') ?? 0)
  }, [])

  const collegeLocked = isPrincipal && sessionCollegeId > 0

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true)
      try {
        const [collegeList, yearList] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          getLeaveYears(),
        ])
        const orgId = organizationId
        const filtered = orgId
          ? collegeList.filter((c) => Number(c.organizationId) === orgId)
          : collegeList
        setCollegeRows(filtered as Record<string, unknown>[])
        setColleges(
          filtered.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
        setYears(yearList.map((y) => ({ value: y, label: y })))

        let cid: number | null = null
        if (collegeLocked) {
          cid = sessionCollegeId
        } else if (filtered.length > 0) {
          cid = Number(filtered[0]!.collegeId)
        }
        if (cid) {
          setCollegeId(cid)
          const row = filtered.find((c) => Number(c.collegeId) === cid)
          setCollegeCode(String(row?.collegeCode ?? ''))
        }
        if (yearList.length > 0) setLeaveYear(yearList[0]!)
      } catch (e) {
        toastError(e, 'Failed to load filters')
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [organizationId, collegeLocked, sessionCollegeId])

  const loadAllotment = useCallback(
    async (employeeId: number) => {
      if (!collegeId || !leaveYear || !employeeId || !organizationId) {
        setAllotmentRows([])
        return
      }
      setAllotmentLoading(true)
      try {
        const [types, entitlements] = await Promise.all([
          listLeaveTypesForEntitlement(organizationId),
          listLeaveEntitlementsForEmployee(collegeId, employeeId, leaveYear),
        ])
        setAllotmentRows(
          buildLeaveAllotmentTypeRows(types, entitlements, collegeId, leaveYear, employeeId),
        )
      } catch (e) {
        toastError(e, 'Failed to load leave allotment')
        setAllotmentRows([])
      } finally {
        setAllotmentLoading(false)
      }
    },
    [collegeId, leaveYear, organizationId],
  )

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return
      const q = term.trim()
      if (q.length < 4) {
        setEmployeeRows([])
        setEmployeeOptions([])
        return
      }
      setEmployeeSearchLoading(true)
      try {
        const list = await searchEmployeesForHr(q, collegeId)
        setEmployeeRows(list as Record<string, unknown>[])
        setEmployeeOptions(
          list.map((e) => ({
            value: String(e.employeeId),
            label: employeeOptionLabel(e as Record<string, unknown>),
          })),
        )
      } catch (e) {
        toastError(e, 'Employee search failed')
        setEmployeeRows([])
        setEmployeeOptions([])
      } finally {
        setEmployeeSearchLoading(false)
      }
    },
    [collegeId],
  )

  function handleCollegeChange(v: string | null) {
    if (collegeLocked) return
    const cid = v ? Number(v) : null
    setCollegeId(cid)
    const row = collegeRows.find((c) => Number(c.collegeId) === cid)
    setCollegeCode(String(row?.collegeCode ?? ''))
    setSelectedEmployeeId(null)
    setSelectedEmployee(null)
    setAllotmentRows([])
    setEmployeeRows([])
    setEmployeeOptions([])
  }

  function handleLeaveYearChange(v: string | null) {
    setLeaveYear(v)
    setSelectedEmployeeId(null)
    setSelectedEmployee(null)
    setAllotmentRows([])
    setEmployeeRows([])
    setEmployeeOptions([])
  }

  function handleEmployeeChange(v: string | null) {
    if (!v) {
      setSelectedEmployeeId(null)
      setSelectedEmployee(null)
      setAllotmentRows([])
      return
    }
    if (!leaveYear) {
      toast.info('Please select the given filters')
      return
    }
    const id = Number(v)
    const row = employeeRows.find((e) => Number(e.employeeId) === id)
    if (!row) return
    setSelectedEmployeeId(id)
    setSelectedEmployee(row)
    void loadAllotment(id)
  }

  function updateAllocated(leavetypeId: number, value: string) {
    const n = value === '' ? 0 : Number(value)
    setAllotmentRows((prev) =>
      prev.map((r) =>
        r.leavetypeId === leavetypeId ? { ...r, allocatedLeaves: Number.isNaN(n) ? 0 : n } : r,
      ),
    )
  }

  async function handleSave() {
    if (!collegeId || !leaveYear || !selectedEmployeeId) {
      toast.info('Please select the given filters')
      return
    }
    setSaving(true)
    try {
      const payload = allotmentRows.map((r) => ({
        ...r,
        leavetypeId: r.leavetypeId,
        allocatedLeaves: r.allocatedLeaves,
        collegeId: r.collegeId,
        leaveYear: r.leaveYear,
        employeeId: r.employeeId,
        leaveEntitlementId: r.leaveEntitlementId,
      }))
      const result = (await saveLeaveEntitlements(payload)) as {
        success?: boolean
        message?: string
      }
      if (result?.success === false) {
        toastError(result.message ?? 'Save failed')
        return
      }
      toastSuccess(result?.message ?? 'Leave allotment saved')
      await loadAllotment(selectedEmployeeId)
    } catch (e) {
      toastError(getErrorMessage(e), 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const filterTitle = (
    <span className="inline-flex items-center gap-2">
      <BookOpen className="h-4 w-4" aria-hidden />
      Leave Allotment
      {showCollegeContext && collegeCode ? (
        <span className="text-[15px] font-semibold text-slate-700">For : {collegeCode}</span>
      ) : null}
    </span>
  )

  return (
    <PageContainer>
      <FilterCard title={filterTitle}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            value={collegeId != null ? String(collegeId) : null}
            onChange={handleCollegeChange}
            options={colleges}
            placeholder="College"
            isLoading={collegesLoading}
            disabled={collegeLocked}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Leave Year"
            value={leaveYear}
            onChange={handleLeaveYearChange}
            options={years}
            placeholder="Leave Year"
            disabled={!collegeId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Employee"
            value={selectedEmployeeId != null ? String(selectedEmployeeId) : null}
            onChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="Search by Employee name or Id."
            searchable
            onSearch={onEmployeeSearch}
            isLoading={employeeSearchLoading}
            disabled={!collegeId || !leaveYear}
            className={FILTER_CARD_SELECT_CLASS}
          />
        </div>
      </FilterCard>

      {selectedEmployee ? (
        <div className="mt-4 overflow-hidden rounded-[10px] border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
            <span className="text-sm font-medium text-slate-700">Leaves Entitled</span>
          </div>

          <div className="flex gap-4 border-b border-slate-100 p-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100"
              aria-hidden
            >
              <User className="h-10 w-10 text-slate-400" strokeWidth={1.25} />
            </div>
            <div className="space-y-0.5 text-sm">
              <p className="font-medium text-blue-600">{String(selectedEmployee.firstName ?? '')}</p>
              <p className="text-slate-500">{String(selectedEmployee.empNumber ?? '')}</p>
              <p className="text-slate-500">{String(selectedEmployee.empDeptName ?? '')}</p>
              <p className="text-slate-500">{String(selectedEmployee.mobile ?? '')}</p>
            </div>
          </div>

          {allotmentLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leave types…
            </div>
          ) : allotmentRows.length > 0 ? (
            <div className="space-y-3 px-4 pb-4 pt-2">
              {allotmentRows.map((leave) => (
                <div
                  key={leave.leavetypeId}
                  className="flex flex-wrap items-end gap-4 border-b border-slate-100 pb-3 last:border-0"
                >
                  <p className="min-w-[200px] flex-1 text-sm text-slate-800">
                    {leave.leaveName}{' '}
                    <span className="text-blue-600">({leave.leaveCode})</span>
                  </p>
                  <div className="w-full max-w-[180px]">
                    <Label htmlFor={`alloc-${leave.leavetypeId}`} className="text-xs text-slate-600">
                      Allocated Leaves
                    </Label>
                    <Input
                      id={`alloc-${leave.leavetypeId}`}
                      type="number"
                      min={0}
                      value={leave.allocatedLeaves}
                      onChange={(e) => updateAllocated(leave.leavetypeId, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  )
}
