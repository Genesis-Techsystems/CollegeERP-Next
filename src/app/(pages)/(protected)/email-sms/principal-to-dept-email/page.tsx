'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Mail, Send } from 'lucide-react'
import { Select, MultiSelect } from '@/common/components/select'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'
import {
  listActiveCollegesForDepartments,
  listDepartmentsByCollege,
  sendBulkEmailToEmployeesDepartmentWise,
  uploadFileForEmail,
} from '@/services'

/** Angular `principal-to-dpt-email.component.ts` — not the same screen as `department-wise-email`. */
const FROM_EMAIL_DEFAULT = 'dev@gentechsyspro.com'
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024

export default function PrincipalToDeptEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isEmailAlert, setIsEmailAlert] = useState(true)
  const [sending, setSending] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    listActiveCollegesForDepartments()
      .then((rows) => {
        setColleges(rows)
        if (rows.length) setCollegeId((prev) => prev ?? rows[0].collegeId)
      })
      .catch(() => setColleges([]))
  }, [])

  useEffect(() => {
    if (!collegeId) {
      setDepartments([])
      return
    }
    listDepartmentsByCollege(collegeId)
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [collegeId])

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.departmentId), label: d.deptCode || d.deptName })),
    [departments],
  )

  const canSend = Boolean(collegeId && departmentIds.length > 0 && subject.trim() && body.trim())

  function onFileChange() {
    const el = fileRef.current
    const f = el?.files?.[0]
    if (!f) return
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toastError('File size must not exceed 24 MB')
      el.value = ''
    }
  }

  async function resolveFilePath(): Promise<string> {
    const el = fileRef.current
    const f = el?.files?.[0]
    if (!f) return ''
    const fd = new FormData()
    fd.append('file', f, f.name)
    return uploadFileForEmail(fd)
  }

  const clearForm = useCallback(() => {
    setSubject('')
    setBody('')
    setDepartmentIds([])
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  async function handleSend() {
    if (!collegeId || departmentIds.length === 0) {
      toastError('Select a college and at least one department')
      return
    }
    if (!subject.trim() || !body.trim()) {
      toastError('Subject and message are required')
      return
    }
    const file = fileRef.current?.files?.[0] ?? null
    setSending(true)
    try {
      let filePath = ''
      if (file) filePath = await resolveFilePath()
      await sendBulkEmailToEmployeesDepartmentWise({
        collegeId,
        subject: subject.trim(),
        mailContent: body.trim(),
        mailContentHtml: body.trim(),
        fromEmailId: FROM_EMAIL_DEFAULT,
        isEmailAlert,
        courseYearIds: [],
        departmentIds: departmentIds.map((id) => Number(id) || 0).filter((id) => id > 0),
        filePath,
      })
      toastSuccess('Email sent successfully')
      clearForm()
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const hasDepartments = departmentIds.length > 0

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            Send email to departments
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-foreground hover:text-foreground/80"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="principal-to-dept-filters"
          >
            Filter
            <Filter className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent id="principal-to-dept-filters">
            <div className="p-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <Select
                  label="College *"
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setCollegeId(v ? Number(v) : null)
                    setDepartmentIds([])
                  }}
                  options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode }))}
                  searchable
                  className="md:col-span-4"
                />
                <MultiSelect
                  label="Departments *"
                  value={departmentIds}
                  onChange={setDepartmentIds}
                  options={departmentOptions}
                  searchable
                  placeholder="Select departments"
                  disabled={!collegeId || departmentOptions.length === 0}
                  className="md:col-span-8"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {hasDepartments && (
        <div className="app-card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b">
            <h2 className="text-sm font-semibold text-foreground">Compose email</h2>
            <p className="text-xs text-muted-foreground mt-1">Subject, message, and optional attachment for the selected departments.</p>
          </div>
          <div className="p-4 space-y-4">
            <FormField label="Subject *">
              <input
                type="text"
                className="app-control flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-[length:var(--app-control-font-size)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </FormField>
            <FormField label="Message *">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </FormField>

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
              <FormField label="Attachment (optional)" className="flex-1 min-w-[200px] mb-0">
                <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.pdf,.doc" className="text-sm w-full" onChange={onFileChange} />
              </FormField>
              <div className="flex items-center gap-2 pb-1">
                <Checkbox id="p2d-alert" checked={isEmailAlert} onCheckedChange={(c) => setIsEmailAlert(c === true)} />
                <Label htmlFor="p2d-alert" className="text-sm font-normal cursor-pointer">
                  Email alert
                </Label>
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button type="button" variant="outline" onClick={clearForm} disabled={sending}>
                  Clear
                </Button>
                <Button type="button" className="gap-1" onClick={() => void handleSend()} disabled={sending || !canSend}>
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
