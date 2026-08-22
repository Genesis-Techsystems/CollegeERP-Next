"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { BookOpen, Eye, Link2 } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getDigitalOnlineSyncFilters,
  listActiveSubjectBooksByRegulation,
  listBooksPage,
  listSubjectRegulationsByCourseYear,
  saveSubjectBookAssignments,
} from "@/services";

type AnyRow = Record<string, any>;

type AssignBookRow = AnyRow & {
  checked: boolean;
  bookId: number;
  booknumber: string;
  title: string;
  isbn: string;
  isTextbook: boolean;
  isOnlinecourse: boolean;
  isReference: boolean;
  subjectRegulationId: number;
  collegeId: number;
  subBookId?: number;
  isActive?: boolean;
};

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function subjectRegulationIdOf(row: AnyRow): number {
  return n(
    row.subjectRegulationId ??
      row.subjectregulationId ??
      row.subjectRegulation?.subjectRegulationId ??
      row.subjectregulation?.subjectRegulationId,
  );
}

function mapBookRow(
  raw: AnyRow,
  subjectRegulationId: number,
  collegeId: number,
): AssignBookRow {
  return {
    ...raw,
    checked: false,
    bookId: n(raw.bookId ?? raw.pk_book_id ?? raw.Book?.bookId),
    booknumber: s(
      raw.booknumber ??
        raw.bookNumber ??
        raw.bookNo ??
        raw.book_code ??
        raw.bookCode,
    ),
    title: s(
      raw.title ?? raw.bookTitle ?? raw.bookName ?? raw.name ?? raw.Book?.title,
    ),
    isbn: s(raw.isbn ?? raw.isbnNo ?? raw.isbnNumber ?? raw.Book?.isbn),
    isTextbook: false,
    isOnlinecourse: false,
    isReference: false,
    subjectRegulationId,
    collegeId,
  };
}

function applyAssignedFlags(
  books: AssignBookRow[],
  subjectBooks: AnyRow[],
): AssignBookRow[] {
  return books.map((book) => {
    const match = subjectBooks.find(
      (x) => n(x.bookId ?? x.Book?.bookId ?? x.fk_book_id) === book.bookId,
    );
    if (!match) return book;
    return {
      ...book,
      checked: true,
      subBookId:
        n(match.subBookId ?? match.subjectBookId ?? match.pk_subject_book_id) ||
        undefined,
      isOnlinecourse: Boolean(match.isOnlinecourse ?? match.isOnlineCourse),
      isReference: Boolean(match.isReference),
      isTextbook: Boolean(match.isTextbook ?? match.isTextBook),
      isbn: s(match.isbn) || book.isbn,
    };
  });
}

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1.5 h-full">
        <button
          type="button"
          className="text-xs font-medium text-[#1565c0] hover:underline"
          onClick={() => onAssign(row)}
        >
          Assign Book
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          title="Books List"
          onClick={() => onView(row)}
        >
          <Eye className="h-3.5 w-3.5 text-[#1565c0]" />
        </button>
      </div>
    );
  };
}

export default function AssignSubjectBooksPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSubject, setAssignSubject] = useState<AnyRow | null>(null);
  const [assignBooks, setAssignBooks] = useState<AssignBookRow[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [booksPage, setBooksPage] = useState(0);
  const [booksPageSize, setBooksPageSize] = useState(50);
  const [booksTotalCount, setBooksTotalCount] = useState(0);
  /** Assigned SubjectBook rows for the open subject — reused across Book pages (not duplicate fetches). */
  const subjectBooksRef = useRef<AnyRow[]>([]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewBooks, setViewBooks] = useState<AnyRow[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, []);

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
        ?.fk_university_id,
    );
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    ).sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? "0"), 10) -
        parseInt(String(a.academic_year ?? "0"), 10),
    );
  }, [academicData, filtersData, collegeId]);
  const courses = useMemo(
    () =>
      uniq(
        filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)),
        "fk_course_id",
      ),
    [filtersData, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0),
        ),
        "fk_course_group_id",
      ),
    [filtersData, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0) &&
            n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        "fk_course_year_id",
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);

  useEffect(() => {
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
  }, [collegeId]);

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const current = [...academicYears].sort(
        (a, b) => n(b.is_curr_ay) - n(a.is_curr_ay),
      )[0];
      setAcademicYearId(n(current?.fk_academic_year_id));
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
  }, [academicYearId]);

  useEffect(() => {
    if (!courseId && courses.length && academicYearId)
      setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId, academicYearId]);

  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
  }, [courseId]);

  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    setCourseYearId(null);
    setRows([]);
  }, [courseGroupId]);

  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);

  useEffect(() => {
    async function loadSubjects() {
      if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const list = await listSubjectRegulationsByCourseYear({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId,
        });
        setRows(
          list.map((row) => ({
            ...row,
            subjectCode: s(row.subjectCode ?? row.subject_code),
            subjectName: s(row.subjectName ?? row.subject_name),
            subjecttypeName: s(
              row.subjecttypeName ??
                row.subjectTypeName ??
                row.subjectType ??
                row.subject_type,
            ),
            collegeId: n(row.collegeId) || collegeId,
          })),
        );
      } catch {
        setRows([]);
        toastError("Failed to load subject regulations");
      } finally {
        setLoading(false);
      }
    }
    void loadSubjects();
  }, [collegeId, academicYearId, courseGroupId, courseYearId]);

  const loadAssignBooksPage = useCallback(
    async (page: number, pageSize: number, subject: AnyRow) => {
      const regId = subjectRegulationIdOf(subject);
      const clgId = n(subject.collegeId) || collegeId || 0;
      setBooksLoading(true);
      try {
        const needSubjectBooks = subjectBooksRef.current.length === 0;
        const [{ rows: bookRows, totalCount }, subjectBooks] =
          await Promise.all([
            listBooksPage(page, pageSize),
            needSubjectBooks && regId
              ? listActiveSubjectBooksByRegulation(regId)
              : Promise.resolve(subjectBooksRef.current),
          ]);
        if (needSubjectBooks) subjectBooksRef.current = subjectBooks;
        setBooksTotalCount(totalCount);
        setBooksPage(page);
        setBooksPageSize(pageSize);
        const mapped = bookRows
          .map((b) => mapBookRow(b, regId, clgId))
          .filter((b) => b.bookId > 0 || b.title.length > 0);
        setAssignBooks(applyAssignedFlags(mapped, subjectBooksRef.current));
      } catch {
        setAssignBooks([]);
        setBooksTotalCount(0);
        toastError("Failed to load books");
      } finally {
        setBooksLoading(false);
      }
    },
    [collegeId],
  );

  const openAssign = useCallback((row: AnyRow) => {
    setAssignSubject(row);
    setBookSearch("");
    setAssignBooks([]);
    subjectBooksRef.current = [];
    setBooksPage(0);
    setBooksTotalCount(0);
    setAssignOpen(true);
  }, []);

  // Server-side Book pages (Angular paginatorByTwoIds) — not client-only on 50 rows.
  useEffect(() => {
    if (!assignOpen || !assignSubject) return;
    void loadAssignBooksPage(booksPage, booksPageSize, assignSubject);
  }, [
    assignOpen,
    assignSubject,
    booksPage,
    booksPageSize,
    loadAssignBooksPage,
  ]);

  const openView = useCallback((row: AnyRow) => {
    setViewOpen(true);
    setViewBooks([]);
    setViewLoading(true);
    void listActiveSubjectBooksByRegulation(subjectRegulationIdOf(row))
      .then((list) => setViewBooks(list))
      .catch(() => {
        setViewBooks([]);
        toastError("Failed to load assigned books");
      })
      .finally(() => setViewLoading(false));
  }, []);

  function updateAssignBook(bookId: number, patch: Partial<AssignBookRow>) {
    setAssignBooks((prev) =>
      prev.map((b) => (b.bookId === bookId ? { ...b, ...patch } : b)),
    );
  }

  async function saveAssign() {
    if (!assignSubject) return;
    const payload: AnyRow[] = [];
    for (const book of assignBooks) {
      if (book.checked) {
        payload.push({ ...book });
      } else if (!book.checked && book.subBookId) {
        payload.push({ ...book, isActive: false });
      }
    }
    if (payload.length === 0) {
      toastInfo("No Book is Checked");
      return;
    }
    setSaving(true);
    try {
      await saveSubjectBookAssignments(payload);
      toastSuccess("Subject books assigned successfully");
      setAssignOpen(false);
    } catch (err) {
      toastError(err, "Failed to assign subject books");
    } finally {
      setSaving(false);
    }
  }

  // Angular applyFilter — client filter on the current server page only.
  const filteredAssignBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    if (!q) return assignBooks;
    return assignBooks.filter((b) => {
      return (
        b.title.toLowerCase().includes(q) ||
        b.booknumber.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q)
      );
    });
  }, [assignBooks, bookSearch]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        field: "subjectCode",
        headerName: "Subject Code",
        minWidth: 120,
        flex: 0.8,
      },
      { field: "subjectName", headerName: "Subject", minWidth: 220, flex: 1.4 },
      {
        field: "subjecttypeName",
        headerName: "Subject Type",
        minWidth: 130,
        flex: 0.8,
      },
      {
        headerName: "Actions",
        minWidth: 160,
        maxWidth: 180,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeActionsRenderer(openAssign, openView),
      },
    ],
    [openAssign, openView],
  );

  const assignColumnDefs = useMemo<ColDef<AssignBookRow>[]>(
    () => [
      {
        headerName: "Select",
        width: 90,
        minWidth: 80,
        maxWidth: 100,
        flex: 0,
        sortable: false,
        filter: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={Boolean(row.checked)}
              onChange={(e) =>
                updateAssignBook(row.bookId, { checked: e.target.checked })
              }
            />
          );
        },
      },
      {
        field: "booknumber",
        headerName: "Book Number",
        minWidth: 120,
        flex: 0.9,
      },
      {
        field: "title",
        headerName: "Title",
        minWidth: 260,
        flex: 1.6,
      },
      {
        field: "isbn",
        headerName: "ISBN",
        minWidth: 120,
        flex: 0.9,
      },
      {
        headerName: "TextBook",
        width: 110,
        minWidth: 100,
        maxWidth: 120,
        flex: 0,
        sortable: false,
        filter: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={Boolean(row.isTextbook)}
              onChange={(e) =>
                updateAssignBook(row.bookId, { isTextbook: e.target.checked })
              }
            />
          );
        },
      },
      {
        headerName: "Online Course",
        width: 130,
        minWidth: 120,
        maxWidth: 140,
        flex: 0,
        sortable: false,
        filter: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={Boolean(row.isOnlinecourse)}
              onChange={(e) =>
                updateAssignBook(row.bookId, {
                  isOnlinecourse: e.target.checked,
                })
              }
            />
          );
        },
      },
      {
        headerName: "Reference",
        width: 110,
        minWidth: 100,
        maxWidth: 120,
        flex: 0,
        sortable: false,
        filter: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={Boolean(row.isReference)}
              onChange={(e) =>
                updateAssignBook(row.bookId, { isReference: e.target.checked })
              }
            />
          );
        },
      },
    ],
    [],
  );

  const viewColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Book Name",
        flex: 1,
        minWidth: 220,
        valueGetter: (p) =>
          s(
            p.data?.title ??
              p.data?.bookTitle ??
              p.data?.bookName ??
              p.data?.Book?.title,
          ) || "-",
      },
    ],
    [],
  );

  const showTable = rows.length > 0;

  return (
    <div className="assign-subject-books-page">
      <FilteredListPage
        title="Assign Subject Books"
        filterTitle="Subject Books List"
        filters={
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select
              label="College"
              required
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({
                value: String(n(x.fk_academic_year_id)),
                label: s(x.academic_year),
              }))}
              searchable
              disabled={!collegeId}
            />
            <Select
              label="Course"
              required
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((x) => ({
                value: String(n(x.fk_course_id)),
                label: s(x.course_code),
              }))}
              searchable
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroups.map((x) => ({
                value: String(n(x.fk_course_group_id)),
                label: s(x.group_code),
              }))}
              searchable
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((x) => ({
                value: String(n(x.fk_course_year_id)),
                label: s(x.course_year_name) || s(x.course_year_code),
              }))}
              searchable
              disabled={!courseGroupId}
            />
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        showTable={showTable}
        resultsVisible={showTable}
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        pagination
        paginationPageSize={10}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent
          className={cn(
            "assign-books-modal flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0",
            "sm:max-w-5xl",
          )}
        >
          <DialogHeader className="shrink-0 justify-start border-b px-4 py-3 pr-12 text-left sm:text-left">
            <DialogTitle className="m-0 inline-flex items-center justify-start gap-2 text-left text-base font-semibold leading-none text-[hsl(var(--primary))]">
              {/* <Link2 className="h-4 w-4 shrink-0" aria-hidden /> */}
              <span>Books List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
            <div className="shrink-0 rounded-[5px] border-2 border-[#c3d9ff] px-3 pt-1 pb-0.5">
              <Input
                placeholder="Book Code / Name / ISBN"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="h-9 border-0 border-b border-input rounded-none px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden [&_.ag-root-wrapper]:min-h-0">
              <DataTable
                rowData={filteredAssignBooks}
                columnDefs={assignColumnDefs}
                loading={booksLoading}
                height="380px"
                pagination={false}
                serverSide
                totalCount={booksTotalCount}
                currentPage={booksPage}
                paginationPageSize={booksPageSize}
                pageSizeOptions={[50]}
                onPageChange={(page, pageSize) => {
                  setBooksPage(page);
                  setBooksPageSize(pageSize);
                }}
                columnFilters={false}
                toolbar={{
                  search: false,
                  exportExcel: false,
                  exportPdf: false,
                  columnPicker: false,
                }}
                getRowId={(p) => String(p.data?.bookId ?? "")}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-w-[88px]"
              onClick={() => setAssignOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="min-w-[88px] bg-[#1a237e] hover:bg-[#151b66]"
              disabled={saving || booksLoading}
              onClick={() => {
                void saveAssign();
              }}
            >
              {saving ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          className={cn(
            "assign-books-modal flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0",
            "sm:max-w-2xl",
          )}
        >
          <DialogHeader className="shrink-0 justify-start border-b px-4 py-3 pr-12 text-left sm:text-left">
            <DialogTitle className="m-0 inline-flex items-center justify-start gap-2 text-left text-base font-semibold leading-none text-[hsl(var(--primary))]">
              <span>Books List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <DataTable
              rowData={viewBooks}
              columnDefs={viewColumnDefs}
              loading={viewLoading}
              height="360px"
              pagination
              paginationPageSize={10}
              columnFilters={false}
              toolbar={{
                search: true,
                searchPlaceholder: "Book Code / Name / ISBN",
                searchFields: [
                  "title",
                  "bookTitle",
                  "bookName",
                  "isbn",
                  "bookCode",
                  "booknumber",
                ],
                exportExcel: false,
                exportPdf: false,
                columnPicker: false,
              }}
              getRowId={(p) =>
                String(
                  n(p.data?.subBookId) ||
                    n(p.data?.bookId) ||
                    s(p.data?.title) ||
                    "row",
                )
              }
            />
          </div>

          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-w-[88px]"
              onClick={() => setViewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
