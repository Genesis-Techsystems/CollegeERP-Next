'use client'

import { useEffect, useState } from 'react'
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
import { createPlacementCompany, updatePlacementCompany } from '@/services/placements'
import type { Campus } from '@/types/campus'
import type { Company, Placement, PlacementCompany } from '@/types/placements'

const schema = z.object({
  comapanyRequirements: z.string().min(1, 'Requirements are required'),
  sscGrade: z.string().optional(),
  sscPercentage: z.string().optional(),
  interGrade: z.string().optional(),
  interPercentage: z.string().optional(),
  diplomaGrade: z.string().optional(),
  diplomaPercentage: z.string().optional(),
  ugGrade: z.string().optional(),
  ugPercentage: z.string().optional(),
  pgGrade: z.string().optional(),
  pgPercentage: z.string().optional(),
  isBackLogAllowed: z.boolean(),
  skillSetIds: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: PlacementCompany | null): FormValues {
  return {
    comapanyRequirements: edit?.comapanyRequirements ?? '',
    sscGrade: edit?.sscGrade ?? '',
    sscPercentage: String(edit?.sscPercentage ?? ''),
    interGrade: edit?.interGrade ?? '',
    interPercentage: String(edit?.interPercentage ?? ''),
    diplomaGrade: edit?.diplomaGrade ?? '',
    diplomaPercentage: String(edit?.diplomaPercentage ?? ''),
    ugGrade: edit?.ugGrade ?? '',
    ugPercentage: String(edit?.ugPercentage ?? ''),
    pgGrade: edit?.pgGrade ?? '',
    pgPercentage: String(edit?.pgPercentage ?? ''),
    isBackLogAllowed: edit?.isBackLogAllowed ?? true,
    skillSetIds: edit?.skillSetIds ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

function ContextRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value ?? '—'}</span>
    </div>
  )
}

interface FilterContext {
  campus: Campus | null
  placement: Placement | null
  company: Company | null
}

interface Props {
  open: boolean
  onClose: () => void
  editData: PlacementCompany | null
  context: FilterContext
  onSaved: () => void
}

export default function PlacementCompanyModal({ open, onClose, editData, context, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { campus, placement, company } = context

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
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    if (!placement || !company) {
      setSubmitError('Select campus, placement, and company before saving.')
      return
    }

    setSubmitError(null)
    try {
      const payload: Partial<PlacementCompany> = {
        placementId: placement.placementId,
        companyId: company.companyId,
        companyname: company.companyname,
        contactDetails: '',
        comapanyRequirements: values.comapanyRequirements,
        sscGrade: values.sscGrade || undefined,
        sscPercentage: values.sscPercentage ? Number(values.sscPercentage) : undefined,
        interGrade: values.interGrade || undefined,
        interPercentage: values.interPercentage ? Number(values.interPercentage) : undefined,
        diplomaGrade: values.diplomaGrade || undefined,
        diplomaPercentage: values.diplomaPercentage ? Number(values.diplomaPercentage) : undefined,
        ugGrade: values.ugGrade || undefined,
        ugPercentage: values.ugPercentage ? Number(values.ugPercentage) : undefined,
        pgGrade: values.pgGrade || undefined,
        pgPercentage: values.pgPercentage ? Number(values.pgPercentage) : undefined,
        isBackLogAllowed: values.isBackLogAllowed,
        skillSetIds: values.skillSetIds || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updatePlacementCompany(editData.placementCompanyId, payload)
      } else {
        await createPlacementCompany(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Placement Requirements' : 'Add Placement Requirements'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-border p-3 space-y-1.5">
            {campus && (
              <ContextRow label="Campus" value={`${campus.campusName} - ${campus.orgCode}`} />
            )}
            <ContextRow label="Placement" value={placement?.plaecmentTitle} />
            <ContextRow label="Company" value={company?.companyname} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Requirements *</Label>
              <Textarea className="text-xs min-h-[64px]" {...register('comapanyRequirements')} />
              {errors.comapanyRequirements && <p className="text-xs text-red-500">{errors.comapanyRequirements.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">SSC Grade</Label>
              <Input className="h-8 text-xs" {...register('sscGrade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">SSC %</Label>
              <Input className="h-8 text-xs" type="number" {...register('sscPercentage')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Inter Grade</Label>
              <Input className="h-8 text-xs" {...register('interGrade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Inter %</Label>
              <Input className="h-8 text-xs" type="number" {...register('interPercentage')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Diploma Grade</Label>
              <Input className="h-8 text-xs" {...register('diplomaGrade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Diploma %</Label>
              <Input className="h-8 text-xs" type="number" {...register('diplomaPercentage')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">UG Grade</Label>
              <Input className="h-8 text-xs" {...register('ugGrade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">UG %</Label>
              <Input className="h-8 text-xs" type="number" {...register('ugPercentage')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">PG Grade</Label>
              <Input className="h-8 text-xs" {...register('pgGrade')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">PG %</Label>
              <Input className="h-8 text-xs" type="number" {...register('pgPercentage')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Skill Set (comma-separated)</Label>
              <Input className="h-8 text-xs" {...register('skillSetIds')} placeholder="e.g. Java, Angular, .Net" />
            </div>
            <div>
              <Controller
                name="isBackLogAllowed"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="pcBacklog" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="pcBacklog" className="text-xs">Backlog Allowed</label>
                  </div>
                )}
              />
            </div>
            <div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="pcIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="pcIsActive" className="text-xs">Active</label>
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
            <Button type="submit" disabled={isSubmitting || !placement || !company}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
