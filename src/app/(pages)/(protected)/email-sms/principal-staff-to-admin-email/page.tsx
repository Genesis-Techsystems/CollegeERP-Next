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

function readOrganizationIdFromStorage(): number {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return 0
  const storage = globalThis.localStorage
  for (const key of ['organizationId', 'orgId', 'orgID'] as const) {
    const v = Number(storage.getItem(key) ?? 0)
    if (v > 0) return v
  }
  return 0
}

function readPrincipalCollegeLock(): { locked: boolean; collegeId: number | null } {
  if (typeof globalThis.window === 'undefined') return { locked: false, collegeId: null }
  const raw =
    globalThis.localStorage?.getItem('isPRINCIPAL') ?? globalThis.localStorage?.getItem('isPrincipal') ?? ''
  const locked = raw === 'true' || raw === '1'
  const cid = Number(globalThis.localStorage?.getItem('collegeId') ?? 0)
  return { locked, collegeId: Number.isFinite(cid) && cid > 0 ? cid : null }
}

function userOptionLabel(u: SendLoginDetailsUserRow): string {
  const row = u as Record<string, unknown>
  const rawFn = row.firstName ?? row.first_name
  const rawLn = row.lastName ?? row.last_name
  const fn = typeof rawFn === 'string' ? rawFn.trim() : ''
  const ln = typeof rawLn === 'string' ? rawLn.trim() : ''
  const name = [fn, ln].filter(Boolean).join(' ').trim()
  const base = String(u.userName ?? name ?? '').trim()
  const em = String(u.email ?? '').trim()
  if (base && em) return `${base} (${em})`
  return base || em || `User #${n(u.userId)}`
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

export default function PrincipalStaffToAdminEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useSessionContext()

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [principalLock, setPrincipalLock] = useState(false)

  const [roles, setRoles] = useState<RoleOption[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleId, setRoleId] = useState<number | null>(null)

  const [adminUsers, setAdminUsers] = useState<SendLoginDetailsUserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userIds, setUserIds] = useState<string[]>([])

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isEmailAlert, setIsEmailAlert] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const { locked, collegeId: forcedCid } = readPrincipalCollegeLock()
    setPrincipalLock(locked)
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
      setRoles([])
      setRoleId(null)
      return
    }
    setRolesLoading(true)
    listRolesByOrganization(organizationId)
      .then((r) => {
        setRoles(Array.isArray(r) ? r : [])
        setRoleId((prev) => {
          if (prev && r.some((x) => x.roleId === prev)) return prev
          return pickDefaultAdminRoleId(r)
        })
      })
      .catch(() => {
        setRoles([])
        setRoleId(null)
      })
      .finally(() => setRolesLoading(false))
  }, [organizationId])

  useEffect(() => {
    setUserIds([])
    setAdminUsers([])
    if (!collegeId || !roleId) return
    setUsersLoading(true)
    listUsersForSendLoginDetails(collegeId, roleId)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setAdminUsers(list)
        const withEmail = list.filter((u) => String(u.email ?? '').trim() !== '')
        setUserIds(withEmail.map((u) => String(n(u.userId))).filter((id) => id !== '0'))
      })
      .catch(() => {
        setAdminUsers([])
        setUserIds([])
      })
      .finally(() => setUsersLoading(false))
  }, [collegeId, roleId])

  const roleOptions = useMemo(
    () =>
      [...roles]
        .filter((r) => r.roleId > 0)
        .sort((a, b) => String(a.roleName ?? '').localeCompare(String(b.roleName ?? '')))
        .map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [roles],
  )

  const userOptions = useMemo(
    () =>
      adminUsers
        .filter((u) => n(u.userId) > 0)
        .map((u) => ({ value: String(n(u.userId)), label: userOptionLabel(u) })),
    [adminUsers],
  )

  const canSend = Boolean(
    collegeId && userIds.length > 0 && subject.trim() && body.trim() && !usersLoading && !rolesLoading,
  )

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
    setUserIds([])
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  async function handleSend() {
    if (!collegeId) {
      toastError('Select a college')
      return
    }
    if (!roleId) {
      toastError('Select an admin role')
      return
    }
    const ids = userIds.map((id) => n(id)).filter((id) => id > 0)
    if (ids.length === 0) {
      toastError('Select at least one admin user')
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
      await sendBulkEmailToAdminFromStaff({
        collegeId,
        subject: subject.trim(),
        mailContent: body.trim(),
        mailContentHtml: body.trim(),
        fromEmailId: FROM_EMAIL_DEFAULT,
        isEmailAlert,
        courseYearIds: [],
        departmentIds: [],
        userIds: ids,
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

  const showCompose = userIds.length > 0 && collegeId && roleId

  return (
    <PageContainer className="space-y-4">
      <div className="app-card border-t-[3px] border-t-amber-300 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            Principal and staff to admin — email
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-foreground hover:text-foreground/80"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="principal-staff-admin-filters"
          >
            Filter
            <Filter className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent id="principal-staff-admin-filters">
            <div className="space-y-4 p-4 pt-3">
              <p className="text-xs text-muted-foreground">
                Choose the college, the role used to find admin accounts, and which administrators receive the message.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                <Select
                  label="College *"
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setCollegeId(v ? Number(v) : null)
                    setUserIds([])
                  }}
                  options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode }))}
                  searchable
                  disabled={principalLock}
                  className="md:col-span-4"
                />
                <Select
                  label="Admin role *"
                  value={roleId ? String(roleId) : null}
                  onChange={(v) => {
                    setRoleId(v ? Number(v) : null)
                    setUserIds([])
                  }}
                  options={roleOptions}
                  searchable
                  placeholder={organizationId ? 'Select role' : 'Set organization / college'}
                  disabled={!organizationId || roleOptions.length === 0}
                  isLoading={rolesLoading}
                  className="md:col-span-4"
                />
                <MultiSelect
                  label="Admin recipients *"
                  value={userIds}
                  onChange={setUserIds}
                  options={userOptions}
                  searchable
                  placeholder={usersLoading ? 'Loading…' : 'Select administrator(s)'}
                  disabled={!collegeId || !roleId || userOptions.length === 0}
                  isLoading={usersLoading}
                  className="md:col-span-4"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {showCompose ? (
        <div className="app-card p-0 overflow-hidden">
          <div className="border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">Compose email</h2>
          </div>
          <div className="space-y-4 p-4">
            <FormField label="Subject *">
              <input
                type="text"
                className="app-control flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-[length:var(--app-control-font-size)] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />
            </FormField>
            <FormField label="Message *">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message"
              />
            </FormField>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <FormField label="Attachment (optional)" className="mb-0 min-w-[200px] flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  className="w-full text-sm"
                  onChange={onFileChange}
                />
              </FormField>
              <div className="flex items-center gap-2 pb-1">
                <Checkbox id="psa-alert" checked={isEmailAlert} onCheckedChange={(c) => setIsEmailAlert(c === true)} />
                <Label htmlFor="psa-alert" className="cursor-pointer text-sm font-normal">
                  Email alert
                </Label>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button type="button" className="gap-1" onClick={() => void handleSend()} disabled={sending || !canSend}>
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send email'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
                  onClick={clearForm}
                  disabled={sending}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}
