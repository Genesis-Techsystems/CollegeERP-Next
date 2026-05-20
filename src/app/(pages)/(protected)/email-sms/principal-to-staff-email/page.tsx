'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Send } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import type { College } from '@/types/college'
import {
  listActiveCollegesForDepartments,
  listRolesByOrganization,
  listUsersForSendLoginDetails,
  sendBulkEmailToAdminFromStaff,
  uploadFileForEmail,
  type RoleOption,
  type SendLoginDetailsUserRow,
} from '@/services'

const FROM_EMAIL_DEFAULT = 'dev@gentechsyspro.com'
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024

const n = (v: unknown) => Number(v) || 0

function splitSubjectAndBody(raw: string): { subject: string; body: string } {
  const t = raw.trim()
  if (!t) return { subject: '', body: '' }
  const nl = t.indexOf('\n')
  if (nl === -1) {
    return { subject: t.slice(0, 200), body: t }
  }
  const first = t.slice(0, nl).trim()
  const rest = t.slice(nl + 1).trim()
  return {
    subject: (first || 'Message').slice(0, 200),
    body: rest || first,
  }
}

function readOrganizationIdFromStorage(): number {
  if (globalThis.window === undefined) return 0
  const storage = globalThis.localStorage
  for (const key of ['organizationId', 'orgId', 'orgID'] as const) {
    const v = Number(storage.getItem(key) ?? 0)
    if (v > 0) return v
  }
  return 0
}

function readPrincipalCollegeLock(): { locked: boolean; collegeId: number | null } {
  if (globalThis.window === undefined) return { locked: false, collegeId: null }
  const raw =
    globalThis.localStorage?.getItem('isPRINCIPAL') ?? globalThis.localStorage?.getItem('isPrincipal') ?? ''
  const locked = raw === 'true' || raw === '1'
  const cid = Number(globalThis.localStorage?.getItem('collegeId') ?? 0)
  return { locked, collegeId: Number.isFinite(cid) && cid > 0 ? cid : null }
}

function pickDefaultAdminRoleId(roles: RoleOption[]): number | null {
  const adminish = roles.find((r) => {
    const nm = String(r.roleName ?? '').trim().toUpperCase()
    return /ADMIN|SUPER/.test(nm) && !/EXAM|STUDENT|STAFF|FACULTY|PARENT/i.test(nm)
  })
  if (adminish) return adminish.roleId
  const anyAdmin = roles.find((r) => /ADMIN/i.test(String(r.roleName ?? '')))
  if (anyAdmin) return anyAdmin.roleId
  return roles[0]?.roleId ?? null
}

/**
 * Angular `principal-to-staff-email` / menu "Send Email To Admin" — single card: subject-style body,
 * optional attachment, Send / Clear. Recipients resolved automatically (college + default admin role).
 */
export default function PrincipalToStaffEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useSessionContext()

  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)

  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleId, setRoleId] = useState<number | null>(null)

  const [adminUserIds, setAdminUserIds] = useState<number[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const { locked, collegeId: forcedCid } = readPrincipalCollegeLock()
    listActiveCollegesForDepartments()
      .then((rows) => {
        setColleges(rows)
        if (locked && forcedCid && rows.some((c) => c.collegeId === forcedCid)) {
          setCollegeId(forcedCid)
        } else if (!locked && rows.length) {
          setCollegeId((prev) => prev ?? rows[0].collegeId)
        }
      })
      .catch(() => setColleges([]))
  }, [])

  const selectedCollege = useMemo(() => colleges.find((c) => c.collegeId === collegeId) ?? null, [colleges, collegeId])

  const organizationId = useMemo(() => {
    const fromSession = n(user?.organizationId)
    if (fromSession > 0) return fromSession
    const fromCollege = n(selectedCollege?.organizationId)
    if (fromCollege > 0) return fromCollege
    return readOrganizationIdFromStorage()
  }, [user?.organizationId, selectedCollege?.organizationId])

  useEffect(() => {
    if (!organizationId) {
      setRoleId(null)
      return
    }
    setRolesLoading(true)
    listRolesByOrganization(organizationId)
      .then((r) => {
        const list = Array.isArray(r) ? r : []
        setRoleId((prev) => {
          if (prev && list.some((x: RoleOption) => x.roleId === prev)) return prev
          return pickDefaultAdminRoleId(list)
        })
      })
      .catch(() => {
        setRoleId(null)
      })
      .finally(() => setRolesLoading(false))
  }, [organizationId])

  useEffect(() => {
    if (!collegeId || !roleId) {
      setAdminUserIds([])
      return
    }
    setRecipientsLoading(true)
    listUsersForSendLoginDetails(collegeId, roleId)
      .then((rows: SendLoginDetailsUserRow[]) => {
        const list = Array.isArray(rows) ? rows : []
        const ids = list
          .filter((u) => String(u.email ?? '').trim() !== '')
          .map((u) => n(u.userId))
          .filter((id) => id > 0)
        setAdminUserIds(ids)
      })
      .catch(() => setAdminUserIds([]))
      .finally(() => setRecipientsLoading(false))
  }, [collegeId, roleId])

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

  const recipientHint = useMemo(() => {
    if (recipientsLoading || rolesLoading) {
      return <p className="text-xs text-muted-foreground">Loading administrator recipients…</p>
    }
    if (adminUserIds.length === 0) {
      return (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          No administrators with an email address were found for the selected college. Sending will stay disabled until
          recipients exist.
        </p>
      )
    }
    return null
  }, [recipientsLoading, rolesLoading, adminUserIds.length])

  const clearForm = useCallback(() => {
    setContent('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  async function handleSend() {
    if (!collegeId) {
      toastError('College could not be determined. Try reloading or contact support.')
      return
    }
    if (recipientsLoading || rolesLoading) {
      toastError('Still loading recipients. Please wait.')
      return
    }
    if (adminUserIds.length === 0) {
      toastError('No administrator email recipients found for this college.')
      return
    }
    const text = content.trim()
    if (!text) {
      toastError('Please enter a subject or message.')
      return
    }
    const { subject, body } = splitSubjectAndBody(content)
    if (!subject.trim()) {
      toastError('Please enter a subject or message.')
      return
    }

    const file = fileRef.current?.files?.[0] ?? null
    setSending(true)
    try {
      let filePath = ''
      if (file) filePath = await resolveFilePath()
      await sendBulkEmailToAdminFromStaff({
        collegeId,
        subject: subject.trim(),
        mailContent: body.trim(),
        mailContentHtml: body.trim(),
        fromEmailId: FROM_EMAIL_DEFAULT,
        isEmailAlert: true,
        courseYearIds: [],
        departmentIds: [],
        userIds: adminUserIds,
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

  const canSend =
    Boolean(collegeId && adminUserIds.length > 0 && content.trim() && !sending && !recipientsLoading && !rolesLoading)

  return (
    <PageContainer className="space-y-4">
      <div className="app-card border-t-[3px] border-t-amber-400 p-0 overflow-hidden shadow-sm">
        <div className="border-b border-amber-400/40 bg-card px-4 py-3">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Send Email To Admin
          </h1>
        </div>
        <div className="space-y-5 bg-muted/20 p-4 sm:p-6">
          <div>
            <label htmlFor="send-admin-content" className="sr-only">
              Subject
            </label>
            <textarea
              id="send-admin-content"
              rows={10}
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-3 text-sm leading-relaxed text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Subject"
              disabled={sending}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={onFileChange}
                disabled={sending}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 sm:shrink-0">
              <Button type="button" className="gap-1 px-5" onClick={() => void handleSend()} disabled={!canSend}>
                <Send className="h-4 w-4" aria-hidden />
                {sending ? 'Sending…' : 'Send Email'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-400 bg-amber-50 px-5 text-amber-950 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/70"
                onClick={clearForm}
                disabled={sending}
              >
                Clear
              </Button>
            </div>
          </div>

          {recipientHint}
        </div>
      </div>
    </PageContainer>
  )
}
