"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/common/components/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilteredListPage } from "@/components/layout";
import {
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listActiveColleges,
  listStudentExamFeeRegistrationPayments,
} from "@/services/pre-examination";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

type AnyRow = Record<string, any>;

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const COL_DEFS = {
  slNo: {
    colId: "slNo",
    headerName: "Sl.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 72,
    minWidth: 64,
    flex: 0,
  } as ColDef<AnyRow>,
  student: {
    colId: "student",
    headerName: "Student",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data;
      if (!r) return "—";
      const name = r.studentName ?? r.student_name ?? "—";
      const roll = r.rollNumber ?? r.hallticketNumber ?? "—";
      return `${name} (${roll})`;
    },
  } as ColDef<AnyRow>,
  courseYear: {
    colId: "courseYear",
    headerName: "Course Year",
    minWidth: 120,
    valueGetter: (p) =>
      p.data?.courseYearName ?? p.data?.course_year_name ?? "—",
  } as ColDef<AnyRow>,
  receiptNo: {
    colId: "receiptNo",
    headerName: "Receipt No.",
    minWidth: 120,
    valueGetter: (p) => p.data?.receiptNo ?? p.data?.receipt_no ?? "—",
  } as ColDef<AnyRow>,
  paymentMode: {
    colId: "paymentMode",
    headerName: "Payment Mode",
    minWidth: 130,
    valueGetter: (p) =>
      p.data?.paymentModeCatDisplayName ?? p.data?.payment_mode_name ?? "—",
  } as ColDef<AnyRow>,
  receiptAmount: {
    colId: "receiptAmount",
    headerName: "Receipt Amount",
    minWidth: 120,
    valueGetter: (p) => p.data?.receiptAmount ?? p.data?.receipt_amount ?? "—",
  } as ColDef<AnyRow>,
  status: {
    colId: "status",
    headerName: "Status",
    minWidth: 120,
    valueGetter: (p) =>
      p.data?.regPaymentStatusCatDisplayName ?? p.data?.payment_status ?? "—",
  } as ColDef<AnyRow>,
  transactions: {
    colId: "transactions",
    headerName: "Transactions",
    minWidth: 110,
    flex: 0,
    sortable: false,
  } as ColDef<AnyRow>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 110,
    flex: 0,
    sortable: false,
  } as ColDef<AnyRow>,
};

function makeTransactionsRenderer(onView: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-[11px]"
      onClick={() => p.data && onView(p.data)}
    >
      View
    </Button>
  );
}

function makeSubjectsRenderer(onView: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-[11px]"
      onClick={() => p.data && onView(p.data)}
    >
      Subjects
    </Button>
  );
}

export default function OnlineExamFeeRegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [fallbackColleges, setFallbackColleges] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [subjectsRows, setSubjectsRows] = useState<AnyRow[]>([]);
  const [transactionsRows, setTransactionsRows] = useState<AnyRow[]>([]);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () =>
      dedupeBy(filterRows, (r) => Number(r.fk_course_id)).filter(
        (r) => Number(r.fk_course_id) > 0,
      ),
    [filterRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0),
    [filterRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0),
    [filterRows, courseId, academicYearId],
  );
  const derivedColleges = useMemo(
    () =>
      dedupeBy(
        [...filterRows, ...restRows].filter(
          (r) =>
            Number(r.fk_course_id ?? r.courseId ?? 0) === Number(courseId) &&
            Number(r.fk_academic_year_id ?? r.academicYearId ?? 0) ===
              Number(academicYearId) &&
            Number(r.fk_exam_id ?? r.examId ?? 0) === Number(examId),
        ),
        (r) => Number(r.fk_college_id ?? r.collegeId ?? 0),
      ).filter((r) => Number(r.fk_college_id ?? r.collegeId ?? 0) > 0),
    [filterRows, restRows, courseId, academicYearId, examId],
  );

  const colleges = useMemo(
    () =>
      dedupeBy(
        [...derivedColleges, ...fallbackColleges].filter(
          (c) => Number(c.fk_college_id ?? c.collegeId ?? 0) > 0,
        ),
        (c) => Number(c.fk_college_id ?? c.collegeId ?? 0),
      ),
    [derivedColleges, fallbackColleges],
  );

  const onViewSubjects = useCallback((row: AnyRow) => {
    const list =
      row.examStdRegSubDTOs ?? row.examStudentDetailDTOs ?? row.subjects ?? [];
    setSubjectsRows(Array.isArray(list) ? list : []);
    setDialogTitle(`Subjects - ${row.studentName ?? row.student_name ?? "-"}`);
    setSubjectsOpen(true);
  }, []);

  const onViewTransactions = useCallback((row: AnyRow) => {
    const list =
      row.examStdRegTxnDTOs ??
      row.transactions ??
      row.examStudentRegTxnDTOs ??
      [];
    setTransactionsRows(Array.isArray(list) ? list : []);
    setDialogTitle(
      `Transactions - ${row.studentName ?? row.student_name ?? "-"}`,
    );
    setTransactionsOpen(true);
  }, []);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.slNo,
      COL_DEFS.student,
      COL_DEFS.courseYear,
      COL_DEFS.receiptNo,
      COL_DEFS.paymentMode,
      COL_DEFS.receiptAmount,
      COL_DEFS.status,
      {
        ...COL_DEFS.transactions,
        cellRenderer: makeTransactionsRenderer(onViewTransactions),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeSubjectsRenderer(onViewSubjects),
      },
    ],
    [onViewSubjects, onViewTransactions],
  );

  useEffect(() => {
    async function loadFilters() {
      setLoading(true);
      try {
        const list = await getUnivExamFiltersRegSup(employeeId).catch(() => []);
        const normalized = Array.isArray(list) ? list : [];
        setFilterRows(normalized);
        const all = await listActiveColleges().catch(() => []);
        setFallbackColleges(Array.isArray(all) ? all : []);
        const firstCourse = dedupeBy(normalized, (r) =>
          Number(r.fk_course_id),
        ).find((r) => Number(r.fk_course_id) > 0);
        if (firstCourse) setCourseId(Number(firstCourse.fk_course_id));
      } finally {
        setLoading(false);
      }
    }
    void loadFilters();
  }, [employeeId]);

  function onCourseChange(v: string) {
    setCourseId(Number(v));
    setAcademicYearId(null);
    setExamId(null);
    setCollegeId(null);
    setRows([]);
    setHasFetched(false);
  }

  function onAcademicYearChange(v: string) {
    setAcademicYearId(Number(v));
    setExamId(null);
    setCollegeId(null);
    setRows([]);
    setHasFetched(false);
  }

  function onExamChange(v: string) {
    const eid = Number(v);
    setExamId(eid);
    setCollegeId(null);
    setRows([]);
    setHasFetched(false);
    void loadCollegesByExam(eid);
  }

  async function loadCollegesByExam(eid: number) {
    if (!courseId || !academicYearId || !eid) {
      setRestRows([]);
      return;
    }
    const data = await getUnivExamRestNoTt({
      courseId: Number(courseId),
      examId: Number(eid),
      academicYearId: Number(academicYearId),
      employeeId,
    }).catch(() => []);
    setRestRows(Array.isArray(data) ? data : []);
  }

  async function onGetList() {
    if (!collegeId || !examId) return;
    setTableLoading(true);
    try {
      const list = await listStudentExamFeeRegistrationPayments({
        collegeId,
        examId,
      }).catch(() => []);
      setRows(Array.isArray(list) ? list : []);
      setHasFetched(true);
    } finally {
      setTableLoading(false);
    }
  }

  const onRegister = useCallback(() => {
    const q = new URLSearchParams();
    if (courseId) q.set("courseId", String(courseId));
    if (academicYearId) q.set("academicYearId", String(academicYearId));
    if (examId) q.set("examId", String(examId));
    if (collegeId) q.set("collegeId", String(collegeId));
    router.push(
      `/admin-examination-management/pre-examination/student-exam-fee-registration?${q.toString()}`,
    );
  }, [router, courseId, academicYearId, examId, collegeId]);

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      const first = Number(
        colleges[0]?.fk_college_id ?? colleges[0]?.collegeId ?? 0,
      );
      if (first > 0) setCollegeId(first);
    }
  }, [colleges, collegeId]);

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const d = p.data;
    if (!d) return "";
    const id =
      d.examStudentRegistrationId ??
      d.examStdRegId ??
      d.registrationId ??
      d.examStudentRegId;
    if (id != null && String(id) !== "0") return String(id);
    return `${d.studentId ?? d.student_id ?? "s"}-${d.receiptNo ?? d.receipt_no ?? "r"}-${d.rollNumber ?? ""}`;
  }, []);

  return (
    <FilteredListPage
      title="Exam Fee Registrations"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label>Course *</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => onCourseChange(v ?? "")}
              options={courses.map((c) => ({
                value: String(c.fk_course_id),
                label: c.course_code,
              }))}
              placeholder="Course"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>Exam Year *</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onAcademicYearChange(v ?? "")}
              options={academicYears.map((a) => ({
                value: String(a.fk_academic_year_id),
                label: a.academic_year,
              }))}
              placeholder="Exam Year"
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <Label>Exam Master *</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => onExamChange(v ?? "")}
              options={exams.map((e) => ({
                value: String(e.fk_exam_id),
                label: e.exam_name ?? e.examName ?? `Exam ${e.fk_exam_id}`,
              }))}
              placeholder="Exam Master"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>College *</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((c) => ({
                value: String(c.fk_college_id ?? c.collegeId),
                label:
                  c.college_code ??
                  c.collegeCode ??
                  c.college_name ??
                  c.collegeName ??
                  `College ${c.fk_college_id ?? c.collegeId}`,
              }))}
              placeholder="College"
            />
          </div>

          <div className="md:col-span-1">
            <Button
              type="button"
              onClick={onGetList}
              disabled={loading || tableLoading || !collegeId || !examId}
              className="h-8 px-3 text-[12px] w-full"
            >
              Get List
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={tableLoading}
      pagination
      paginationPageSize={10}
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: "Search registrations…",
        pdfDocumentTitle: "Exam Fee Registrations",
      }}
      toolbarTrailing={(
        <Button
          type="button"
          size="sm"
          onClick={onRegister}
          disabled={!collegeId || !examId}
          className="h-[30px] px-3 text-[12px]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Register
        </Button>
      )}
    >
      <Dialog open={subjectsOpen} onOpenChange={setSubjectsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject Code</th>
                  <th className="px-2 py-1 text-left">Subject Name</th>
                </tr>
              </thead>
              <tbody>
                {subjectsRows.map((s, i) => (
                  <tr key={`sub-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {s.subjectCode ?? s.subject_code ?? "-"}
                    </td>
                    <td className="px-2 py-1">
                      {s.subjectName ?? s.subject_name ?? "-"}
                    </td>
                  </tr>
                ))}
                {subjectsRows.length === 0 && (
                  <tr className="border-t">
                    <td
                      colSpan={3}
                      className="px-2 py-6 text-center text-muted-foreground"
                    >
                      No subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transactionsOpen} onOpenChange={setTransactionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Transaction No</th>
                  <th className="px-2 py-1 text-left">Amount</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsRows.map((t, i) => (
                  <tr key={`txn-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {t.transactionNo ?? t.transaction_no ?? "-"}
                    </td>
                    <td className="px-2 py-1">
                      {t.transactionAmount ?? t.amount ?? "-"}
                    </td>
                    <td className="px-2 py-1">
                      {t.transactionStatus ?? t.status ?? "-"}
                    </td>
                  </tr>
                ))}
                {transactionsRows.length === 0 && (
                  <tr className="border-t">
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-muted-foreground"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
