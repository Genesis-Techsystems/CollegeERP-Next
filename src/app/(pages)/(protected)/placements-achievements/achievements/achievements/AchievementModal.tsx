'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Select as SearchSelect } from '@/common/components/select'
import { listOrganizations } from '@/services/admin/organization'
import {
  listAchievementSubCategories, createAchievement, updateAchievement,
} from '@/services/placements'
import { listGeneralDetailsByCode } from '@/services'
import { searchStudentsByKeyword } from '@/services/student-information'
import { searchEmployeesForHr } from '@/services/hr-payroll'
import type { Achievement, AchievementSubCategory } from '@/types/placements'
import type { Organization } from '@/types/organization'

type AnyRow = Record<string, any>

const SELECT_CLASS = "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const schema = z.object({
  organizationId: z.string().min(1, 'Organization is required'),
  achivementTitle: z.string().min(1, 'Achievement title is required'),
  achievementLevelCatId: z.string().min(1, 'Level is required'),
  subcategoryId: z.string().optional(),
  specialization: z.string().optional(),
  prizeCatId: z.string().optional(),
  achivementDescription: z.string().optional(),
  ranks: z.string().optional(),
  grade: z.string().optional(),
  percentage: z.string().optional(),
  durationFrom: z.string().optional(),
  durationTo: z.string().optional(),
  referenceNo: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: Achievement | null): FormValues {
  return {
    organizationId: String(edit?.organizationId ?? ''),
    achivementTitle: edit?.achivementTitle ?? '',
    achievementLevelCatId: String(edit?.achievementLevelCatId ?? ''),
    subcategoryId: String(edit?.subcategoryId ?? ''),
    specialization: edit?.specialization ?? '',
    prizeCatId: String(edit?.prizeCatId ?? ''),
    achivementDescription: edit?.achivementDescription ?? '',
    ranks: edit?.ranks ?? '',
    grade: edit?.grade ?? '',
    percentage: String(edit?.percentage ?? ''),
    durationFrom: edit?.durationFrom ?? '',
    durationTo: edit?.durationTo ?? '',
    referenceNo: edit?.referenceNo ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: Achievement | null
  onSaved: () => void
}

export default function AchievementModal({ open, onClose, editData, onSaved }: Props) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [subCategories, setSubCategories] = useState<AchievementSubCategory[]>([])
  const [achievementLevels, setAchievementLevels] = useState<AnyRow[]>([])
  const [prizes, setPrizes] = useState<AnyRow[]>([])

  // Student search (outside RHF — requires async search)
  const [studentSearchRows, setStudentSearchRows] = useState<AnyRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Employee search (outside RHF — requires async search)
  const [employeeSearchRows, setEmployeeSearchRows] = useState<AnyRow[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    if (!open) return
    listOrganizations().then(setOrganizations).catch(console.error)
    listAchievementSubCategories().then(setSubCategories).catch(console.error)
    listGeneralDetailsByCode('ACHVMNTLVL').then(setAchievementLevels).catch(console.error)
    listGeneralDetailsByCode('prizes').then(setPrizes).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
    if (editData) {
      setSelectedStudentIds(editData.fkParticipatedStdIds ? editData.fkParticipatedStdIds.split(',').filter(Boolean) : [])
      setSelectedEmployeeIds(editData.fkParticipatedEmpIds ? editData.fkParticipatedEmpIds.split(',').filter(Boolean) : [])
    } else {
      setSelectedStudentIds([])
      setSelectedEmployeeIds([])
      setStudentSearchRows([])
      setEmployeeSearchRows([])
    }
  }, [open, editData, reset])

  const isActive = watch('isActive')

  const studentOptions = useMemo(() => studentSearchRows.map((r) => ({
    value: String(pickNum(r, ['studentId', 'fk_student_id'])),
    label: `${pickText(r, ['studentName', 'firstName']) || 'Student'} (${pickText(r, ['hallticketNumber', 'rollNumber']) || '-'})`,
  })), [studentSearchRows])

  const employeeOptions = useMemo(() => employeeSearchRows.map((r) => ({
    value: String(pickNum(r, ['employeeId', 'employee_id'])),
    label: `${pickText(r, ['employeeName', 'empName', 'firstName', 'name']) || 'Employee'} (${pickText(r, ['empNumber', 'employeeNumber']) || '-'})`,
  })), [employeeSearchRows])

  async function handleStudentSearch(term: string) {
    if (term.trim().length < 5) { setStudentSearchRows([]); return }
    setLoadingStudents(true)
    try { setStudentSearchRows(await searchStudentsByKeyword(term)) }
    catch { setStudentSearchRows([]) }
    finally { setLoadingStudents(false) }
  }

  async function handleEmployeeSearch(term: string) {
    if (term.trim().length < 5) { setEmployeeSearchRows([]); return }
    setLoadingEmployees(true)
    try { setEmployeeSearchRows(await searchEmployeesForHr(term)) }
    catch { setEmployeeSearchRows([]) }
    finally { setLoadingEmployees(false) }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<Achievement> = {
        organizationId: Number(values.organizationId),
        achivementTitle: values.achivementTitle,
        achievementLevelCatId: Number(values.achievementLevelCatId),
        subcategoryId: values.subcategoryId ? Number(values.subcategoryId) : undefined,
        specialization: values.specialization || undefined,
        prizeCatId: values.prizeCatId ? Number(values.prizeCatId) : undefined,
        achivementDescription: values.achivementDescription || undefined,
        ranks: values.ranks || undefined,
        grade: values.grade || undefined,
        percentage: values.percentage ? Number(values.percentage) : undefined,
        durationFrom: values.durationFrom || undefined,
        durationTo: values.durationTo || undefined,
        referenceNo: values.referenceNo || undefined,
        fkParticipatedStdIds: selectedStudentIds.length ? selectedStudentIds.join(',') : undefined,
        fkParticipatedEmpIds: selectedEmployeeIds.length ? selectedEmployeeIds.join(',') : undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateAchievement(editData.achievementId, payload)
      } else {
        await createAchievement(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Achievement' : 'Add Achievement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Organization *</Label>
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>
                      {organizations.map((o) => (
                        <SelectItem key={o.organizationId} value={String(o.organizationId)}>{o.orgName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.organizationId && <p className="text-xs text-red-500">{errors.organizationId.message}</p>}
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Achievement Title *</Label>
              <Input className="h-8 text-xs" {...register('achivementTitle')} />
              {errors.achivementTitle && <p className="text-xs text-red-500">{errors.achivementTitle.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Sub-Category</Label>
              <Controller
                name="subcategoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                    <SelectContent>
                      {subCategories.map((s) => (
                        <SelectItem key={s.subCategoryId} value={String(s.subCategoryId)}>{s.achievementSubcategory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Level *</Label>
              <Controller
                name="achievementLevelCatId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {achievementLevels.map((l) => (
                        <SelectItem key={l.generalDetailId ?? l.gd_id} value={String(l.generalDetailId ?? l.gd_id)}>
                          {l.generalDetailDisplayName ?? l.gd_name ?? 'Level'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.achievementLevelCatId && <p className="text-xs text-red-500">{errors.achievementLevelCatId.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Prize</Label>
              <Controller
                name="prizeCatId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select prize" /></SelectTrigger>
                    <SelectContent>
                      {prizes.map((p) => (
                        <SelectItem key={p.generalDetailId ?? p.gd_id} value={String(p.generalDetailId ?? p.gd_id)}>
                          {p.generalDetailDisplayName ?? p.gd_name ?? 'Prize'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Specialization</Label>
              <Input className="h-8 text-xs" {...register('specialization')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Ranks</Label>
              <Input className="h-8 text-xs" {...register('ranks')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Grade</Label>
              <Input className="h-8 text-xs" {...register('grade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Percentage</Label>
              <Input className="h-8 text-xs" type="number" {...register('percentage')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Duration From</Label>
              <Input className="h-8 text-xs" type="date" {...register('durationFrom')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Duration To</Label>
              <Input className="h-8 text-xs" type="date" {...register('durationTo')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Reference No.</Label>
              <Input className="h-8 text-xs" {...register('referenceNo')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-xs min-h-[64px]" {...register('achivementDescription')} />
            </div>
            <div className="col-span-2">
              <SearchSelect
                label="Students (search min 5 chars)"
                value={selectedStudentIds.length ? selectedStudentIds[0] : null}
                onChange={(v) => setSelectedStudentIds(v ? [v] : [])}
                options={studentOptions}
                placeholder="Search students…"
                searchable
                onSearch={(t) => void handleStudentSearch(t)}
                isLoading={loadingStudents}
                className={SELECT_CLASS}
              />
              {selectedStudentIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Selected IDs: {selectedStudentIds.join(', ')}</p>
              )}
            </div>
            <div className="col-span-2">
              <SearchSelect
                label="Employees (search min 5 chars)"
                value={selectedEmployeeIds.length ? selectedEmployeeIds[0] : null}
                onChange={(v) => setSelectedEmployeeIds(v ? [v] : [])}
                options={employeeOptions}
                placeholder="Search employees…"
                searchable
                onSearch={(t) => void handleEmployeeSearch(t)}
                isLoading={loadingEmployees}
                className={SELECT_CLASS}
              />
              {selectedEmployeeIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Selected IDs: {selectedEmployeeIds.join(', ')}</p>
              )}
            </div>
            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="achIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="achIsActive" className="text-xs">Active</label>
                  </div>
                )}
              />
            </div>
            {!isActive && (
              <div className="space-y-0.5 col-span-2">
                <Label className="text-xs">Reason</Label>
                <Input className="h-8 text-xs" {...register('reason')} />
              </div>
            )}
          </div>
          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
