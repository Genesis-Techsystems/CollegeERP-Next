'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  messageContent: z.string().trim().min(1, 'Message is required'),
})

type FormValues = z.infer<typeof schema>

export type CounselorSendSmsModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    messageContent: string
    subject: string
    fromEmailId: string
    isSmsAlert: boolean
  }) => void | Promise<void>
}

/** Angular `CouncelorSendSmsComponent` — message only; parent attaches student/course fields. */
export function CounselorSendSmsModal({
  open,
  onClose,
  onSubmit,
}: Readonly<CounselorSendSmsModalProps>) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { messageContent: '' },
  })

  useEffect(() => {
    if (open) reset({ messageContent: '' })
  }, [open, reset])

  async function submit(values: FormValues) {
    // Angular submit(): subject, fromEmailId, isSmsAlert fixed; mailContentHtml unused for SMS path.
    await onSubmit({
      messageContent: values.messageContent,
      subject: 'Counselor Meeting',
      fromEmailId: 'dev@gentechsys.com',
      isSmsAlert: true,
    })
    onClose()
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Send SMS"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(submit)()
      }}
      submitLabel="Send"
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="space-y-2">
        <Label htmlFor="counselor-sms-message">Message *</Label>
        <Controller
          name="messageContent"
          control={control}
          render={({ field }) => (
            <Textarea
              id="counselor-sms-message"
              rows={5}
              placeholder="Enter SMS message"
              value={field.value}
              onChange={field.onChange}
              className="resize-y"
            />
          )}
        />
        {errors.messageContent ? (
          <p className="text-xs text-destructive">{errors.messageContent.message}</p>
        ) : null}
      </div>
    </FormModal>
  )
}
