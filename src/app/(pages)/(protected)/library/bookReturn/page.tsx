'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { Select, type SelectOption } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { useSessionContext } from '@/context/SessionContext'
import { toastError } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  listIssuedBooksByMemberCode,
  searchBookReturn,
  searchLibraryMembers,
} from '@/services'
import type { BookReturnSearchRow, LibraryRow } from '@/services'
import type { LibraryMembership } from '@/types/library'

function memberOptionLabel(m: LibraryMembership): string {
  const code = String(m.membershipNo ?? m.memberCode ?? '').trim()
  const name = String(m.memberName ?? '').trim()
  if (code && name) return `${code} (${name})`
  return code || name || 'Member'
}

function memberOptionValue(m: LibraryMembership): string {
  return String(m.memberShipId ?? m.libMemberId ?? m.membershipNo ?? '')
}

function memberCodeOf(m: LibraryMembership | null): string {
  if (!m) return ''
  return String(m.membershipNo ?? m.memberCode ?? '').trim()
}

function returnSearchOptionLabel(r: BookReturnSearchRow): string {
  const code = String(r.membershipNo ?? r.memberCode ?? '').trim()
  const title = String(r.bookDetail?.bookTitle ?? '').trim()
  const acc = String(r.bookDetail?.accessionno ?? r.bookDetail?.accessionNo ?? '').trim()
  if (title && acc) return `${code} (${title} - ${acc})`
  if (code) return code
  return memberOptionLabel(r)
}

function issuedBookOptionLabel(b: LibraryRow): string {
  const acc = String(b.accessionno ?? b.accessionNo ?? '').trim()
  const title = String(b.bookTitle ?? b.title ?? '').trim()
  if (acc && title) return `(${acc}) ${title}`
  return acc || title || 'Book'
}

function issuedBookOptionValue(b: LibraryRow): string {
  return String(b.bookIssuedetailsId ?? b.accessionno ?? '')
}

function returnStatusLabel(row: LibraryRow): string {
  if (row.fineTypeCode === 'BOOKLOST') return 'Book Lost'
  if (row.isrenewaled && !row.isreturned) return 'Renewed'
  if (row.isreturned) return 'Returned'
  return 'Not Returned'
}

export default function BookReturnPage() {
  const { user } = useSessionContext()
  const collegeId = user?.collegeId ?? 0

  const [memberRows, setMemberRows] = useState<LibraryMembership[]>([])
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<LibraryMembership | null>(null)
  const [memberSearchLoading, setMemberSearchLoading] = useState(false)

  const [bookOptions, setBookOptions] = useState<SelectOption[]>([])
  const [returnSearchRows, setReturnSearchRows] = useState<BookReturnSearchRow[]>([])
  const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null)
  const [bookSearchLoading, setBookSearchLoading] = useState(false)

  const memberCode = memberCodeOf(selectedMember)

  const {
    data: issuedBooks = [],
    isLoading: loadingIssued,
  } = useQuery({
    queryKey: ['Library', 'issuedBooks', memberCode],
    queryFn: () => listIssuedBooksByMemberCode(memberCode),
    enabled: memberCode.length > 0,
  })

  const onMemberSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 2) {
        setMemberRows([])
        setMemberOptions([])
        return
      }
      setMemberSearchLoading(true)
      try {
        const rows = await searchLibraryMembers(q, collegeId || undefined)
        setMemberRows(rows)
        setMemberOptions(
          rows.map((m) => ({
            value: memberOptionValue(m),
            label: memberOptionLabel(m),
          })),
        )
      } catch (e) {
        toastError(e, 'Membership search failed')
        setMemberRows([])
        setMemberOptions([])
      } finally {
        setMemberSearchLoading(false)
      }
    },
    [collegeId],
  )

  const onBookSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 2) {
        setBookOptions([])
        return
      }
      setBookSearchLoading(true)
      try {
        if (selectedMember && memberCode) {
          const rows = await listIssuedBooksByMemberCode(memberCode)
          const needle = q.toLowerCase()
          const filtered = rows.filter((b) => {
            const acc = String(b.accessionno ?? '').toLowerCase()
            const title = String(b.bookTitle ?? '').toLowerCase()
            return acc.includes(needle) || title.includes(needle)
          })
          setBookOptions(
            filtered.map((b) => ({
              value: issuedBookOptionValue(b),
              label: issuedBookOptionLabel(b),
            })),
          )
          return
        }

        const libraryId = Number(selectedMember?.libraryId ?? selectedMember?.fk_library_id ?? 0)
        const rows = await searchBookReturn(q, libraryId > 0 ? libraryId : undefined)
        setReturnSearchRows(rows)
        setBookOptions(
          rows.map((r, index) => ({
            value: `return::${index}`,
            label: returnSearchOptionLabel(r),
          })),
        )
      } catch (e) {
        toastError(e, 'Book search failed')
        setBookOptions([])
      } finally {
        setBookSearchLoading(false)
      }
    },
    [selectedMember, memberCode],
  )

  function handleMemberChange(value: string | null) {
    setSelectedMemberId(value)
    setSelectedBookKey(null)
    if (!value) {
      setSelectedMember(null)
      setBookOptions([])
      setReturnSearchRows([])
      return
    }
    const picked = memberRows.find((m) => memberOptionValue(m) === value)
    if (picked) setSelectedMember(picked)
  }

  function handleBookChange(value: string | null) {
    setSelectedBookKey(value)
    if (!value) return

    if (value.startsWith('return::')) {
      const index = Number(value.slice('return::'.length))
      const picked = returnSearchRows[index]
      if (picked) {
        setSelectedMember(picked)
        setSelectedMemberId(memberOptionValue(picked))
        setMemberRows([picked])
        setMemberOptions([
          { value: memberOptionValue(picked), label: memberOptionLabel(picked) },
        ])
      }
    }
  }

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: 'issueFromdate',
        headerName: 'Issue Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? String(p.value).slice(0, 10) : '—'),
      },
      {
        field: 'issueTodate',
        headerName: 'Due Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? String(p.value).slice(0, 10) : '—'),
      },
      {
        field: 'issueDuedate',
        headerName: 'Returned Date',
        minWidth: 120,
        valueFormatter: (p) => (p.value ? String(p.value).slice(0, 10) : '—'),
      },
      { field: 'accessionno', headerName: 'Accession No.', minWidth: 120 },
      { field: 'bookTitle', headerName: 'Book Title', minWidth: 180, flex: 1 },
      {
        field: 'fineTypeName',
        headerName: 'Fine Type',
        minWidth: 100,
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
      },
      {
        headerName: 'Status',
        minWidth: 120,
        valueGetter: (p) => returnStatusLabel(p.data ?? {}),
      },
    ],
    [],
  )

  const memberDetail = selectedMember as LibraryMembership & {
    studentDetail?: Record<string, unknown>
    employeeDetail?: Record<string, unknown>
  }
  const student = memberDetail?.studentDetail
  const employee = memberDetail?.employeeDetail
  const displayName = String(
    student?.firstName ?? employee?.firstName ?? selectedMember?.memberName ?? '',
  )
  const displaySub1 = String(
    student?.rollNumber ?? employee?.empNumber ?? selectedMember?.rollNumber ?? '',
  )

  const filters = (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-[13px]">Membership Id or Name</Label>
        <Select
          value={selectedMemberId}
          onChange={handleMemberChange}
          options={memberOptions}
          placeholder="Search member…"
          searchable
          onSearch={(t) => void onMemberSearch(t)}
          isLoading={memberSearchLoading}
          clearable
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[13px]">Book barcode / accession</Label>
        <Select
          value={selectedBookKey}
          onChange={handleBookChange}
          options={bookOptions}
          placeholder="Scan or search book…"
          searchable
          onSearch={(t) => void onBookSearch(t)}
          isLoading={bookSearchLoading}
          clearable
          className="w-full"
        />
      </div>
    </div>
  )

  return (
    <FilteredListPage
      title="Book Return"
      filters={
        selectedMember ? (
          <div className="space-y-4">
            {filters}
            <div className="rounded-md border bg-muted/10 p-4 text-[13px]">
              <p className="font-medium text-foreground">{displayName || '—'}</p>
              <p className="text-muted-foreground">{displaySub1 || '—'}</p>
            </div>
          </div>
        ) : (
          filters
        )
      }
      rowData={selectedMember ? issuedBooks : []}
      columnDefs={columnDefs}
      loading={selectedMember ? loadingIssued : false}
      pagination
      paginationPageSize={10}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Issued Books',
      }}
    />
  )
}
