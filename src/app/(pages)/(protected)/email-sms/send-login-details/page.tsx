'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, KeyRound, Send } from 'lucide-react'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSessionContext } from '@/context/SessionContext'
import { useCrudList } from '@/hooks/useCrudList'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import {
  listGeneralUserAccountColleges,
  listRolesByOrganization,
  listUsersForSendLoginDetails,
  sendLoginDetailsSms,
  type RoleOption,
  type SendLoginDetailsUserRow,
} from '@/services'
import type { College } from '@/types/college'

type UserRow = SendLoginDetailsUserRow & { checked?: boolean }

const n = (v: unknown) => Number(v) || 0

/** Matches Angular login storage and other app pages (`organizationId` is not always written to localStorage). */
function readOrganizationIdFromStorage(): number {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return 0
  const storage = globalThis.localStorage
  for (const key of ['organizationId', 'orgId', 'orgID'] as const) {
    const v = Number(storage.getItem(key) ?? 0)
    if (v > 0) return v
  }
  return 0
}

function rowText(r: UserRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export default function SendLoginDetailsPage() {
  const { user } = useSessionContext()
  const [filterOpen, setFilterOpen] = useState(true)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const { data: colleges, isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.emailSms.sendLoginDetailsColleges(),
    queryFn: listGeneralUserAccountColleges,
  })

  const organizationId = useMemo(() => {
    const fromSession = Number(user?.organizationId ?? 0)
    if (fromSession > 0) return fromSession

    const fromStorage = readOrganizationIdFromStorage()
    if (fromStorage > 0) return fromStorage

    const college =
      collegeId !== null && collegeId > 0
        ? colleges.find((c) => c.collegeId === collegeId)
        : colleges[0]
    const fromCollege = Number(college?.organizationId ?? 0)
    if (fromCollege > 0) return fromCollege

    return 0
  }, [user?.organizationId, collegeId, colleges])

  const { data: roles, isLoading: rolesLoading } = useCrudList<RoleOption>({
    queryKey: QK.emailSms.sendLoginDetailsRoles(organizationId),
    queryFn: () => listRolesByOrganization(organizationId),
    enabled: organizationId > 0,
  })

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(colleges[0].collegeId)
    }
  }, [colleges, collegeId])

  useEffect(() => {
    setUsers([])
    setUserSearch('')
  }, [collegeId, roleId])

  const collegeOptions = useMemo(
    () =>
      [...colleges]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ value: String(c.collegeId), label: c.collegeCode })),
    [colleges],
  )

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [roles],
  )

  const displayedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((r) => {
      const u = rowText(r, 'userName', 'user_name').toLowerCase()
      const m = rowText(r, 'mobileNumber', 'mobile_number').toLowerCase()
      const e = rowText(r, 'email').toLowerCase()
      return u.includes(q) || m.includes(q) || e.includes(q)
    })
  }, [users, userSearch])

  const selectedCount = useMemo(() => users.filter((r) => r.checked).length, [users])

  const masterChecked = useMemo(() => {
    if (displayedUsers.length === 0) return false
    return displayedUsers.every((r) => r.checked)
  }, [displayedUsers])

  const previewRows = useMemo(
    () =>
      users.filter((r) => r.checked && rowText(r, 'mobileNumber', 'mobile_number')),
    [users],
  )

  async function loadUsers() {
    if (!collegeId || !roleId) {
      toastError('Please select college and user role')
      return
    }
    setLoadingList(true)
    try {
      const list = await listUsersForSendLoginDetails(collegeId, roleId)
      const withFlags = list.map((row) => {
        const mobile = rowText(row as UserRow, 'mobileNumber', 'mobile_number')
        return {
          ...row,
          checked: Boolean(mobile),
        } satisfies UserRow
      })
      setUsers(withFlags)
      if (withFlags.length === 0) {
        toastSuccess('No users found for this filter')
      }
    } catch (e) {
      toastError(getErrorMessage(e))
      setUsers([])
    } finally {
      setLoadingList(false)
    }
  }

  function setRowChecked(userId: number | undefined, checked: boolean) {
    if (!userId) return
    setUsers((prev) => prev.map((r) => (n(r.userId) === userId ? { ...r, checked } : r)))
  }

  function toggleMaster(checked: boolean) {
    const ids = new Set(displayedUsers.map((r) => n(r.userId)))
    setUsers((prev) => prev.map((r) => (ids.has(n(r.userId)) ? { ...r, checked } : r)))
  }

  function openPreview() {
    if (previewRows.length === 0) {
      toastError('Mobile numbers are empty.')
      return
    }
    setPreviewOpen(true)
  }

  async function confirmSend() {
    setSending(true)
    try {
      await sendLoginDetailsSms(previewRows as SendLoginDetailsUserRow[])
      toastSuccess('Login details sent successfully')
      setPreviewOpen(false)
      setUsers([])
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Send Login Details
          </h1>
          <button
            type="button"
            className="text-sm text-foreground inline-flex items-center gap-1"
            onClick={() => setFilterOpen((v) => !v)}
          >
            Filter
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              searchable
              isLoading={collegesLoading}
              className="md:col-span-3"
            />
            <Select
              label="Users (role) *"
              value={roleId ? String(roleId) : null}
              onChange={(v) => setRoleId(v ? Number(v) : null)}
              options={roleOptions}
              searchable
              isLoading={rolesLoading}
              placeholder="Select role"
              className="md:col-span-3"
            />
            <div className="md:col-span-2">
              <Button type="button" className="w-full md:w-auto" onClick={() => void loadUsers()} disabled={loadingList}>
                {loadingList ? 'Loading…' : 'Get List'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {users.length > 0 ? (
        <div className="app-card p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={userSearch}
              onChange={setUserSearch}
              placeholder="Search by user name, mobile, or email"
              className="max-w-md"
            />
            <div className="text-sm text-muted-foreground">
              Selected count: <span className="font-semibold text-foreground tabular-nums">{selectedCount}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 p-2 text-center">
                    <Checkbox
                      checked={masterChecked}
                      onCheckedChange={(v) => toggleMaster(v === true)}
                      aria-label="Select all visible rows"
                    />
                  </th>
                  <th className="p-2 text-left font-medium">User Name</th>
                  <th className="p-2 text-left font-medium">Mobile</th>
                  <th className="p-2 text-left font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((row) => {
                  const uid = n(row.userId)
                  return (
                    <tr key={uid || `${rowText(row, 'userName')}-${rowText(row, 'mobileNumber', 'mobile_number')}`} className="border-t">
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={Boolean(row.checked)}
                          onCheckedChange={(v) => setRowChecked(uid, v === true)}
                          aria-label={`Select ${rowText(row, 'userName')}`}
                        />
                      </td>
                      <td className="p-2">{rowText(row, 'userName', 'user_name') || '—'}</td>
                      <td className="p-2 tabular-nums">{rowText(row, 'mobileNumber', 'mobile_number') || '—'}</td>
                      <td className="p-2">{rowText(row, 'email') || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={openPreview}>
              <Send className="h-4 w-4 mr-1.5" />
              Send SMS
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm recipients</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 text-sm">
            {previewRows.map((r) => (
              <div
                key={n(r.userId)}
                className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border pb-2 last:border-0"
              >
                <span className="font-medium">{rowText(r, 'userName', 'user_name')}</span>
                <span className="text-muted-foreground tabular-nums">{rowText(r, 'mobileNumber', 'mobile_number')}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmSend()} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
