"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { BookMarked, ChevronDown, Filter, UserRound } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MINIO_URL } from "@/config/constants/api";
import {
  listStudents,
  listPaymentModes,
  addExamAdditionalFeeReceipt,
} from "@/services/pre-examination";
import {
  getExamRevisionStdDetailsBundle,
  getStudentRevisionPaymentDetails,
  dedupeRevisionHistoryRows,
  listExamRevisionTypes,
  listStudentExamsForRevaluationFee,
  listStudentPhotocopyEvaluationDetails,
  mergeRevaluationReceiptRows,
  type MergedRevaluationReceipt,
} from "@/services/re-evaluation";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";

type AnyRow = Record<string, any>;

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 0;
}
function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? "").trim();
    if (val) return val;
  }
  return "";
}
function statusTextClass(code: string): string {
  const c = code.replaceAll(/\s+/g, "").toUpperCase();
  if (c.includes("INCOLLEGE")) return "text-emerald-600 font-medium";
  if (c.includes("PASSED")) return "text-slate-600 font-medium";
  if (c.includes("DISCONT")) return "text-amber-700 font-medium";
  if (c.includes("DETAIN")) return "text-orange-600 font-medium";
  if (c.includes("DTND")) return "text-red-600 font-medium";
  return "text-slate-700 font-medium";
}
function formatReceiptDate(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function resolvePhotoUrl(row: AnyRow | null): string | null {
  if (!row) return null;
  const path = strFrom(row, [
    "studentPhotoPath",
    "student_photo_path",
    "photoPath",
  ]);
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = MINIO_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
function openFile(path: string) {
  if (!path) return;
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${MINIO_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  window.open(url, "_blank", "width=700,height=600");
}

function subjectRowId(row: AnyRow | undefined): number {
  return numFrom(row ?? {}, ["fk_subject_id"]);
}

function SelectAllHeader(
  props: IHeaderParams & {
    checked?: boolean;
    onToggle?: (checked: boolean) => void;
  },
) {
  return (
    <label className="inline-flex items-center gap-2 text-[12px] font-medium">
      <input
        type="checkbox"
        checked={Boolean(props.checked)}
        onChange={(e) => props.onToggle?.(e.target.checked)}
      />
      <span>All</span>
    </label>
  );
}

// ── URL deep-link hydration (preserved) ─────────────────────────────────────
async function hydrateFromRollQuery(args: {
  roll: string;
  sidParam: string | null;
  examParam: string | null;
  loadExamsForStudent: (sid: number) => Promise<void>;
  setStudentRows: (v: AnyRow[]) => void;
  setStudentId: (v: number | null) => void;
  setStudentRow: (v: AnyRow | null) => void;
  setExamId: (v: number | null) => void;
}): Promise<void> {
  const {
    roll,
    sidParam,
    examParam,
    loadExamsForStudent,
    setStudentRows,
    setStudentId,
    setStudentRow,
    setExamId,
  } = args;
  const rows = await listStudents(roll);
  const list = Array.isArray(rows) ? rows : [];
  setStudentRows(list);
  const sid = sidParam
    ? Number(sidParam)
    : numFrom(list[0] ?? {}, ["studentId", "student_id", "fk_student_id"]);
  if (sid <= 0) return;
  setStudentId(sid);
  setStudentRow(
    list.find(
      (r) => numFrom(r, ["studentId", "student_id", "fk_student_id"]) === sid,
    ) ?? null,
  );
  await loadExamsForStudent(sid);
  if (examParam) setExamId(Number(examParam));
}

async function hydrateRevaluationFeeFromSearchParams(args: {
  searchParams: ReadonlyURLSearchParams;
  loadExamsForStudent: (sid: number) => Promise<void>;
  setLoading: (v: boolean) => void;
  setStudentRows: (v: AnyRow[]) => void;
  setStudentId: (v: number | null) => void;
  setStudentRow: (v: AnyRow | null) => void;
  setExamId: (v: number | null) => void;
}): Promise<void> {
  const {
    searchParams,
    loadExamsForStudent,
    setLoading,
    setStudentRows,
    setStudentId,
    setStudentRow,
    setExamId,
  } = args;
  const roll = searchParams.get("stdRollNumber") ?? searchParams.get("q") ?? "";
  const sidParam = searchParams.get("studentId");
  const examParam = searchParams.get("examId");
  setLoading(true);
  try {
    if (roll) {
      await hydrateFromRollQuery({
        roll,
        sidParam,
        examParam,
        loadExamsForStudent,
        setStudentRows,
        setStudentId,
        setStudentRow,
        setExamId,
      });
      return;
    }
    if (sidParam) {
      const sid = Number(sidParam);
      if (sid <= 0) return;
      setStudentId(sid);
      await loadExamsForStudent(sid);
      if (examParam) setExamId(Number(examParam));
    }
  } catch (e) {
    toastError(e, "Failed to apply URL parameters");
  } finally {
    setLoading(false);
  }
}

export default function ReEvaluationFeeCollectionPage() {
  const searchParams = useSearchParams();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const appliedQueryKey = useRef<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentRows, setStudentRows] = useState<AnyRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentRow, setStudentRow] = useState<AnyRow | null>(null);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [revisionTypes, setRevisionTypes] = useState<AnyRow[]>([]);
  const [revisionTypeId, setRevisionTypeId] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mergedReceipts, setMergedReceipts] = useState<
    MergedRevaluationReceipt[]
  >([]);

  // re-evaluation subject selection
  const [detailsList, setDetailsList] = useState<AnyRow[]>([]);
  const [coursesYearList, setCoursesYearList] = useState<AnyRow[]>([]);
  const [examRevisionStdDetails, setExamRevisionStdDetails] = useState<
    AnyRow[]
  >([]);
  const [checksubject, setChecksubject] = useState(true);
  const [duplicateSelectedList, setDuplicateSelectedList] = useState<AnyRow[]>(
    [],
  );

  // payment form
  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([]);
  const [paymentModeCatId, setPaymentModeCatId] = useState<number | null>(131);
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [otherPaymentNumber, setOtherPaymentNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [receiptDate, setReceiptDate] = useState(todayYmd());
  const [feeComments, setFeeComments] = useState("");
  const [saving, setSaving] = useState(false);

  // revision history + photocopy
  const [revisionHistory, setRevisionHistory] = useState<AnyRow[]>([]);
  const [revisionPaymentDetails, setRevisionPaymentDetails] = useState<
    AnyRow[]
  >([]);
  const [isPhotoCopy, setIsPhotoCopy] = useState(false);
  const [photocopyOpen, setPhotocopyOpen] = useState(false);
  const [photocopyData, setPhotocopyData] = useState<AnyRow[]>([]);

  // view subjects modal
  const [viewSubjOpen, setViewSubjOpen] = useState(false);
  const [viewSubjRows, setViewSubjRows] = useState<AnyRow[]>([]);

  const eachCourseFee = Number(coursesYearList[0]?.fee ?? 0);
  const examFeeAmount = duplicateSelectedList.length * eachCourseFee;

  useEffect(() => {
    void (async () => {
      const [types, modes] = await Promise.all([
        listExamRevisionTypes().catch(() => []),
        listPaymentModes().catch(() => []),
      ]);
      setRevisionTypes(Array.isArray(types) ? types : []);
      setPaymentModes(Array.isArray(modes) ? modes : []);
    })();
  }, []);

  const loadExamsForStudent = useCallback(
    async (sid: number) => {
      setLoading(true);
      try {
        const rows = await listStudentExamsForRevaluationFee(sid, employeeId);
        setExams(rows);
        setExamId(numFrom(rows[0] ?? {}, ["fk_exam_id", "examId"]) || null);
      } catch (e) {
        toastError(e, "Failed to load exams for student");
        setExams([]);
        setExamId(null);
      } finally {
        setLoading(false);
      }
    },
    [employeeId],
  );

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setStudentRows([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      const rows = await listStudents(q);
      setStudentRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toastError(e, "Student search failed");
      setStudentRows([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  const examOptions = useMemo(
    () =>
      exams
        .map((x) => ({
          value: String(numFrom(x, ["fk_exam_id", "examId"])),
          label: strFrom(x, ["exam_name", "examName"]),
        }))
        .filter((o) => o.value !== "0"),
    [exams],
  );
  const revisionOptions = useMemo(
    () =>
      revisionTypes
        .map((x) => ({
          value: String(numFrom(x, ["generalDetailId", "general_detail_id"])),
          label: strFrom(x, ["generalDetailDisplayName", "generalDetailCode"]),
        }))
        .filter((o) => o.value !== "0"),
    [revisionTypes],
  );

  useEffect(() => {
    const roll =
      searchParams.get("stdRollNumber") ?? searchParams.get("q") ?? "";
    const sidParam = searchParams.get("studentId");
    if (!roll && !sidParam) return;
    const key = searchParams.toString();
    if (appliedQueryKey.current === key) return;
    appliedQueryKey.current = key;
    void hydrateRevaluationFeeFromSearchParams({
      searchParams,
      loadExamsForStudent,
      setLoading,
      setStudentRows,
      setStudentId,
      setStudentRow,
      setExamId,
    });
  }, [searchParams, loadExamsForStudent]);

  function resetSelection() {
    setDetailsList([]);
    setCoursesYearList([]);
    setExamRevisionStdDetails([]);
    setDuplicateSelectedList([]);
    setMergedReceipts([]);
    setRevisionHistory([]);
    setRevisionPaymentDetails([]);
  }

  async function onStudentChange(sid: number | null, student: AnyRow | null) {
    setStudentId(sid);
    setStudentRow(student);
    setExamId(null);
    setRevisionTypeId(null);
    setShowProfile(false);
    setExams([]);
    resetSelection();
    if (sid && sid > 0) await loadExamsForStudent(sid);
  }

  const toggleAllSubjects = useCallback((all: boolean) => {
    setChecksubject(all);
    setExamRevisionStdDetails((prev) =>
      prev.map((it) =>
        Number(it.already_reg) === 1
          ? { ...it, checked: false, disabled: true }
          : { ...it, checked: all },
      ),
    );
  }, []);

  const toggleSubject = useCallback((check: boolean, row: AnyRow) => {
    if (Number(row.already_reg) === 1) return;
    setExamRevisionStdDetails((prev) =>
      prev.map((it) =>
        Number(it.fk_subject_id) === Number(row.fk_subject_id)
          ? { ...it, checked: check }
          : it,
      ),
    );
    if (!check)
      setDuplicateSelectedList((prev) =>
        prev.filter(
          (x) => Number(x.fk_subject_id) !== Number(row.fk_subject_id),
        ),
      );
  }, []);

  const subjectColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        colId: "select",
        headerName: "All",
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: SelectAllHeader,
        headerComponentParams: {
          checked: checksubject,
          onToggle: toggleAllSubjects,
        },
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <input
              type="checkbox"
              disabled={!!row.disabled}
              checked={!!row.checked}
              onChange={(e) => toggleSubject(e.target.checked, row)}
            />
          );
        },
      },
      {
        headerName: "Subject",
        minWidth: 220,
        flex: 1.5,
        valueGetter: (p) =>
          `${strFrom(p.data ?? {}, ["subject_code"])} - ${strFrom(p.data ?? {}, ["subject_name"])}`,
      },
      {
        headerName: "Subject Marks",
        minWidth: 120,
        flex: 0.8,
        type: "rightAligned",
        valueGetter: (p) => strFrom(p.data ?? {}, ["subject_marks"]) || "-",
      },
      {
        headerName: "Grade",
        minWidth: 90,
        flex: 0.6,
        valueGetter: (p) => strFrom(p.data ?? {}, ["grade"]) || "-",
      },
      {
        headerName: "Grade Points",
        minWidth: 110,
        flex: 0.7,
        type: "rightAligned",
        valueGetter: (p) => strFrom(p.data ?? {}, ["grade_points"]) || "-",
      },
    ],
    [checksubject, toggleAllSubjects, toggleSubject],
  );

  const duplicateColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 72,
        flex: 0,
      },
      {
        headerName: "Subject",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) =>
          `${strFrom(p.data ?? {}, ["subject_code"])} - ${strFrom(p.data ?? {}, ["subject_name"])}`,
      },
      {
        headerName: "Course Marks",
        minWidth: 120,
        flex: 0.6,
        type: "rightAligned",
        valueGetter: (p) => strFrom(p.data ?? {}, ["subject_marks"]) || "-",
      },
    ],
    [],
  );

  // Angular setCourseYear + CoursemarkItems (checkCourse master = true)
  function buildSubjectsForCourseYears(
    details: AnyRow[],
    cyList: AnyRow[],
    revId: number,
  ) {
    const cyIds = new Set(
      cyList.filter((c) => c.check).map((c) => Number(c.fk_course_year_id)),
    );
    let rows = details.filter(
      (it) =>
        cyIds.has(Number(it.fk_course_year_id)) &&
        Number(it.fk_adt_examfeetype_catdet_id) === revId,
    );
    rows = rows.filter(
      (it, i, self) =>
        i ===
        self.findIndex(
          (t) => Number(t.fk_subject_id) === Number(it.fk_subject_id),
        ),
    );
    rows = [...rows].sort(
      (a, b) => Number(a.order_no ?? 0) - Number(b.order_no ?? 0),
    );
    return rows.map((it) => ({
      ...it,
      disabled: Number(it.already_reg) === 1,
      checked: Number(it.already_reg) !== 1,
    }));
  }

  async function onSelectRevision(value: string | null) {
    const rid = value ? Number(value) : null;
    setRevisionTypeId(rid);
    setShowProfile(Boolean(studentId && examId && rid));
    setDuplicateSelectedList([]);
    if (!studentId || !examId || !rid) {
      resetSelection();
      return;
    }
    const typeName = strFrom(
      revisionTypes.find((t) => numFrom(t, ["generalDetailId"]) === rid) ?? {},
      ["generalDetailDisplayName", "generalDetailCode"],
    );
    setIsPhotoCopy(typeName.toLowerCase().includes("photo"));

    setLoading(true);
    try {
      const [bundle, paymentDetails] = await Promise.all([
        getExamRevisionStdDetailsBundle({ examId, studentId }),
        getStudentRevisionPaymentDetails({ examId, studentId }).catch(() => []),
      ]);
      const details = Array.isArray(bundle.detailsList)
        ? bundle.detailsList
        : [];
      setDetailsList(details);
      setMergedReceipts(mergeRevaluationReceiptRows(bundle.receiptRows));
      const paymentRows = Array.isArray(paymentDetails) ? paymentDetails : [];
      setRevisionPaymentDetails(paymentRows);
      setRevisionHistory(dedupeRevisionHistoryRows(paymentRows));

      // setCourseYear(): distinct course-years for this exam + revision type
      const courses = details.filter(
        (x) =>
          Number(x.fk_exam_id) === Number(examId) &&
          Number(x.fk_adt_examfeetype_catdet_id) === rid,
      );
      const seen = new Set<number>();
      const cyList = courses
        .filter((it) => {
          const dup = seen.has(Number(it.fk_course_year_id));
          seen.add(Number(it.fk_course_year_id));
          return !dup;
        })
        .map((c) => ({ ...c, check: true }));
      setCoursesYearList(cyList);
      setChecksubject(true);
      setExamRevisionStdDetails(
        cyList.length > 0
          ? buildSubjectsForCourseYears(details, cyList, rid)
          : [],
      );
    } catch (e) {
      toastError(e, "Failed to load re-valuation details");
    } finally {
      setLoading(false);
    }
  }

  function toggleCourseYear(check: boolean, row: AnyRow) {
    const next = coursesYearList.map((c) =>
      Number(c.fk_course_year_id) === Number(row.fk_course_year_id)
        ? { ...c, check }
        : c,
    );
    setCoursesYearList(next);
    setDuplicateSelectedList([]);
    setExamRevisionStdDetails(
      buildSubjectsForCourseYears(detailsList, next, Number(revisionTypeId)),
    );
    setChecksubject(true);
  }

  // AddData(): move newly-checked subjects into the selected (duplicate) list
  function addData() {
    const newlyChecked = examRevisionStdDetails.filter(
      (row) =>
        row.checked === true &&
        !duplicateSelectedList.some(
          (d) => Number(d.fk_subject_id) === Number(row.fk_subject_id),
        ),
    );
    if (newlyChecked.length === 0) {
      toast.info("Select subject(s) to add.");
      return;
    }
    setDuplicateSelectedList((prev) => [...prev, ...newlyChecked]);
  }

  async function payFee() {
    if (duplicateSelectedList.length === 0) {
      toastError("Add at least one subject before paying.");
      return;
    }
    if (!paymentModeCatId) {
      toastError("Select a payment mode.");
      return;
    }
    if (!receiptDate) {
      toastError("Select the payment date.");
      return;
    }
    const stu = studentRow ?? {};
    const collegeId = numFrom(stu, [
      "collegeId",
      "college_id",
      "fk_college_id",
    ]);
    const head = examRevisionStdDetails[0] ?? duplicateSelectedList[0] ?? {};
    const sel0 = duplicateSelectedList[0] ?? {};
    const subjectIds = duplicateSelectedList
      .map((r) => numFrom(r, ["fk_subject_id"]))
      .join(",");

    const examRevisionSubjectDTOs = duplicateSelectedList.map((row) => ({
      collegeId,
      courseYearId: row.fk_course_year_id,
      courseYearCode: row.course_year_code,
      addtFeeAmount: examFeeAmount,
      examAddtFeeReceiptId: null,
      addtReceiptNo: row.addt_receipt_no,
      addtReceiptDate: row.receipt_date,
      examId,
      examStdDetId: row.fk_exam_std_det_id,
      examRevisionTypeCatId: revisionTypeId,
      studentId,
      subjectId: row.fk_subject_id,
      previousMarks: row.subject_marks,
      isPublished: true,
      isActive: true,
    }));

    const payload: AnyRow = {
      collegeId,
      examFeeReceiptId: null,
      feeReceiptNo: head.fee_receipt_no,
      feeAddtId: head.fk_exam_fee_addt_id,
      courseYearId: sel0.fk_course_year_id,
      examId,
      addtFeeAmount: examFeeAmount,
      examFeeStructureId: head.pk_exam_fee_structure_id,
      examTotalAmount: examFeeAmount,
      examtypeCatId: head.fk_adt_examfeetype_catdet_id,
      addtExamFeeTypeCatId: head.fk_adt_examfeetype_catdet_id,
      examRevisionTypeCatId: revisionTypeId,
      collectedEmpId: head.fk_collected_emp_id,
      addtReceiptNo: head.addt_receipt_no,
      addtReceiptDate: head.receipt_date,
      isRefund: head.is_Refund,
      refundEmpId: head.fk_refund_emp_id,
      refundDate: head.refund_date,
      refundReason: head.refund_Reason,
      examFeeAmount,
      receiptDate,
      studentId,
      paymentModeCatId,
      referenceNumber,
      chequeNo,
      ddno,
      otherPaymentNumber,
      transactionNo,
      feeComments,
      subjectIds,
      isActive: true,
      reason: null,
      examAdditionalFeeReceiptDTOs: [
        {
          collegeId,
          examFeeReceiptId: null,
          feeAddtId: head.fk_exam_fee_addt_id,
          addtExamFeeTypeCatId: sel0.fk_adt_examfeetype_catdet_id,
          collectedEmpId: null,
          refundEmpId: null,
          examRevisionSubId: null,
          courseYearId: sel0.fk_course_year_id,
          addtFeeAmount: examFeeAmount,
          examAddtFeeReceiptId: null,
          examId,
          examStdDetId: sel0.fk_exam_std_det_id,
          examRevisionTypeCatId: revisionTypeId,
          revisedByEmpId: null,
          studentId,
          subjectId: null,
          addtReceiptDate: receiptDate,
          subjectTypeId: null,
          regulationId: null,
          updatedUser: null,
          createdUser: null,
          reevaluationEnteredEmpId: null,
          receiptDate,
          paymentModeCatId,
          referenceNumber,
          chequeNo,
          ddno,
          otherPaymentNumber,
          transactionNo,
          feeComments,
          isActive: true,
          examRevisionSubjectDTOs,
        },
      ],
    };

    setSaving(true);
    try {
      await addExamAdditionalFeeReceipt(payload);
      toastSuccess("Re-valuation fee paid successfully.");
      setDuplicateSelectedList([]);
      setChequeNo("");
      setDdno("");
      setReferenceNumber("");
      setOtherPaymentNumber("");
      setTransactionNo("");
      setFeeComments("");
      await onSelectRevision(String(revisionTypeId));
    } catch (e) {
      toastError(e, "Failed to pay re-valuation fee");
    } finally {
      setSaving(false);
    }
  }

  async function openPhotocopy() {
    if (!examId || !studentId) return;
    const rows = await listStudentPhotocopyEvaluationDetails({
      examId,
      studentId,
    }).catch(() => []);
    setPhotocopyData(Array.isArray(rows) ? rows : []);
    setPhotocopyOpen(true);
  }
  function openViewRevisionDetails(row: AnyRow) {
    const receiptId = numFrom(row, ["fk_exam_fee_receipt_id"]);
    const rows = revisionPaymentDetails.filter(
      (r) => numFrom(r, ["fk_exam_fee_receipt_id"]) === receiptId,
    );
    setViewSubjRows(rows);
    setViewSubjOpen(true);
  }

  function openViewSubjects(r: MergedRevaluationReceipt) {
    setViewSubjRows(Array.isArray(r.subjects) ? r.subjects : []);
    setViewSubjOpen(true);
  }

  const photoSrc = resolvePhotoUrl(studentRow);
  const statusCode = strFrom(studentRow ?? {}, [
    "studentStatusCode",
    "student_status_code",
  ]);
  const statusName = strFrom(studentRow ?? {}, [
    "studentStatusDisplayName",
    "student_status_display_name",
    "studentStatus",
  ]);

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" aria-hidden />
            Re-Valuation Fee
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            style={{ marginRight: "0px" }}
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3 space-y-3">
            <StudentSearchSelect
              label="Student"
              value={studentId}
              students={studentRows}
              selectedStudent={studentRow}
              isLoading={studentSearchLoading}
              minChars={2}
              placeholder="Search by name or hall ticket…"
              onSearch={(term) => void onStudentSearch(term)}
              onChange={(sid, student) => void onStudentChange(sid, student)}
            />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="space-y-1 md:col-span-6">
                <Label>Exam *</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    setExamId(v ? Number(v) : null);
                    setRevisionTypeId(null);
                    setShowProfile(false);
                    resetSelection();
                  }}
                  options={examOptions}
                  placeholder="Exam"
                  searchable
                  disabled={!studentId || exams.length === 0}
                />
              </div>
              <div className="space-y-1 md:col-span-6">
                <Label>Exam Revision Type</Label>
                <Select
                  value={revisionTypeId ? String(revisionTypeId) : null}
                  onChange={(v) => void onSelectRevision(v)}
                  options={revisionOptions}
                  placeholder="Type"
                  disabled={!examId}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student banner */}
      {showProfile && studentRow && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="rounded-md border border-blue-200 bg-muted/40 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <UserRound
                    className="h-12 w-12 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-[13px]">
                <p className="text-[15px] font-semibold text-slate-900">
                  {strFrom(studentRow, ["firstName", "first_name"]) || "-"}
                </p>
                <p className="text-muted-foreground">
                  {strFrom(studentRow, [
                    "rollNumber",
                    "roll_number",
                    "hallticketNumber",
                    "hallticket_number",
                  ]) || "-"}
                </p>
                <p className="text-muted-foreground">
                  {[
                    strFrom(studentRow, ["collegeCode", "college_code"]),
                    strFrom(studentRow, ["academicYear", "academic_year"]),
                    strFrom(studentRow, ["courseCode", "course_code"]),
                    strFrom(studentRow, ["groupCode", "group_code"]),
                    strFrom(studentRow, [
                      "courseYearName",
                      "course_year_name",
                      "courseYearCode",
                    ]),
                    strFrom(studentRow, ["section"])
                      ? `Section ${strFrom(studentRow, ["section"])}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                <p className="text-muted-foreground">
                  {strFrom(studentRow, ["mobile", "phone", "studentMobile"]) ||
                    "-"}
                </p>
              </div>
              <div className="shrink-0 space-y-1 text-[13px] md:text-right">
                <div>
                  <span className="text-slate-700">Quota : </span>
                  <span className="text-blue-700 font-medium">
                    {strFrom(studentRow, [
                      "quotaDisplayName",
                      "quota_display_name",
                    ]) || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-700">Student Status : </span>
                  <span className={statusTextClass(statusCode || statusName)}>
                    {statusName || statusCode || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Semester + Subjects */}
      {showProfile && coursesYearList.length > 0 && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Semester / course-year list */}
            <div className="md:col-span-3 rounded border">
              <div className="bg-[#c3d9ff] px-2 py-1.5 text-[13px] font-semibold">
                Select Semester
              </div>
              <div className="max-h-[300px] overflow-auto p-2 text-[12px] space-y-1">
                {coursesYearList.map((c, i) => (
                  <label key={`cy-${i}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!c.check}
                      onChange={(e) => toggleCourseYear(e.target.checked, c)}
                    />
                    {strFrom(c, ["course_year_code", "course_year_name"])}
                  </label>
                ))}
              </div>
            </div>

            {/* Subjects + marks */}
            <div className="md:col-span-9 rounded border overflow-hidden">
              <DataTable
                title=""
                subtitle=""
                bordered={false}
                rowData={examRevisionStdDetails}
                columnDefs={subjectColumnDefs}
                loading={loading}
                pagination={false}
                height="300px"
                fitColumnsToWidth={false}
                getRowId={(p) => String(subjectRowId(p.data))}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search subject…",
                  columnPicker: false,
                  exportExcel: false,
                  exportPdf: false,
                }}
                toolbarTrailing={
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-blue-700 whitespace-nowrap">
                      Each Course Fee — {eachCourseFee} /-
                    </span>
                    <Button
                      type="button"
                      className="h-8 text-[12px]"
                      onClick={addData}
                      disabled={
                        examRevisionStdDetails.filter((r) => r.checked)
                          .length === 0
                      }
                    >
                      Add
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected subjects + Payment */}
      {showProfile && duplicateSelectedList.length > 0 && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 rounded border overflow-hidden">
              <DataTable
                title=""
                subtitle=""
                bordered={false}
                rowData={duplicateSelectedList}
                columnDefs={duplicateColumnDefs}
                pagination={false}
                height="auto"
                fitColumnsToWidth
                toolbar={{
                  columnPicker: false,
                  exportExcel: false,
                  exportPdf: false,
                  search: false,
                }}
              />
            </div>

            <div className="md:col-span-6 rounded border p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Pay Mode *</Label>
                  <Select
                    value={paymentModeCatId ? String(paymentModeCatId) : null}
                    onChange={(v) => setPaymentModeCatId(v ? Number(v) : null)}
                    options={paymentModes.map((m) => ({
                      value: String(numFrom(m, ["generalDetailId"])),
                      label: strFrom(m, [
                        "generalDetailDisplayName",
                        "generalDetailName",
                      ]),
                    }))}
                    placeholder="Pay Mode"
                  />
                </div>
                {paymentModeCatId === 133 && (
                  <div className="space-y-1">
                    <Label>Cheque Number</Label>
                    <Input
                      className="h-8 text-[12px]"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                    />
                  </div>
                )}
                {paymentModeCatId === 134 && (
                  <div className="space-y-1">
                    <Label>DD Number</Label>
                    <Input
                      className="h-8 text-[12px]"
                      value={ddno}
                      onChange={(e) => setDdno(e.target.value)}
                    />
                  </div>
                )}
                {paymentModeCatId === 131 && (
                  <div className="space-y-1">
                    <Label>Reference Number</Label>
                    <Input
                      className="h-8 text-[12px]"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>
                )}
                {paymentModeCatId === 135 && (
                  <div className="space-y-1">
                    <Label>Other Payment Number</Label>
                    <Input
                      className="h-8 text-[12px]"
                      value={otherPaymentNumber}
                      onChange={(e) => setOtherPaymentNumber(e.target.value)}
                    />
                  </div>
                )}
                {paymentModeCatId === 132 && (
                  <div className="space-y-1">
                    <Label>Transaction Number</Label>
                    <Input
                      className="h-8 text-[12px]"
                      value={transactionNo}
                      onChange={(e) => setTransactionNo(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Payment Amount</Label>
                  <Input
                    className="h-8 text-[12px] font-semibold text-right"
                    value={String(examFeeAmount)}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    className="h-8 text-[12px]"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Fee Comments</Label>
                  <Input
                    className="h-8 text-[12px]"
                    value={feeComments}
                    onChange={(e) => setFeeComments(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  className="h-9 text-[12px]"
                  onClick={payFee}
                  disabled={saving}
                >
                  {saving ? "Paying…" : "Pay fees"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision history — Angular revisionHistoryList table */}
      {showProfile && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left">Receipt Date</th>
                <th className="px-3 py-2 text-left">Receipt No.</th>
                <th className="px-3 py-2 text-right">Receipt Amount</th>
                <th className="px-3 py-2 text-center">
                  {isPhotoCopy ? "View" : "Details"}
                </th>
              </tr>
            </thead>
            <tbody>
              {revisionHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {loading ? "Loading…" : "No receipt records"}
                  </td>
                </tr>
              ) : (
                revisionHistory.map((r, i) => (
                  <tr key={`rh-${i}`} className="border-b">
                    <td className="px-3 py-2">
                      {formatReceiptDate(
                        strFrom(r, ["recepit_date", "receipt_date"]),
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {strFrom(r, ["receipt_no", "fee_receipt_no"]) || "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {strFrom(r, ["fee_amount", "exam_total_amount"]) || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isPhotoCopy ? (
                        <button
                          type="button"
                          className="text-blue-700 hover:underline"
                          onClick={() => void openPhotocopy()}
                        >
                          View
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-blue-700 hover:underline"
                          onClick={() => openViewRevisionDetails(r)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipts */}
      {/* {showProfile && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left">SI No.</th>
                <th className="px-3 py-2 text-left">Semester</th>
                <th className="px-3 py-2 text-left">Receipt No.</th>
                <th className="px-3 py-2 text-left">Payment Date</th>
                <th className="px-3 py-2 text-left">Payment Mode</th>
                <th className="px-3 py-2 text-right">Exam Fee (₹)</th>
                <th className="px-3 py-2 text-right">Add. Fee (₹)</th>
                <th className="px-3 py-2 text-right">LateFee (₹)</th>
                <th className="px-3 py-2 text-right">Amount (₹)</th>
                <th className="px-3 py-2 text-center">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {mergedReceipts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {loading ? "Loading…" : "No receipt records"}
                  </td>
                </tr>
              ) : (
                mergedReceipts.map((r, i) => (
                  <tr key={r.fk_exam_addt_fee_receipt_id} className="border-b">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{r.course_year_code || "-"}</td>
                    <td className="px-3 py-2">{r.fee_receipt_no || "-"}</td>
                    <td className="px-3 py-2">
                      {formatReceiptDate(r.receipt_date)}
                    </td>
                    <td className="px-3 py-2">{r.payment_mode || "-"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.exam_fee_amount ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.exam_addt_fee ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.exam_fine_amount ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.exam_total_amount ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="outline"
                        className="h-7 text-[12px]"
                        onClick={() => openViewSubjects(r)}
                      >
                        Courses
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )} */}

      {/* Photocopy popup */}
      <Dialog open={photocopyOpen} onOpenChange={setPhotocopyOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photocopy / Evaluation Details</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">Hall Ticket</th>
                  <th className="px-2 py-1 text-left">Evaluator Name</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-right">Total Marks</th>
                  <th className="px-2 py-1 text-center">Answer Paper</th>
                </tr>
              </thead>
              <tbody>
                {photocopyData.map((p, i) => (
                  <tr key={`pc-${i}`} className="border-t">
                    <td className="px-2 py-1">
                      {strFrom(p, ["hallticket_number"])}
                    </td>
                    <td className="px-2 py-1">
                      {strFrom(p, ["evaluator_name"])}
                    </td>
                    <td className="px-2 py-1">
                      {strFrom(p, ["subject_details"])}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {strFrom(p, ["evaluated_totalmarks"]) || "-"}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {strFrom(p, ["evaluated_answerpaper_path"]) ? (
                        <button
                          className="text-blue-700 hover:underline"
                          onClick={() =>
                            openFile(strFrom(p, ["evaluated_answerpaper_path"]))
                          }
                        >
                          View
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {photocopyData.length === 0 && (
                  <tr className="border-t">
                    <td
                      colSpan={5}
                      className="px-2 py-6 text-center text-muted-foreground"
                    >
                      No evaluation details found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* View subjects modal */}
      <Dialog open={viewSubjOpen} onOpenChange={setViewSubjOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Course Year</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                </tr>
              </thead>
              <tbody>
                {viewSubjRows.map((s, i) => (
                  <tr key={`vs-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {strFrom(s, [
                        "course_year_code",
                        "courseYearCode",
                        "course_year_name",
                      ])}
                    </td>
                    <td className="px-2 py-1">
                      {strFrom(s, [
                        "subject_details",
                        "subject_code",
                        "subject_name",
                      ]) ||
                        `${strFrom(s, ["subject_code"])} - ${strFrom(s, ["subject_name"])}`}
                    </td>
                  </tr>
                ))}
                {viewSubjRows.length === 0 && (
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
    </PageContainer>
  );
}
