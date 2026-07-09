'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createDocumentRepository,
  listActiveCollegesByUniversityForDocumentRepository,
  listActiveCoursesByUniversityForDocumentRepository,
  listActiveOrganizationsForDocumentRepository,
  listActiveUniversitiesForDocumentRepository,
  listDocFormTypesForDocumentRepository,
  listDocTypesForDocumentRepository,
  updateDocumentRepository,
} from '@/services'
import type { College } from '@/types/college'
import type { Course } from '@/types/course'
import type { DocumentRepository } from '@/types/document-repository'
import type { Organization } from '@/types/organization'
import type { University } from '@/types/university'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  universityId: z.number().min(1, 'University is required'),
  collegeId: z.number().min(1, 'College is required'),
  courseId: z.number().min(1, 'Course is required'),
  docTypeId: z.number().min(1, 'Document type is required'),
  docFormId: z.number().min(1, 'Document form type is required'),
  fileNameFormat: z.string().optional(),
  docName: z.string().min(1, 'Document name is required'),
  docCode: z.string().optional(),
  isForStudent: z.boolean().optional(),
  isForEmp: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GeneralDetail {
  generalDetailId: number
  generalDetailCode?: string
  name?: string
}

interface DocumentRepositoryModalProps {
  open: boolean
  onClose: () => void
  row: DocumentRepository | null
  existingRows?: DocumentRepository[]
  onSaved: () => void
}

export default function DocumentRepositoryModal({
  open,
  onClose,
  row,
  existingRows = [],
  onSaved,
}: Readonly<DocumentRepositoryModalProps>) {
  const isEditing = Boolean(row)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [docTypes, setDocTypes] = useState<GeneralDetail[]>([])
  const [docForms, setDocForms] = useState<GeneralDetail[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      universityId: undefined,
      collegeId: undefined,
      courseId: undefined,
      docTypeId: undefined,
      docFormId: undefined,
      fileNameFormat: '',
      docName: '',
      docCode: '',
      isForStudent: false,
      isForEmp: false,
      isMandatory: false,
      isActive: true,
      reason: '',
    },
  })

  const universityId = watch('universityId')

  const organizationOptions = useMemo(
    () => organizations.map((item) => ({ value: String(item.organizationId), label: item.orgCode ?? item.orgName })),
    [organizations],
  )
  const universityOptions = useMemo(
    () => universities.map((item) => ({ value: String(item.universityId), label: item.universityCode ?? item.universityName })),
    [universities],
  )
  const collegeOptions = useMemo(
    () => colleges.map((item) => ({ value: String(item.collegeId), label: item.collegeCode ?? item.collegeName })),
    [colleges],
  )
  const courseOptions = useMemo(
    () => courses.map((item) => ({ value: String(item.courseId), label: item.courseCode ?? item.courseName })),
    [courses],
  )
  const docTypeOptions = useMemo(
    () => docTypes.map((item) => ({ value: String(item.generalDetailId), label: item.generalDetailCode ?? item.name ?? '-' })),
    [docTypes],
  )
  const docFormOptions = useMemo(
    () => docForms.map((item) => ({ value: String(item.generalDetailId), label: item.generalDetailCode ?? item.name ?? '-' })),
    [docForms],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([
      listActiveOrganizationsForDocumentRepository(),
      listActiveUniversitiesForDocumentRepository(),
      listDocTypesForDocumentRepository(),
      listDocFormTypesForDocumentRepository(),
    ])
      .then(([orgRows, universityRows, docTypeRows, docFormRows]) => {
        setOrganizations(orgRows)
        setUniversities(universityRows)
        setDocTypes(docTypeRows)
        setDocForms(docFormRows)
      })
      .catch((error) => setSubmitError(error instanceof Error ? error.message : 'Failed to load form data'))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (row) {
      reset({
        organizationId: row.organizationId,
        universityId: row.universityId,
        collegeId: row.collegeId,
        courseId: row.courseId,
        docTypeId: row.docTypeId,
        docFormId: row.docFormId,
        fileNameFormat: row.fileNameFormat ?? '',
        docName: row.docName,
        docCode: row.docCode ?? '',
        isForStudent: row.isForStudent ?? false,
        isForEmp: row.isForEmp ?? false,
        isMandatory: row.isMandatory ?? false,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [open, row, reset])

  useEffect(() => {
    if (!open || !universityId) {
      setColleges([])
      setCourses([])
      return
    }
    Promise.all([
      listActiveCollegesByUniversityForDocumentRepository(universityId),
      listActiveCoursesByUniversityForDocumentRepository(universityId),
    ])
      .then(([collegeRows, courseRows]) => {
        setColleges(collegeRows)
        setCourses(courseRows)
      })
      .catch((error) => setSubmitError(error instanceof Error ? error.message : 'Failed to load university data'))
  }, [open, universityId])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      if (!isEditing) {
        const docName = values.docName.trim().toLowerCase()
        const docCode = (values.docCode ?? '').trim().toLowerCase()
        const duplicate = existingRows.some((item) =>
          item.courseId === values.courseId
          && item.collegeId === values.collegeId
          && item.universityId === values.universityId
          && item.organizationId === values.organizationId
          && (item.docName ?? '').trim().toLowerCase() === docName
          && (item.docCode ?? '').trim().toLowerCase() === docCode,
        )
        if (duplicate) {
          setSubmitError(
            'Already document type exists with same name or code in organization or university or college or course.',
          )
          return
        }
        await createDocumentRepository(values)
      } else {
        await updateDocumentRepository(row!.documentRepositoryId, values)
      }
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save document repository')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Document Repository' : 'Add Document Repository'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={organizationOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="universityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="University"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : undefined
                    field.onChange(next)
                    setValue('collegeId', undefined as unknown as number)
                    setValue('courseId', undefined as unknown as number)
                  }}
                  options={universityOptions}
                  placeholder="Select university"
                  searchable
                  error={errors.universityId?.message}
                />
              )}
            />
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  disabled={!universityId}
                  error={errors.collegeId?.message}
                />
              )}
            />
            <Controller
              name="courseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={courseOptions}
                  placeholder="Select course"
                  searchable
                  disabled={!universityId}
                  error={errors.courseId?.message}
                />
              )}
            />
            <Controller
              name="docTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Document Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={docTypeOptions}
                  placeholder="Select document type"
                  searchable
                  error={errors.docTypeId?.message}
                />
              )}
            />
            <Controller
              name="docFormId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Document Form Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={docFormOptions}
                  placeholder="Select document form type"
                  searchable
                  error={errors.docFormId?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="fileNameFormat">File Name Format</Label>
              <Input id="fileNameFormat" {...register('fileNameFormat')} />
            </div>
            <div>
              <Label htmlFor="docName">Document Name *</Label>
              <Input id="docName" {...register('docName')} />
              {errors.docName && <p className="text-xs text-red-500">{errors.docName.message}</p>}
            </div>
            <div>
              <Label htmlFor="docCode">Document Code</Label>
              <Input id="docCode" {...register('docCode')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isForStudent"
                checked={watch('isForStudent') ?? false}
                onCheckedChange={(checked) => setValue('isForStudent', Boolean(checked))}
              />
              <Label htmlFor="isForStudent">For Student</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isForEmp"
                checked={watch('isForEmp') ?? false}
                onCheckedChange={(checked) => setValue('isForEmp', Boolean(checked))}
              />
              <Label htmlFor="isForEmp">For Employee</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isMandatory"
                checked={watch('isMandatory') ?? false}
                onCheckedChange={(checked) => setValue('isMandatory', Boolean(checked))}
              />
              <Label htmlFor="isMandatory">Mandatory</Label>
            </div>
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(value) => setValue('reason', value)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}

          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Close</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

