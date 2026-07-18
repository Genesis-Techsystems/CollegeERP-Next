'use client'

import { Monitor } from 'lucide-react'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { FormSectionHeader } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/FormSectionHeader'
import {
  entityOptions,
  gdOptions,
  parseDate,
  txt,
  type AnyRow,
} from './application-form-utils'

const ADMISSION_TYPE_OPTIONS = [
  { value: '1', label: 'New Admission' },
  { value: '2', label: 'Admission From Counsilling' },
]

export interface AppOfficeUseStepProps {
  data: AnyRow
  onChange: (patch: Partial<AnyRow>) => void
  colleges: AnyRow[]
  academicYears: AnyRow[]
  courses: AnyRow[]
  courseGroups: AnyRow[]
  courseYears: AnyRow[]
  quotas: AnyRow[]
  regulations: AnyRow[]
  batches: AnyRow[]
  studentTypes: AnyRow[]
  onCollegeChange: (collegeId: number | null) => void
  onAcademicYearChange: (academicYearId: number | null) => void
  onCourseChange: (courseId: number | null) => void
  onCourseGroupChange: (courseGroupId: number | null) => void
  onGetDetails?: () => void
  /** Edit mode: hide counselling search; show Admission Date; lock college. */
  isEdit?: boolean
  /** Validation messages keyed by field — shown below each field. */
  errors?: Record<string, string>
}

/** Angular Office Use step — only the fields shown in add/edit application-form. */
export function AppOfficeUseStep({
  data,
  onChange,
  colleges,
  academicYears,
  courses,
  courseGroups,
  courseYears,
  quotas,
  regulations,
  batches,
  studentTypes,
  onCollegeChange,
  onAcademicYearChange,
  onCourseChange,
  onCourseGroupChange,
  onGetDetails,
  isEdit = false,
  errors = {},
}: AppOfficeUseStepProps) {
  return (
    <div className="space-y-4">
      <FormSectionHeader icon={Monitor} title="For Office Use Only" />

      {!isEdit ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3">
            <Select
              label="Admission Type"
              required
              value={data.admissionType ? String(data.admissionType) : '1'}
              onChange={(v) => onChange({ admissionType: v ? Number(v) : 1 })}
              options={ADMISSION_TYPE_OPTIONS}
              searchable={false}
              clearable={false}
            />
          </div>
          <div className="space-y-1 lg:col-span-6">
            <Label className="text-xs">Search by Student Application No.</Label>
            <Input
              placeholder="Search by Student Application No."
              value={txt(data, ['univAppId'])}
              onChange={(e) => onChange({ univAppId: e.target.value })}
            />
          </div>
          <div className="lg:col-span-3">
            <Button type="button" className="h-9 w-full" onClick={() => onGetDetails?.()}>
              Get Details
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 px-1">
        <h3 className="text-xs font-semibold text-foreground">
          Select Class Hierarchy <span className="text-destructive">*</span>
        </h3>
        <div className="grid gap-3 rounded-lg border border-sky-200/80 bg-slate-50/80 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="College"
            placeholder="College"
            value={data.collegeId ? String(data.collegeId) : ''}
            onChange={(v) => onCollegeChange(v ? Number(v) : null)}
            options={entityOptions(colleges, ['collegeId'], ['collegeCode', 'collegeName'])}
            searchable
            required
            disabled={isEdit}
            error={errors.collegeId}
          />
          <Select
            label="Academic Year"
            placeholder="Academic Year"
            value={data.academicYearId ? String(data.academicYearId) : ''}
            onChange={(v) => onAcademicYearChange(v ? Number(v) : null)}
            options={entityOptions(academicYears, ['academicYearId'], ['academicYear', 'academic_year'])}
            searchable
            required
            error={errors.academicYearId}
          />
          <Select
            label="Course"
            placeholder="Course"
            value={data.courseId ? String(data.courseId) : ''}
            onChange={(v) => onCourseChange(v ? Number(v) : null)}
            options={entityOptions(courses, ['courseId'], ['courseCode', 'courseName'])}
            searchable
            required
            error={errors.courseId}
          />
          <Select
            label="Course Group"
            placeholder="Course Group"
            value={data.courseGroupId ? String(data.courseGroupId) : ''}
            onChange={(v) => onCourseGroupChange(v ? Number(v) : null)}
            options={entityOptions(courseGroups, ['courseGroupId'], ['groupCode', 'courseGroupCode'])}
            searchable
            required
            error={errors.courseGroupId}
          />
          <Select
            label="Course Year"
            placeholder="Course Year"
            value={data.courseYearId ? String(data.courseYearId) : ''}
            onChange={(v) => onChange({ courseYearId: v ? Number(v) : null })}
            options={entityOptions(courseYears, ['courseYearId'], ['courseYearName', 'courseYearCode'])}
            searchable
            required
            error={errors.courseYearId}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Quota"
          placeholder="Quota"
          required
          value={data.quotaId ? String(data.quotaId) : ''}
          onChange={(v) => onChange({ quotaId: v ? Number(v) : null })}
          options={gdOptions(quotas)}
          searchable
          clearable
          error={errors.quotaId}
        />
        <Select
          label="Regulation"
          placeholder="Regulation"
          required
          value={data.regulationId ? String(data.regulationId) : ''}
          onChange={(v) => onChange({ regulationId: v ? Number(v) : null })}
          options={entityOptions(regulations, ['regulationId'], ['regulationName', 'regulationCode'])}
          searchable
          clearable
          error={errors.regulationId}
        />
        <Select
          label="Batch"
          placeholder="Batch"
          required
          value={data.batchId ? String(data.batchId) : ''}
          onChange={(v) => onChange({ batchId: v ? Number(v) : null })}
          options={entityOptions(batches, ['batchId'], ['batchName'])}
          searchable
          clearable
          error={errors.batchId}
        />
        <div className="space-y-1">
          <Label className="text-xs">Application Number</Label>
          <Input value={txt(data, ['applicationNumber'])} disabled readOnly className="bg-muted" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {isEdit ? 'Reference Application Number' : 'Reference Application No.(Offline)'}
          </Label>
          <Input
            placeholder={
              isEdit ? 'Reference Application Number' : 'Reference Application No.(Offline)'
            }
            value={txt(data, ['refApplicationNo'])}
            onChange={(e) => onChange({ refApplicationNo: e.target.value })}
          />
        </div>
        {isEdit ? (
          <div className="space-y-1">
            <Label className="text-xs">Admission Date</Label>
            <DatePicker
              placeholder="Admission Date"
              value={parseDate(data.adminssionDate)}
              onChange={(d) => onChange({ adminssionDate: d })}
            />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label className="text-xs">Date Of Registration</Label>
          <DatePicker
            placeholder="Date Of Registration"
            value={parseDate(data.dateOfRegistration)}
            onChange={(d) => onChange({ dateOfRegistration: d })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Receipt Number</Label>
          <Input
            placeholder="Receipt Number"
            value={txt(data, ['receiptNo'])}
            onChange={(e) => onChange({ receiptNo: e.target.value })}
          />
        </div>
        <Select
          label={isEdit ? 'Student Type' : 'Student Types'}
          placeholder={isEdit ? 'Student Type' : 'Student Types'}
          value={data.studentTypeId ? String(data.studentTypeId) : ''}
          onChange={(v) => onChange({ studentTypeId: v ? Number(v) : null })}
          options={gdOptions(studentTypes)}
          searchable
          clearable
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Checkbox
            checked={Boolean(data.isLateral)}
            onCheckedChange={(c) => onChange({ isLateral: c === true })}
          />
          Is Lateral
        </label>
      </div>
    </div>
  )
}
