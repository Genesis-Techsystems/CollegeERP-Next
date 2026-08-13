"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { ClipboardList, Eye, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DatePicker } from "@/common/components/date-picker";
import { DataTable } from "@/common/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getExamMasterDetailsByGroup,
  getStudentAcademicBatches,
  getStudentExamFeeStructure,
  getStudentSubjectsForRegularExam,
  getStudentSubjectsForSupplyExam,
  listExamFeeReceipts,
  listExamFeeTypes,
  listExamMastersByCourse,
  listPaymentModes,
  listStudents,
  payExamFeeReceipts,
} from "@/services/pre-examination";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { useSessionContext } from "@/context/SessionContext";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  clearExamFeeReturnState,
  loadExamFeeReturnState,
  saveExamFeePrintPayload,
  saveExamFeeReturnState,
} from "./_print/store";

type AnyRow = Record<string, any>;

const COMPACT_TOOLBAR = {
  search: false,
  columnPicker: false,
  exportExcel: false,
  exportPdf: false,
  columnFilters: false,
} as const;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Subject Name / Code",
  columnPicker: false,
  exportExcel: false,
  exportPdf: false,
  columnFilters: false,
} as const;

const VIEW_SUBJECT_COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 280,
    flex: 2,
    valueGetter: (p: ValueGetterParams<AnyRow>) => {
      const name = String(
        p.data?.subjectName ?? p.data?.Subject_name ?? p.data?.shortName ?? "",
      ).trim();
      const code = String(
        p.data?.subjectCode ?? p.data?.Subject_code ?? "",
      ).trim();
      if (!name && !code) return "-";
      return code ? `${name || "-"} (${code})` : name;
    },
  } as ColDef<AnyRow>,
  subjectType: {
    headerName: "Subject Type",
    minWidth: 120,
    flex: 0.8,
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      String(
        p.data?.subjectTypeCode ??
          p.data?.subjecttypeName ??
          p.data?.subjectTypeName ??
          "-",
      ).toUpperCase(),
  } as ColDef<AnyRow>,
  credits: {
    headerName: "Credits",
    minWidth: 90,
    flex: 0.6,
    valueGetter: (p: ValueGetterParams<AnyRow>) => {
      const c = p.data?.credits;
      return c !== "" && c != null ? String(c) : "-";
    },
  } as ColDef<AnyRow>,
  regulation: {
    headerName: "Regulation",
    field: "regulationName",
    minWidth: 120,
    flex: 0.8,
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      String(p.data?.regulationName ?? p.data?.regulationCode ?? "-"),
  } as ColDef<AnyRow>,
};

const PAY_CONFIRM_COL_DEFS = {
  siNo: {
    headerName: "SI.No.",
    valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  courseYear: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 120,
    flex: 1,
  } as ColDef<AnyRow>,
  subjects: {
    headerName: "Subjects",
    minWidth: 90,
    flex: 0.7,
    valueGetter: (p: ValueGetterParams<AnyRow>) => {
      const details =
        p.data?.examStudentDTOs?.[0]?.examStudentDetailDTOs ??
        p.data?.subjects ??
        [];
      return Array.isArray(details) ? details.length : 0;
    },
  } as ColDef<AnyRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<AnyRow>,
  feeAmount: {
    field: "examFeeAmount",
    headerName: "Fee Amount",
    minWidth: 110,
    flex: 0.9,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  fineAmount: {
    field: "examFineAmount",
    headerName: "Fine Amount",
    minWidth: 110,
    flex: 0.9,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  addAmount: {
    field: "examAddtFee",
    headerName: "Additional Amount",
    minWidth: 140,
    flex: 1,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
};

/** Angular Exam Fee Receipts table columns */
const RECEIPT_COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  semester: {
    field: "courseYearName",
    headerName: "Semester",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<AnyRow>,
  receiptNo: {
    field: "feeReceiptNo",
    headerName: "Receipt No.",
    minWidth: 140,
    flex: 1.1,
  } as ColDef<AnyRow>,
  paymentDate: {
    headerName: "Payment Date",
    minWidth: 120,
    flex: 1,
    valueGetter: (p: ValueGetterParams<AnyRow>) => fmtDate(p.data?.receiptDate),
  } as ColDef<AnyRow>,
  paymentMode: {
    field: "paymentModeCatDisplayName",
    headerName: "Payment Mode",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<AnyRow>,
  examType: {
    field: "examtypeCatDisplayName",
    headerName: "Exam Type",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<AnyRow>,
  examFee: {
    headerName: "Exam Fee (₹)",
    minWidth: 110,
    flex: 0.8,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examFeeAmount != null ? p.data.examFeeAmount : "-",
  } as ColDef<AnyRow>,
  addFee: {
    headerName: "Add. Fee (₹)",
    minWidth: 110,
    flex: 0.8,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examAddtFee != null ? p.data.examAddtFee : "-",
  } as ColDef<AnyRow>,
  lateFee: {
    headerName: "LateFee(₹)",
    minWidth: 100,
    flex: 0.7,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examFineAmount != null ? p.data.examFineAmount : "-",
  } as ColDef<AnyRow>,
  amount: {
    headerName: "Amount (₹)",
    minWidth: 110,
    flex: 0.8,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examTotalAmount != null ? p.data.examTotalAmount : "-",
  } as ColDef<AnyRow>,
  subjects: {
    headerName: "Subjects",
    minWidth: 110,
    width: 110,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 80,
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

function makeReceiptCoursesRenderer(onView: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    if (!p.data) return null;
    return (
      <button
        type="button"
        className="rounded bg-[#ffcf46] px-2.5 py-1 text-[12px] font-medium text-black hover:brightness-95"
        onClick={() => onView(p.data as AnyRow)}
      >
        Courses
      </button>
    );
  };
}

function makePrintReceiptRenderer(onPrint: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    if (!p.data) return null;
    return (
      <button
        type="button"
        title="Print Receipt"
        onClick={() => onPrint(p.data as AnyRow)}
        className="inline-flex items-center justify-center text-[#0c51a4] hover:opacity-80"
      >
        <Printer className="h-5 w-5" />
      </button>
    );
  };
}

/** State + always-current ref (Angular `this.x` parity for async chains). */
function useStateRef<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const ref = useRef<T>(state);
  ref.current = state;
  return [state, setState, ref] as const;
}

const isEmptyObject = (o: AnyRow | null | undefined) =>
  !o || Object.keys(o).length === 0;

/** YYYY-MM-DD from a Date (local). */
function ymd(d: Date | null): string {
  if (!d) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : "");

/** Display date "MMM d, y" (Angular date pipe). */
function fmtDate(v: unknown): string {
  const s = dateOnly(v);
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CLASS: Record<string, string> = {
  DTND: "text-red-600 font-bold",
  INCOLLEGE: "text-green-700 font-bold",
  PASSEDOUT: "text-[#461eb6] font-bold",
  DETAINRECOMMENDED: "text-orange-600 font-bold",
  DISCONTINUED: "text-red-600 font-bold",
};

export default function StudentExamFeeRegistrationPage() {
  const router = useRouter();
  const { user } = useSessionContext();
  // --- selection / lookups ---
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const studentsRef = useRef<AnyRow[]>([]);
  studentsRef.current = students;
  const [studentId, setStudentId] = useState<number | null>(null);
  const [student, setStudent, studentRef] = useStateRef<AnyRow>({});
  const collegeLogoUrl = useCollegeLogo(
    Number(
      student?.collegeId ?? student?.fk_college_id ?? user?.collegeId ?? 0,
    ) || null,
  );
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [examId, setExamId, examIdRef] = useStateRef<number | null>(null);
  const [flag, setFlag] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const rollDeepLinkAppliedRef = useRef(false);
  const restoredFromPrintRef = useRef(false);
  const deepLinkExamAppliedRef = useRef(false);

  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([]);
  const [, setExamFeeTypes, examFeeTypesRef] = useStateRef<AnyRow[]>([]);

  // --- course-year / subject flow ---
  const [, setAllCourseYears, allCourseYearsRef] = useStateRef<AnyRow[]>([]);
  const [, setCourseYearsList, courseYearsListRef] = useStateRef<AnyRow[]>([]);
  const [, setExamDetailsList, examDetailsListRef] = useStateRef<AnyRow[]>([]);
  /** Full ExamMasterDetails (both Regular + Supple). Never replace with a type-filtered subset. */
  const allExamDetailsListRef = useRef<AnyRow[]>([]);
  /** Ignore stale getExamDetails responses when user toggles Regular/Supple quickly. */
  const examDetailsReqSeqRef = useRef(0);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [courseYearId, setCourseYearId, courseYearIdRef] = useStateRef<
    number | null
  >(null);
  const [checkExam, setCheckExam, checkExamRef] = useStateRef<1 | 2>(1);
  const studentCurrentCourseYearIdRef = useRef<number | null>(null);

  const [studentSubjects, setStudentSubjects, studentSubjectsRef] = useStateRef<
    AnyRow[]
  >([]);
  const [checksubject, setChecksubject] = useState(true);
  const [searchText, setSearchText] = useState("");

  // --- fee structure + computed payment ---
  const [examFeeStructure, setExamFeeStructure, examFeeStructureRef] =
    useStateRef<AnyRow[]>([]);
  const [courseYearFee, setCourseYearFee, courseYearFeeRef] = useStateRef<
    AnyRow[]
  >([]);

  // --- payment form ---
  const [paymentModeCatId, setPaymentModeCatId] = useState<number | null>(131);
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [otherPaymentNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date());
  const [feeComments, setFeeComments] = useState("");
  const [paying, setPaying] = useState(false);

  // --- receipts ---
  const [feeReceipts, setFeeReceipts] = useState<AnyRow[]>([]);
  const [coursesYearList, setCoursesYearList] = useState<AnyRow[]>([]);

  // --- modals ---
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payReceipts, setPayReceipts] = useState<AnyRow[]>([]);
  const payReceiptsRef = useRef<AnyRow[]>([]);
  const [viewSubjOpen, setViewSubjOpen] = useState(false);
  const [viewSubjRows, setViewSubjRows] = useState<AnyRow[]>([]);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  // Restore filters + working data after print → Back (no remount refresh).
  useEffect(() => {
    const snap = loadExamFeeReturnState();
    if (!snap) return;
    restoredFromPrintRef.current = true;
    rollDeepLinkAppliedRef.current = true;
    deepLinkExamAppliedRef.current = true;

    setStudents(Array.isArray(snap.students) ? snap.students : []);
    setStudentId(snap.studentId ?? null);
    setStudent(
      snap.student && typeof snap.student === "object" ? snap.student : {},
    );
    setExamsList(Array.isArray(snap.examsList) ? snap.examsList : []);
    examIdRef.current = snap.examId ?? null;
    setExamId(snap.examId ?? null);
    setFlag(!!snap.flag);
    setAllCourseYears(
      Array.isArray(snap.allCourseYears) ? snap.allCourseYears : [],
    );
    setCourseYearsList(
      Array.isArray(snap.courseYearsList) ? snap.courseYearsList : [],
    );
    setExamDetailsList(
      Array.isArray(snap.examDetailsList) ? snap.examDetailsList : [],
    );
    allExamDetailsListRef.current = Array.isArray(snap.examDetailsList)
      ? snap.examDetailsList
      : [];
    setCourseYears(Array.isArray(snap.courseYears) ? snap.courseYears : []);
    setCourseYearId(snap.courseYearId ?? null);
    setCheckExam(snap.checkExam === 2 ? 2 : 1);
    studentCurrentCourseYearIdRef.current =
      snap.studentCurrentCourseYearId ?? null;
    setStudentSubjects(
      Array.isArray(snap.studentSubjects) ? snap.studentSubjects : [],
    );
    setChecksubject(snap.checksubject !== false);
    setSearchText(String(snap.searchText ?? ""));
    setExamFeeStructure(
      Array.isArray(snap.examFeeStructure) ? snap.examFeeStructure : [],
    );
    setCourseYearFee(
      Array.isArray(snap.courseYearFee) ? snap.courseYearFee : [],
    );
    setPaymentModeCatId(snap.paymentModeCatId ?? 131);
    setChequeNo(String(snap.chequeNo ?? ""));
    setDdno(String(snap.ddno ?? ""));
    setReferenceNumber(String(snap.referenceNumber ?? ""));
    setTransactionNo(String(snap.transactionNo ?? ""));
    setReceiptDate(snap.receiptDate ? new Date(snap.receiptDate) : new Date());
    setFeeComments(String(snap.feeComments ?? ""));
    setFeeReceipts(Array.isArray(snap.feeReceipts) ? snap.feeReceipts : []);
    setCoursesYearList(
      Array.isArray(snap.coursesYearList) ? snap.coursesYearList : [],
    );

    // Defer clear so React Strict Mode remount can still read the snapshot.
    const t = window.setTimeout(() => clearExamFeeReturnState(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link context forwarded from online-exam-fee-registration
  // (?collegeId&courseId&academicYearId&examId). This page is student-driven,
  // so the exam dropdown only populates after a student is picked. Once it does,
  // pre-select the exam that matches the deep-linked examId (once), so the
  // operator does not lose the context they came in with. Absent params => no-op.
  const searchParams = useSearchParams();

  useEffect(() => {
    if (restoredFromPrintRef.current || deepLinkExamAppliedRef.current) return;
    const qpExam = Number(searchParams.get("examId") ?? 0);
    if (!qpExam || examsList.length === 0 || examId) return;
    const match = examsList.find((e) => Number(e.examId) === qpExam);
    if (!match) return;
    deepLinkExamAppliedRef.current = true;
    examIdRef.current = qpExam;
    setExamId(qpExam);
    void selectedExternalExam(qpExam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examsList, searchParams]);

  // Angular printForm/printreceipt goBack → ?stdRollNumber=… re-searches the student
  // (skipped when returning from print with a full session snapshot).
  useEffect(() => {
    if (restoredFromPrintRef.current || rollDeepLinkAppliedRef.current) return;
    const roll = String(searchParams.get("stdRollNumber") ?? "").trim();
    if (!roll || roll.length < 5) return;
    rollDeepLinkAppliedRef.current = true;
    void enteredStudent(roll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Derived: selected subjects + count
  const selectedSubjects = useMemo(
    () => studentSubjects.filter((s) => s.isSelected),
    [studentSubjects],
  );
  const selectedCount = selectedSubjects.length;
  const selectableSubjectCount = useMemo(
    () => studentSubjects.filter((s) => !s.subjAlreadyRegistered).length,
    [studentSubjects],
  );
  const canAddFee = selectableSubjectCount > 0 && selectedCount > 0;

  const filteredSubjects = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return studentSubjects;
    return studentSubjects.filter((s) =>
      `${s.shortName ?? ""} ${s.subjectName ?? ""} ${s.subjectCode ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [studentSubjects, searchText]);

  const totalReceiptAmt = useMemo(
    () =>
      courseYearFee.reduce(
        (sum, cy) =>
          sum +
          Number(cy.examFeeAmount || 0) +
          Number(cy.examFineAmount || 0) +
          Number(cy.examAddFee || 0),
        0,
      ),
    [courseYearFee],
  );

  const additionalStructures: AnyRow[] =
    examFeeStructure[0]?.examFeeAdditionalStructureDTOs ?? [];

  // ============== INIT (Angular getGeneralDetails → paymentMode + examFeeType) ==============
  useEffect(() => {
    void (async () => {
      const [modes, types] = await Promise.all([
        listPaymentModes().catch(() => []),
        listExamFeeTypes().catch(() => []),
      ]);
      setPaymentModes(Array.isArray(modes) ? modes : []);
      setExamFeeTypes(Array.isArray(types) ? types : []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============== STUDENT SEARCH ==============
  async function enteredStudent(term: string) {
    const q = (term ?? "").trim();
    if (!q) {
      setStudents([]);
      return;
    }
    if (q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const list = await listStudents(q).catch(() => []);
      setStudents(Array.isArray(list) ? list : []);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  // ============== SELECT STUDENT ==============
  async function selectedStudent(sid: number | null, row: AnyRow | null) {
    setPhotoError(false);
    setCourseYearsList([]);
    setAllCourseYears([]);
    setFeeReceipts([]);
    setCoursesYearList([]);
    setSearchText("");
    setCourseYearFee([]);
    setExamsList([]);
    setExamId(null);
    setCourseYears([]);
    setStudentSubjects([]);
    allExamDetailsListRef.current = [];
    examDetailsReqSeqRef.current += 1; // invalidate in-flight exam-details requests
    setExamDetailsList([]);
    setCourseYearId(null);
    setCheckExam(1);
    setFlag(false);
    setExamFeeStructure([]);
    setStudentId(sid);

    if (!sid || !row) {
      studentRef.current = {} as AnyRow;
      setStudent({} as AnyRow);
      return;
    }

    setStudents((prev) =>
      prev.some((x) => Number(x.studentId) === sid) ? prev : [...prev, row],
    );
    const found = row;
    studentRef.current = found; // fresh for the async chain below
    setStudent(found);
    studentCurrentCourseYearIdRef.current = Number(found.courseYearId);

    // Course years (StudentAcademicbatch by studentDetail.studentId), dedupe by fromCourseYearId
    const batches = await getStudentAcademicBatches(sid).catch(() => []);
    setAllCourseYears(Array.isArray(batches) ? batches : []);
    const byFrom = new Map<number, AnyRow>();
    for (const b of Array.isArray(batches) ? batches : [])
      byFrom.set(Number(b.fromCourseYearId), b);
    const cyList = [...byFrom.values()];
    courseYearsListRef.current = cyList; // fresh for supplyCourseYears
    setCourseYearsList(cyList);

    // Exams for this student's course
    const exams = await listExamMastersByCourse(Number(found.courseId)).catch(
      () => [],
    );
    setExamsList(
      (Array.isArray(exams) ? exams : []).filter((e) => !e.isInternalExam),
    );
  }

  // ============== SELECT EXAM ==============
  // Angular selectedExternalExam(): exactly 3 calls in parallel —
  // getStudentExamFeeStructure, ExamMasterDetails, ExamFeeReceipt.
  // (subjects load later only if ExamMasterDetails yields a matching course year)
  async function selectedExternalExam(eid: number) {
    setFlag(true);
    setFeeReceipts([]);
    setCoursesYearList([]);
    setSearchText("");
    allExamDetailsListRef.current = [];
    setExamDetailsList([]);
    setCourseYears([]);
    setStudentSubjects([]);
    // Angular selectedExternalExam always loads Regular (getExamDetails(1))
    checkExamRef.current = 1;
    setCheckExam(1);
    const stu = studentRef.current;
    await Promise.all([
      loadFeeStructure(Number(stu.courseYearId)),
      getExamDetails(1, eid),
      getExamFeeReceipts(Number(stu.studentId), eid),
    ]);
  }

  /** Match ExamMasterDetails.courseYearId to academic-batch year ids (Angular + fromCourseYearId). */
  function examDetailMatchesBatch(ed: AnyRow, cy: AnyRow): boolean {
    const edCy = Number(ed.courseYearId);
    return (
      edCy === Number(cy.courseYearId) || edCy === Number(cy.fromCourseYearId)
    );
  }

  // ============== EXAM DETAILS → COURSE YEARS ==============
  async function getExamDetails(type: 1 | 2, eid: number) {
    const stu = studentRef.current;
    const seq = ++examDetailsReqSeqRef.current;
    const list = await getExamMasterDetailsByGroup({
      examId: eid,
      courseGroupId: Number(stu.courseGroupId),
      regulationId: Number(stu.regulationId),
    }).catch(() => []);
    // Drop stale responses (user toggled Regular ↔ Supple while request was in flight)
    if (seq !== examDetailsReqSeqRef.current) return;
    if (checkExamRef.current !== type) return;
    const details = Array.isArray(list) ? list : [];
    allExamDetailsListRef.current = details;
    supplyCourseYears(type, details, stu, eid);
  }

  function supplyCourseYears(
    type: 1 | 2,
    examDetails: AnyRow[],
    stu: AnyRow,
    eid: number,
  ) {
    setStudentSubjects([]);
    setCourseYearFee([]);
    const cyList = courseYearsListRef.current;
    if (!examDetails || examDetails.length === 0) {
      setCourseYears([]);
      setCourseYearId(null);
      return;
    }
    if (type === 1) {
      // Regular: only the student's current course year, if present as Regular in exam details.
      const reg = examDetails.filter((x) => x.examTypeCatCode === "Regular");
      examDetailsListRef.current = reg;
      setExamDetailsList(reg);
      const match = cyList.find(
        (x) => Number(x.fromCourseYearId) === Number(stu.courseYearId),
      );
      let cys = match ? [match] : [];
      cys = cys.filter((cy) =>
        reg.some((ed) => examDetailMatchesBatch(ed, cy)),
      );
      setCourseYears(cys);
      if (cys.length > 0) {
        const cyId = Number(cys[0].fromCourseYearId ?? cys[0].courseYearId);
        setCourseYearId(cyId);
        void getStudentSubjects(Number(stu.courseYearId), 1, eid);
      } else {
        setCourseYearId(null);
        toast.info("No Course Years in Exam Details");
      }
    } else {
      // Supple: prior semesters only (fromCourseYearId !== current), that exist as Supple in exam details.
      // Current semester (Regular) is intentionally excluded — Angular supplyCourseYears(type===2).
      const sup = examDetails.filter((x) => x.examTypeCatCode === "Supple");
      examDetailsListRef.current = sup;
      setExamDetailsList(sup);
      let cys = cyList.filter(
        (x) => Number(x.fromCourseYearId) !== Number(stu.courseYearId),
      );
      cys = cys.filter((cy) =>
        sup.some((ed) => examDetailMatchesBatch(ed, cy)),
      );
      setCourseYears(cys);
      setCourseYearId(null);
      if (cys.length === 0) toast.info("No Course Years in Exam Details");
    }
  }

  function onChangeCheckExam(value: 1 | 2) {
    checkExamRef.current = value; // keep ref fresh for loadFeeStructure's exam-type filter
    setCheckExam(value);
    clearOnExamTypeChange();
    void getExamDetails(value, Number(examIdRef.current));
  }

  function clearOnExamTypeChange() {
    // Clear semester list immediately so Regular SEM doesn't linger under Supplementary UI
    setCourseYears([]);
    setCourseYearFee([]);
    setStudentSubjects([]);
    setExamFeeStructure([]);
    setCourseYearId(null);
  }

  // ============== FEE STRUCTURE ==============
  async function loadFeeStructure(cyId: number) {
    const stu = studentRef.current;
    if (!stu?.collegeId || !examIdRef.current || !cyId) {
      setExamFeeStructure([]);
      return;
    }
    const s = await getStudentExamFeeStructure({
      collegeId: Number(stu.collegeId),
      examId: Number(examIdRef.current),
      courseGroupId: Number(stu.courseGroupId),
      courseYearId: cyId,
    }).catch(() => null);
    if (!s) {
      setExamFeeStructure([]);
      return;
    }
    // Angular: split additional structures, re-filter by exam type code, set ids + isDisable.
    const code = checkExamRef.current === 1 ? "Regular" : "Supple";
    const all: AnyRow[] = Array.isArray(s.examFeeAdditionalStructureDTOs)
      ? s.examFeeAdditionalStructureDTOs
      : [];
    const filtered = all
      .filter((a) => a.examTypeCatDisplayCode === code)
      .map((a) => ({
        ...a,
        examFeeStructureId: s.examFeeStructureId,
        isDisable: Number(a.fee) > 0,
      }));
    setExamFeeStructure([
      {
        ...s,
        examFeeAdditionalStructures: all,
        examFeeAdditionalStructureDTOs: filtered,
      },
    ]);
  }

  // ============== SUBJECTS ==============
  function getRelevantExamSubjects(cyId: number) {
    if (cyId == null) return;
    if (cyId === Number(studentRef.current.courseYearId))
      void getStudentSubjects(
        cyId,
        checkExamRef.current,
        Number(examIdRef.current),
      );
    else void getExamCourseYearSubjects(cyId, Number(examIdRef.current));
  }

  function normalizeRegular(rows: AnyRow[], cyId: number): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: Number(r.subjectId ?? r.fk_subject_id ?? 0),
      courseYearId: cyId,
      examType: "Regular",
      isSelected: !r.subjAlreadyRegistered,
      checked: !r.subjAlreadyRegistered,
      shortName:
        r.shortName && String(r.shortName).trim() !== ""
          ? r.shortName
          : r.subjectCode,
      Subject_name: r.subjectName,
      Subject_code: r.subjectCode,
      subjectTypeCode:
        r.subjectTypeCode ?? r.subjecttypeName ?? r.subjectTypeName ?? "",
      credits: r.credits ?? r.subCredits ?? r.subjectCredits ?? "",
      regulationName: r.regulationName ?? r.regulationCode ?? "",
    }));
  }
  function normalizeSupply(rows: AnyRow[], cyId: number): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: Number(r.subjectId ?? r.fk_subject_id ?? 0),
      courseYearId: cyId,
      examType: "Supple",
      isSelected: !r.subjAlreadyRegistered,
      checked: !r.subjAlreadyRegistered,
      shortName:
        r.shortName && String(r.shortName).trim() !== ""
          ? r.shortName
          : r.subjectCode,
      Subject_name: r.subjectName,
      Subject_code: r.subjectCode,
      subjectTypeCode:
        r.subjectTypeCode ?? r.subjecttypeName ?? r.subjectTypeName ?? "",
      credits:
        r.credits ?? r.subjectCredits ?? r.creditPoints ?? r.subCredits ?? "",
      regulationName: r.regulationName ?? r.regulationCode ?? "",
    }));
  }

  function applyBridgeFilterAndSort(rows: AnyRow[], cyId: number): AnyRow[] {
    let list = rows;
    const match = examDetailsListRef.current.find(
      (e) => Number(e.courseYearId) === Number(cyId),
    );
    if (match && match.isBridgeCourse !== undefined) {
      list = list.filter((s) => s.isBridgeCourse === match.isBridgeCourse);
    }
    return [...list].sort((a, b) =>
      a.subjAlreadyRegistered === b.subjAlreadyRegistered
        ? 0
        : a.subjAlreadyRegistered
          ? 1
          : -1,
    );
  }

  async function getStudentSubjects(
    cyId: number,
    checkExamVal: 1 | 2,
    eid: number,
  ) {
    setExamFeeStructure([]);
    const stu = studentRef.current;
    if (eid != null) await loadFeeStructure(cyId);
    let rows: AnyRow[] = [];
    if (Number(stu.courseYearId) === Number(cyId)) {
      const stdAcademicYearId = stu.academicYearId;
      rows = await getStudentSubjectsForRegularExam({
        collegeId: Number(stu.collegeId),
        academicYearId: Number(stdAcademicYearId),
        studentId: Number(stu.studentId),
        courseYearId: cyId,
        examId: eid,
      });
      rows = normalizeRegular(rows, cyId);
    } else {
      rows = await getStudentSubjectsForSupplyExam({
        collegeId: Number(stu.collegeId),
        courseYearId: cyId,
        studentId: Number(stu.studentId),
        examId: eid,
      });
      rows = normalizeSupply(rows, cyId);
    }
    setStudentSubjects(applyBridgeFilterAndSort(rows, cyId));
    markAll(true);
  }

  // Supple quick-link: only FAIL/ABSENT supply subjects.
  async function getExamCourseYearSubjects(cyId: number, eid: number) {
    const stu = studentRef.current;
    await loadFeeStructure(cyId);
    let rows = await getStudentSubjectsForSupplyExam({
      collegeId: Number(stu.collegeId),
      courseYearId: cyId,
      studentId: Number(stu.studentId),
      examId: eid,
    });
    rows = rows.filter(
      (r) => r.examresultCatCode === "FAIL" || r.examresultCatCode === "ABSENT",
    );
    rows = normalizeSupply(rows, cyId).map((r) => ({
      ...r,
      credits: r.creditPoints ?? r.credits,
    }));
    setStudentSubjects(applyBridgeFilterAndSort(rows, cyId));
    markAll(true);
  }

  // ============== CHECK / MARK ALL ==============
  function markAll(checkAllValue?: boolean) {
    const all = checkAllValue ?? checksubject;
    setStudentSubjects((prev) =>
      prev.map((s) => {
        if (!all) return { ...s, checked: false, isSelected: false };
        if (!s.subjAlreadyRegistered)
          return { ...s, checked: true, isSelected: true };
        return { ...s, checked: false, isSelected: false };
      }),
    );
    // keep courseYearFee in sync if already built
    if (courseYearFeeRef.current.length > 0)
      setTimeout(() => rebuildCourseYearFee(), 0);
  }

  function checkedSubjects(check: boolean, item: AnyRow) {
    setStudentSubjects((prev) =>
      prev.map((s) =>
        s.subjectId === item.subjectId && s.courseYearId === item.courseYearId
          ? { ...s, checked: check, isSelected: check }
          : s,
      ),
    );
    if (!check && courseYearFeeRef.current.length > 0)
      setTimeout(() => rebuildCourseYearFee(), 0);
  }

  function onToggleSelectAll(v: boolean) {
    setChecksubject(v);
    markAll(v);
  }

  // ============== FEE CALC ==============
  function fineCheck(fineList: AnyRow[]): AnyRow {
    const today = ymd(new Date());
    for (const f of fineList || []) {
      const from = dateOnly(f.fineFromDate);
      const to = dateOnly(f.fineToDate);
      if (from && to && today >= from && today <= to) return f;
    }
    return {};
  }
  function getSupplyFeeAmount(count: number, s: AnyRow): number {
    if (count === 1) return Number(s.subject1Fee || 0);
    if (count === 2) return Number(s.subject2Fee || 0);
    if (count === 3) return Number(s.subject3Fee || 0);
    if (count === 4) return Number(s.subject4Fee || 0);
    if (count === 5) return Number(s.subject5Fee || s.supplyFee || 0);
    if (count === 6) return Number(s.subject6Fee || s.supplyFee || 0);
    if (count >= 7) return Number(s.supplyFee || 0);
    return 0;
  }

  // Angular addExamSubjects(): build courseYearFee grouped by courseYearId.
  function buildCourseYearFee(): AnyRow[] {
    const s = examFeeStructureRef.current[0];
    if (!s) return [];
    const checked = studentSubjectsRef.current.filter((x) => x.checked);
    if (checked.length === 0) return [];

    let addF = 0;
    for (const a of s.examFeeAdditionalStructureDTOs ?? [])
      if (a.applyToAll) addF += Number(a.fee || 0);

    const fineObj =
      (s.examFeeFineDTOs?.length ?? 0) > 0 ? fineCheck(s.examFeeFineDTOs) : {};
    const noFine = isEmptyObject(fineObj);
    const result: AnyRow[] = [];
    const currentCY = studentCurrentCourseYearIdRef.current;

    for (const sub of checked) {
      const cyId = Number(sub.courseYearId);
      let existing = result.find((x) => x.courseYearId === cyId);
      const isRegular = Number(currentCY) === cyId;
      const examFeeAmount = isRegular
        ? Number(s.regFee || 0)
        : getSupplyFeeAmount(checked.length, s);
      const fineAmount = noFine
        ? 0
        : Number((isRegular ? fineObj.regFeeFine : fineObj.supplyFeeFine) || 0);
      if (!existing) {
        result.push({
          collegeCode: sub.collegeCode ?? studentRef.current.collegeCode,
          courseYearId: cyId,
          courseName: sub.courseName ?? studentRef.current.courseName,
          courseYearName:
            sub.courseYearName ?? studentRef.current.courseYearName,
          examType: sub.examType,
          examFeeAmount,
          examFineAmount: fineAmount,
          examAddFee: addF,
          academicYear: sub.academicYear ?? studentRef.current.academicYear,
          examFeeStructureId: s.examFeeStructureId,
          examAdditionalFeeReceiptDTOs: s.examFeeAdditionalStructureDTOs ?? [],
          subjects: [sub],
        });
      } else if (
        !existing.subjects.some((x: AnyRow) => x.subjectId === sub.subjectId)
      ) {
        existing.subjects.push(sub);
      }
    }
    return result;
  }

  function addExamSubjects() {
    if (examFeeStructureRef.current.length === 0) {
      toast.info("No Exam Fee Structure for this branch and Year.");
      return;
    }
    setCourseYearFee(buildCourseYearFee());
  }
  function rebuildCourseYearFee() {
    setCourseYearFee(buildCourseYearFee());
  }

  function updateAdditionalFee(idx: number, val: number) {
    setExamFeeStructure((prev) => {
      if (prev.length === 0) return prev;
      const structure = { ...prev[0] };
      const list = [...(structure.examFeeAdditionalStructureDTOs ?? [])];
      list[idx] = { ...list[idx], fee: val };
      structure.examFeeAdditionalStructureDTOs = list;
      return [structure];
    });
  }
  function updateLateFee(courseYearId: number, val: number) {
    setCourseYearFee((prev) =>
      prev.map((cy) =>
        Number(cy.courseYearId) === Number(courseYearId)
          ? { ...cy, examFineAmount: val }
          : cy,
      ),
    );
  }

  // ============== RECEIPTS ==============
  async function getExamFeeReceipts(sid: number, eid: number) {
    const list = await listExamFeeReceipts({
      studentId: sid,
      examId: eid,
    }).catch(() => []);
    // Angular getExamFeeReceipts: normalize subjectTypeCode / credits on nested DTOs
    const receipts = (Array.isArray(list) ? list : []).map((r) => {
      const details = r?.examStudentDTOs?.[0]?.examStudentDetailDTOs;
      if (Array.isArray(details)) {
        for (const d of details) {
          d.subjectTypeCode = d.subjectTypeCode ?? d.subjecttypeCode ?? "";
          d.credits = d.credits ?? d.subCredits ?? "";
        }
      }
      return r;
    });
    setFeeReceipts(receipts);
    // Angular getExamFeeReceipts → CoursesYearDublicateList: push receipt once per
    // subject row, then unique by courseYearId keeping the *last* occurrence.
    const dups: AnyRow[] = [];
    for (const r of receipts) {
      const details = r?.examStudentDTOs?.[0]?.examStudentDetailDTOs;
      const n = Array.isArray(details) ? details.length : 0;
      for (let j = 0; j < n; j++) dups.push(r);
    }
    const byCY = new Map<number, AnyRow>();
    for (const r of dups) byCY.set(Number(r.courseYearId), r);
    // If a course year only has receipts with empty subject DTOs, still list it
    // (Angular would omit it; keep as fallback so the header block remains).
    if (byCY.size === 0) {
      for (const r of receipts) byCY.set(Number(r.courseYearId), r);
    }
    setCoursesYearList([...byCY.values()]);
  }

  /**
   * Enrich receipt for Angular printForm(CoursesYearList) / printreceipt(feeReceipt).
   * CoursesYearList is a unique ExamFeeReceipt row; print pages read std* fields from it.
   */
  function buildPrintPayload(receipt: AnyRow): AnyRow {
    const stu = studentRef.current;
    const examRow = examsList.find(
      (e) => Number(e.examId) === Number(receipt.examId ?? examIdRef.current),
    );
    const cyId = Number(receipt.courseYearId) || 0;
    // Prefer a same-course-year receipt that still has examStudentDetailDTOs
    // (Angular CoursesYearList is built only from receipts that had subjects).
    const withSubjects =
      cyId > 0
        ? feeReceipts.find((r) => {
            if (Number(r.courseYearId) !== cyId) return false;
            const d = r?.examStudentDTOs?.[0]?.examStudentDetailDTOs;
            return Array.isArray(d) && d.length > 0;
          })
        : null;
    const source = withSubjects ?? receipt;
    const dto = source?.examStudentDTOs?.[0];
    return {
      ...source,
      studentId: Number(source.studentId ?? stu.studentId) || null,
      examId: Number(source.examId ?? examIdRef.current) || null,
      courseYearId: Number(source.courseYearId) || null,
      // Angular exam form Application Id: otherPaymentNumber only (never feeReceiptNo)
      otherPaymentNumber: source.otherPaymentNumber ?? "",
      stdName:
        source.stdName ??
        source.studentName ??
        stu.firstName ??
        stu.studentName ??
        "",
      stdRollNumber:
        source.stdRollNumber ??
        source.hallticketNumber ??
        stu.hallticketNumber ??
        stu.rollNumber ??
        "",
      stdFatherName:
        source.stdFatherName ??
        stu.fatherName ??
        stu.father_name ??
        stu.parentName ??
        "",
      // Angular shows receipt.studentType (often "EXAM"); do not invent REGULAR
      studentType:
        source.studentType ??
        source.student_type ??
        stu.studentType ??
        stu.student_type ??
        "",
      collegeName:
        source.collegeName ?? stu.collegeName ?? stu.college_name ?? "",
      address: source.address ?? stu.collegeAddress ?? stu.address ?? "",
      orgLogo:
        source.orgLogo ??
        source.org_logo ??
        source.collegeLogo ??
        source.college_logo ??
        source.logoPath ??
        source.logo ??
        stu.orgLogo ??
        stu.org_logo ??
        stu.collegeLogo ??
        stu.college_logo ??
        stu.logoPath ??
        stu.logo ??
        user?.collegeLogo ??
        (collegeLogoUrl && !collegeLogoUrl.includes("default_logo")
          ? collegeLogoUrl
          : "") ??
        "",
      courseCode: source.courseCode ?? stu.courseCode ?? "",
      groupCode: source.groupCode ?? stu.groupCode ?? "",
      section: source.section ?? stu.section ?? "",
      courseYearCode:
        source.courseYearCode ??
        source.course_year_code ??
        stu.courseYearCode ??
        "",
      courseYearName: source.courseYearName ?? stu.courseYearName ?? "",
      examName: source.examName ?? examRow?.examName ?? "",
      examTotalAmount:
        source.examTotalAmount ??
        Number(source.examFeeAmount ?? 0) +
          Number(source.examFineAmount ?? 0) +
          Number(source.examAddtFee ?? 0),
      hallticketNumber: source.hallticketNumber ?? stu.hallticketNumber ?? "",
      receiptDate: source.receiptDate ?? receipt.receiptDate ?? null,
      transactionNo: source.transactionNo ?? "",
      // Angular: studentSubjects = examStudentDTOs[0] → examStudentDetailDTOs
      examStudentDTOs: Array.isArray(source.examStudentDTOs)
        ? source.examStudentDTOs
        : dto
          ? [dto]
          : [],
    };
  }

  // ============== PAY ==============
  function payExamFees() {
    if (courseYearFeeRef.current.length === 0) return;
    if (!paymentModeCatId) {
      toastError("Select a payment mode.");
      return;
    }
    if (!receiptDate) {
      toastError("Select the payment date.");
      return;
    }
    const stu = studentRef.current;
    const rdate = ymd(receiptDate);
    const examRow = examsList.find(
      (e) => Number(e.examId) === Number(examIdRef.current),
    );
    const examName = examRow?.examName ?? "";
    const examFromDate = dateOnly(examRow?.fromDate);
    const examToDate = dateOnly(examRow?.toDate);

    const receipts = courseYearFeeRef.current.map((cy) => {
      // Lenient match (mirrors additional-exam-fees): the row's examType is a
      // display literal ("Regular"/"Supple"/"Supplementary") that rarely equals
      // the GeneralDetail code verbatim, so a strict === misses and posts null.
      // Match by lowercased substring on the fee type's code/name instead.
      const want = String(cy.examType ?? "").toLowerCase();
      const wantsRegular = want.includes("reg");
      const wantsSupple = want.includes("sup");
      const matchesFeeType = (x: AnyRow) => {
        const code = String(
          x.generalDetailCode ??
            x.generalDetailName ??
            x.generalDetailDisplayName ??
            "",
        ).toLowerCase();
        if (wantsRegular) return code.includes("reg");
        if (wantsSupple) return code.includes("sup");
        return code === want;
      };
      const ft =
        examFeeTypesRef.current.find(matchesFeeType) ??
        examFeeTypesRef.current.find(
          (x) => String(x.generalDetailCode) === String(cy.examType),
        );
      const examtypeCatId = ft ? Number(ft.generalDetailId) : null;
      if (examtypeCatId == null) {
        console.warn(
          "[student-exam-fee-registration] Could not resolve examtypeCatId for examType:",
          cy.examType,
          examFeeTypesRef.current,
        );
      }
      let addFeeAmt = 0;
      const addTFee: AnyRow[] = [];
      for (const a of cy.examAdditionalFeeReceiptDTOs || []) {
        if (Number(a.fee) > 0) {
          if (a.applyToAll === true) addFeeAmt += Number(a.fee);
          else addFeeAmt = 0;
          addTFee.push({
            ...a,
            collegeId: Number(stu.collegeId),
            addtFeeAmount: a.fee,
            isActive: true,
            addtExamFeeTypeCatId: a.adtExamfeetypeCatId,
            collectedEmpId: employeeId,
            addtReceiptDate: rdate,
          });
        }
      }
      const examFeeAmount = Number(cy.examFeeAmount || 0);
      const examFineAmount = Number(cy.examFineAmount || 0);
      return {
        chequeNo,
        ddno,
        examFeeAmount,
        examFineAmount,
        examAddtFee: addFeeAmt,
        examTotalAmount: examFeeAmount + examFineAmount + addFeeAmt,
        collegeCode: cy.collegeCode ?? stu.collegeCode,
        examName,
        courseName: cy.courseName ?? stu.courseName,
        courseYearName: cy.courseYearName,
        examType: cy.examType,
        examFromDate,
        examToDate,
        courseGroupName: stu.groupCode,
        academicYear: cy.academicYear ?? stu.academicYear,
        studentName: stu.firstName,
        rollno: stu.hallticketNumber,
        feeComments,
        employeeId,
        collegeId: Number(stu.collegeId),
        courseYearId: cy.courseYearId,
        examFeeFineId: null,
        examFeeStructureId: cy.examFeeStructureId,
        examId: Number(examIdRef.current),
        examtypeCatId,
        paymentModeCatId,
        studentId: Number(stu.studentId),
        isActive: true,
        otherPaymentNumber,
        receiptDate: rdate,
        referenceNumber,
        transactionNo,
        examAdditionalFeeReceiptDTOs: addTFee,
        examStudentDTOs: [
          {
            feeComments,
            collegeId: Number(stu.collegeId),
            courseGroupId: Number(stu.courseGroupId),
            courseYearId: cy.courseYearId,
            examFeeAmount,
            examtypeCatId,
            regulationId: Number(stu.regulationId),
            studentId: Number(stu.studentId),
            isActive: true,
            isFeePaid: true,
            registrationDate: rdate,
            examId: Number(examIdRef.current),
            examStudentDetailDTOs: cy.subjects,
          },
        ],
      };
    });
    if (receipts.some((r) => r.examtypeCatId == null)) {
      toastError(
        "Could not resolve the exam fee type for this exam. Please verify the exam fee type configuration before collecting the fee.",
      );
      return;
    }
    payReceiptsRef.current = receipts;
    setPayReceipts(receipts);
    setPayDialogOpen(true);
  }

  async function confirmPay() {
    setPaying(true);
    try {
      await payExamFeeReceipts(payReceiptsRef.current);
      toastSuccess("Exam fee paid successfully.");
      setPayDialogOpen(false);
      setPayReceipts([]);
      payReceiptsRef.current = [];
      clearAfterPay();
      await getExamFeeReceipts(
        Number(studentRef.current.studentId),
        Number(examIdRef.current),
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to pay exam fees.");
    } finally {
      setPaying(false);
    }
  }

  function clearAfterPay() {
    setCourseYearFee([]);
    setStudentSubjects([]);
    setExamFeeStructure([]);
    setCourseYearId(null);
    setChequeNo("");
    setReferenceNumber("");
    setTransactionNo("");
    setDdno("");
    setFeeComments("");
  }

  // ============== VIEW SUBJECTS MODAL ==============
  function viewCourseYearSubjects(row: AnyRow, mode: "receipt" | "noReceipt") {
    const raw =
      mode === "receipt"
        ? (row.examStudentDTOs?.[0]?.examStudentDetailDTOs ??
          row.examStdRegSubDTOs ??
          [])
        : (row.subjects ?? []);
    const regulationFallback = String(
      row.regulationName ??
        row.regulationCode ??
        studentRef.current.regulationName ??
        "",
    );
    const subs = (Array.isArray(raw) ? raw : []).map((s: AnyRow) => ({
      ...s,
      subjectName: s.subjectName ?? s.Subject_name ?? s.shortName ?? "",
      subjectCode: s.subjectCode ?? s.Subject_code ?? "",
      subjectTypeCode:
        s.subjectTypeCode ??
        s.subjecttypeName ??
        s.subjectTypeName ??
        s.subject_type_code ??
        "",
      credits: s.credits ?? s.subCredits ?? s.subjectCredits ?? "",
      regulationName:
        s.regulationName ?? s.regulationCode ?? regulationFallback,
    }));
    setViewSubjRows(subs);
    setViewSubjOpen(true);
  }

  // ============== PRINT (Angular printForm / printreceipt) ==============
  function captureReturnState() {
    saveExamFeeReturnState({
      students,
      studentId,
      student: studentRef.current ?? {},
      examsList,
      examId: examIdRef.current,
      flag,
      allCourseYears: allCourseYearsRef.current ?? [],
      courseYearsList: courseYearsListRef.current ?? [],
      examDetailsList: examDetailsListRef.current ?? [],
      courseYears,
      courseYearId: courseYearIdRef.current,
      checkExam: checkExamRef.current,
      studentCurrentCourseYearId: studentCurrentCourseYearIdRef.current,
      studentSubjects: studentSubjectsRef.current ?? [],
      checksubject,
      searchText,
      examFeeStructure: examFeeStructureRef.current ?? [],
      courseYearFee: courseYearFeeRef.current ?? [],
      paymentModeCatId,
      chequeNo,
      ddno,
      referenceNumber,
      transactionNo,
      receiptDate: receiptDate ? receiptDate.toISOString() : null,
      feeComments,
      feeReceipts,
      coursesYearList,
    });
  }

  function printExamForm(row: AnyRow) {
    if (!row) return;
    captureReturnState();
    saveExamFeePrintPayload(buildPrintPayload(row));
    router.push(
      "/admin-examination-management/pre-examination/student-exam-fee-registration/print-exam-form",
    );
  }

  function printFeeReceipt(row: AnyRow) {
    if (!row) return;
    captureReturnState();
    saveExamFeePrintPayload(buildPrintPayload(row));
    router.push(
      "/admin-examination-management/pre-examination/student-exam-fee-registration/print-receipt",
    );
  }

  const viewSubjectColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      VIEW_SUBJECT_COL_DEFS.siNo,
      {
        ...VIEW_SUBJECT_COL_DEFS.subjectName,
        cellStyle: { color: "hsl(var(--primary))" },
      },
      VIEW_SUBJECT_COL_DEFS.subjectType,
      VIEW_SUBJECT_COL_DEFS.credits,
      VIEW_SUBJECT_COL_DEFS.regulation,
    ],
    [],
  );

  const receiptColumnDefs: ColDef<AnyRow>[] = [
    RECEIPT_COL_DEFS.siNo,
    RECEIPT_COL_DEFS.semester,
    RECEIPT_COL_DEFS.receiptNo,
    RECEIPT_COL_DEFS.paymentDate,
    RECEIPT_COL_DEFS.paymentMode,
    RECEIPT_COL_DEFS.examType,
    RECEIPT_COL_DEFS.examFee,
    RECEIPT_COL_DEFS.addFee,
    RECEIPT_COL_DEFS.lateFee,
    RECEIPT_COL_DEFS.amount,
    {
      ...RECEIPT_COL_DEFS.subjects,
      cellRenderer: makeReceiptCoursesRenderer((row) =>
        viewCourseYearSubjects(row, "receipt"),
      ),
    },
    {
      ...RECEIPT_COL_DEFS.actions,
      cellRenderer: makePrintReceiptRenderer(printFeeReceipt),
    },
  ];

  const payConfirmColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      PAY_CONFIRM_COL_DEFS.siNo,
      PAY_CONFIRM_COL_DEFS.courseYear,
      PAY_CONFIRM_COL_DEFS.subjects,
      PAY_CONFIRM_COL_DEFS.examType,
      PAY_CONFIRM_COL_DEFS.feeAmount,
      PAY_CONFIRM_COL_DEFS.fineAmount,
      PAY_CONFIRM_COL_DEFS.addAmount,
    ],
    [],
  );

  const payDialogHead = payReceipts[0];
  const payDialogTotal = useMemo(
    () =>
      payReceipts.reduce(
        (sum, r) =>
          sum +
          Number(r.examFeeAmount || 0) +
          Number(r.examFineAmount || 0) +
          Number(r.examAddtFee || 0),
        0,
      ),
    [payReceipts],
  );

  return (
    <FilteredListPage
      title="Student Exam Fee Collection"
      bodyClassName="!overflow-x-auto"
      filters={
        <GlobalFilterBarRow className="!flex-nowrap !items-end w-full">
          <GlobalFilterField
            label="Student"
            className="global-filter-field--shrink !min-w-0 !flex-[0_0_35%] !max-w-[35%] sm:!min-w-[16rem]"
          >
            <StudentSearchSelect
              label=""
              value={studentId}
              students={students}
              selectedStudent={!isEmptyObject(student) ? student : null}
              isLoading={studentSearchLoading}
              onSearch={(term) => void enteredStudent(term)}
              onChange={(id, row) => void selectedStudent(id, row)}
              className="w-full min-w-0 [&>div]:max-w-none [&_input]:h-9"
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Exam *"
            className="global-filter-field--shrink !min-w-0 !flex-[0_0_60%] !max-w-[60%] sm:!min-w-[20rem]"
          >
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => {
                const eid = v ? Number(v) : 0;
                examIdRef.current = eid;
                setExamId(eid || null);
                if (eid) void selectedExternalExam(eid);
                else setFlag(false);
              }}
              options={examsList.map((e) => ({
                value: String(e.examId),
                label: `${e.examName} (${fmtDate(e.fromDate)} - ${fmtDate(e.toDate)})${e.isRegularExam ? " (Regular)" : ""}${e.isSupplyExam ? " (Supple)" : ""}`,
              }))}
              placeholder="Select Exam"
              searchable
              className="w-full min-w-0"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        studentId && examId && flag ? (
          <div className="space-y-4">
            {/* Student banner — Angular std-his */}
            {!isEmptyObject(student) && (
              <div className="overflow-hidden rounded-[3px] border-4 border-[#c3d9ff]">
                <div className="flex flex-wrap items-stretch gap-0 sm:flex-nowrap">
                  <div className="flex w-full shrink-0 items-center justify-center bg-white p-1.5 sm:w-[15%] sm:max-w-[140px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        photoError || !student.studentPhotoPath
                          ? "/assets/images/avatars/default_Student.png"
                          : String(student.studentPhotoPath)
                      }
                      alt=""
                      className="h-[100px] w-[75%] max-w-[120px] bg-[#c3d9ff] object-cover p-1.5"
                      onError={() => setPhotoError(true)}
                    />
                  </div>
                  <div className="min-w-0 flex-1 px-2 py-2.5 text-[13px] leading-[1.35] sm:flex-[0_0_60%] sm:max-w-[60%]">
                    <p className="m-0 font-medium text-black">
                      {String(student.firstName ?? "").toUpperCase()} (
                      <span className="font-medium text-blue-600">
                        {student.isLateral ? "LATERAL" : "REGULAR"}
                      </span>
                      )
                    </p>
                    <p className="m-0 mt-1 font-medium text-[#8c8c8c]">
                      {student.hallticketNumber}
                    </p>
                    <p className="m-0 mt-1 font-medium text-[#8c8c8c]">
                      {student.collegeCode} / {student.academicYear} /{" "}
                      {student.courseCode} / {student.groupCode} /{" "}
                      {student.courseYearName} / Section {student.section}
                    </p>
                    <p className="m-0 mt-1 font-medium text-[#8c8c8c]">
                      {student.mobile}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col justify-center px-3 py-2 text-[15px] sm:ml-auto">
                    <div className="py-1 text-black">
                      <span>Quota : </span>
                      {student.quotaDisplayName != null &&
                      String(student.quotaDisplayName).trim() !== "" ? (
                        <span className="text-blue-600">
                          {student.quotaDisplayName}
                        </span>
                      ) : null}
                    </div>
                    <div className="py-1 text-black">
                      <span>Student Status : </span>
                      {student.studentStatusCode != null ? (
                        <span
                          className={
                            STATUS_CLASS[String(student.studentStatusCode)] ??
                            "font-bold text-green-700"
                          }
                        >
                          {student.studentStatusDisplayName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Select Exam Fee Courses — match Angular / second-image layout */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <h2 className="m-0 bg-[#c3d9ff] px-4 py-2.5 text-[15px] font-semibold text-[#0c51a4]">
                Select Exam Fee Courses
              </h2>

              <div className="space-y-3 p-4">
                <div className="flex items-center gap-8 text-[13px] font-medium text-[#213045]">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="checkExam"
                      className="h-4 w-4 accent-[#0c51a4]"
                      checked={checkExam === 1}
                      onChange={() => onChangeCheckExam(1)}
                    />
                    Regular
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="checkExam"
                      className="h-4 w-4 accent-[#0c51a4]"
                      checked={checkExam === 2}
                      onChange={() => onChangeCheckExam(2)}
                    />
                    Supplementary
                  </label>
                </div>

                <div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
                  {/* Semester */}
                  {courseYears.length > 0 ? (
                    <div className="w-full">
                      <Select
                        variant="outlined"
                        value={courseYearId ? String(courseYearId) : null}
                        onChange={(v) => {
                          const id = v ? Number(v) : null;
                          setCourseYearId(id);
                          if (id) getRelevantExamSubjects(id);
                        }}
                        options={courseYears.map((o) => ({
                          value: String(o.fromCourseYearId),
                          label:
                            o.fromCourseYearName ?? `Sem ${o.fromCourseYearId}`,
                        }))}
                        placeholder="Semester"
                        label="Semester"
                      />
                      {courseYearId && checkExam === 2 ? (
                        <div className="mt-2 flex gap-4">
                          <span
                            className="cursor-pointer text-[13px] font-medium text-blue-600 underline"
                            onClick={() =>
                              void getStudentSubjects(
                                Number(courseYearId),
                                2,
                                Number(examIdRef.current),
                              )
                            }
                          >
                            All
                          </span>
                          <span
                            className="cursor-pointer text-[13px] font-medium text-blue-600 underline"
                            onClick={() =>
                              getRelevantExamSubjects(Number(courseYearId))
                            }
                          >
                            Supple
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Subjects list */}
                  {studentSubjects.length > 0 ? (
                    <div className="flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
                      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2">
                        <div className="relative min-w-0 flex-1">
                          <Search
                            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                            aria-hidden
                          />
                          <input
                            className="h-8 w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-[12px] outline-none"
                            placeholder="Search..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                          />
                        </div>
                        <span className="shrink-0 text-[12px] font-medium text-blue-600">
                          Courses: {selectedCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 bg-[#c3d9ff] px-3 py-1.5 text-[12px] font-semibold text-[#0c51a4]">
                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={checksubject && selectableSubjectCount > 0}
                            disabled={selectableSubjectCount === 0}
                            onChange={(e) =>
                              onToggleSelectAll(e.target.checked)
                            }
                          />
                          <span>All</span>
                        </label>
                        <span>Subjects</span>
                      </div>
                      <div className="max-h-[180px] flex-1 overflow-y-auto bg-white">
                        {filteredSubjects.map((obj, i) => (
                          <label
                            key={`sub-${obj.subjectId}-${obj.courseYearId}-${obj.examType ?? ""}-${i}`}
                            className={cn(
                              "flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-1.5 text-[12px] font-medium last:border-b-0",
                              obj.subjAlreadyRegistered
                                ? "cursor-default"
                                : "cursor-pointer hover:bg-[#f7fbff]",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={obj.subjAlreadyRegistered}
                              checked={!!obj.checked}
                              onChange={() =>
                                !obj.subjAlreadyRegistered &&
                                checkedSubjects(!obj.checked, obj)
                              }
                            />
                            <span className="min-w-0 text-blue-600">
                              {obj.shortName}
                              {obj.subjectCode != null
                                ? ` - ${obj.subjectCode}`
                                : null}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Additional Fee + Add Fee (button sits under panel, right-aligned) */}
                  {studentSubjects.length > 0 ? (
                    <div className="flex w-full flex-col gap-2 self-stretch">
                      <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
                        <div className="bg-[#c3d9ff] px-3 py-1.5 text-[12px] font-semibold text-[#0c51a4]">
                          Additional Fee
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-1">
                          {examFeeStructure.length > 0 &&
                          additionalStructures.some(
                            (a) => a.applyToAll === true,
                          )
                            ? additionalStructures.map((addFeeStr, i) =>
                                addFeeStr.applyToAll === true ? (
                                  <div
                                    key={`addl-${i}`}
                                    className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0"
                                  >
                                    <span className="min-w-0 flex-1 text-[12px] font-medium text-[#213045]">
                                      {addFeeStr.adtExamfeetypeCatDisplayName}
                                    </span>
                                    <input
                                      type="number"
                                      className="h-7 w-16 shrink-0 rounded border border-slate-300 text-right text-[12px] font-bold"
                                      value={String(addFeeStr.fee ?? 0)}
                                      onChange={(e) =>
                                        updateAdditionalFee(
                                          i,
                                          Number(e.target.value || 0),
                                        )
                                      }
                                    />
                                  </div>
                                ) : null,
                              )
                            : null}
                        </div>
                      </div>
                      <div className="flex justify-end pt-0.5">
                        <Button
                          className="h-8 rounded-full bg-[#7a8ba4] px-5 text-[12px] font-medium text-white hover:bg-[#6a7a92]"
                          onClick={addExamSubjects}
                          disabled={!canAddFee}
                        >
                          Add Fee
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Selected Courses strip */}
                {selectedSubjects.length > 0 ? (
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="bg-[#c3d9ff] px-3 py-1.5 text-[12px] font-semibold text-[#0c51a4]">
                      Selected Courses : {selectedCount}
                    </div>
                    <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto p-2">
                      {selectedSubjects.map((sub, i) => (
                        <span
                          key={`sel-${i}`}
                          className="rounded border border-slate-200 bg-[#f7fbff] px-2 py-1 text-[12px] font-medium text-[#213045]"
                        >
                          {sub.shortName}
                          {sub.subjectCode != null ? (
                            <>
                              {" - "}
                              <span className="text-blue-600">
                                {sub.subjectCode}
                              </span>
                            </>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Exam Fee Payment — Angular HTML table (not AG Grid) */}
            {studentId && courseYearFee.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white">
                <h2 className="m-0 rounded-t-lg bg-[#c3d9ff] px-4 py-2.5 text-[15px] font-semibold text-[#0c51a4]">
                  Exam Fee Payment
                </h2>
                <div className="exam-fee-angular-table p-2">
                  <table>
                    <colgroup>
                      <col style={{ width: 56 }} />
                      <col style={{ minWidth: 140 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 80 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>SI No</th>
                        <th>Semester</th>
                        <th className="is-right">Exam Type</th>
                        <th className="is-right">No of Subjects</th>
                        <th className="is-right">LateFee</th>
                        <th className="is-right">Add. Fee Amt(₹)</th>
                        <th className="is-right">Fee Amt (₹)</th>
                        <th className="is-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseYearFee.map((row, i) => (
                        <tr key={`${row.courseYearId}-${row.examType}-${i}`}>
                          <td>{i + 1}</td>
                          <td>{row.courseYearName}</td>
                          <td className="is-right">{row.examType}</td>
                          <td className="is-right">
                            {Array.isArray(row.subjects)
                              ? row.subjects.length
                              : (row.subjectCount ?? "-")}
                          </td>
                          <td className="is-right">
                            <input
                              type="number"
                              className="ml-auto h-7 w-24 rounded border border-[#cecece] px-1 text-right text-[12px] font-medium"
                              value={String(row.examFineAmount ?? 0)}
                              onChange={(e) =>
                                updateLateFee(
                                  Number(row.courseYearId),
                                  Number(e.target.value || 0),
                                )
                              }
                            />
                          </td>
                          <td className="is-right">{row.examAddFee ?? "-"}</td>
                          <td className="is-right">
                            {row.examFeeAmount ?? "-"}
                          </td>
                          <td className="is-center">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center text-[#9E9E9E] hover:text-foreground"
                              title="View Courses"
                              onClick={() =>
                                viewCourseYearSubjects(row, "noReceipt")
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-[#c3d9ff] bg-white px-3 py-2 text-[13px]">
                  <span className="font-bold text-blue-700">Summary</span>
                  <span className="font-bold">
                    Total Fees{" "}
                    <span className="ml-6 tabular-nums">{totalReceiptAmt}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Payment section */}
            {courseYearFee.length > 0 && (
              <div className="rounded border-[10px] border-[#c3d9ff] bg-[#f1f6ff] p-2">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-full sm:w-56">
                    <Select
                      value={paymentModeCatId ? String(paymentModeCatId) : null}
                      onChange={(v) =>
                        setPaymentModeCatId(v ? Number(v) : null)
                      }
                      options={paymentModes.map((m) => ({
                        value: String(m.generalDetailId),
                        label:
                          m.generalDetailDisplayName ??
                          m.generalDetailName ??
                          "-",
                      }))}
                      placeholder="Pay Mode"
                      label="Pay Mode"
                    />
                  </div>
                  {paymentModeCatId === 133 && (
                    <div className="w-full sm:w-56">
                      <label className="text-[12px] text-muted-foreground">
                        Cheque Number
                      </label>
                      <Input
                        className="h-8 text-[12px]"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 134 && (
                    <div className="w-full sm:w-56">
                      <label className="text-[12px] text-muted-foreground">
                        DD Number
                      </label>
                      <Input
                        className="h-8 text-[12px]"
                        value={ddno}
                        onChange={(e) => setDdno(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 131 && (
                    <div className="w-full sm:w-56">
                      <label className="text-[12px] text-muted-foreground">
                        Reference Number
                      </label>
                      <Input
                        className="h-8 text-[12px]"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  )}
                  {(paymentModeCatId === 135 || paymentModeCatId === 132) && (
                    <div className="w-full sm:w-56">
                      <label className="text-[12px] text-muted-foreground">
                        Transaction Number
                      </label>
                      <Input
                        className="h-8 text-[12px]"
                        value={transactionNo}
                        onChange={(e) => setTransactionNo(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="ml-auto text-right">
                    <label className="block text-[14px] font-medium">
                      Payment Amount
                    </label>
                    <Input
                      type="number"
                      disabled
                      readOnly
                      className="h-9 w-40 text-right text-[18px] font-bold"
                      value={String(totalReceiptAmt)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-full sm:w-56">
                    <label className="text-[12px] text-muted-foreground">
                      Payment Date *
                    </label>
                    <DatePicker
                      value={receiptDate}
                      onChange={setReceiptDate}
                      placeholder="Payment Date"
                    />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <label className="text-[12px] text-muted-foreground">
                      Fee Comments
                    </label>
                    <Input
                      className="h-8 text-[12px]"
                      value={feeComments}
                      onChange={(e) => setFeeComments(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <Button
                      className="h-9 w-full text-[12px]"
                      onClick={payExamFees}
                      disabled={paying}
                    >
                      Pay fees
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Fee Receipts (one block per course-year) — Angular DataTable parity */}
            {coursesYearList.map((cyl, idx) => {
              const rows = feeReceipts.filter(
                (r) => Number(r.courseYearId) === Number(cyl.courseYearId),
              );
              return (
                <div
                  key={`cyl-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white"
                >
                  <h2 className="m-0 flex items-center justify-between rounded-t-lg bg-[#c3d9ff] px-4 py-2.5 text-[15px] font-semibold text-[#0c51a4]">
                    <span>Exam Fee Receipts</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded bg-[#ffcf46] px-2.5 py-1 text-[12px] font-medium text-black hover:brightness-95"
                      onClick={() => printExamForm(cyl)}
                      title="Print Exam Form"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Exam Form
                    </button>
                  </h2>
                  <div className="p-2">
                    {rows.length > 0 ? (
                      <DataTable
                        title=""
                        bordered={false}
                        rowData={rows}
                        columnDefs={receiptColumnDefs}
                        getRowId={(p) =>
                          String(
                            (p.data as AnyRow)?.examFeeReceiptId ??
                              `${(p.data as AnyRow)?.feeReceiptNo}-${(p.data as AnyRow)?.courseYearId}-${(p.data as AnyRow)?.receiptDate}`,
                          )
                        }
                        pagination={false}
                        toolbar={COMPACT_TOOLBAR}
                        height="auto"
                        columnFilters={false}
                      />
                    ) : (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No receipts for this semester.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {/* Pay confirmation modal — Angular ExamFeePayDialog parity */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[hsl(var(--primary))]">
              <ClipboardList className="h-5 w-5" aria-hidden />
              Exam Fee Payment
            </DialogTitle>
          </DialogHeader>

          {payDialogHead ? (
            <div className="space-y-3">
              <div className="rounded border-2 border-[#89c5ff] bg-[#f7fbff] px-3 py-2 text-[13px]">
                <div className="grid grid-cols-[7rem_1fr] gap-y-1.5 sm:grid-cols-[8rem_1fr]">
                  <span className="font-medium">Student :</span>
                  <span className="text-blue-600">
                    {payDialogHead.studentName} ({payDialogHead.rollno})
                  </span>
                  <span className="font-medium">College :</span>
                  <span className="text-blue-600">
                    {payDialogHead.collegeCode}
                    {payDialogHead.academicYear
                      ? ` / (${payDialogHead.academicYear})`
                      : ""}
                  </span>
                  <span className="font-medium">Course :</span>
                  <span className="text-blue-600">
                    {payDialogHead.courseName} / (
                    {payDialogHead.courseGroupName})
                  </span>
                  <span className="font-medium">Exam :</span>
                  <span className="text-blue-600">
                    {payDialogHead.examName} (
                    {fmtDate(payDialogHead.examFromDate)} -{" "}
                    {fmtDate(payDialogHead.examToDate)})
                  </span>
                </div>
              </div>

              <DataTable
                bordered={false}
                rowData={payReceipts}
                columnDefs={payConfirmColumnDefs}
                getRowId={(p) =>
                  String(
                    (p.data as AnyRow)?.courseYearId ??
                      `${(p.data as AnyRow)?.courseYearName}-${(p.data as AnyRow)?.examType}`,
                  )
                }
                pagination={false}
                toolbar={COMPACT_TOOLBAR}
                height="auto"
              />

              <div className="flex justify-end border-t px-1 pt-2 text-[13px] font-medium">
                <span className="mr-8">Total Amount</span>
                <span className="min-w-[4rem] text-right tabular-nums">
                  {payDialogTotal}
                </span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
              disabled={paying}
            >
              Close
            </Button>
            <Button onClick={() => void confirmPay()} disabled={paying}>
              {paying ? "Paying…" : "Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View subjects modal — Angular ViewSubjectsComponent parity */}
      <Dialog
        open={viewSubjOpen}
        onOpenChange={(open) => {
          setViewSubjOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <span aria-hidden>📘</span>
              Subjects List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <DataTable
              title=""
              bordered={false}
              rowData={viewSubjRows}
              columnDefs={viewSubjectColumnDefs}
              getRowId={(p) =>
                String(
                  (p.data as AnyRow)?.subjectId ??
                    `${(p.data as AnyRow)?.subjectCode}-${(p.data as AnyRow)?.subjectName}`,
                )
              }
              pagination={true}
              toolbar={SEARCH_ONLY_TOOLBAR}
              height="360px"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewSubjOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
