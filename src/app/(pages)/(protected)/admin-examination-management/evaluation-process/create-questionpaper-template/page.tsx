'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileQuestion, CheckCircle2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useSessionContext } from '@/context/SessionContext'
import { crud } from '@/services/crud'
import { getCollegeFilters } from '@/services/evaluation'

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  templateTitle: z.string().min(1, 'Template title is required').max(200, 'Max 200 characters'),
  totalmarks: z
    .number()
    .int('Must be a whole number')
    .positive('Must be greater than 0'),
  templateDescription: z.string().max(500, 'Max 500 characters').optional(),
  universityId: z.string().min(1, 'Please select a university'),
})

type FormValues = z.infer<typeof schema>

// ─── Helper: parse university rows ───────────────────────────────────────────

interface UniversityRow {
  fk_university_id?: number
  university_id?: number
  university_name?: string
  university_code?: string
  org_name?: string
}

function parseUniversityOptions(resultSets: unknown[][]): SelectOption[] {
  const flat = resultSets.flat() as UniversityRow[]
  const seen = new Set<string>()
  const opts: SelectOption[] = []
  for (const row of flat) {
    const id = row.fk_university_id ?? row.university_id
    const label = row.university_name ?? row.university_code ?? row.org_name
    if (id == null || label == null) continue
    const val = String(id)
    if (seen.has(val)) continue
    seen.add(val)
    opts.push({ value: val, label: String(label) })
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateQuestionPaperTemplatePage() {
  const { user } = useSessionContext()

  const [universityOptions, setUniversityOptions] = useState<SelectOption[]>([])
  const [filterLoading, setFilterLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateTitle: '',
      totalmarks: undefined,
      templateDescription: '',
      universityId: '',
    },
  })

  const selectedUniversityId = watch('universityId')

  // ── Load university options ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setFilterLoading(true)
      try {
        const resultSets = await getCollegeFilters({
          orgId: user?.organizationId,
          employeeId: user?.employeeId,
        })
        if (cancelled) return
        const opts = parseUniversityOptions(resultSets)
        setUniversityOptions(opts)
        if (opts.length === 1) {
          setValue('universityId', opts[0].value, { shouldValidate: false })
        }
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setFilterLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.organizationId, user?.employeeId, setValue])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(data: FormValues) {
    setSuccessMessage(null)
    setSubmitError(null)
    try {
      await crud.postDetails('addExamQpTemplateAndDetails', {
        templateTitle: data.templateTitle,
        totalmarks: data.totalmarks,
        templateDescription: data.templateDescription ?? '',
        universityId: Number(data.universityId),
        isActive: true,
      })
      setSuccessMessage(`Template "${data.templateTitle}" saved successfully.`)
      reset({
        templateTitle: '',
        totalmarks: undefined,
        templateDescription: '',
        universityId: universityOptions.length === 1 ? universityOptions[0].value : '',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save template. Please try again.'
      setSubmitError(msg)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Create Question Paper Template"
        subtitle="Define a new evaluation template that can be linked to question papers"
      />

      {/* Info card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex gap-4">
        <FileQuestion className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-medium text-slate-800">About Question Paper Templates</p>
          <p>
            Templates define the marks structure for evaluation question papers. Once created, a
            template can be selected when configuring exam question papers for a given
            university. Each template specifies the total marks and an optional description for
            evaluator reference.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
          <button
            type="button"
            className="ml-auto text-emerald-600 hover:text-emerald-800 text-xs underline"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          {submitError}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* University */}
          <div className="space-y-1">
            <Select
              label="University"
              options={universityOptions}
              value={selectedUniversityId || null}
              onChange={(v) => setValue('universityId', v ?? '', { shouldValidate: true })}
              placeholder="Select University"
              isLoading={filterLoading}
              searchable={universityOptions.length > 6}
              required
              error={errors.universityId?.message}
            />
          </div>

          {/* Template Title */}
          <div className="space-y-1.5">
            <Label htmlFor="templateTitle">
              Template Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="templateTitle"
              placeholder="e.g. End Semester Evaluation Template"
              aria-invalid={!!errors.templateTitle}
              {...register('templateTitle')}
            />
            {errors.templateTitle && (
              <p className="text-xs text-destructive">{errors.templateTitle.message}</p>
            )}
          </div>

          {/* Total Marks */}
          <div className="space-y-1.5">
            <Label htmlFor="totalmarks">
              Total Marks <span className="text-destructive">*</span>
            </Label>
            <Input
              id="totalmarks"
              type="number"
              min={1}
              placeholder="e.g. 100"
              aria-invalid={!!errors.totalmarks}
              {...register('totalmarks', { valueAsNumber: true })}
            />
            {errors.totalmarks && (
              <p className="text-xs text-destructive">{errors.totalmarks.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="templateDescription">Description</Label>
            <textarea
              id="templateDescription"
              rows={4}
              placeholder="Optional notes about this template…"
              aria-invalid={!!errors.templateDescription}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              {...register('templateDescription')}
            />
            {errors.templateDescription && (
              <p className="text-xs text-destructive">{errors.templateDescription.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Template'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() =>
                reset({
                  templateTitle: '',
                  totalmarks: undefined,
                  templateDescription: '',
                  universityId: universityOptions.length === 1 ? universityOptions[0].value : '',
                })
              }
            >
              Clear
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
