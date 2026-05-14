'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Link2 } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageContainer, PageHeader } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listActiveSubjectBooksByRegulation,
  listBooksPage,
  listStaffMappingSections,
  listStaffSubjectRows,
  saveSubjectBookAssignment,
} from '@/services'

type AnyRow = Record<string, any>
type BookTypeFlags = {
  textBook: boolean
  onlineCourse: boolean
  reference: boolean
}

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
const pickFirst = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return value
  }
  return null
}
const getBookId = (row: AnyRow) => n(
  pickFirst(row, ['bookId', 'pkBookId', 'pk_book_id', 'id', 'fk_book_id'])
  ?? row.book?.bookId
  ?? row.Book?.bookId,
)
const getBookTitle = (row: AnyRow) => s(
  pickFirst(row, ['bookTitle', 'bookName', 'title', 'name'])
  ?? row.book?.bookName
  ?? row.Book?.bookName,
)
const getBookCode = (row: AnyRow) => s(
  pickFirst(row, ['bookCode', 'isbn', 'isbnNo', 'bookNo', 'bookNumber', 'accessionNo', 'code'])
  ?? row.book?.isbn
  ?? row.Book?.isbn,
)
const getBookNumber = (row: AnyRow) => s(
  pickFirst(row, ['bookNumber', 'bookNo', 'book_code', 'accessionNo', 'accessionNumber'])
  ?? row.book?.bookNumber
  ?? row.Book?.bookNumber,
)
const getIsbn = (row: AnyRow) => s(
  pickFirst(row, ['isbn', 'isbnNo', 'isbnNumber'])
  ?? row.book?.isbn
  ?? row.Book?.isbn,
)
const getFlag = (row: AnyRow, keys: string[]) => {
  const value = pickFirst(row, keys)
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').trim().toLowerCase()
  return text === 'true' || text === '1' || text === 'yes' || text === 'y'
}
const extractBookFlags = (row: AnyRow): BookTypeFlags => ({
  textBook: getFlag(row, ['isTextBook', 'textBook', 'is_textbook', 'isTextbook']),
  onlineCourse: getFlag(row, ['isOnlineCourse', 'onlineCourse', 'is_online_course']),
  reference: getFlag(row, ['isReference', 'referenceBook', 'is_reference']),
})
const getBookAuthor = (row: AnyRow) => s(
  pickFirst(row, ['authorName', 'author', 'writerName', 'writer'])
  ?? row.book?.authorName
  ?? row.Book?.authorName,
)
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function makeAssignActionsRenderer(onAssign: (row: AnyRow) => Promise<void>) {
  return (p: any) => (
    <Button size="sm" variant="outline" onClick={() => { void onAssign(p.data ?? {}) }}>
      Assign
    </Button>
  )
}

export default function AssignSubjectBooksPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [sections, setSections] = useState<AnyRow[]>([])

  const [rows, setRows] = useState<AnyRow[]>([])

  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null)
  const [books, setBooks] = useState<AnyRow[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [selectedSubjectBookId, setSelectedSubjectBookId] = useState<number | null>(null)
  const [booksPage, setBooksPage] = useState(1)
  const [booksTotalCount, setBooksTotalCount] = useState(0)
  const booksPageSize = 50
  const [bookTypeById, setBookTypeById] = useState<Record<number, BookTypeFlags>>({})
  const [bookTitle, setBookTitle] = useState('')
  const [bookCode, setBookCode] = useState('')
  const [authorName, setAuthorName] = useState('')

  function updateBookTypeFlag(
    id: number,
    flags: BookTypeFlags,
    key: keyof BookTypeFlags,
    checked: boolean,
  ) {
    setSelectedBookId(id)
    setBookTypeById((prev) => ({
      ...prev,
      [id]: { ...flags, [key]: checked },
    }))
  }

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getDigitalOnlineSyncFilters(orgId, empId).then((d) => {
      setFiltersData(d.filtersData as AnyRow[])
      setAcademicData(d.academicYearData as AnyRow[])
    }).catch(() => {
      setFiltersData([])
      setAcademicData([])
    })
  }, [])

  const colleges = useMemo(() => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)), [filtersData])
  const courses = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'), [filtersData, collegeId])
  const courseGroups = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0)), 'fk_course_group_id'), [filtersData, collegeId, courseId])
  const courseYears = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0) && n(r.fk_course_group_id) === (courseGroupId ?? 0)), 'fk_course_year_id').sort((a, b) => n(a.year_order) - n(b.year_order)), [filtersData, collegeId, courseId, courseGroupId])
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')))
  }, [academicData, filtersData, collegeId])

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setRows([]); setSections([]) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId)) }, [sections, groupSectionId])

  useEffect(() => {
    async function loadSections() {
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !academicYearId) {
        setSections([])
        return
      }
      const organizationId = Number(localStorage.getItem('organizationId') ?? 0)
      const employeeId = Number(localStorage.getItem('employeeId') ?? 0)
      const list = await listStaffMappingSections({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => [])
      setSections(list)
    }
    void loadSections()
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId])

  useEffect(() => {
    async function loadRows() {
      if (!collegeId || !academicYearId || !groupSectionId) {
        setRows([])
        return
      }
      setLoading(true)
      try {
        const subjects = await listStaffSubjectRows({ collegeId, academicYearId, groupSectionId }).catch(() => [])
        const merged = subjects.map((row) => ({
          ...row,
          subjectCourseyearId: n(row.subjectCourseyearId ?? row.subjectCourseYearId),
          bookTitle: s(row.bookTitle ?? row.bookName),
          bookCode: s(row.bookCode),
          authorName: s(row.authorName),
        }))
        setRows(merged)
      } finally {
        setLoading(false)
      }
    }
    void loadRows()
  }, [collegeId, academicYearId, groupSectionId])

  async function openAssign(row: AnyRow) {
    setSelectedRow(row)
    setBookSearch('')
    setSelectedBookId(null)
    setSelectedSubjectBookId(null)
    setBooksPage(1)
    setBooksTotalCount(0)
    setBookTypeById({})
    setBooks([])
    setBookTitle(s(row.bookTitle))
    setBookCode(s(row.bookCode))
    setAuthorName(s(row.authorName))
    setAssignOpen(true)

    const subjectRegulationId = n(
      row.subjectRegulationId
      ?? row.subjectregulationId
      ?? row.subjectRegulation?.subjectRegulationId
      ?? row.subjectregulation?.subjectRegulationId,
    )
    setBooksLoading(true)
    const [bookRows, activeSubjectBooks] = await Promise.all([
      listBooksPage(0, booksPageSize).catch(() => ({ rows: [], totalCount: 0 })),
      listActiveSubjectBooksByRegulation(subjectRegulationId).catch(() => []),
    ])
    setBooks(bookRows.rows)
    setBooksTotalCount(bookRows.totalCount)
    setBookTypeById(() => {
      const next: Record<number, BookTypeFlags> = {}
      for (const row of bookRows.rows) {
        const id = getBookId(row)
        if (!id) continue
        next[id] = extractBookFlags(row)
      }
      return next
    })
    const activeBookIds = new Set(
      activeSubjectBooks
        .map((x) => getBookId(x))
        .filter(Boolean),
    )
    const activeSubjectBookByBookId = new Map<number, AnyRow>()
    for (const row of activeSubjectBooks) {
      const bookId = getBookId(row)
      if (bookId) activeSubjectBookByBookId.set(bookId, row)
    }
    if (activeBookIds.size > 0) {
      const matched = bookRows.rows.find((x) => activeBookIds.has(getBookId(x)))
      if (matched) {
        const id = getBookId(matched)
        setSelectedBookId(id)
        const subjectBookRow = activeSubjectBookByBookId.get(id)
        const subjectBookId = n(subjectBookRow?.subjectBookId ?? subjectBookRow?.pk_subject_book_id)
        setSelectedSubjectBookId(subjectBookId || null)
        setBookTitle(getBookTitle(matched))
        setBookCode(getBookCode(matched))
        setAuthorName(getBookAuthor(matched))
      }
    }
    setBooksLoading(false)
  }

  useEffect(() => {
    async function loadBooks() {
      if (!assignOpen) return
      setBooksLoading(true)
      const currentPage = Math.max(0, booksPage - 1)
      const response = await listBooksPage(currentPage, booksPageSize).catch(() => ({ rows: [], totalCount: 0 }))
      let list = response.rows
      if (bookSearch.trim()) {
        const q = bookSearch.trim().toLowerCase()
        list = list.filter((x) => {
          const title = getBookTitle(x).toLowerCase()
          const code = getBookCode(x).toLowerCase()
          return title.includes(q) || code.includes(q)
        })
      }
      setBooks(list)
      setBooksTotalCount(response.totalCount)
      setBookTypeById((prev) => {
        const next = { ...prev }
        for (const row of list) {
          const id = getBookId(row)
          if (!id || next[id]) continue
          next[id] = extractBookFlags(row)
        }
        return next
      })
      if (!selectedBookId && list.length > 0) {
        const matched = list.find((x) => {
          const title = getBookTitle(x).toLowerCase()
          return title && title === s(bookTitle).toLowerCase()
        })
        if (matched) setSelectedBookId(getBookId(matched))
      }
      setBooksLoading(false)
    }
    void loadBooks()
  }, [assignOpen, bookSearch, booksPage])

  async function saveAssign() {
    if (!selectedRow || !collegeId || !academicYearId || !groupSectionId) return
    const selectedBook = books.find((x) => getBookId(x) === (selectedBookId ?? 0))
    const selectedFlags = selectedBookId ? bookTypeById[selectedBookId] : undefined
    const fallbackFlags = selectedBook ? extractBookFlags(selectedBook) : { textBook: false, onlineCourse: false, reference: false }
    const finalFlags = selectedFlags ?? fallbackFlags
    const finalBookTitle = selectedBook ? getBookTitle(selectedBook).trim() : bookTitle.trim()
    const finalBookCode = selectedBook ? getBookCode(selectedBook).trim() : bookCode.trim()
    const finalAuthorName = selectedBook ? getBookAuthor(selectedBook).trim() : authorName.trim()
    if (!finalBookTitle) {
      toastError('Book title is required')
      return
    }
    setSaving(true)
    try {
      await saveSubjectBookAssignment({
        subjectBookId: selectedSubjectBookId ?? undefined,
        subjectRegulationId: n(
          selectedRow.subjectRegulationId
          ?? selectedRow.subjectregulationId
          ?? selectedRow.subjectRegulation?.subjectRegulationId
          ?? selectedRow.subjectregulation?.subjectRegulationId,
        ),
        bookId: selectedBookId ?? undefined,
        subjectCourseyearId: n(selectedRow.subjectCourseyearId),
        collegeId,
        academicYearId,
        groupSectionId,
        bookTitle: finalBookTitle,
        bookCode: finalBookCode,
        authorName: finalAuthorName,
        isTextBook: finalFlags.textBook,
        isOnlineCourse: finalFlags.onlineCourse,
        isReference: finalFlags.reference,
        isActive: true,
      })
      setRows((prev) => prev.map((row) => {
        if (n(row.subjectCourseyearId) !== n(selectedRow.subjectCourseyearId)) return row
        return { ...row, bookTitle: finalBookTitle, bookCode: finalBookCode, authorName: finalAuthorName }
      }))
      setAssignOpen(false)
      toastSuccess('Subject book assigned successfully')
    } catch {
      toastError('Failed to assign subject book')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 },
    { field: 'subjectName', headerName: 'Subject', minWidth: 220, flex: 1.3 },
    { field: 'subjectCode', headerName: 'Subject Code', minWidth: 120, flex: 0.8 },
    { field: 'subjectType', headerName: 'Subject Type', minWidth: 130, flex: 0.8 },
    { field: 'bookTitle', headerName: 'Book Title', minWidth: 220, flex: 1.2, valueGetter: (p: any) => s(p.data?.bookTitle) || '-' },
    { field: 'bookCode', headerName: 'Book Code', minWidth: 120, flex: 0.8, valueGetter: (p: any) => s(p.data?.bookCode) || '-' },
    { field: 'authorName', headerName: 'Author', minWidth: 150, flex: 0.9, valueGetter: (p: any) => s(p.data?.authorName) || '-' },
    { headerName: 'Actions', minWidth: 120, maxWidth: 140, flex: 0, cellRenderer: makeAssignActionsRenderer(openAssign) },
  ], [])

  const totalBooks = booksTotalCount || books.length
  const totalPages = Math.max(1, Math.ceil(totalBooks / booksPageSize))
  const safePage = Math.min(booksPage, totalPages)
  const pageStart = (safePage - 1) * booksPageSize
  const pageEnd = Math.min(pageStart + booksPageSize, totalBooks)

  const bookModalColumnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    {
      headerName: '#',
      width: 70,
      flex: 0,
      cellRenderer: (p: any) => {
        const id = getBookId(p.data ?? {})
        const title = getBookTitle(p.data ?? {})
        const code = getBookCode(p.data ?? {})
        const author = getBookAuthor(p.data ?? {})
        return (
          <input
            type="checkbox"
            checked={selectedBookId === id}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedBookId(id)
                setBookTitle(title)
                setBookCode(code)
                setAuthorName(author)
              } else {
                setSelectedBookId(null)
              }
            }}
          />
        )
      },
    },
    { headerName: 'Book Number', minWidth: 140, valueGetter: (p: any) => getBookNumber(p.data ?? {}) || '-' },
    { headerName: 'Title', minWidth: 280, flex: 1.2, valueGetter: (p: any) => getBookTitle(p.data ?? {}) || '-' },
    { headerName: 'ISBN', minWidth: 140, valueGetter: (p: any) => getIsbn(p.data ?? {}) || getBookCode(p.data ?? {}) || '-' },
    {
      headerName: 'TextBook',
      minWidth: 120,
      maxWidth: 130,
      flex: 0,
      cellRenderer: (p: any) => {
        const id = getBookId(p.data ?? {})
        const flags = bookTypeById[id] ?? extractBookFlags(p.data ?? {})
        return <input type="checkbox" checked={flags.textBook} onChange={(e) => updateBookTypeFlag(id, flags, 'textBook', e.target.checked)} />
      },
    },
    {
      headerName: 'Online Course',
      minWidth: 140,
      maxWidth: 150,
      flex: 0,
      cellRenderer: (p: any) => {
        const id = getBookId(p.data ?? {})
        const flags = bookTypeById[id] ?? extractBookFlags(p.data ?? {})
        return <input type="checkbox" checked={flags.onlineCourse} onChange={(e) => updateBookTypeFlag(id, flags, 'onlineCourse', e.target.checked)} />
      },
    },
    {
      headerName: 'Reference',
      minWidth: 120,
      maxWidth: 130,
      flex: 0,
      cellRenderer: (p: any) => {
        const id = getBookId(p.data ?? {})
        const flags = bookTypeById[id] ?? extractBookFlags(p.data ?? {})
        return <input type="checkbox" checked={flags.reference} onChange={(e) => updateBookTypeFlag(id, flags, 'reference', e.target.checked)} />
      },
    },
  ], [selectedBookId, bookTypeById])

  return (
    <PageContainer>
      <PageHeader title="Assign Subject Books" />

      <div className="app-card p-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Select label="College" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable />
          <Select label="Course" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable disabled={!collegeId} />
          <Select label="Course Group" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) }))} searchable disabled={!courseId} />
          <Select label="Course Year" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable disabled={!courseGroupId} />
          <Select label="Academic Year" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable disabled={!courseYearId} />
          <Select label="Section" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sections.map((x) => ({ value: String(n(x.pk_group_section_id ?? x.groupSectionId)), label: s(x.section) }))} searchable disabled={!academicYearId} />
        </div>
      </div>

      {!!groupSectionId && (
        <div className="app-card mt-3 p-0 overflow-hidden">
          <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} toolbar={{ search: true, searchPlaceholder: 'Search subject/book' }} pagination paginationPageSize={10} />
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-5xl p-0 bg-background overflow-hidden">
          <DialogHeader className="border-b bg-background pr-12 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base leading-6 text-primary pt-[18px] pl-[28px]">
              <Link2 className="h-4 w-4" />
              Books List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-4 py-3">
            <Input
              placeholder="Book Code / Name / ISBN"
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="max-h-[330px] overflow-auto rounded-md border">
              <DataTable
                rowData={books}
                columnDefs={bookModalColumnDefs}
                loading={booksLoading}
                toolbar={false}
                pagination={false}
              />
            </div>
            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <span>Items per page: {booksPageSize}</span>
              <span>
                {totalBooks === 0 ? '0 - 0' : `${pageStart + 1} - ${pageEnd}`} of {totalBooks}
              </span>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setBooksPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                {'<'}
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => setBooksPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                {'>'}
              </button>
            </div>
          </div>
          <DialogFooter className="px-4 pb-4 pt-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Close</Button>
            <Button disabled={saving} onClick={() => { void saveAssign() }}>{saving ? 'Assigning...' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

