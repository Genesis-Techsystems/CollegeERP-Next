'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, type SelectOption } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  allocateTransportForStudent,
  listAcademicYearsForCollege,
  listCollegesByOrganization,
  listRouteStopsByRoute,
  listRoutesByTransportDetail,
  searchEmployeesForTransport,
  searchStudentsByKeyword,
} from '@/services'
import { TransportPageTitle } from '../_components/TransportPageTitle'
import { useTransportOrgCascade } from '../_lib/use-transport-org-cascade'
import { toApiDate } from '../_lib/format-transport-time'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  allocationFor: z.enum(['S', 'E']),
  organizationId: z.coerce.number().min(1),
  collegeId: z.coerce.number().optional(),
  academicYearId: z.coerce.number().optional(),
  transportDetailId: z.coerce.number().min(1),
  personId: z.coerce.number().min(1, 'Select a student or employee'),
  routeId: z.coerce.number().min(1),
  pickupRouteStopId: z.coerce.number().min(1),
  dropRouteStopId: z.coerce.number().min(1),
  fromDate: z.date(),
  toDate: z.date().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

export default function TransportAllocationPage() {
  const [personOptions, setPersonOptions] = useState<SelectOption[]>([])
  const [searchingPerson, setSearchingPerson] = useState(false)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([])
  const [routes, setRoutes] = useState<SelectOption[]>([])
  const [stops, setStops] = useState<SelectOption[]>([])

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      allocationFor: 'S',
      fromDate: new Date(),
    },
  })

  const allocationFor = watch('allocationFor')
  const organizationId = watch('organizationId')
  const collegeId = watch('collegeId')
  const transportDetailId = watch('transportDetailId')
  const routeId = watch('routeId')

  const { organizations, transportDetails, loadingOrgs, loadingTransport } =
    useTransportOrgCascade(organizationId)

  useEffect(() => {
    if (!organizationId) {
      setColleges([])
      return
    }
    void listCollegesByOrganization(organizationId)
      .then((rows) =>
        setColleges(
          rows.map((c) => ({
            value: String((c as { collegeId?: number }).collegeId),
            label: String(
              (c as { collegeCode?: string }).collegeCode ??
                (c as { collegeName?: string }).collegeName,
            ),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load colleges'))
  }, [organizationId])

  useEffect(() => {
    if (!collegeId) {
      setAcademicYears([])
      return
    }
    void listAcademicYearsForCollege(collegeId)
      .then((rows) =>
        setAcademicYears(
          rows.map((y) => ({
            value: String((y as { academicYearId?: number }).academicYearId),
            label: String(
              (y as { academicYear?: string }).academicYear ??
                (y as { academicYearId?: number }).academicYearId,
            ),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load academic years'))
  }, [collegeId])

  useEffect(() => {
    if (!transportDetailId) {
      setRoutes([])
      return
    }
    void listRoutesByTransportDetail(transportDetailId)
      .then((r) =>
        setRoutes(
          r.map((x) => ({
            value: String(x.routeId),
            label: `${x.serviceNumber ?? ''} ${x.routeCode ?? ''}`.trim() || String(x.routeId),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load routes'))
  }, [transportDetailId])

  useEffect(() => {
    if (!routeId) {
      setStops([])
      return
    }
    void listRouteStopsByRoute(routeId)
      .then((s) =>
        setStops(
          s.map((x) => ({
            value: String(x.routeStopId),
            label: x.stopName ?? String(x.routeStopId),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load stops'))
  }, [routeId])

  async function searchPerson(term: string) {
    if (term.trim().length < 3) {
      setPersonOptions([])
      return
    }
    setSearchingPerson(true)
    try {
      const rows =
        allocationFor === 'S'
          ? await searchStudentsByKeyword(term)
          : await searchEmployeesForTransport(term)
      setPersonOptions(
        rows.map((r) => {
          const row = r as {
            studentId?: number
            employeeId?: number
            firstName?: string
            stdFirstName?: string
            rollNo?: string
          }
          const id = allocationFor === 'S' ? row.studentId : row.employeeId
          const name = row.firstName ?? row.stdFirstName ?? String(id)
          const label = row.rollNo ? `${name} (${row.rollNo})` : name
          return { value: String(id), label }
        }),
      )
    } catch (err) {
      toastError(err, 'Search failed')
    } finally {
      setSearchingPerson(false)
    }
  }

  async function onSubmit(data: FormValues) {
    const payload: Record<string, unknown> = {
      allocationFor: data.allocationFor,
      organizationId: data.organizationId,
      transportDetailId: data.transportDetailId,
      routeId: data.routeId,
      pickupRouteStopId: data.pickupRouteStopId,
      dropRouteStopId: data.dropRouteStopId,
      fromDate: toApiDate(data.fromDate),
      toDate: toApiDate(data.toDate ?? undefined),
      isActive: true,
    }
    if (data.allocationFor === 'S') {
      payload.studentId = data.personId
      payload.academicYearId = data.academicYearId
      payload.collegeId = data.collegeId
    } else {
      payload.employeeId = data.personId
    }
    try {
      await allocateTransportForStudent(payload)
      toastSuccess('Transport allocated successfully')
    } catch (err) {
      toastError(err, 'Failed to allocate transport')
    }
  }

  return (
    <PageContainer className="space-y-5">
      <TransportPageTitle title="Transport Allocation" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocate transport</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmit(onSubmit)()
            }}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={allocationFor === 'S' ? 'default' : 'outline'}
                onClick={() => {
                  setValue('allocationFor', 'S')
                  setValue('personId', undefined as unknown as number)
                  setPersonOptions([])
                }}
              >
                Student
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allocationFor === 'E' ? 'default' : 'outline'}
                onClick={() => {
                  setValue('allocationFor', 'E')
                  setValue('personId', undefined as unknown as number)
                  setPersonOptions([])
                }}
              >
                Employee
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Organization *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('collegeId', undefined)
                      setValue('transportDetailId', undefined as unknown as number)
                    }}
                    options={organizations}
                    searchable
                    isLoading={loadingOrgs}
                    error={errors.organizationId?.message}
                  />
                )}
              />
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={colleges}
                    searchable
                    clearable
                    disabled={allocationFor === 'E' || !organizationId}
                  />
                )}
              />
              <Controller
                name="transportDetailId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Transport *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={transportDetails}
                    searchable
                    isLoading={loadingTransport}
                    disabled={!organizationId}
                    error={errors.transportDetailId?.message}
                  />
                )}
              />
            </div>

            {allocationFor === 'S' ? (
              <Controller
                name="academicYearId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Academic Year"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={academicYears}
                    searchable
                    clearable
                    disabled={!collegeId}
                  />
                )}
              />
            ) : null}

            <Controller
              name="personId"
              control={control}
              render={({ field }) => (
                <Select
                  label={allocationFor === 'S' ? 'Student *' : 'Employee *'}
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={personOptions}
                  placeholder="Type at least 3 characters to search"
                  searchable
                  onSearch={(term) => void searchPerson(term)}
                  isLoading={searchingPerson}
                  error={errors.personId?.message}
                />
              )}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Controller
                name="routeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Route *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('pickupRouteStopId', undefined as unknown as number)
                      setValue('dropRouteStopId', undefined as unknown as number)
                    }}
                    options={routes}
                    searchable
                    disabled={!transportDetailId}
                    error={errors.routeId?.message}
                  />
                )}
              />
              <Controller
                name="pickupRouteStopId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Pickup Stop *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={stops}
                    searchable
                    disabled={!routeId}
                    error={errors.pickupRouteStopId?.message}
                  />
                )}
              />
              <Controller
                name="dropRouteStopId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Drop Stop *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={stops}
                    searchable
                    disabled={!routeId}
                    error={errors.dropRouteStopId?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-w-xl">
              <Controller
                name="fromDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="From Date *"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    error={errors.fromDate?.message}
                  />
                )}
              />
              <Controller
                name="toDate"
                control={control}
                render={({ field }) => (
                  <DatePicker label="To Date" value={field.value ?? null} onChange={field.onChange} />
                )}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Allocate Transport'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
