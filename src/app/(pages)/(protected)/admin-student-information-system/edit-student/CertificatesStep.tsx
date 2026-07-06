'use client'

import { FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormSectionHeader } from './FormSectionHeader'
import { DEFAULT_STUDENT_PHOTO, EDIT_PLACEHOLDERS, type StudentDocumentRow } from './edit-student-utils'

export interface CertificatesStepProps {
  documents: StudentDocumentRow[]
  onChange: (index: number, patch: Partial<StudentDocumentRow>) => void
}

export function CertificatesStep({ documents, onChange }: CertificatesStepProps) {
  return (
    <div className="space-y-4">
      <FormSectionHeader icon={FileText} title="Certificate Collection" />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              {['Document', 'Hardcopy', 'Softcopy', 'Original', 'Verified', 'Rack #', 'Preview', 'Upload'].map((h) => (
                <th key={h} className="border-b border-border px-2 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={doc.documentRepositoryId} className="border-b border-border/60">
                <td className="px-2 py-2">{doc.fileName}</td>
                {(['isHardCopy', 'isSoftCopy', 'isOriginal', 'isVerified'] as const).map((key) => (
                  <td key={key} className="px-2 py-2 text-center">
                    <Checkbox checked={doc[key]} onCheckedChange={(c) => onChange(index, { [key]: c === true })} />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <Input className="h-8 text-xs" placeholder={EDIT_PLACEHOLDERS.rackNumber} value={doc.rackNumber} onChange={(e) => onChange(index, { rackNumber: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  {doc.filePath && doc.isSoftCopy ? (
                    <img src={doc.filePath} alt="" className="h-10 w-10 rounded border object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_STUDENT_PHOTO }} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
                    <span className="text-primary">Check Softcopy to upload</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
