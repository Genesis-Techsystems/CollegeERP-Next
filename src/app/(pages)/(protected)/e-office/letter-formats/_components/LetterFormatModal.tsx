'use client'

import { useEffect, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { RichTextEditor } from '@/common/components/rich-text-editor'
import { ActiveStatusField } from '@/common/components/forms'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OfficeLetterFormatRow } from '@/types/e-office'

export type LetterFormatModalProps = {
  open: boolean
  onClose: () => void
  onSave: (payload: OfficeLetterFormatRow) => Promise<void>
  organizationId: number
  collegeId: number
  orgLabel: string
  collegeLabel: string
  initial?: OfficeLetterFormatRow | null
  isSubmitting?: boolean
}

type ContentKind = 'html' | 'message' | 'email'

function detectContentKind(row?: OfficeLetterFormatRow | null): ContentKind {
  if (!row) return 'html'
  if (row.messageContent) return 'message'
  if (row.emailContent) return 'email'
  return 'html'
}

function editorValue(row: OfficeLetterFormatRow | null | undefined, kind: ContentKind): string {
  if (!row) return ''
  if (kind === 'message') return row.messageContent ?? ''
  if (kind === 'email') return row.emailContent ?? ''
  return row.htmlContent ?? ''
}

export function LetterFormatModal({
  open,
  onClose,
  onSave,
  organizationId,
  collegeId,
  orgLabel,
  collegeLabel,
  initial,
  isSubmitting,
}: LetterFormatModalProps) {
  const isEdit = Boolean(initial?.officeLetterFormatsId)
  const [formatCode, setFormatCode] = useState('')
  const [formatDescription, setFormatDescription] = useState('')
  const [contentKind, setContentKind] = useState<ContentKind>('html')
  const [editorHtml, setEditorHtml] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  useEffect(() => {
    if (!open) return
    setFormatCode(initial?.formatCode ?? '')
    setFormatDescription(initial?.formatDescription ?? '')
    const kind = detectContentKind(initial)
    setContentKind(kind)
    setEditorHtml(editorValue(initial, kind))
    setIsActive(initial?.isActive ?? true)
    setReason(initial?.reason ?? 'active')
  }, [open, initial])

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!formatCode.trim() || !formatDescription.trim()) return
    const payload: OfficeLetterFormatRow = {
      organizationId,
      collegeId,
      formatCode: formatCode.trim(),
      formatDescription: formatDescription.trim(),
      htmlContent: contentKind === 'html' ? editorHtml : '',
      messageContent: contentKind === 'message' ? editorHtml : '',
      emailContent: contentKind === 'email' ? editorHtml : '',
      isActive,
      reason: isActive ? 'active' : reason,
      officeLetterFormatsId: initial?.officeLetterFormatsId,
    }
    await onSave(payload)
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Format' : 'Add Format'}
      description={`${orgLabel} / ${collegeLabel}`}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Back"
      size="xl"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      contentClassName="sm:max-w-4xl max-h-[min(34rem,92vh)] overflow-hidden flex flex-col gap-0"
      formClassName="space-y-3 overflow-hidden py-1"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="formatCode" className="text-[12px]">
            Format Code
          </Label>
          <Input
            id="formatCode"
            className="h-9 text-[12px]"
            value={formatCode}
            onChange={(ev) => setFormatCode(ev.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="formatDescription" className="text-[12px]">
            Format Description
          </Label>
          <Input
            id="formatDescription"
            className="h-9 text-[12px]"
            value={formatDescription}
            onChange={(ev) => setFormatDescription(ev.target.value)}
            required
          />
        </div>
      </div>

      <Select
        label="Content type"
        value={contentKind}
        onChange={(v) => setContentKind((v ?? 'html') as ContentKind)}
        options={[
          { value: 'html', label: 'HTML Content' },
          { value: 'message', label: 'Message Content' },
          { value: 'email', label: 'Email Content' },
        ]}
        className="sm:max-w-xs"
      />

      <div className="space-y-1">
        <Label className="text-[12px]">Content</Label>
        <RichTextEditor
          value={editorHtml}
          onChange={setEditorHtml}
          minHeight={88}
          className="[&_.ProseMirror]:min-h-[88px] [&_.ProseMirror]:max-h-[88px] [&_.ProseMirror]:overflow-y-auto"
        />
        <p className="text-[11px] text-amber-600">Maximum word limit 350.</p>
      </div>

      <ActiveStatusField
        isActive={isActive}
        onActiveChange={(v) => setIsActive(v === true)}
        reason={reason}
        onReasonChange={setReason}
      />
    </FormModal>
  )
}
