'use client'

import { useCallback, useState } from 'react'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSessionContext } from '@/context/SessionContext'
import { toastError } from '@/lib/toast'
import { searchLibraryBookDetails, searchLibraryMembers } from '@/services'
import type { LibraryRow } from '@/services'
import type { LibraryMembership } from '@/types/library'
import { LibraryScreenShell } from '../_components/LibraryScreenShell'

function memberOptionLabel(m: LibraryMembership): string {
  const code = String(m.membershipNo ?? m.memberCode ?? '').trim()
  const name = String(m.memberName ?? '').trim()
  if (code && name) return `${code} (${name})`
  return code || name || 'Member'
}

function memberOptionValue(m: LibraryMembership): string {
  return String(m.memberShipId ?? m.libMemberId ?? m.membershipNo ?? '')
}

function bookOptionLabel(b: LibraryRow): string {
  const acc = String(b.accessionno ?? b.accessionNo ?? '').trim()
  const title = String(b.bookTitle ?? b.title ?? '').trim()
  if (acc && title) return `(${acc}) ${title}`
  if (acc) return `(${acc})`
  return title || 'Book'
}

function bookOptionValue(b: LibraryRow): string {
  return String(b.bookDetailsId ?? b.bookDetailId ?? '')
}

function formatBookAuthors(book: LibraryRow): string {
  const authors = book.authors
  if (Array.isArray(authors)) {
    return authors
      .map((a) => {
        if (typeof a === 'string') return a
        const row = a as Record<string, unknown>
        return String(row.firstName ?? row.authorName ?? row.name ?? '').trim()
      })
      .filter(Boolean)
      .join(', ')
  }
  return String(book.authorFirstName ?? book.bookAuthor ?? book.authorName ?? '').trim()
}

export default function BookIssuePage() {
  const { user } = useSessionContext()
  const collegeId = user?.collegeId ?? 0

  const [memberRows, setMemberRows] = useState<LibraryMembership[]>([])
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<LibraryMembership | null>(null)
  const [memberSearchLoading, setMemberSearchLoading] = useState(false)

  const [bookRows, setBookRows] = useState<LibraryRow[]>([])
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<LibraryRow | null>(null)
  const [bookSearchLoading, setBookSearchLoading] = useState(false)

  const memberLibraryId = Number(
    selectedMember?.libraryId ?? selectedMember?.fk_library_id ?? 0,
  )

  const maxBooks = Number(selectedMember?.noOfMaxBooks ?? 0)
  const issuedBooks = Number(selectedMember?.noOfBorrowedBooks ?? 0)
  const availableBooks = Math.max(0, maxBooks - issuedBooks)

  const bookCategory = String(
    selectedBook?.bookCategoryCode ?? selectedBook?.bookCategory ?? '',
  )
  const bookAuthor = selectedBook ? formatBookAuthors(selectedBook) : ''
  const bookVolume = String(selectedBook?.vol ?? '')

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
        setBookRows([])
        setBookOptions([])
        return
      }
      setBookSearchLoading(true)
      try {
        const rows = await searchLibraryBookDetails(
          q,
          memberLibraryId > 0 ? memberLibraryId : undefined,
        )
        setBookRows(rows)
        setBookOptions(
          rows.map((b) => ({
            value: bookOptionValue(b),
            label: bookOptionLabel(b),
          })),
        )
      } catch (e) {
        toastError(e, 'Book search failed')
        setBookRows([])
        setBookOptions([])
      } finally {
        setBookSearchLoading(false)
      }
    },
    [memberLibraryId],
  )

  function handleMemberChange(value: string | null) {
    setSelectedMemberId(value)
    if (!value) {
      setSelectedMember(null)
      clearBookFields()
      return
    }
    const picked = memberRows.find((m) => memberOptionValue(m) === value)
    if (picked) {
      setSelectedMember(picked)
      clearBookFields()
    }
  }

  function handleBookChange(value: string | null) {
    setSelectedBookId(value)
    if (!value) {
      setSelectedBook(null)
      return
    }
    const picked = bookRows.find((b) => bookOptionValue(b) === value)
    if (picked) setSelectedBook(picked)
  }

  function clearBookFields() {
    setSelectedBookId(null)
    setSelectedBook(null)
    setBookRows([])
    setBookOptions([])
  }

  function handleClear() {
    clearBookFields()
  }

  return (
    <LibraryScreenShell title="Book Issue">
      <div className="app-card space-y-6 p-4">
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">Max</span>
              <p className="font-semibold">{selectedMember ? maxBooks : '—'}</p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">Issued</span>
              <p className="font-semibold">{selectedMember ? issuedBooks : '—'}</p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">Available</span>
              <p className="font-semibold">{selectedMember ? availableBooks : '—'}</p>
            </div>
          </div>
        </div>

        {selectedMember ? (
          <div className="space-y-3 rounded-md border p-4">
            <h2 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Book Issue</h2>
            {availableBooks === 0 ? (
              <p className="text-[12px] text-destructive">Max book limit is over.</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[13px]">Book (barcode / title)</Label>
                <Select
                  value={selectedBookId}
                  onChange={handleBookChange}
                  options={bookOptions}
                  placeholder="Scan or search book…"
                  searchable
                  onSearch={(t) => void onBookSearch(t)}
                  isLoading={bookSearchLoading}
                  clearable
                  disabled={availableBooks === 0}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Book Category</Label>
                <Input className="h-9" value={bookCategory} readOnly disabled />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[13px]">Author</Label>
                <Input className="h-9" value={bookAuthor} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Volume</Label>
                <Input className="h-9" value={bookVolume} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Issue date</Label>
                <Input type="date" className="h-9" disabled={availableBooks === 0} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Issue days</Label>
                <Input
                  type="number"
                  className="h-9"
                  min={1}
                  defaultValue={1}
                  disabled={availableBooks === 0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Return date</Label>
                <Input type="date" className="h-9" disabled={availableBooks === 0} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={availableBooks === 0 || !selectedBook}>
                Add
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={availableBooks === 0}>
                Reserved Book
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </LibraryScreenShell>
  )
}
