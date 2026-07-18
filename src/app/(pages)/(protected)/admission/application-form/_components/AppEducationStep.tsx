'use client'

import { Plus, School, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { FormSectionHeader } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/FormSectionHeader'
import { ensureArray, gdOptions, type AnyRow } from './application-form-utils'

export interface AppEducationStepProps {
  data: AnyRow
  onChange: (patch: Partial<AnyRow>) => void
  languages: AnyRow[]
  onAddEducation: () => void
  onRemoveEducation: (index: number, item: AnyRow) => void
}

const EDU_FIELDS = [
  { key: 'nameOfInstitution', header: 'Institution Name', placeholder: 'Name' },
  { key: 'board', header: 'Board', placeholder: 'Board' },
  { key: 'medium', header: 'Medium', placeholder: 'Medium' },
  { key: 'address', header: 'Address', placeholder: 'Address' },
  { key: 'majorSubjects', header: 'Major Subjects', placeholder: 'Subjects' },
  { key: 'gradeClassSecured', header: 'Grade', placeholder: 'Grade' },
  { key: 'yearOfCompletion', header: 'Year Of Completion', placeholder: 'Year' },
  { key: 'precentage', header: 'Percentage', placeholder: 'Percentage' },
] as const

/** Angular Educational Record — uses languageId1/2/3 (not language1Id). */
export function AppEducationStep({
  data,
  onChange,
  languages,
  onAddEducation,
  onRemoveEducation,
}: AppEducationStepProps) {
  const education = ensureArray<AnyRow>(data.studentEducationDetails)

  function updateEducation(index: number, patch: Partial<AnyRow>) {
    const next = education.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange({ studentEducationDetails: next })
  }

  return (
    <div className="space-y-5">
      <FormSectionHeader
        icon={School}
        title="Educational Record"
        action={
          education.length === 0 ? (
            <Button type="button" size="sm" onClick={onAddEducation}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          ) : null
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              {EDU_FIELDS.map((f) => (
                <th key={f.key} className="border-b border-border px-2 py-2 font-medium">
                  {f.header}
                </th>
              ))}
              <th className="border-b border-border px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {education
              .filter((r) => r.isActive !== false)
              .map((row, index) => (
                <tr key={index} className="border-b border-border/60">
                  {EDU_FIELDS.map((f) => (
                    <td key={f.key} className="px-1 py-1">
                      <Input
                        className="h-8 text-xs"
                        placeholder={f.placeholder}
                        value={String(row[f.key] ?? '')}
                        onChange={(e) => updateEducation(index, { [f.key]: e.target.value })}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 py-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onAddEducation}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {index > 0 ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onRemoveEducation(index, row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <FormSectionHeader icon={School} title="Languages Known" />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              <th className="border-b border-border px-2 py-2">Language</th>
              <th className="border-b border-border px-2 py-2 text-center">Speak</th>
              <th className="border-b border-border px-2 py-2 text-center">Read</th>
              <th className="border-b border-border px-2 py-2 text-center">Write</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((n) => {
              const langKey = `languageId${n}`
              const speakKey = `speak${n}`
              const readKey = `read${n}`
              const writeKey = `write${n}`
              return (
                <tr key={n} className="border-b border-border/60">
                  <td className="px-2 py-1">
                    <Select
                      placeholder="Language"
                      value={data[langKey] ? String(data[langKey]) : ''}
                      onChange={(v) => onChange({ [langKey]: v ? Number(v) : null })}
                      options={gdOptions(languages)}
                      searchable
                      clearable
                    />
                  </td>
                  {([speakKey, readKey, writeKey] as const).map((key) => (
                    <td key={key} className="px-2 py-1 text-center">
                      <Checkbox
                        checked={Boolean(data[key])}
                        onCheckedChange={(c) => onChange({ [key]: c === true })}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
