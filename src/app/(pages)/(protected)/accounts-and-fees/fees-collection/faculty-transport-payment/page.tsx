'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Table, type TableColumn } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { toastError } from '@/lib/toast'
import {
  getEmployeeDetailsForTransport,
  listTransportAllocationsByEmployee,
  searchEmployeesForTransport,
} from '@/services'
import type { EmployeeSearchRow, TransportAllocationRow } from '@/types/fees-collection'
import { FeeEmployeeProfileCard } from '../_components/FeeEmployeeProfileCard'

function employeeOptionLabel(e: EmployeeSearchRow): string {
  const name = e.firstName ?? 'Employee'
  const id = e.empNumber ?? e.employeeId
  return id ? `${name} (${id})` : name
}

function formatTransportTime(time?: string | null): string {
  if (!time) return ''
  const s = String(time)
  const m = s.match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/)
  if (!m) return s
  let h = Number(m[1])
  const ampm = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${h}${m[2]}${m[3]} ${ampm}`
}

export default function FacultyTransportPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appliedQueryKey = useRef<string | null>(null)

  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [employeeRows, setEmployeeRows] = useState<EmployeeSearchRow[]>([])
  const [employeeId, setEmployeeId] = useState<string | null>(searchParams.get('employeeId'))
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchRow | null>(null)

  const empNum = Number(employeeId ?? 0)

  const { data: employeeDetails, isLoading: detailsLoading } = useQuery({
    queryKey: QK.feesCollection.employeeDetails(empNum),
    queryFn: () => getEmployeeDetailsForTransport(empNum),
    enabled: empNum > 0,
  })

  const { data: transportRows = [], isLoading: transportLoading } = useQuery({
    queryKey: QK.feesCollection.transportAllocations(empNum),
    queryFn: () => listTransportAllocationsByEmployee(empNum),
    enabled: empNum > 0 && !!employeeDetails,
  })

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 5) {
      setEmployeeRows([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const list = await searchEmployeesForTransport(q)
      setEmployeeRows(Array.isArray(list) ? list : [])
    } catch (e) {
      toastError(e, 'Employee search failed')
      setEmployeeRows([])
    } finally {
      setEmployeeSearchLoading(false)
    }
  }, [])

  const employeeOptions = useMemo(() => {
    const base = employeeRows.map((e) => ({
      value: String(e.employeeId),
      label: employeeOptionLabel(e),
    }))
    const eid = employeeId
    if (eid && selectedEmployee && !base.some((o) => o.value === eid)) {
      return [{ value: eid, label: employeeOptionLabel(selectedEmployee) }, ...base]
    }
    return base
  }, [employeeRows, employeeId, selectedEmployee])

  useEffect(() => {
    const empName = searchParams.get('empName')
    const eid = searchParams.get('employeeId')
    if (!empName && !eid) return

    const key = searchParams.toString()
    if (appliedQueryKey.current === key) return
    appliedQueryKey.current = key

    void (async () => {
      const q = empName?.trim() ?? ''
      if (q.length < 5 && !eid) return

      setEmployeeSearchLoading(true)
      try {
        const list = q.length >= 5 ? await searchEmployeesForTransport(q) : []
        setEmployeeRows(list)
        const pick = eid
          ? list.find((r) => String(r.employeeId) === eid) ?? null
          : list[0] ?? null
        if (pick) {
          setEmployeeId(String(pick.employeeId))
          setSelectedEmployee(pick)
        }
      } catch (e) {
        toastError(e, 'Employee search failed')
      } finally {
        setEmployeeSearchLoading(false)
      }
    })()
  }, [searchParams])

  function handleEmployeeChange(v: string | null) {
    setEmployeeId(v)
    if (!v) {
      setSelectedEmployee(null)
      return
    }
    const row =
      employeeRows.find((e) => String(e.employeeId) === v) ??
      (selectedEmployee && String(selectedEmployee.employeeId) === v ? selectedEmployee : null)
    setSelectedEmployee(row)
  }

  function handlePayment(row: TransportAllocationRow) {
    if (!employeeDetails) return
    const params = new URLSearchParams({
      collegeId: String(employeeDetails.collegeId ?? ''),
      employeeId: String(row.employeeId ?? empNum),
      firstName: String(employeeDetails.firstName ?? ''),
      empNumber: String(employeeDetails.empNumber ?? ''),
      routePickupPlace: String(row.routePickupPlace ?? ''),
      routeDropPlace: String(row.routeDropPlace ?? ''),
      routeCode: String(row.routeCode ?? ''),
      pickTime: String(row.pickTime ?? ''),
      dropTime: String(row.dropTime ?? ''),
      collegeCode: String(employeeDetails.collegeCode ?? ''),
      photoPath: String(employeeDetails.photoPath ?? ''),
      deptName: String(employeeDetails.deptName ?? ''),
      mobile: String(employeeDetails.mobile ?? ''),
      academicYearId: String(row.academicYearId ?? ''),
      academicYear: String(row.academicYear ?? ''),
      transportAllocationId: String(row.transportAllocationId ?? ''),
    })
    router.push(
      `/accounts-and-fees/fees-collection/faculty-transport-payment/faculty-fee-pay?${params}`,
    )
  }

  const transportColumns = useMemo<TableColumn<TransportAllocationRow>[]>(
    () => [
      {
        id: 'si',
        label: 'SI No.',
        width: 6,
        render: (_row, index) => index + 1,
      },
      {
        id: 'route',
        label: 'Route',
        width: 28,
        render: (row) => (
          <span>
            {row.routePickupPlace} - {row.routeDropPlace}{' '}
            {row.routeCode ? (
              <span className="font-medium text-blue-600">({row.routeCode})</span>
            ) : null}
          </span>
        ),
      },
      {
        id: 'academicYear',
        label: 'Academic Year',
        width: 14,
        render: (row) => row.academicYear ?? '',
      },
      {
        id: 'pickup',
        label: 'Pickup Point',
        width: 22,
        render: (row) => (
          <span>
            {row.pickupRouteStopName}
            {row.pickTime ? (
              <>
                {' '}
                (<span className="font-medium text-blue-600">{formatTransportTime(row.pickTime)}</span>)
              </>
            ) : null}
          </span>
        ),
      },
      {
        id: 'drop',
        label: 'Drop Point',
        width: 22,
        render: (row) => (
          <span>
            {row.dropRoutestopName}
            {row.dropTime ? (
              <>
                {' '}
                (<span className="font-medium text-blue-600">{formatTransportTime(row.dropTime)}</span>)
              </>
            ) : null}
          </span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 8,
        type: 'action',
        render: (row) => (
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[#ffcf46] hover:bg-[#e6ba3f] text-slate-900"
            onClick={() => handlePayment(row)}
          >
            Payment
          </Button>
        ),
      },
    ],
    [employeeDetails, empNum, router],
  )

  const showProfile = empNum > 0 && !!employeeDetails && Object.keys(employeeDetails).length > 0
  const listLoading = detailsLoading || transportLoading

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Faculty Bus Fee Collection
          </span>
        }
        fieldMaxWidth="28rem"
      >
        <Select
          className={FILTER_CARD_SELECT_CLASS}
          label="Employee"
          required
          value={employeeId}
          onChange={handleEmployeeChange}
          options={employeeOptions}
          placeholder="Search by employee name or number (5+ chars)"
          searchable
          onSearch={(t) => void onEmployeeSearch(t)}
          isLoading={employeeSearchLoading}
          clearable
        />
      </FilterCard>

      {showProfile ? (
        <>
          <FeeEmployeeProfileCard employee={employeeDetails} />

          {!listLoading && transportRows.length === 0 ? (
            <p className="text-right text-sm font-medium text-amber-700">
              To pay transport fee please allocate route to staff.
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">Transport Details</h2>
            <Table
              rows={transportRows}
              columns={transportColumns}
              loading={listLoading}
              embedded
              emptyText="No transport allocation found."
              pageSize={0}
            />
          </section>
        </>
      ) : null}
    </PageContainer>
  )
}
