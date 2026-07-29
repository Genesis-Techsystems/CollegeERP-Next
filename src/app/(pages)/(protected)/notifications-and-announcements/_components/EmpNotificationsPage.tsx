'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { usePageNavLabel } from '@/common/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastInfo } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  getAudienceTypes,
  getNotificationsByAudience,
  type DashboardNotification,
} from '@/services'

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function formatPublishDate(raw: string | undefined): string {
  if (!raw) return ''
  const dt = new Date(String(raw))
  if (Number.isNaN(dt.getTime())) return String(raw)
  // Angular: publishDate | date:'MMMM d, y'
  return format(dt, 'MMMM d, yyyy')
}

function audiencesRenderer(p: ICellRendererParams<DashboardNotification>) {
  const list = p.data?.notificationAudiences ?? []
  if (list.length === 0) return ''
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {list.map((item, index) => (
        <span key={String(item.notificationAudienceId ?? index)}>
          {item.categoryName ?? ''}
        </span>
      ))}
    </div>
  )
}

function documentRenderer(p: ICellRendererParams<DashboardNotification>) {
  const path = p.data?.notificationDocPath
  if (path) {
    return (
      <a
        href={String(path)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        Document
      </a>
    )
  }
  return <span>No Docs Uploaded</span>
}

function statusRenderer(p: ICellRendererParams<DashboardNotification>) {
  if (p.data?.isAnnouncement === true) {
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-800">
        Announcement
      </span>
    )
  }
  return (
    <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
      Notification
    </span>
  )
}

/**
 * Angular `EmpNotificationsComponent`
 * Routes:
 *  - `#/principal-communications/announcements`
 *  - `#/principal-communications/notifications/send-notifications`
 */
export function EmpNotificationsPage() {
  const { user } = useSessionContext()
  const router = useRouter()
  const navLabel = usePageNavLabel()
  const pageTitle = navLabel ?? 'Notifications & Announcements'

  const [rows, setRows] = useState<DashboardNotification[]>([])
  const [loading, setLoading] = useState(true)

  const empStatusCode = readStorage('empStatusCode') || 'ACTV'
  const isActiveEmployee = empStatusCode === 'ACTV'
  const isHod =
    readStorage('isHOD') === 'true' || readStorage('isPRINCIPAL') === 'true'

  const collegeId = positiveId(readStorage('collegeId'), user?.collegeId)
  const academicYearId = positiveId(
    readStorage('academicYearId'),
    user?.academicYearId,
  )
  const employeeId = positiveId(readStorage('employeeId'), user?.employeeId)
  const empDeptId = positiveId(readStorage('empDeptId'))
  const empCategoryName = readStorage('empCategoryName')
  const userRole = readStorage('userRole') || user?.userRole || ''

  const loadNotifications = useCallback(async () => {
    // Angular: only load when empStatusCode === 'ACTV'
    if (!isActiveEmployee) {
      setRows([])
      setLoading(false)
      return
    }

    if (!collegeId || !academicYearId || !employeeId) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const audiences = await getAudienceTypes()
      const code = empCategoryName === 'Teaching' ? 'TCHNGSTF' : 'NTCHNGSTF'
      const audience = audiences.find(
        (a) => String(a.generalDetailCode) === code,
      )
      const gdId = Number(audience?.generalDetailId ?? 0)
      if (!gdId) {
        setRows([])
        return
      }

      let data: DashboardNotification[] = []
      if (userRole === 'NON TEACHING') {
        data = await getNotificationsByAudience({
          notificationAudienceId: gdId,
          academicYearId,
          collegeId,
          employeeId,
          includeDept: false,
        })
      } else if (empDeptId > 0) {
        data = await getNotificationsByAudience({
          notificationAudienceId: gdId,
          academicYearId,
          collegeId,
          employeeId,
          deptId: empDeptId,
          includeDept: true,
        })
      } else {
        toastInfo('Employee Not Assigned To Any Department')
        setRows([])
        return
      }

      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      toastError(getErrorMessage(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [
    isActiveEmployee,
    collegeId,
    academicYearId,
    employeeId,
    empDeptId,
    empCategoryName,
    userRole,
  ])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const columnDefs = useMemo<ColDef<DashboardNotification>[]>(
    () => [
      {
        headerName: 'No.',
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        colId: 'publishDate',
        headerName: 'Notification Date',
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => formatPublishDate(p.data?.publishDate),
      },
      {
        field: 'notificationTitle',
        headerName: 'Notification Title',
        minWidth: 180,
        flex: 1.2,
      },
      {
        colId: 'categoryName',
        headerName: 'For',
        minWidth: 120,
        flex: 1,
        autoHeight: true,
        wrapText: true,
        cellRenderer: audiencesRenderer,
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 200,
        flex: 1.4,
      },
      {
        colId: 'file',
        headerName: 'Document',
        minWidth: 130,
        flex: 0.8,
        cellRenderer: documentRenderer,
      },
      {
        colId: 'isAnnouncement',
        headerName: 'Status',
        minWidth: 130,
        flex: 0.8,
        cellRenderer: statusRenderer,
      },
    ],
    [],
  )

  function openAddNotification() {
    // Angular openDialog():
    // navigate to add-notification with collegeId & academicYearId query params
    const qs = new URLSearchParams({
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
    })
    router.push(
      `/notifications-and-announcements/add-notification?${qs.toString()}`,
    )
  }

  return (
    <ListPage
      title={pageTitle}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        isHod ? (
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={openAddNotification}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Notification
          </Button>
        ) : null
      }
      notice={
        !isActiveEmployee ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-center text-sm font-medium text-red-600">
              Employee in Resigned State
            </p>
          </div>
        ) : null
      }
    />
  )
}
