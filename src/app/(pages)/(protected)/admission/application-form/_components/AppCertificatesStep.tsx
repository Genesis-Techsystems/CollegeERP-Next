'use client'

import { FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormSectionHeader } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/FormSectionHeader'
import type { StudentDocumentRow } from './application-form-utils'

export interface AppCertificatesStepProps {
  documents: StudentDocumentRow[]
  onChange: (index: number, patch: Partial<StudentDocumentRow>) => void
}

/** Angular Certificates step columns (no Preview column). */
export function AppCertificatesStep({ documents, onChange }: AppCertificatesStepProps) {
  return (
    <div className="space-y-4">
      <FormSectionHeader icon={FileText} title="Certificate Collection" />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              {['Document Name', 'Hardcopy', 'Softcopy', 'Original', 'Verified', 'Rack Number', 'upload'].map(
                (h) => (
                  <th key={h} className="border-b border-border px-2 py-2 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No documents configured for the selected college / course.
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={doc.documentRepositoryId} className="border-b border-border/60">
                  <td className="px-2 py-2">{doc.fileName}</td>
                  {(['isHardCopy', 'isSoftCopy', 'isOriginal', 'isVerified'] as const).map((key) => (
                    <td key={key} className="px-2 py-2 text-center">
                      <Checkbox
                        checked={doc[key]}
                        onCheckedChange={(c) => onChange(index, { [key]: c === true })}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Rack Number"
                      value={doc.rackNumber}
                      onChange={(e) => onChange(index, { rackNumber: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {doc.isSoftCopy ? (
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="max-w-[140px] text-[10px]"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onChange(index, { path: file })
                        }}
                      />
                    ) : (
                      <span className="text-primary">To upload Doc check Softcopy</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
