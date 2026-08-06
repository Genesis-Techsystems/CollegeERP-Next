"use client";

/**
 * Additional Fee Collection — Angular `additional-exam-fee-collection`.
 * Flow: Student → Exam → Regular/Supple → Semester → Additional Fee → Add Fee → Pay
 * Pay: POST examfeereceipt[] (not addExamAdditionalFeeReceipt).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { ClipboardList, Printer } from "lucide-react";
import defaultStudent from "@/assets/images/avatars/default_Student.png";
import { StudentSearchSelect } from "@/common/components/student-search";
import { Select, type SelectOption } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { toDateStr, toDateOnlyISO } from "@/common/generic-functions";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
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
} from "@/services";
import { saveExamFeePrintPayload } from "../student-exam-fee-registration/_print/store";

type AnyRow = Record<string, any>;

type CartRow = {
  collegeCode: string;
  courseYearId: number;
  courseName: string;
  courseYearName: string;
  examType: string; // Regular | Supple (Angular examTypeCatDisplayCode)
  examAddFee: number;
  academicYear: string;
  examFeeStructureId: number | null;
  examFeeAmount?: number;
  examFineAmount?: number;
  /** Source DTO(s) from fee structure — enriched on pay */
  examAdditionalFeeReceiptDTOs: AnyRow[];
};

const COMPACT_TOOLBAR = {
  search: false,
  columnPicker: false,
  exportExcel: false,
  exportPdf: false,
  columnFilters: false,
} as const;

/** Angular Exam Fee Payment table columns */
const PAYMENT_COL_DEFS = {
  siNo: {
    headerName: "SI No",
    valueGetter: (p: ValueGetterParams<CartRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<CartRow>,
  semester: {
    field: "courseYearName",
    headerName: "Semester",
    minWidth: 160,
    flex: 1.4,
  } as ColDef<CartRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 120,
    flex: 0.9,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
  } as ColDef<CartRow>,
  addFeeAmt: {
    field: "examAddFee",
    headerName: "Add. Fee Amt(₹)",
    minWidth: 130,
    flex: 0.9,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
  } as ColDef<CartRow>,
  feeAmt: {
    field: "examAddFee",
    headerName: "Fee Amt (₹)",
    minWidth: 120,
    flex: 0.9,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
  } as ColDef<CartRow>,
};

/** Angular Exam Fee Receipts table columns */
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
    minWidth: 140,
    flex: 1.1,
  } as ColDef<AnyRow>,
  paymentDate: {
    headerName: "Payment Date",
    minWidth: 130,
    flex: 1,
    valueGetter: (p: ValueGetterParams<AnyRow>) => {
      const d = p.data?.receiptDate;
      if (!d) return "-";
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
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
  addFee: {
    headerName: "Add. Fee (₹)",
    minWidth: 120,
    flex: 0.8,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examAddtFee != null ? p.data.examAddtFee : "-",
  } as ColDef<AnyRow>,
  amount: {
    headerName: "Amount (₹)",
    minWidth: 110,
    flex: 0.8,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueGetter: (p: ValueGetterParams<AnyRow>) =>
      p.data?.examAddtFee != null ? p.data.examAddtFee : "-",
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

function makePrintReceiptRenderer(onPrint: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    if (!p.data) return null;
    return (
      <button
        type="button"
        title="Print Receipt"
        onClick={() => onPrint(p.data as AnyRow)}
        className="inline-flex text-red-600 hover:text-red-700"
      >
        <Printer className="h-4 w-4" />
      </button>
    );
  };
}

/** Angular additional-exam-fee-pay-dialog columns */
const PAY_CONFIRM_COL_DEFS = {
  siNo: {
    headerName: "SI.No.",
    valueGetter: (p: ValueGetterParams<CartRow>) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  } as ColDef<CartRow>,
  courseYear: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 140,
    flex: 1,
  } as ColDef<CartRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 120,
    flex: 1,
  } as ColDef<CartRow>,
  additionalAmount: {
    field: "examAddFee",
    headerName: "Additional Amount",
    minWidth: 140,
    flex: 1,
    type: "rightAligned",
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header",
    valueFormatter: (p) =>
      p.value == null || p.value === "" ? "—" : String(p.value),
  } as ColDef<CartRow>,
};

const DEFAULT_PAYMENT_MODE_ID = 131;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = Number(row[key]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function feeTypeLabel(row: AnyRow | null | undefined): string {
  if (!row) return "Additional Fee";
  return (
    pickText(row, [
      "adtExamfeetypeCatCode",
      "addtExamFeeTypeCatCode",
      "addtExamFeeTypeName",
      "addtFeeTypeName",
      "generalDetailDisplayName",
      "generalDetailName",
    ]) || "Additional Fee"
  );
}

function feeTypeIdOf(row: AnyRow): number {
  return pickNum(row, [
    "adtExamfeetypeCatId",
    "addtExamFeeTypeCatId",
    "addtFeeTypeCatId",
    "generalDetailId",
  ]);
}

export default function AdditionalExamFeesPage() {
  const router = useRouter();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [student, setStudent] = useState<AnyRow | null>(null);

  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState("");
  const [flag, setFlag] = useState(false);

  const [checkExam, setCheckExam] = useState<1 | 2>(1); // 1 Regular, 2 Supple
  const [batches, setBatches] = useState<AnyRow[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);

  const [structure, setStructure] = useState<AnyRow | null>(null);
  const [feeOptions, setFeeOptions] = useState<AnyRow[]>([]);
  const [additionalFeeId, setAdditionalFeeId] = useState<number | null>(null);
  const [feePreviewAmount, setFeePreviewAmount] = useState(0);
  const [studentSubjects, setStudentSubjects] = useState<AnyRow[]>([]);

  const [cart, setCart] = useState<CartRow[]>([]);
  const [receipts, setReceipts] = useState<AnyRow[]>([]);

  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);
  const [paymentModeCatId, setPaymentModeCatId] = useState(
    DEFAULT_PAYMENT_MODE_ID,
  );
  const [receiptDate, setReceiptDate] = useState(toDateOnlyISO(new Date()));
  const [feeComments, setFeeComments] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [otherPaymentNumber, setOtherPaymentNumber] = useState("");

  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  /** Supple mode subject filter: All = full supply list; Supple = FAIL/ABSENT only */
  const [suppleSubjectMode, setSuppleSubjectMode] = useState<"all" | "supple">(
    "supple",
  );

  // Init payment modes + exam fee types (Angular getData)
  useEffect(() => {
    void (async () => {
      const [modes, types] = await Promise.all([
        listPaymentModes().catch(() => []),
        listExamFeeTypes().catch(() => []),
      ]);
      setPaymentModes(Array.isArray(modes) ? modes : []);
      setExamFeeTypes(Array.isArray(types) ? types : []);
      const cash = (Array.isArray(modes) ? modes : []).find(
        (m) => Number(m.generalDetailId) === DEFAULT_PAYMENT_MODE_ID,
      );
      if (cash) setPaymentModeCatId(Number(cash.generalDetailId));
      else if (modes[0]) setPaymentModeCatId(Number(modes[0].generalDetailId));
    })();
  }, []);

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (!q) {
      setStudents([]);
      return;
    }
    if (q.length < 5) return;
    setStudentsLoading(true);
    try {
      const list = await listStudents(q).catch(() => []);
      setStudents(Array.isArray(list) ? list : []);
    } finally {
      setStudentsLoading(false);
    }
  }

  function clearAfterStudent() {
    setExamId(null);
    setExams([]);
    setFlag(false);
    setBatches([]);
    setSemesterId(null);
    setStructure(null);
    setFeeOptions([]);
    setAdditionalFeeId(null);
    setStudentSubjects([]);
    setCart([]);
    setReceipts([]);
  }

  async function onStudentChange(id: number | null, row: AnyRow | null) {
    setStudentId(id);
    if (!id || !row) {
      setStudent(null);
      clearAfterStudent();
      return;
    }
    setStudent(row);
    setStudents((prev) =>
      prev.some((s) => Number(s.studentId) === Number(id))
        ? prev
        : [...prev, row],
    );
    clearAfterStudent();

    // Angular: StudentAcademicbatch + ExamMaster by courseId
    const courseId = pickNum(row, ["courseId", "fk_course_id"]);
    const [batchRows, examRows] = await Promise.all([
      getStudentAcademicBatches(id).catch(() => []),
      listExamMastersByCourse(courseId).catch(() => []),
    ]);
    const dedupedBatches = dedupeBy(
      Array.isArray(batchRows) ? batchRows : [],
      (b) => pickNum(b, ["fromCourseYearId", "courseYearId"]),
    );
    setBatches(dedupedBatches);
    const external = (Array.isArray(examRows) ? examRows : []).filter(
      (e) => !Boolean(e.isInternalExam ?? e.is_internal_exam),
    );
    setExams(external);
  }

  // Exam selected → show student card, load receipts + structure for current CY
  useEffect(() => {
    if (!studentId || !examId || !student) {
      setFlag(false);
      return;
    }
    setFlag(true);
    void (async () => {
      const list = await listExamFeeReceipts({ studentId, examId }).catch(
        () => [],
      );
      setReceipts(Array.isArray(list) ? list : []);
    })();
  }, [studentId, examId, student]);

  /**
   * Angular getRelevantExamSujects / getStudentSubjects / getExamCourseYearSubjets
   * + getExamFeeStructure — load structure + subjects when semester changes.
   */
  useEffect(() => {
    if (!student || !examId || !semesterId) {
      setStructure(null);
      setFeeOptions([]);
      setStudentSubjects([]);
      return;
    }
    void (async () => {
      const collegeId = pickNum(student, ["collegeId", "fk_college_id"]);
      const courseGroupId = pickNum(student, [
        "courseGroupId",
        "fk_course_group_id",
      ]);
      const academicYearId = pickNum(student, [
        "academicYearId",
        "fk_academic_year_id",
      ]);
      const currentCy = pickNum(student, [
        "courseYearId",
        "fk_course_year_id",
        "fk_courseYearId",
      ]);
      const isRegular = checkExam === 1;
      const isCurrentYear = Number(semesterId) === currentCy;

      const struc = await getStudentExamFeeStructure({
        collegeId,
        examId,
        courseGroupId,
        courseYearId: semesterId,
      }).catch(() => null);

      // Subjects: same-year → getStudentSubjects; other year → supply + FAIL/ABSENT (Supple mode)
      let subjects: AnyRow[] = [];
      if (isCurrentYear) {
        if (isRegular) {
          subjects = await getStudentSubjectsForRegularExam({
            collegeId,
            academicYearId,
            studentId: Number(studentId),
            courseYearId: semesterId,
            examId,
          }).catch(() => []);
        } else {
          // Angular getStudentSubjects supply branch for current year
          subjects = await getStudentSubjectsForSupplyExam({
            collegeId,
            courseYearId: semesterId,
            studentId: Number(studentId),
            examId,
          }).catch(() => []);
        }
      } else {
        // Angular getExamCourseYearSubjets — supply API, then FAIL/ABSENT when mode=supple
        const all = await getStudentSubjectsForSupplyExam({
          collegeId,
          courseYearId: semesterId,
          studentId: Number(studentId),
          examId,
        }).catch(() => []);
        const rows = Array.isArray(all) ? all : [];
        subjects =
          checkExam === 2 && suppleSubjectMode === "supple"
            ? rows.filter((s) => {
                const code = String(s.examresultCatCode ?? "");
                return code === "FAIL" || code === "ABSENT";
              })
            : rows;
      }

      setStructure(struc);
      setStudentSubjects(Array.isArray(subjects) ? subjects : []);

      const dtos = Array.isArray(struc?.examFeeAdditionalStructureDTOs)
        ? (struc!.examFeeAdditionalStructureDTOs as AnyRow[])
        : Array.isArray(struc?.examFeeAdditionalStructures)
          ? (struc!.examFeeAdditionalStructures as AnyRow[])
          : [];

      // Angular: includeInReg==false && includeInRev==false (null/undefined excluded)
      const list = dtos.filter((d) => {
        if (!(d.includeInReg == false && d.includeInRev == false)) return false;
        const code = String(d.examTypeCatDisplayCode ?? "");
        return isRegular ? code === "Regular" : code === "Supple";
      });
      setFeeOptions(list);
      // Angular does not auto-select first fee
      setAdditionalFeeId(null);
      setFeePreviewAmount(0);
    })();
  }, [student, examId, semesterId, checkExam, studentId, suppleSubjectMode]);

  useEffect(() => {
    if (!additionalFeeId) {
      setFeePreviewAmount(0);
      return;
    }
    const picked = feeOptions.find(
      (f) => feeTypeIdOf(f) === Number(additionalFeeId),
    );
    setFeePreviewAmount(Number(picked?.fee ?? 0));
  }, [additionalFeeId, feeOptions]);

  const examOptions = useMemo<SelectOption[]>(() => {
    const q = examSearch.trim().toLowerCase();
    const src = q
      ? exams.filter((e) =>
          `${e.examName ?? e.exam_name ?? ""}`.toLowerCase().includes(q),
        )
      : exams;
    return src.map((e) => {
      const id = pickNum(e, ["examId", "fk_exam_id"]);
      const name = pickText(e, ["examName", "exam_name"]) || `Exam ${id}`;
      const from = toDateStr(pickText(e, ["fromDate", "from_date"]));
      const to = toDateStr(pickText(e, ["toDate", "to_date"]));
      const tags = [
        e.isRegularExam ? "(Regular)" : "",
        e.isSupplyExam ? "(Supple)" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const dates = from && to ? ` (${from} - ${to})` : "";
      return {
        value: String(id),
        label: `${name}${dates}${tags ? ` ${tags}` : ""}`.trim(),
      };
    });
  }, [exams, examSearch]);

  /**
   * Angular supplyCourseYears(type):
   * Regular → only student's current courseYearId
   * Supple → all academic batches except current courseYearId
   */
  const visibleBatches = useMemo(() => {
    if (!student) return [];
    const currentCy = pickNum(student, [
      "courseYearId",
      "fk_course_year_id",
      "fk_courseYearId",
    ]);
    if (checkExam === 1) {
      const current = batches.find(
        (b) => pickNum(b, ["fromCourseYearId", "courseYearId"]) === currentCy,
      );
      return current ? [current] : batches.slice(0, 1);
    }
    return batches.filter(
      (b) => pickNum(b, ["fromCourseYearId", "courseYearId"]) !== currentCy,
    );
  }, [batches, student, checkExam]);

  const semesterOptions = useMemo<SelectOption[]>(
    () =>
      visibleBatches
        .map((b) => {
          const id = pickNum(b, ["fromCourseYearId", "courseYearId"]);
          return {
            value: String(id),
            label:
              pickText(b, ["fromCourseYearName", "courseYearName"]) ||
              `Semester ${id}`,
          };
        })
        .filter((o) => Number(o.value) > 0),
    [visibleBatches],
  );

  // Angular supplyCourseYears: Regular → current CY; Supple → first other batch
  useEffect(() => {
    if (!flag || !student) return;
    if (checkExam === 1) {
      const currentCy = pickNum(student, [
        "courseYearId",
        "fk_course_year_id",
        "fk_courseYearId",
      ]);
      if (currentCy > 0) setSemesterId(currentCy);
      return;
    }
    const first = visibleBatches[0];
    const id = first ? pickNum(first, ["fromCourseYearId", "courseYearId"]) : 0;
    setSemesterId(id > 0 ? id : null);
    setSuppleSubjectMode("supple");
  }, [checkExam, flag, student, visibleBatches]);

  const selectedExam = useMemo(
    () =>
      exams.find(
        (e) => pickNum(e, ["examId", "fk_exam_id"]) === Number(examId),
      ) ?? null,
    [exams, examId],
  );

  const totalFees = useMemo(
    () => cart.reduce((s, r) => s + Number(r.examAddFee || 0), 0),
    [cart],
  );

  const paymentColumnDefs = useMemo<ColDef<CartRow>[]>(
    () => [
      PAYMENT_COL_DEFS.siNo,
      PAYMENT_COL_DEFS.semester,
      PAYMENT_COL_DEFS.examType,
      PAYMENT_COL_DEFS.addFeeAmt,
      PAYMENT_COL_DEFS.feeAmt,
    ],
    [],
  );

  const payConfirmColumnDefs = useMemo<ColDef<CartRow>[]>(
    () => [
      PAY_CONFIRM_COL_DEFS.siNo,
      PAY_CONFIRM_COL_DEFS.courseYear,
      PAY_CONFIRM_COL_DEFS.examType,
      PAY_CONFIRM_COL_DEFS.additionalAmount,
    ],
    [],
  );

  function onExamTypeChange(next: 1 | 2) {
    // Angular clear() + supplyCourseYears(type)
    setCheckExam(next);
    setCart([]);
    setSemesterId(null);
    setAdditionalFeeId(null);
    setFeePreviewAmount(0);
    setStudentSubjects([]);
    setStructure(null);
    setFeeOptions([]);
    setSuppleSubjectMode("supple");
    setReferenceNumber("");
    setTransactionNo("");
    setChequeNo("");
    setDdno("");
    setOtherPaymentNumber("");
    setFeeComments("");
  }

  /** Angular getStudentSubjects — All link (no FAIL/ABSENT filter) */
  function onSuppleAllSubjects() {
    setSuppleSubjectMode("all");
  }

  /** Angular getRelevantExamSujects — Supple link (FAIL/ABSENT for other years) */
  function onSuppleFailAbsentSubjects() {
    setSuppleSubjectMode("supple");
  }

  function onOpenPayDialog() {
    if (!examId || !studentId) {
      toastError(new Error("Select student and exam"), "Validation");
      return;
    }
    if (!paymentModeCatId) {
      toastError(new Error("Pay Mode is required"), "Validation");
      return;
    }
    if (!receiptDate) {
      toastError(new Error("Payment Date is required"), "Validation");
      return;
    }
    if (cart.length === 0) {
      toastInfo("Add at least one additional fee.");
      return;
    }
    setPayConfirmOpen(true);
  }

  function clearAfterPay() {
    // Angular clear() after successful pay
    setCart([]);
    setSemesterId(null);
    setAdditionalFeeId(null);
    setFeePreviewAmount(0);
    setStudentSubjects([]);
    setStructure(null);
    setFeeOptions([]);
    setReferenceNumber("");
    setTransactionNo("");
    setChequeNo("");
    setDdno("");
    setOtherPaymentNumber("");
    setFeeComments("");
  }

  function onAddFee() {
    if (!student || !examId || !semesterId) {
      toastInfo("Select student, exam and semester.");
      return;
    }
    if (!additionalFeeId) {
      toastInfo("Please select an Additional Fee.");
      return;
    }
    // Angular gate: studentSubjects.length > 0
    if (studentSubjects.length === 0) {
      toastInfo("No subjects found for this semester / exam type.");
      return;
    }
    if (!structure) {
      toastInfo("No Exam Fee Structure for this branch and Year.");
      return;
    }

    const dto = feeOptions.find(
      (f) => feeTypeIdOf(f) === Number(additionalFeeId),
    );
    if (!dto) {
      toastInfo("Selected additional fee not found in structure.");
      return;
    }

    const amount =
      feePreviewAmount > 0 ? feePreviewAmount : Number(dto.fee ?? 0);
    const cyName =
      semesterOptions.find((o) => Number(o.value) === Number(semesterId))
        ?.label || `Semester ${semesterId}`;
    const examTypeCode =
      pickText(dto, ["examTypeCatDisplayCode", "examType"]) ||
      (checkExam === 1 ? "Regular" : "Supple");

    const enrichedDto = {
      ...dto,
      fee: amount,
    };

    setCart((prev) => [
      ...prev,
      {
        collegeCode: pickText(student, ["collegeCode"]),
        courseYearId: Number(semesterId),
        courseName: pickText(student, ["courseName", "courseCode"]),
        courseYearName: cyName,
        examType: examTypeCode,
        examAddFee: amount,
        academicYear: pickText(student, ["academicYear"]),
        examFeeStructureId: Number(structure.examFeeStructureId ?? 0) || null,
        examFeeAmount: 0,
        examFineAmount: 0,
        examAdditionalFeeReceiptDTOs: [enrichedDto],
      },
    ]);
  }

  /** Angular printreceipt() → print-examfee-receipt via ParametersService */
  function printFeeReceipt(row: AnyRow) {
    if (!row) return;
    saveExamFeePrintPayload(row);
    router.push(
      "/admin-examination-management/pre-examination/student-exam-fee-registration/print-receipt",
    );
  }

  const receiptColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      RECEIPT_COL_DEFS.siNo,
      RECEIPT_COL_DEFS.semester,
      RECEIPT_COL_DEFS.receiptNo,
      RECEIPT_COL_DEFS.paymentDate,
      RECEIPT_COL_DEFS.paymentMode,
      RECEIPT_COL_DEFS.examType,
      RECEIPT_COL_DEFS.addFee,
      RECEIPT_COL_DEFS.amount,
      {
        ...RECEIPT_COL_DEFS.actions,
        cellRenderer: makePrintReceiptRenderer(printFeeReceipt),
      },
    ],
    [],
  );

  /** Angular payExamFees() body — POST examfeereceipt[] */
  function buildPayPayload(): AnyRow[] {
    if (!student || !examId) return [];
    const examName = pickText(selectedExam, ["examName", "exam_name"]);
    const examFromDate = pickText(selectedExam, ["fromDate", "from_date"]);
    const examToDate = pickText(selectedExam, ["toDate", "to_date"]);

    return cart.map((row) => {
      // Angular: generalDetailCode === examType (exact)
      const match = examFeeTypes.find(
        (t) => String(t.generalDetailCode ?? "") === String(row.examType),
      );
      const examtypeCatId = Number(match?.generalDetailId ?? 0);

      const addTFee: AnyRow[] = [];
      let addFeeAmt = 0;
      const srcList = Array.isArray(row.examAdditionalFeeReceiptDTOs)
        ? row.examAdditionalFeeReceiptDTOs
        : [row.examAdditionalFeeReceiptDTOs].filter(Boolean);

      for (const d of srcList) {
        const fee = Number(d.fee ?? 0);
        if (fee <= 0) continue;
        addFeeAmt += fee;
        addTFee.push({
          ...d,
          collegeId: pickNum(student, ["collegeId"]),
          addtFeeAmount: fee,
          isActive: true,
          addtExamFeeTypeCatId: feeTypeIdOf(d),
          collectedEmpId: employeeId || null,
          addtReceiptDate: receiptDate,
        });
      }

      return {
        chequeNo: chequeNo || null,
        ddno: ddno || null,
        examFeeAmount: row.examFeeAmount ?? 0,
        examFineAmount: row.examFineAmount ?? 0,
        examAddtFee: addFeeAmt,
        examTotalAmount: addFeeAmt,
        collegeCode: row.collegeCode,
        examName,
        courseName: row.courseName,
        courseYearName: row.courseYearName,
        examType: row.examType,
        examFromDate,
        examToDate,
        courseGroupName: pickText(student, ["groupCode"]),
        academicYear: row.academicYear,
        studentName: pickText(student, ["firstName", "studentName"]),
        rollno: pickText(student, ["hallticketNumber", "rollNumber"]),
        feeComments: feeComments || null,
        employeeId: employeeId || null,
        collegeId: pickNum(student, ["collegeId"]),
        courseYearId: row.courseYearId,
        examFeeFineId: null,
        examFeeStructureId: row.examFeeStructureId,
        examId,
        examtypeCatId,
        paymentModeCatId,
        studentId,
        isActive: true,
        otherPaymentNumber: otherPaymentNumber || null,
        receiptDate,
        referenceNumber: referenceNumber || null,
        transactionNo: transactionNo || null,
        examAdditionalFeeReceiptDTOs: addTFee,
        examStudentDTOs: [
          {
            feeComments: feeComments || null,
            collegeId: pickNum(student, ["collegeId"]),
            courseYearId: row.courseYearId,
            examFeeAmount: row.examFeeAmount ?? 0,
            examtypeCatId,
            regulationId: pickNum(student, [
              "regulationId",
              "fk_regulation_id",
            ]),
            studentId,
            isActive: true,
            isFeePaid: true,
            registrationDate: receiptDate,
            examId,
          },
        ],
      };
    });
  }

  async function onConfirmPay() {
    if (paying || cart.length === 0) return;
    if (!examId || !studentId) {
      toastError(new Error("Select student and exam"), "Validation");
      return;
    }
    if (!paymentModeCatId) {
      toastError(new Error("Pay Mode is required"), "Validation");
      return;
    }
    setPaying(true);
    try {
      const payload = buildPayPayload();
      await payExamFeeReceipts(payload);
      toastSuccess("Exam fee paid successfully");
      setPayConfirmOpen(false);
      clearAfterPay();
      const list = await listExamFeeReceipts({
        studentId: Number(studentId),
        examId: Number(examId),
      }).catch(() => []);
      setReceipts(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e, "Failed to pay exam fee");
    } finally {
      setPaying(false);
    }
  }

  const showStudentCard = Boolean(student && flag);

  return (
    <FilteredPage
      title="Additional Exam Fee"
      filtersCollapsible
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Student *" className="md:col-span-4">
            <StudentSearchSelect
              label=""
              fullWidth
              value={studentId}
              students={students}
              selectedStudent={student}
              isLoading={studentsLoading}
              onSearch={(term) => void onSearchStudents(term)}
              onChange={(id, row) => void onStudentChange(id, row)}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam *" className="md:col-span-8">
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => {
                setExamId(v ? Number(v) : null);
                setCart([]);
                setSemesterId(null);
              }}
              options={examOptions}
              placeholder={student ? "Search exam…" : "Select student first"}
              searchable
              disabled={!student}
              onSearch={setExamSearch}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        !showStudentCard ? (
          <p className="text-sm text-muted-foreground">
            Search and select a student, then choose an exam to continue.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Student profile — Angular std-his card */}
            <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3">
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
                <div className="flex justify-center md:col-span-2">
                  <img
                    src={student?.studentPhotoPath || defaultStudent.src}
                    alt="Student"
                    className="h-24 w-24 rounded border object-cover"
                    onError={(e) => {
                      e.currentTarget.src = defaultStudent.src;
                    }}
                  />
                </div>
                <div className="space-y-1 text-[13px] leading-6 md:col-span-7">
                  <div className="text-base font-semibold text-blue-700">
                    {student?.firstName ?? student?.studentName ?? "-"} (
                    {student?.isLateral ? "LATERAL" : "REGULAR"})
                  </div>
                  <div className="text-muted-foreground">
                    {student?.hallticketNumber ?? student?.rollNumber ?? "-"}
                  </div>
                  <div className="text-muted-foreground">
                    {[
                      student?.collegeCode,
                      student?.academicYear,
                      student?.courseCode,
                      student?.groupCode,
                      student?.courseYearName,
                      student?.section ? `Section ${student.section}` : "",
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </div>
                  <div className="text-muted-foreground">
                    {student?.mobile ?? "-"}
                  </div>
                </div>
                <div className="space-y-1 text-[13px] md:col-span-3">
                  <div>
                    Quota :{" "}
                    <span className="text-blue-700">
                      {student?.quotaDisplayName ?? ""}
                    </span>
                  </div>
                  <div>
                    Student Status :{" "}
                    <span className="font-semibold text-green-700">
                      {student?.studentStatusDisplayName ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Exam Fee Subjects */}
            <div className="rounded-md border border-border">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
                Select Exam Fee Subjects
              </div>
              <div className="space-y-3 p-3">
                <div className="flex flex-wrap gap-5 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={checkExam === 1}
                      onChange={() => onExamTypeChange(1)}
                    />
                    Regular
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={checkExam === 2}
                      onChange={() => onExamTypeChange(2)}
                    />
                    Supplementary
                  </label>
                </div>

                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                  <div className="space-y-1 md:col-span-4">
                    <Label>Semester *</Label>
                    <Select
                      value={semesterId ? String(semesterId) : null}
                      onChange={(v) => {
                        setSemesterId(v ? Number(v) : null);
                        // Angular selectionChange → getRelevantExamSujects (FAIL/ABSENT default)
                        if (checkExam === 2) setSuppleSubjectMode("supple");
                      }}
                      options={semesterOptions}
                      placeholder="Semester"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <Label>Additional Fee *</Label>
                    <Select
                      value={additionalFeeId ? String(additionalFeeId) : null}
                      onChange={(v) => setAdditionalFeeId(v ? Number(v) : null)}
                      options={feeOptions.map((f) => ({
                        value: String(feeTypeIdOf(f)),
                        label: feeTypeLabel(f),
                      }))}
                      placeholder="Additional Fee"
                    />
                  </div>
                  {studentSubjects.length > 0 && (
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        className="h-9 w-full bg-[#0d376d] hover:bg-[#0b2f5d]"
                        onClick={onAddFee}
                        disabled={!additionalFeeId || !semesterId}
                      >
                        Add Fee
                      </Button>
                    </div>
                  )}
                  {additionalFeeId != null && (
                    <div className="overflow-hidden rounded border border-border md:col-span-3">
                      <div className="border-b bg-muted/40 px-2 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
                        Additional Fee
                      </div>
                      <div className="flex items-center gap-2 px-2 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          {feeTypeLabel(
                            feeOptions.find(
                              (f) => feeTypeIdOf(f) === Number(additionalFeeId),
                            ),
                          )}
                        </span>
                        <Input
                          type="number"
                          className="h-8 w-24 text-right"
                          value={String(feePreviewAmount || 0)}
                          onChange={(e) =>
                            setFeePreviewAmount(Number(e.target.value || 0))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Angular All / Supple subject filter links (Supplementary only) */}
                {checkExam === 2 && semesterId != null && (
                  <div className="flex gap-4 text-sm font-medium text-blue-700">
                    <button
                      type="button"
                      className={
                        suppleSubjectMode === "all"
                          ? "underline"
                          : "hover:underline"
                      }
                      onClick={onSuppleAllSubjects}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={
                        suppleSubjectMode === "supple"
                          ? "underline"
                          : "hover:underline"
                      }
                      onClick={onSuppleFailAbsentSubjects}
                    >
                      Supple
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Exam Fee Payment */}
            {cart.length > 0 && (
              <div className="space-y-2 rounded-md border border-border">
                <div className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
                  Exam Fee Payment
                </div>
                <DataTable
                  title=""
                  bordered={false}
                  rowData={cart}
                  columnDefs={paymentColumnDefs}
                  getRowId={(p) =>
                    String(
                      `${(p.data as CartRow)?.courseYearId}-${(p.data as CartRow)?.examType}-${(p.data as CartRow)?.examAddFee}-${(p.data as CartRow)?.examFeeStructureId ?? "x"}`,
                    )
                  }
                  pagination={false}
                  toolbar={COMPACT_TOOLBAR}
                  height="auto"
                  columnFilters={false}
                />
                <div className="mx-2 mb-2 flex items-center justify-between rounded border bg-white px-3 py-2 text-[13px]">
                  <span className="font-bold text-blue-700">Summary</span>
                  <span className="font-bold">
                    Total Fees{" "}
                    <span className="ml-6 tabular-nums">{totalFees}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t p-3 md:grid-cols-12">
                  <div className="space-y-1 md:col-span-3">
                    <Label>Pay Mode *</Label>
                    <Select
                      value={String(paymentModeCatId || "")}
                      onChange={(v) =>
                        setPaymentModeCatId(
                          v ? Number(v) : DEFAULT_PAYMENT_MODE_ID,
                        )
                      }
                      options={paymentModes.map((m) => ({
                        value: String(m.generalDetailId),
                        label:
                          m.generalDetailDisplayName ??
                          m.generalDetailName ??
                          String(m.generalDetailId),
                      }))}
                      placeholder="Pay Mode"
                    />
                  </div>
                  {paymentModeCatId === 131 && (
                    <div className="space-y-1 md:col-span-3">
                      <Label>Reference Number</Label>
                      <Input
                        className="h-9"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 132 && (
                    <div className="space-y-1 md:col-span-3">
                      <Label>Transaction Number</Label>
                      <Input
                        className="h-9"
                        value={transactionNo}
                        onChange={(e) => setTransactionNo(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 133 && (
                    <div className="space-y-1 md:col-span-3">
                      <Label>Cheque Number</Label>
                      <Input
                        className="h-9"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 134 && (
                    <div className="space-y-1 md:col-span-3">
                      <Label>DD Number</Label>
                      <Input
                        className="h-9"
                        value={ddno}
                        onChange={(e) => setDdno(e.target.value)}
                      />
                    </div>
                  )}
                  {paymentModeCatId === 135 && (
                    <div className="space-y-1 md:col-span-3">
                      <Label>Other Payment Number</Label>
                      <Input
                        className="h-9"
                        value={otherPaymentNumber}
                        onChange={(e) => setOtherPaymentNumber(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-1 md:col-span-2">
                    <Label>Payment Date *</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Fee Comments</Label>
                    <Input
                      className="h-9"
                      value={feeComments}
                      onChange={(e) => setFeeComments(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-1 text-right text-[11px]">
                      Payment Amount
                    </div>
                    <div className="flex h-9 items-center justify-end rounded border px-2 text-lg font-semibold">
                      {totalFees}
                    </div>
                  </div>
                  <div className="flex justify-end md:col-span-12">
                    <Button
                      type="button"
                      className="bg-[#0d376d] hover:bg-[#0b2f5d]"
                      onClick={onOpenPayDialog}
                    >
                      Pay fees
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Fee Receipts */}
            {receipts.length > 0 && (
              <div className="space-y-2 rounded-md border border-border">
                <div className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
                  Exam Fee Receipts
                </div>
                <DataTable
                  title=""
                  bordered={false}
                  rowData={receipts}
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
              </div>
            )}
          </div>
        )
      }
    >
      <Dialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[hsl(var(--primary))]">
              <ClipboardList className="h-5 w-5" aria-hidden />
              Exam Fee Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded border-2 border-[#89c5ff] bg-[#f7fbff] px-3 py-2 text-[13px]">
              <div className="grid grid-cols-[7rem_1fr] gap-y-1.5 sm:grid-cols-[8rem_1fr]">
                <span className="font-medium">Student :</span>
                <span className="text-blue-600">
                  {student?.firstName ?? "—"} (
                  {student?.hallticketNumber ?? student?.rollNumber ?? "—"})
                </span>
                <span className="font-medium">College :</span>
                <span className="text-blue-600">
                  {student?.collegeCode ?? "—"}
                  {student?.academicYear ? ` / (${student.academicYear})` : ""}
                </span>
                <span className="font-medium">Course :</span>
                <span className="text-blue-600">
                  {student?.courseName ?? student?.courseCode ?? "—"} / (
                  {student?.groupCode ?? "—"})
                </span>
                <span className="font-medium">Exam :</span>
                <span className="text-blue-600">
                  {(() => {
                    const name =
                      pickText(selectedExam, ["examName", "exam_name"]) || "—";
                    const from = pickText(selectedExam, [
                      "fromDate",
                      "from_date",
                    ]);
                    const to = pickText(selectedExam, ["toDate", "to_date"]);
                    if (!from && !to) return name;
                    const fmt = (d: string) =>
                      d
                        ? new Date(d).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "";
                    return `${name} (${fmt(from)} - ${fmt(to)})`;
                  })()}
                </span>
              </div>
            </div>

            <DataTable
              bordered={false}
              rowData={cart}
              columnDefs={payConfirmColumnDefs}
              getRowId={(p) =>
                String(
                  `${(p.data as CartRow)?.courseYearId}-${(p.data as CartRow)?.examType}-${(p.data as CartRow)?.examFeeStructureId ?? "x"}`,
                )
              }
              pagination={false}
              toolbar={COMPACT_TOOLBAR}
              height="auto"
              columnFilters={false}
            />

            <div className="flex justify-end border-t px-1 pt-2 text-[13px] font-medium">
              <span className="mr-8">Total Amount</span>
              <span className="min-w-[4rem] text-right tabular-nums">
                {totalFees}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayConfirmOpen(false)}
              disabled={paying}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirmPay()}
              disabled={paying}
            >
              {paying ? "Paying…" : "Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
