'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  listAcademicYearsForCollege,
  listCollegesByOrganization,
  listHostelDetails,
  postHostelRoomAllocation,
  searchEmployeesForTransport,
  searchStudentsInCollege,
  toHostelApiDate,
} from '@/services'
import { HostelPageTitle } from '../_components/HostelPageTitle'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  allocationFor: z.enum(['student', 'employee']),
  collegeId: z.coerce.number().min(1, 'College is required'),
  academicYearId: z.coerce.number().optional(),
  personId: z.coerce.number().min(1, 'Select a student or employee'),
  fromDate: z.date(),
  toDate: z.date(),
  paymentDueDate: z.date(),
  isAmountSetteled: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function AllocateToRoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hostelId = Number(searchParams.get('hostelId') ?? 0)
  const hstlRoomId = Number(searchParams.get('hstlRoomId') ?? 0)
  const hostelName = searchParams.get('hostelName') ?? ''
  const hostelCode = searchParams.get('hostelCode') ?? ''
  const floorNo = searchParams.get('floorNo') ?? ''
  const floorName = searchParams.get('floorName') ?? ''
  const roomNumber = searchParams.get('roomNumber') ?? ''
  const roomTypeCode = searchParams.get('roomTypeCode') ?? ''
  const availableBeds = searchParams.get('availableBeds') ?? ''
  const amount = searchParams.get('amount') ?? ''

  const [organizationId, setOrganizationId] = useState(0)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([])
  const [personOptions, setPersonOptions] = useState<SelectOption[]>([])
  const [searchingPerson, setSearchingPerson] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      allocationFor: 'student',
      fromDate: new Date(),
      toDate: new Date(),
      paymentDueDate: new Date(),
      isAmountSetteled: false,
    },
  })

  const allocationFor = watch('allocationFor')
  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!hstlRoomId) {
      router.replace('/hostel/rooms-list')
    }
  }, [hstlRoomId, router])

  useEffect(() => {
    if (!hostelId) return
    void listHostelDetails()
      .then((rows) => {
        const hostel = rows.find((h) => h.hostelId === hostelId)
        if (hostel?.organizationId) setOrganizationId(hostel.organizationId)
      })
      .catch((err) => toastError(err, 'Failed to load hostel'))
  }, [hostelId])

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
    if (!collegeId || allocationFor !== 'student') {
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
  }, [collegeId, allocationFor])

  async function searchPerson(term: string) {
    const q = term.trim()
    if (q.length < 5 || !collegeId) {
      setPersonOptions([])
      return
    }
    setSearchingPerson(true)
    try {
      const rows =
        allocationFor === 'student'
          ? await searchStudentsInCollege(collegeId, q)
          : await searchEmployeesForTransport(q)
      setPersonOptions(
        rows.map((r) => {
          const row = r as {
            studentId?: number
            employeeId?: number
            firstName?: string
            rollNumber?: string
            empNumber?: string
          }
          const id = allocationFor === 'student' ? row.studentId : row.employeeId
          const name = row.firstName ?? String(id)
          const sub = row.rollNumber ?? row.empNumber
          return { value: String(id), label: sub ? `${name} (${sub})` : name }
        }),
      )
    } catch (err) {
      toastError(err, 'Search failed')
    } finally {
      setSearchingPerson(false)
    }
  }

  async function onSubmit(data: FormValues) {
    if (!organizationId || !hostelId || !hstlRoomId) {
      toastError(new Error('Missing hostel or room'), 'Cannot save')
      return
    }
    const payload: Record<string, unknown> = {
      organizationId,
      collegeId: data.collegeId,
      hostelId,
      hstlRoomId,
      fromDate: toHostelApiDate(data.fromDate),
      toDate: toHostelApiDate(data.toDate),
      paymentDueDate: toHostelApiDate(data.paymentDueDate),
      isAmountSetteled: data.isAmountSetteled,
      isActive: true,
    }
    if (data.allocationFor === 'student') {
      payload.studentId = data.personId
      if (data.academicYearId) payload.academicYearId = data.academicYearId
    } else {
      payload.employeeId = data.personId
    }
    try {
      await postHostelRoomAllocation(payload)
      toastSuccess('Room allocated successfully')
      router.push('/hostel/view-room-details')
    } catch (err) {
      toastError(err, 'Failed to allocate room')
    }
  }

  if (!hstlRoomId) {
    return null
  }

  const floorLabel = floorName ? `${floorNo} (${floorName})` : floorNo

  return (
    <PageContainer className="space-y-5">
      <HostelPageTitle title="Hostel Room Allocating">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-[30px] px-3 text-[12px]"
          onClick={() =>
            router.push(hostelId ? `/hostel/rooms-list?hostelId=${hostelId}` : '/hostel/rooms-list')
          }
        >
          <ArrowLeftIcon className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      </HostelPageTitle>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="text-muted-foreground">Hostel: </span>
            <span className="font-medium">
              {hostelCode || hostelName ? `${hostelCode} ${hostelName}`.trim() : '—'}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Floor: </span>
            <span className="font-medium">{floorLabel || '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Room: </span>
            <span className="font-medium">
              {roomNumber}
              {roomTypeCode ? ` (${roomTypeCode})` : ''}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Available beds: </span>
            <span className="font-medium">{availableBeds || '0'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-medium">{amount || '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocate to this room</CardTitle>
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
                variant={allocationFor === 'student' ? 'default' : 'outline'}
                onClick={() => {
                  setValue('allocationFor', 'student')
                  setValue('personId', undefined as unknown as number)
                  setPersonOptions([])
                }}
              >
                Allocate student
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allocationFor === 'employee' ? 'default' : 'outline'}
                onClick={() => {
                  setValue('allocationFor', 'employee')
                  setValue('personId', undefined as unknown as number)
                  setPersonOptions([])
                }}
              >
                Allocate employee
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('personId', undefined as unknown as number)
                      setPersonOptions([])
                    }}
                    options={colleges}
                    searchable
                    error={errors.collegeId?.message}
                  />
                )}
              />
              {allocationFor === 'student' && (
                <Controller
                  name="academicYearId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Academic year"
                      value={field.value ? String(field.value) : null}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={academicYears}
                      searchable
                      error={errors.academicYearId?.message}
                    />
                  )}
                />
              )}
              <Controller
                name="personId"
                control={control}
                render={({ field }) => (
                  <Select
                    label={allocationFor === 'student' ? 'Student *' : 'Employee *'}
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={personOptions}
                    searchable
                    onSearch={(term) => void searchPerson(term)}
                    isLoading={searchingPerson}
                    disabled={!collegeId}
                    placeholder={
                      allocationFor === 'student'
                        ? 'Search by name or roll no (min 5 chars)'
                        : 'Search by name or ID (min 5 chars)'
                    }
                    error={errors.personId?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Controller
                name="fromDate"
                control={control}
                render={({ field }) => (
                  <DatePicker label="From date" value={field.value} onChange={field.onChange} />
                )}
              />
              <Controller
                name="toDate"
                control={control}
                render={({ field }) => (
                  <DatePicker label="To date" value={field.value} onChange={field.onChange} />
                )}
              />
              <Controller
                name="paymentDueDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Payment due date"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <Controller
              name="isAmountSetteled"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isAmountSetteled"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <Label htmlFor="isAmountSetteled" className="text-sm font-normal">
                    Amount settled
                  </Label>
                </div>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              Save details
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
