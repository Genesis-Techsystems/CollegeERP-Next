"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    bookId: n(raw.bookId ?? raw.pk_book_id),
    booknumber: s(
      raw.booknumber ?? raw.bookNumber ?? raw.bookNo ?? raw.book_code,
    ),
    title: s(raw.title ?? raw.bookTitle ?? raw.bookName ?? raw.name),
    isbn: s(raw.isbn ?? raw.isbnNo ?? raw.isbnNumber),
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
      (x) => n(x.bookId ?? x.Book?.bookId) === book.bookId,
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
          className="text-xs font-medium text-primary hover:underline"
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
          <Eye className="h-3.5 w-3.5" />
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

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSubject, setAssignSubject] = useState<AnyRow | null>(null);
  const [assignBooks, setAssignBooks] = useState<AssignBookRow[]>([]);
  const [subjectBooksCache, setSubjectBooksCache] = useState<AnyRow[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [booksPage, setBooksPage] = useState(0);
  const [booksTotalCount, setBooksTotalCount] = useState(0);
  const booksPageSize = 50;

  // View assigned modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewBooks, setViewBooks] = useState<AnyRow[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSearch, setViewSearch] = useState("");

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

  // Angular cascade: College → AY → Course → Group → Year
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
    async (page: number, subject: AnyRow, existingSubjectBooks?: AnyRow[]) => {
      if (!collegeId) return;
      const regId = subjectRegulationIdOf(subject);
      setBooksLoading(true);
      try {
        const [{ rows: bookRows, totalCount }, subjectBooks] =
          await Promise.all([
            listBooksPage(page, booksPageSize),
            existingSubjectBooks
              ? Promise.resolve(existingSubjectBooks)
              : listActiveSubjectBooksByRegulation(regId),
          ]);
        setSubjectBooksCache(subjectBooks);
        setBooksTotalCount(totalCount);
        setBooksPage(page);
        const mapped = bookRows.map((b) => mapBookRow(b, regId, collegeId));
        setAssignBooks(applyAssignedFlags(mapped, subjectBooks));
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

  async function openAssign(row: AnyRow) {
    setAssignSubject(row);
    setBookSearch("");
    setAssignOpen(true);
    setAssignBooks([]);
    setSubjectBooksCache([]);
    await loadAssignBooksPage(0, row);
  }

  async function openView(row: AnyRow) {
    setViewOpen(true);
    setViewSearch("");
    setViewBooks([]);
    setViewLoading(true);
    try {
      const list = await listActiveSubjectBooksByRegulation(
        subjectRegulationIdOf(row),
      );
      setViewBooks(list);
    } catch {
      setViewBooks([]);
      toastError("Failed to load assigned books");
    } finally {
      setViewLoading(false);
    }
  }

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

  const filteredViewBooks = useMemo(() => {
    const q = viewSearch.trim().toLowerCase();
    if (!q) return viewBooks;
    return viewBooks.filter((b) => {
      const title = s(b.title ?? b.bookTitle ?? b.bookName).toLowerCase();
      const code = s(b.bookCode ?? b.booknumber ?? b.isbn).toLowerCase();
      return title.includes(q) || code.includes(q);
    });
  }, [viewBooks, viewSearch]);

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
    [],
  );

  const assignColumnDefs = useMemo<ColDef<AssignBookRow>[]>(
    () => [
      {
        headerName: "Select",
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(e) =>
                updateAssignBook(row.bookId, { checked: e.target.checked })
              }
            />
          );
        },
      },
      { field: "booknumber", headerName: "Book Number", minWidth: 120 },
      { field: "title", headerName: "Title", minWidth: 220, flex: 1.2 },
      { field: "isbn", headerName: "ISBN", minWidth: 120 },
      {
        headerName: "TextBook",
        width: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={row.isTextbook}
              onChange={(e) =>
                updateAssignBook(row.bookId, { isTextbook: e.target.checked })
              }
            />
          );
        },
      },
      {
        headerName: "Online Course",
        width: 120,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={row.isOnlinecourse}
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
        width: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AssignBookRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              checked={row.isReference}
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
      },
      {
        headerName: "Book Name",
        flex: 1,
        minWidth: 220,
        valueGetter: (p) =>
          s(p.data?.title ?? p.data?.bookTitle ?? p.data?.bookName) || "-",
      },
    ],
    [],
  );

  const totalPages = Math.max(
    1,
    Math.ceil((booksTotalCount || 0) / booksPageSize),
  );
  const pageStart = booksTotalCount === 0 ? 0 : booksPage * booksPageSize + 1;
  const pageEnd = Math.min((booksPage + 1) * booksPageSize, booksTotalCount);

  return (
    <>
      <FilteredListPage
        title="Assign Subject Books"
        filters={
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Select
              label="College"
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
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        pagination
        paginationPageSize={10}
      />

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
                rowData={filteredAssignBooks}
                columnDefs={assignColumnDefs}
                loading={booksLoading}
                toolbar={false}
                pagination={false}
                getRowId={(p) =>
                  String(p.data?.bookId ?? p.data?.title ?? Math.random())
                }
              />
            </div>
            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <span>Items per page: {booksPageSize}</span>
              <span>
                {booksTotalCount === 0 ? "0 - 0" : `${pageStart} - ${pageEnd}`}{" "}
                of {booksTotalCount}
              </span>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                disabled={booksPage <= 0 || !assignSubject}
                onClick={() => {
                  if (assignSubject)
                    void loadAssignBooksPage(
                      booksPage - 1,
                      assignSubject,
                      subjectBooksCache,
                    );
                }}
              >
                {"<"}
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                disabled={booksPage + 1 >= totalPages || !assignSubject}
                onClick={() => {
                  if (assignSubject)
                    void loadAssignBooksPage(
                      booksPage + 1,
                      assignSubject,
                      subjectBooksCache,
                    );
                }}
              >
                {">"}
              </button>
            </div>
          </div>
          <DialogFooter className="px-4 pb-4 pt-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Close
            </Button>
            <Button
              disabled={saving}
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
        <DialogContent className="sm:max-w-lg p-0 bg-background overflow-hidden">
          <DialogHeader className="border-b bg-background pr-12 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base leading-6 text-primary pt-[18px] pl-[28px]">
              <BookOpen className="h-4 w-4" />
              Books List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-4 py-3">
            <Input
              placeholder="Book Code / Name / ISBN"
              value={viewSearch}
              onChange={(e) => setViewSearch(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="max-h-[330px] overflow-auto rounded-md border">
              <DataTable
                rowData={filteredViewBooks}
                columnDefs={viewColumnDefs}
                loading={viewLoading}
                toolbar={false}
                pagination={false}
              />
            </div>
          </div>
          <DialogFooter className="px-4 pb-4 pt-2">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
