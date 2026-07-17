"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { ClipboardList, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FilteredPage } from "@/components/layout";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { saveExamFeePrintPayload } from "./_print/store";

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

const PAYMENT_COL_DEFS = {
  siNo: {
    headerName: "SI No",
    valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  semester: {
    field: "courseYearName",
    headerName: "Semester",
    minWidth: 140,
    flex: 1.2,
  } as ColDef<AnyRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  subjectCount: {
    headerName: "No of Subjects",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      Array.isArray(p.data?.subjects) ? p.data.subjects.length : 0,
    minWidth: 120,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  lateFee: {
    headerName: "LateFee",
    field: "examFineAmount",
    minWidth: 120,
    flex: 0.9,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
  addFee: {
    headerName: "Add. Fee Amt(₹)",
    field: "examAddFee",
    minWidth: 130,
    flex: 0.9,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  feeAmt: {
    headerName: "Fee Amt (₹)",
    field: "examFeeAmount",
    minWidth: 120,
    flex: 0.9,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Action",
    minWidth: 90,
    width: 90,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

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

const RECEIPT_COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: (p: ValueGetterParams<AnyRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  semester: {
    field: "courseYearName",
    headerName: "Semester",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<AnyRow>,
  receiptNo: {
    field: "feeReceiptNo",
    headerName: "Receipt No.",
    minWidth: 120,
    flex: 1,
  } as ColDef<AnyRow>,
  paymentDate: {
    headerName: "Payment Date",
    minWidth: 120,
    flex: 1,
  } as ColDef<AnyRow>,
  paymentMode: {
    field: "paymentModeCatDisplayName",
    headerName: "Payment Mode",
    minWidth: 120,
    flex: 1,
  } as ColDef<AnyRow>,
  examType: {
    field: "examtypeCatDisplayName",
    headerName: "Exam Type",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<AnyRow>,
  examFee: {
    headerName: "Exam Fee (₹)",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) => p.data?.examFeeAmount ?? "-",
  } as ColDef<AnyRow>,
  addFee: {
    headerName: "Add. Fee (₹)",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) => p.data?.examAddtFee ?? "-",
  } as ColDef<AnyRow>,
  lateFee: {
    headerName: "LateFee(₹)",
    minWidth: 100,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examFineAmount ?? "-",
  } as ColDef<AnyRow>,
  amount: {
    field: "examTotalAmount",
    headerName: "Amount (₹)",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-right",
    headerClass: "ag-right-aligned-header",
  } as ColDef<AnyRow>,
  subjects: {
    headerName: "Subjects",
    minWidth: 110,
    flex: 0.8,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

/** Angular ExamFeePayDialog table columns */
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
  // --- selection / lookups ---
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const studentsRef = useRef<AnyRow[]>([]);
  studentsRef.current = students;
  const [studentId, setStudentId] = useState<number | null>(null);
  const [student, setStudent, studentRef] = useStateRef<AnyRow>({});
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [examId, setExamId, examIdRef] = useStateRef<number | null>(null);
  const [flag, setFlag] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const rollDeepLinkAppliedRef = useRef(false);

  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([]);
  const [, setExamFeeTypes, examFeeTypesRef] = useStateRef<AnyRow[]>([]);

  // --- course-year / subject flow ---
  const [, setAllCourseYears, allCourseYearsRef] = useStateRef<AnyRow[]>([]);
  const [, setCourseYearsList, courseYearsListRef] = useStateRef<AnyRow[]>([]);
  const [, setExamDetailsList, examDetailsListRef] = useStateRef<AnyRow[]>([]);
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

  // Deep-link context forwarded from online-exam-fee-registration
  // (?collegeId&courseId&academicYearId&examId). This page is student-driven,
  // so the exam dropdown only populates after a student is picked. Once it does,
  // pre-select the exam that matches the deep-linked examId (once), so the
  // operator does not lose the context they came in with. Absent params => no-op.
  const searchParams = useSearchParams();
  const deepLinkExamAppliedRef = useRef(false);

  useEffect(() => {
    if (deepLinkExamAppliedRef.current) return;
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
  useEffect(() => {
    if (rollDeepLinkAppliedRef.current) return;
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
    setExamDetailsList([]);
    setCourseYearId(null);
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
    setExamDetailsList([]);
    setCourseYears([]);
    setStudentSubjects([]);
    const stu = studentRef.current;
    await Promise.all([
      loadFeeStructure(Number(stu.courseYearId)),
      getExamDetails(1, eid),
      getExamFeeReceipts(Number(stu.studentId), eid),
    ]);
  }

  // ============== EXAM DETAILS → COURSE YEARS ==============
  async function getExamDetails(type: 1 | 2, eid: number) {
    const stu = studentRef.current;
    const list = await getExamMasterDetailsByGroup({
      examId: eid,
      courseGroupId: Number(stu.courseGroupId),
      regulationId: Number(stu.regulationId),
    }).catch(() => []);
    const details = Array.isArray(list) ? list : [];
    examDetailsListRef.current = details;
    setExamDetailsList(details);
    supplyCourseYears(type, details, stu, eid);
  }

  function supplyCourseYears(
    type: 1 | 2,
    examDetails: AnyRow[],
    stu: AnyRow,
    eid: number,
  ) {
    setStudentSubjects([]);
    const cyList = courseYearsListRef.current;
    if (!examDetails || examDetails.length === 0) {
      setCourseYears([]);
      return;
    }
    if (type === 1) {
      // Angular: filter Regular, push batch where fromCourseYearId === student.courseYearId,
      // then keep only rows whose courseYearId appears in exam details.
      const reg = examDetails.filter((x) => x.examTypeCatCode === "Regular");
      examDetailsListRef.current = reg;
      setExamDetailsList(reg);
      const match = cyList.find(
        (x) => Number(x.fromCourseYearId) === Number(stu.courseYearId),
      );
      let cys = match ? [match] : [];
      cys = cys.filter((cy) =>
        reg.some((ed) => Number(ed.courseYearId) === Number(cy.courseYearId)),
      );
      setCourseYears(cys);
      if (cys.length > 0) {
        const cyId = Number(cys[0].fromCourseYearId ?? cys[0].courseYearId);
        setCourseYearId(cyId);
        void getStudentSubjects(Number(stu.courseYearId), 1, eid);
      } else {
        toast.info("No Course Years in Exam Details");
      }
    } else {
      const sup = examDetails.filter((x) => x.examTypeCatCode === "Supple");
      examDetailsListRef.current = sup;
      setExamDetailsList(sup);
      let cys = cyList.filter(
        (x) => Number(x.fromCourseYearId) !== Number(stu.courseYearId),
      );
      cys = cys.filter((cy) =>
        sup.some((ed) => Number(ed.courseYearId) === Number(cy.courseYearId)),
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
    // Angular CoursesYearList: unique by courseYearId, keeping the *last* receipt
    // (filter where courseYearId is not found again later in the list).
    const byCY = new Map<number, AnyRow>();
    for (const r of receipts) byCY.set(Number(r.courseYearId), r);
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
    const dto = receipt?.examStudentDTOs?.[0];
    return {
      ...receipt,
      studentId: Number(receipt.studentId ?? stu.studentId) || null,
      examId: Number(receipt.examId ?? examIdRef.current) || null,
      courseYearId: Number(receipt.courseYearId) || null,
      // Angular Application Id on exam form
      otherPaymentNumber:
        receipt.otherPaymentNumber ?? receipt.feeReceiptNo ?? "",
      stdName:
        receipt.stdName ??
        receipt.studentName ??
        stu.firstName ??
        stu.studentName ??
        "",
      stdRollNumber:
        receipt.stdRollNumber ??
        receipt.hallticketNumber ??
        stu.hallticketNumber ??
        stu.rollNumber ??
        "",
      stdFatherName:
        receipt.stdFatherName ??
        stu.fatherName ??
        stu.father_name ??
        stu.parentName ??
        "",
      // Angular shows receipt.studentType (often "EXAM"); do not invent REGULAR
      studentType:
        receipt.studentType ??
        receipt.student_type ??
        stu.studentType ??
        stu.student_type ??
        "",
      collegeName:
        receipt.collegeName ?? stu.collegeName ?? stu.college_name ?? "",
      address: receipt.address ?? stu.collegeAddress ?? stu.address ?? "",
      orgLogo: receipt.orgLogo ?? stu.orgLogo ?? stu.logoPath ?? "",
      courseCode: receipt.courseCode ?? stu.courseCode ?? "",
      groupCode: receipt.groupCode ?? stu.groupCode ?? "",
      section: receipt.section ?? stu.section ?? "",
      courseYearCode:
        receipt.courseYearCode ??
        receipt.course_year_code ??
        stu.courseYearCode ??
        "",
      courseYearName: receipt.courseYearName ?? stu.courseYearName ?? "",
      examName: receipt.examName ?? examRow?.examName ?? "",
      examTotalAmount:
        receipt.examTotalAmount ??
        Number(receipt.examFeeAmount ?? 0) +
          Number(receipt.examFineAmount ?? 0) +
          Number(receipt.examAddtFee ?? 0),
      hallticketNumber: receipt.hallticketNumber ?? stu.hallticketNumber ?? "",
      // Ensure nested subjects survive sessionStorage round-trip
      examStudentDTOs: Array.isArray(receipt.examStudentDTOs)
        ? receipt.examStudentDTOs
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
  function printExamForm(row: AnyRow) {
    if (!row) return;
    saveExamFeePrintPayload(buildPrintPayload(row));
    router.push(
      "/admin-examination-management/pre-examination/student-exam-fee-registration/print-exam-form",
    );
  }

  function printFeeReceipt(row: AnyRow) {
    if (!row) return;
    saveExamFeePrintPayload(buildPrintPayload(row));
    router.push(
      "/admin-examination-management/pre-examination/student-exam-fee-registration/print-receipt",
    );
  }

  const paymentColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      PAYMENT_COL_DEFS.siNo,
      PAYMENT_COL_DEFS.semester,
      PAYMENT_COL_DEFS.examType,
      PAYMENT_COL_DEFS.subjectCount,
      {
        ...PAYMENT_COL_DEFS.lateFee,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <Input
              type="number"
              className="ml-auto h-7 w-24 text-right text-[12px]"
              value={String(row.examFineAmount ?? 0)}
              onChange={(e) =>
                updateLateFee(
                  Number(row.courseYearId),
                  Number(e.target.value || 0),
                )
              }
            />
          );
        },
      },
      PAYMENT_COL_DEFS.addFee,
      PAYMENT_COL_DEFS.feeAmt,
      {
        ...PAYMENT_COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center text-[#9E9E9E] hover:text-foreground"
              title="View Courses"
              onClick={() => viewCourseYearSubjects(row, "noReceipt")}
            >
              <Eye className="h-4 w-4" />
            </button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over stable helpers
    [courseYearFee],
  );

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

  const receiptColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      RECEIPT_COL_DEFS.siNo,
      RECEIPT_COL_DEFS.semester,
      RECEIPT_COL_DEFS.receiptNo,
      {
        ...RECEIPT_COL_DEFS.paymentDate,
        valueGetter: (p) => fmtDate(p.data?.receiptDate),
      },
      RECEIPT_COL_DEFS.paymentMode,
      RECEIPT_COL_DEFS.examType,
      RECEIPT_COL_DEFS.examFee,
      RECEIPT_COL_DEFS.addFee,
      RECEIPT_COL_DEFS.lateFee,
      RECEIPT_COL_DEFS.amount,
      {
        ...RECEIPT_COL_DEFS.subjects,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <button
              type="button"
              className="rounded bg-[#ffcf46] px-2 py-1 text-[12px]"
              onClick={() => viewCourseYearSubjects(row, "receipt")}
            >
              Courses
            </button>
          );
        },
      },
      {
        ...RECEIPT_COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="Print Receipt"
              onClick={() => printFeeReceipt(row)}
            >
              <Printer className="h-4 w-4" />
            </button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feeReceipts],
  );

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
    <FilteredPage
      title="Exam Fee Collection"
      filters={
        <GlobalFilterBarRow>
          <div className="md:col-span-5 space-y-1">
            <StudentSearchSelect
              label="Student"
              value={studentId}
              students={students}
              selectedStudent={!isEmptyObject(student) ? student : null}
              isLoading={studentSearchLoading}
              onSearch={(term) => void enteredStudent(term)}
              onChange={(id, row) => void selectedStudent(id, row)}
            />
          </div>
          <div className="md:col-span-7 space-y-1">
            <Label>Exam *</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => {
                const eid = v ? Number(v) : 0;
                examIdRef.current = eid;
                setExamId(eid);
                if (eid) void selectedExternalExam(eid);
              }}
              options={examsList.map((e) => ({
                value: String(e.examId),
                label: `${e.examName} (${fmtDate(e.fromDate)} - ${fmtDate(e.toDate)})${e.isRegularExam ? " (Regular)" : ""}${e.isSupplyExam ? " (Supple)" : ""}`,
              }))}
              placeholder="Select Exam"
              searchable
            />
          </div>
        </GlobalFilterBarRow>
      }
    >
      {/* Student banner */}
      {!isEmptyObject(student) && flag && (
        <div className="rounded border-4 border-[#c3d9ff] p-3">
          <div className="flex gap-4">
            <div className="w-[120px] shrink-0">
              {student.studentPhotoPath && !photoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.studentPhotoPath}
                  alt="student"
                  className="w-full bg-[#c3d9ff] p-1.5"
                  style={{ maxHeight: 110 }}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div
                  className="flex w-full items-center justify-center bg-[#c3d9ff] p-1.5 text-[28px] font-semibold text-white"
                  style={{ height: 110 }}
                >
                  {String(student.firstName ?? "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1 text-[13px] leading-5">
              <p className="font-medium">
                {student.firstName} (
                <span className="text-blue-600">
                  {student.isLateral ? "LATERAL" : "REGULAR"}
                </span>
                )
              </p>
              <p className="text-[#8c8c8c]">{student.hallticketNumber}</p>
              <p className="text-[#8c8c8c]">
                {student.collegeCode} / {student.academicYear} /{" "}
                {student.courseCode} / {student.groupCode} /{" "}
                {student.courseYearName} / Section {student.section}
              </p>
              <p className="text-[#8c8c8c]">{student.mobile}</p>
            </div>
            <div className="text-[14px]">
              <div className="py-1">
                Quota :{" "}
                <span className="text-blue-600">
                  {student.quotaDisplayName}
                </span>
              </div>
              <div className="py-1">
                Student Status :{" "}
                <span
                  className={
                    STATUS_CLASS[String(student.studentStatusCode)] ??
                    "text-green-700 font-medium"
                  }
                >
                  {student.studentStatusDisplayName}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Exam Fee Courses */}
      {studentId && flag && (
        <div className="rounded border-2 border-[#89c5ff] p-2.5">
          <h2 className="mb-2 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
            Select Exam Fee Courses
          </h2>

          <div className="bg-white px-2 py-2">
            <div className="flex items-center gap-8 text-[13px]">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="checkExam"
                  checked={checkExam === 1}
                  onChange={() => onChangeCheckExam(1)}
                />
                Regular
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="checkExam"
                  checked={checkExam === 2}
                  onChange={() => onChangeCheckExam(2)}
                />
                Supplementary
              </label>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-2">
            {/* Semester */}
            {courseYears.length > 0 && (
              <div className="md:col-span-2 bg-white p-2">
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => {
                    const id = v ? Number(v) : null;
                    setCourseYearId(id);
                    if (id) getRelevantExamSubjects(id);
                  }}
                  options={courseYears.map((o) => ({
                    value: String(o.fromCourseYearId),
                    label: o.fromCourseYearName ?? `Sem ${o.fromCourseYearId}`,
                  }))}
                  placeholder="Semester"
                  label="Semester"
                />
                {courseYearId && checkExam === 2 && (
                  <div className="mt-2 flex gap-4">
                    <span
                      className="cursor-pointer text-[13px] text-blue-600 underline"
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
                      className="cursor-pointer text-[13px] text-blue-600 underline"
                      onClick={() =>
                        getRelevantExamSubjects(Number(courseYearId))
                      }
                    >
                      Supple
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Subjects table */}
            {studentSubjects.length > 0 && (
              <div className="md:col-span-3 border border-[#dedede] bg-white">
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="relative flex-1">
                    <Input
                      className="h-7 pl-7 text-[12px]"
                      placeholder="Search..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    <span className="material-icons absolute left-2 top-1.5 text-[14px] text-muted-foreground">
                      🔍
                    </span>
                  </div>
                  <span className="text-[13px] font-medium text-blue-600">
                    Courses: {selectedCount}
                  </span>
                </div>
                <table className="w-full text-[12px]">
                  <thead
                    className="block overflow-y-auto"
                    style={{ scrollbarGutter: "stable" }}
                  >
                    <tr className="flex w-full bg-[#C3D9FF]">
                      <th className="w-[40px] px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={checksubject && selectableSubjectCount > 0}
                          disabled={selectableSubjectCount === 0}
                          onChange={(e) => onToggleSelectAll(e.target.checked)}
                        />
                        <span className="ml-1">All</span>
                      </th>
                      <th className="flex-1 px-1 py-1 text-left">Subjects</th>
                    </tr>
                  </thead>
                  <tbody
                    className="block max-h-[150px] overflow-y-auto"
                    style={{ scrollbarGutter: "stable" }}
                  >
                    {filteredSubjects.map((obj, i) => (
                      <tr
                        key={`sub-${obj.subjectId || i}`}
                        className={`flex w-full ${obj.subjAlreadyRegistered ? "bg-[#f2f0f0]" : ""}`}
                      >
                        <td className="w-[40px] px-1 py-1 text-center">
                          <input
                            type="checkbox"
                            disabled={obj.subjAlreadyRegistered}
                            checked={!!obj.checked}
                            onChange={() =>
                              !obj.subjAlreadyRegistered &&
                              checkedSubjects(!obj.checked, obj)
                            }
                          />
                        </td>
                        <td className="flex-1 px-1 py-1">
                          {obj.shortName}
                          {obj.subjectCode != null && (
                            <>
                              {" "}
                              -{" "}
                              <span className="text-blue-600">
                                {obj.subjectCode}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected Courses */}
            {selectedSubjects.length > 0 && (
              <div className="md:col-span-3 border border-[#dedede] bg-white">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#C3D9FF]">
                      <th className="px-1 py-1 text-left text-blue-700">
                        Selected Courses : {selectedCount}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="block max-h-[150px] overflow-y-auto">
                    {selectedSubjects.map((sub, i) => (
                      <tr key={`sel-${i}`} className="flex w-full">
                        <td className="flex-1 px-1 py-1">
                          {sub.shortName}
                          {sub.subjectCode != null && (
                            <>
                              {" "}
                              -{" "}
                              <span className="text-blue-600">
                                {sub.subjectCode}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Additional Fee */}
            {examFeeStructure.length > 0 && additionalStructures.length > 0 && (
              <div className="md:col-span-3 border border-[#dedede] bg-white">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#C3D9FF]">
                      <th className="px-1 py-1 text-left">Additional Fee</th>
                    </tr>
                  </thead>
                  <tbody className="block max-h-[150px] overflow-y-auto">
                    {additionalStructures.map((addFeeStr, i) =>
                      addFeeStr.applyToAll === true ? (
                        <tr
                          key={`addl-${i}`}
                          className="flex w-full items-center"
                        >
                          <td className="flex flex-1 items-center justify-between gap-2 px-1 py-1">
                            <span>
                              {addFeeStr.adtExamfeetypeCatDisplayName}
                            </span>
                            <Input
                              type="number"
                              className="h-7 w-20 border-2 border-[#c4c4c4] text-right text-[12px]"
                              value={String(addFeeStr.fee ?? 0)}
                              onChange={(e) =>
                                updateAdditionalFee(
                                  i,
                                  Number(e.target.value || 0),
                                )
                              }
                            />
                          </td>
                        </tr>
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Fee — disabled when all subjects already registered / none selectable */}
            {studentSubjects.length > 0 && (
              <div className="md:col-span-1 flex items-end">
                <Button
                  className="h-8 w-full text-[12px]"
                  onClick={addExamSubjects}
                  disabled={!canAddFee}
                >
                  Add Fee
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exam Fee Payment summary */}
      {studentId && courseYearFee.length > 0 && (
        <div className="mx-1 space-y-2">
          <h2 className="rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
            Exam Fee Payment
          </h2>
          <DataTable
            title=""
            bordered={false}
            rowData={courseYearFee}
            columnDefs={paymentColumnDefs}
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
          <div className="flex items-center justify-between rounded border bg-white px-3 py-2 text-[13px]">
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
        <div className="mx-1 rounded border-[10px] border-[#c3d9ff] bg-[#f1f6ff] p-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-56">
              <Select
                value={paymentModeCatId ? String(paymentModeCatId) : null}
                onChange={(v) => setPaymentModeCatId(v ? Number(v) : null)}
                options={paymentModes.map((m) => ({
                  value: String(m.generalDetailId),
                  label:
                    m.generalDetailDisplayName ?? m.generalDetailName ?? "-",
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

      {/* Exam Fee Receipts (one block per course-year) */}
      {coursesYearList.map((cyl, idx) => {
        const rows = feeReceipts.filter(
          (r) => Number(r.courseYearId) === Number(cyl.courseYearId),
        );
        return (
          <div key={`cyl-${idx}`} className="mx-1 space-y-2">
            <h2 className="flex items-center justify-between rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
              <span>Exam Fee Receipts</span>
              <button
                type="button"
                className="rounded bg-[#ffcf46] px-2 py-1 text-[12px]"
                onClick={() => printExamForm(cyl)}
                title="Print Exam Form"
              >
                <Printer className="mr-1 inline h-3.5 w-3.5" />
                Exam Form
              </button>
            </h2>
            <DataTable
              title=""
              bordered={false}
              rowData={rows}
              columnDefs={receiptColumnDefs}
              getRowId={(p) =>
                String(
                  (p.data as AnyRow)?.examFeeReceiptId ??
                    `${(p.data as AnyRow)?.feeReceiptNo}-${(p.data as AnyRow)?.courseYearId}`,
                )
              }
              pagination={false}
              toolbar={COMPACT_TOOLBAR}
              height="auto"
            />
          </div>
        );
      })}

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
              pagination={false}
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
    </FilteredPage>
  );
}
