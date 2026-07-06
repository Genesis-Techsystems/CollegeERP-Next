'use client'

import { Laptop, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FormSectionHeader } from './FormSectionHeader'
import { ensureArray, ACTIVITY_FIELD_PLACEHOLDERS, EDIT_PLACEHOLDERS, type AnyRow } from './edit-student-utils'

export interface ActivitiesStepProps {
  data: AnyRow
  onChange: (patch: Partial<AnyRow>) => void
  onAddActivity: () => void
  onRemoveActivity: (index: number, item: AnyRow) => void
}

export function ActivitiesStep({ data, onChange, onAddActivity, onRemoveActivity }: ActivitiesStepProps) {
  const activities = ensureArray<AnyRow>(data.studentActivitiesDetails)

  function updateActivity(index: number, patch: Partial<AnyRow>) {
    const next = activities.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange({ studentActivitiesDetails: next })
  }

  return (
    <div className="space-y-5">
      <FormSectionHeader
        icon={Laptop}
        title="Extra Curricular Activities"
        action={
          activities.length === 0 ? (
            <Button type="button" size="sm" onClick={onAddActivity}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          ) : null
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              <th className="border-b border-border px-2 py-2">Particular</th>
              <th className="border-b border-border px-2 py-2">Level</th>
              <th className="border-b border-border px-2 py-2">Sponsored By</th>
              <th className="border-b border-border px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {activities.filter((r) => r.isActive !== false).map((row, index) => (
              <tr key={index} className="border-b border-border/60">
                {(['particulars', 'level', 'sponsoredBy'] as const).map((field) => (
                  <td key={field} className="px-1 py-1">
                    <Input className="h-8 text-xs" placeholder={ACTIVITY_FIELD_PLACEHOLDERS[field]} value={String(row[field] ?? '')} onChange={(e) => updateActivity(index, { [field]: e.target.value })} />
                  </td>
                ))}
                <td className="px-2 py-1 whitespace-nowrap">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onAddActivity}><Plus className="h-3.5 w-3.5" /></Button>
                  {index > 0 ? (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onRemoveActivity(index, row)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormSectionHeader icon={Laptop} title="Hobbies And Other Interests" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Hobbies</Label>
          <Textarea placeholder={EDIT_PLACEHOLDERS.hobbies} value={String(data.hobbies ?? '')} onChange={(e) => onChange({ hobbies: e.target.value })} rows={4} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Interests</Label>
          <Textarea placeholder={EDIT_PLACEHOLDERS.interests} value={String(data.interests ?? '')} onChange={(e) => onChange({ interests: e.target.value })} rows={4} />
        </div>
      </div>
    </div>
  )
}
