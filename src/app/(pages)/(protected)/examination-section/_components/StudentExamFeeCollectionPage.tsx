"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ClipboardList, Eye, Printer, Trash2 } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import { PageContainer } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionContext } from "@/context/SessionContext";
import {
  setSecuredValue,
  toDateStr,
  utcMidnightIso,
} from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  saveExamFeePrintPayload,
  setExamFeePrintReturnHref,
} from "@/app/(pages)/(protected)/admin-examination-management/pre-examination/student-exam-fee-registration/_print/store";
import {
  buildStudentExamFeeStagingPayload,
  chargeRazorpayPayment,
  createRazorpayOrder,
  deleteExamFeeReceipt,
  downloadStudentExamFeeReceiptPdf,
  fetchStudentDetail,
  getExamCourseYearSubjects,
  getExamMasterDetailsByGroup,
  getStudentAcademicBatches,
  getStudentExamFeeStructure,
  getStudentSubjectsForRegularExam,
  getStudentSubjectsForSupplyExam,
  initiatePayment,
  listExamFeeReceipts,
  listExamFeeTypes,
  listExamStdCourseYearSubjects,
  listPaymentModes,
  listStudentPortalExams,
  listStudentPortalRevaluationExams,
  loadRazorpayCheckoutScript,
  payExamFeeReceipts,
  printPdfBlob,
  resolveExamTypeCategoryId,
  resolveOnlinePaymentModeId,
  saveStgOnlineExamFeeReceipt,
  searchStudentsByKeyword,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

export type StudentExamFeeVariant = "exam-fee" | "revaluation";

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

type AnyRow = Record<string, any>;

type StudentExamProfile = StudentFeeSearchRow & {
  courseId?: number;
  courseGroupId?: number;
  courseYearId?: number;
  regulationId?: number;
  academicYearId?: number;
  courseName?: string;
  groupName?: string;
};

type CourseYearFeeRow = {
  courseYearId: number;
  courseYearName: string;
  examType: string;
  examFeeAmount: number;
  examFineAmount: number;
  examAddFee: number;
  subjects: AnyRow[];
  examFeeStructureId?: number;
  examAdditionalFeeReceiptDTOs?: AnyRow[];
  collegeCode?: string;
  courseName?: string;
  academicYear?: string;
  examtypeCatId?: number | null;
  examFeeFineId?: number | null;
};

type SubjectListRow = {
  subjectName: string;
  subjectCode: string;
  subjectTypeCode: string;
  credits: string | number;
  regulationName: string;
};

const SUBJECT_LIST_COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 72,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<SubjectListRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 220,
    flex: 1.6,
    valueGetter: (p) =>
      [p.data?.subjectName, p.data?.subjectCode].filter(Boolean).join(" — "),
  } as ColDef<SubjectListRow>,
  subjectType: {
    field: "subjectTypeCode",
    headerName: "Subject Type",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<SubjectListRow>,
  credits: {
    field: "credits",
    headerName: "Credits",
    minWidth: 90,
    flex: 0.7,
    cellClass: "ag-right-aligned-cell",
    valueFormatter: (p) =>
      p.value != null && String(p.value).trim() !== "" ? String(p.value) : "-",
  } as ColDef<SubjectListRow>,
  regulation: {
    field: "regulationName",
    headerName: "Regulation",
    minWidth: 100,
    flex: 0.8,
    valueFormatter: (p) =>
      p.value != null && String(p.value).trim() !== "" ? String(p.value) : "-",
  } as ColDef<SubjectListRow>,
};

function subjectNameRenderer(p: ICellRendererParams<SubjectListRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span className="text-blue-700">
      {row.subjectName || "-"}
      {row.subjectCode ? (
        <span className="text-blue-600"> — {row.subjectCode}</span>
      ) : null}
    </span>
  );
}

const num = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const key of keys) {
    const v = Number(row[key]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
};

const txt = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

function fmtDate(v: unknown): string {
  const s = v ? String(v).slice(0, 10) : "";
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function studentStatusClass(code?: string): string {
  const c = String(code ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  if (c.includes("INCOLLEGE")) return "status-incollege";
  if (c.includes("PASSEDOUT")) return "status-passedout";
  if (c.includes("DETAIN")) return "status-detain";
  if (c.includes("DISCONTINUED") || c.includes("DTND")) return "status-dtnd";
  return "font-medium";
}

function examFromDate(exam: AnyRow | null | undefined): string {
  return txt(exam, ["examFromDate", "fromDate"]);
}

function examToDate(exam: AnyRow | null | undefined): string {
  return txt(exam, ["examToDate", "toDate"]);
}

function decodeRazorValue(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw) return "";
  try {
    return atob(raw);
  } catch {
    return raw;
  }
}

function fineCheck(fineList: AnyRow[] | null | undefined): AnyRow | null {
  if (!Array.isArray(fineList) || fineList.length === 0) return null;
  const currentDate = toDateStr(new Date());
  for (const fine of fineList) {
    const from = String(fine.fineFromDate ?? "").slice(0, 10);
    const to = String(fine.fineToDate ?? "").slice(0, 10);
    if (currentDate && from && to && currentDate >= from && currentDate <= to) {
      return fine;
    }
  }
  return null;
}

/** Angular student-exam-fee-collection `.pic` profile banner. */
function StudentExamFeeProfileBanner({
  student,
}: {
  readonly student: StudentExamProfile;
}) {
  const [photoError, setPhotoError] = useState(false);
  const photoSrc =
    !photoError && student.studentPhotoPath
      ? student.studentPhotoPath
      : DEFAULT_STUDENT_PHOTO;

  const pathLine = [
    student.collegeCode,
    student.academicYear,
    student.courseCode,
    student.groupCode,
    student.courseYearName,
    student.section ? `Section ${student.section}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="std-his">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-[15%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt=""
            className="pic"
            onError={() => setPhotoError(true)}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 text-[13px] leading-5">
          <p className="font-medium text-foreground">
            {student.firstName}{" "}
            <span className="font-semibold text-blue-600">
              ({student.isLateral ? "LATERAL" : "REGULAR"})
            </span>
          </p>
          <p className="text-[#8c8c8c]">
            {student.hallticketNumber ?? student.rollNumber}
          </p>
          {pathLine ? <p className="text-[#8c8c8c]">{pathLine}</p> : null}
          {student.mobile ? (
            <p className="text-[#8c8c8c]">{student.mobile}</p>
          ) : null}
        </div>
        <div className="space-y-1 text-[15px] sm:min-w-[180px]">
          {student.quotaDisplayName ? (
            <p>
              Quota :{" "}
              <span className="text-blue-600">{student.quotaDisplayName}</span>
            </p>
          ) : null}
          {student.studentStatusDisplayName ? (
            <p>
              Student Status :{" "}
              <span className={studentStatusClass(student.studentStatusCode)}>
                {student.studentStatusDisplayName}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function normalizeStudentProfile(row: AnyRow): StudentExamProfile {
  return {
    studentId: num(row, ["studentId", "studentDetailId", "id"]),
    firstName: txt(row, ["firstName", "studentName", "name"]),
    rollNumber: txt(row, ["rollNumber", "rollNo"]),
    hallticketNumber: txt(row, [
      "hallticketNumber",
      "hallTicketNumber",
      "rollNumber",
    ]),
    studentPhotoPath: txt(row, ["studentPhotoPath"]),
    collegeCode: txt(row, ["collegeCode"]),
    academicYear: txt(row, ["academicYear", "academicYearName"]),
    courseCode: txt(row, ["courseCode"]),
    courseName: txt(row, ["courseName"]),
    groupCode: txt(row, ["groupCode", "courseGroupCode"]),
    groupName: txt(row, ["groupName"]),
    courseYearName: txt(row, ["courseYearName", "fromCourseYearName"]),
    section: txt(row, ["section", "sectionName"]),
    mobile: txt(row, ["mobile", "mobileNumber"]),
    quotaDisplayName: txt(row, ["quotaDisplayName", "quotaName"]),
    studentStatusCode: txt(row, ["studentStatusCode"]),
    studentStatusDisplayName: txt(row, [
      "studentStatusDisplayName",
      "studentStatusName",
    ]),
    isLateral: Boolean(row.isLateral),
    collegeId: num(row, ["collegeId"]),
    courseId: num(row, ["courseId"]),
    courseGroupId: num(row, ["courseGroupId"]),
    courseYearId: num(row, ["courseYearId"]),
    regulationId: num(row, ["regulationId"]),
    academicYearId: num(row, ["academicYearId"]),
  };
}

function examOptionLabel(exam: AnyRow): string {
  const name = txt(exam, ["examName", "name"]);
  const from = fmtDate(examFromDate(exam));
  const to = fmtDate(examToDate(exam));
  const range = from !== "-" && to !== "-" ? ` (${from} - ${to})` : "";
  const tags = [
    exam.isInternalExam ? "(Internal)" : "",
    exam.isRegularExam ? "(Regular)" : "",
    exam.isSupplyExam ? "(Supple)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${name}${range}${tags ? ` ${tags}` : ""}`.trim();
}

function dedupeCourseYears(rows: AnyRow[]): AnyRow[] {
  const map = new Map<number, AnyRow>();
  for (const row of rows) {
    const id = num(row, ["fromCourseYearId", "courseYearId"]);
    if (id > 0) map.set(id, row);
  }
  return [...map.values()];
}

function StudentExamFeeCollectionContent({
  variant,
}: {
  variant: StudentExamFeeVariant;
}) {
  const isRevaluation = variant === "revaluation";
  const pageTitle = isRevaluation
    ? "Re-Valuation Fee Registration"
    : "Exam Fee Collection";
  const subjectsHeading = isRevaluation
    ? "Select Re-Valuation Fee Subjects"
    : "Select Exam Fee Subjects";
  const receiptsHeading = isRevaluation
    ? "Re-Valuation Fee Receipts"
    : "Exam Fee Receipts";
  const redirectPath = isRevaluation
    ? "/examination-section/revaluation-fee-registration"
    : "/examination-section/exam-fee-registration";

  const { user, isLoading: sessionLoading } = useSessionContext();
  const router = useRouter();
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentExamProfile | null>(null);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examId, setExamId] = useState<string>("");
  const [examType, setExamType] = useState<1 | 2>(1);
  const [examDetails, setExamDetails] = useState<AnyRow[]>([]);
  const [academicBatches, setAcademicBatches] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [courseYearId, setCourseYearId] = useState<string>("");
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectAllSubjects, setSelectAllSubjects] = useState(true);
  const [feeStructure, setFeeStructure] = useState<AnyRow | null>(null);
  const [additionalFees, setAdditionalFees] = useState<AnyRow[]>([]);
  const [courseYearFee, setCourseYearFee] = useState<CourseYearFeeRow[]>([]);
  const [feeReceipts, setFeeReceipts] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [viewSubjOpen, setViewSubjOpen] = useState(false);
  const [viewSubjRows, setViewSubjRows] = useState<SubjectListRow[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnyRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const selectedSubjects = useMemo(
    () => subjects.filter((s) => s.checked),
    [subjects],
  );

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => {
      const name = txt(s, [
        "shortName",
        "subjectName",
        "subjectCode",
      ]).toLowerCase();
      const code = txt(s, ["subjectCode"]).toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [subjects, subjectSearch]);

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((exam) => ({
        value: String(num(exam, ["examId", "id"])),
        label: examOptionLabel(exam),
      })),
    [exams],
  );

  const courseYearOptions = useMemo<SelectOption[]>(
    () =>
      courseYears.map((cy) => ({
        value: String(num(cy, ["fromCourseYearId", "courseYearId"])),
        label:
          txt(cy, ["fromCourseYearName", "courseYearName", "courseYearCode"]) ||
          "Course Year",
      })),
    [courseYears],
  );

  const totalReceiptAmt = useMemo(
    () =>
      courseYearFee.reduce(
        (sum, row) =>
          sum + row.examFeeAmount + row.examFineAmount + row.examAddFee,
        0,
      ),
    [courseYearFee],
  );

  const selectedExam = useMemo(
    () =>
      exams.find((e) => num(e, ["examId", "id"]) === Number(examId)) ?? null,
    [exams, examId],
  );

  const loadStudent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let row: AnyRow | null = null;
      if (user.studentId) {
        row = await fetchStudentDetail(user.studentId);
      }
      if (!row && user.userName.trim().length > 4) {
        const matches = await searchStudentsByKeyword(user.userName.trim());
        row = matches[0] ?? null;
      }
      if (!mountedRef.current) return;
      if (!row) {
        toastInfo("Could not load your student profile.");
        return;
      }
      const profile = normalizeStudentProfile(row);
      setStudent(profile);
      const courseId = profile.courseId ?? 0;
      const collegeId = profile.collegeId ?? 0;
      if (courseId > 0) {
        const examRows = isRevaluation
          ? await listStudentPortalRevaluationExams(collegeId, courseId)
          : await listStudentPortalExams(courseId);
        if (!mountedRef.current) return;
        setExams(examRows);
      }
      const batches = await getStudentAcademicBatches(profile.studentId ?? 0);
      if (!mountedRef.current) return;
      setAcademicBatches(dedupeCourseYears(batches));

      const feeTypes = await listExamFeeTypes().catch(() => []);
      if (!mountedRef.current) return;
      setExamFeeTypes(feeTypes);
    } catch (e) {
      if (mountedRef.current) toastError(e, "Failed to load student details");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, isRevaluation]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionLoading && user) void loadStudent();
  }, [sessionLoading, user, loadStudent]);

  const resolveCourseYearsForExam = useCallback(
    (
      details: AnyRow[],
      type: 1 | 2,
      batches: AnyRow[],
      currentStudent: StudentExamProfile,
      matchExamDetails: boolean,
    ) => {
      const code = type === 1 ? "Regular" : "Supple";
      const filteredDetails = details.filter(
        (d) =>
          txt(d, ["examTypeCatCode", "examTypeCode"]).toLowerCase() ===
          code.toLowerCase(),
      );
      let years: AnyRow[] = [];
      if (type === 1) {
        const current = batches.find(
          (b) =>
            num(b, ["fromCourseYearId", "courseYearId"]) ===
            (currentStudent.courseYearId ?? 0),
        );
        if (current) years = [current];
      } else {
        years = batches.filter(
          (b) =>
            num(b, ["fromCourseYearId", "courseYearId"]) !==
            (currentStudent.courseYearId ?? 0),
        );
      }
      if (matchExamDetails) {
        years = years.filter((cy) =>
          filteredDetails.some(
            (ed) =>
              num(ed, ["courseYearId"]) ===
              num(cy, ["fromCourseYearId", "courseYearId"]),
          ),
        );
      }
      setCourseYears(years.filter(Boolean));
      if (years.length > 0) {
        const firstId = String(
          num(years[0], ["fromCourseYearId", "courseYearId"]),
        );
        setCourseYearId(firstId);
      } else {
        setCourseYearId("");
        if (matchExamDetails) {
          toastInfo(
            type === 1
              ? "No regular course years in exam details."
              : "No supplementary course years found.",
          );
        }
      }
    },
    [],
  );

  const loadExamContext = useCallback(
    async (selectedExamId: number) => {
      if (!student || !selectedExamId) return;
      setLoading(true);
      try {
        const [details, receipts, batches] = await Promise.all([
          isRevaluation
            ? Promise.resolve([] as AnyRow[])
            : getExamMasterDetailsByGroup({
                examId: selectedExamId,
                courseGroupId: student.courseGroupId ?? 0,
                regulationId: student.regulationId ?? 0,
              }),
          listExamFeeReceipts({
            studentId: student.studentId ?? 0,
            examId: selectedExamId,
          }),
          getStudentAcademicBatches(student.studentId ?? 0),
        ]);
        if (!mountedRef.current) return;
        setExamDetails(details);
        setFeeReceipts(receipts);
        const deduped = dedupeCourseYears(batches);
        setAcademicBatches(deduped);
      } catch (e) {
        if (mountedRef.current) toastError(e, "Failed to load exam details");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [student, isRevaluation],
  );

  useEffect(() => {
    const id = Number(examId);
    if (id > 0 && student) void loadExamContext(id);
  }, [examId, student, loadExamContext]);

  useEffect(() => {
    if (examId) return;
    setExamDetails([]);
    setCourseYears([]);
    setCourseYearId("");
    setSubjects([]);
    setCourseYearFee([]);
    setFeeStructure(null);
    setAdditionalFees([]);
    setFeeReceipts([]);
  }, [examId]);

  useEffect(() => {
    if (!student || !examId) return;
    if (!isRevaluation && !examDetails.length) return;
    resolveCourseYearsForExam(
      examDetails,
      examType,
      academicBatches,
      student,
      !isRevaluation,
    );
    setSubjects([]);
    setCourseYearFee([]);
    setFeeStructure(null);
    setAdditionalFees([]);
  }, [
    examId,
    examType,
    examDetails,
    academicBatches,
    student,
    isRevaluation,
    resolveCourseYearsForExam,
  ]);

  const loadSubjectsAndFee = useCallback(
    async (cyId: number) => {
      if (!student || !cyId || !examId) return;
      setLoading(true);
      try {
        const structure = await getStudentExamFeeStructure({
          collegeId: student.collegeId ?? 0,
          examId: Number(examId),
          courseGroupId: student.courseGroupId ?? 0,
          courseYearId: cyId,
        });
        if (!mountedRef.current) return;
        setFeeStructure(structure);
        const allAdditional =
          structure?.examFeeAdditionalStructureDTOs ??
          structure?.examFeeAdditionalStructures ??
          [];
        const examTypeCode = examType === 1 ? "Regular" : "Supple";
        const filteredAdditional = (
          Array.isArray(allAdditional) ? allAdditional : []
        ).filter(
          (row: AnyRow) =>
            txt(row, [
              "examTypeCatDisplayCode",
              "examTypeCatCode",
            ]).toLowerCase() === examTypeCode.toLowerCase(),
        );
        setAdditionalFees(
          filteredAdditional.map((row: AnyRow) => ({
            ...row,
            examFeeStructureId: structure?.examFeeStructureId,
            isDisable: Number(row.fee ?? 0) > 0,
          })),
        );

        let rows: AnyRow[] = [];
        const isCurrentYear = cyId === (student.courseYearId ?? 0);
        if (examType === 1 && isCurrentYear) {
          rows = await getStudentSubjectsForRegularExam({
            collegeId: student.collegeId ?? 0,
            academicYearId: student.academicYearId ?? 0,
            studentId: student.studentId ?? 0,
            courseYearId: cyId,
            examId: Number(examId),
          });
        } else if (examType === 2) {
          rows = await getStudentSubjectsForSupplyExam({
            collegeId: student.collegeId ?? 0,
            courseYearId: cyId,
            studentId: student.studentId ?? 0,
            examId: Number(examId),
          });
        } else {
          const batch = courseYears.find(
            (cy) => num(cy, ["fromCourseYearId", "courseYearId"]) === cyId,
          );
          rows = await getExamCourseYearSubjects({
            collegeId: student.collegeId ?? 0,
            academicYearId:
              num(batch, ["academicYearId"]) || student.academicYearId || 0,
            courseYearId: cyId,
            courseGroupId: student.courseGroupId ?? 0,
          });
        }

        const normalized = rows.map((row) => ({
          ...row,
          shortName: txt(row, ["shortName", "subjectCode", "subjectName"]),
          subjectCode: txt(row, ["subjectCode"]),
          subjectName: txt(row, ["subjectName", "shortName"]),
          examType: examTypeCode,
          checked: true,
          courseYearId: cyId,
          courseYearName: txt(row, ["courseYearName", "fromCourseYearName"]),
        }));
        if (!mountedRef.current) return;
        setSubjects(normalized);
        setSelectAllSubjects(true);
      } catch (e) {
        if (mountedRef.current) {
          toastError(e, "Failed to load subjects");
          setSubjects([]);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [student, examId, examType, courseYears],
  );

  useEffect(() => {
    const cy = Number(courseYearId);
    if (cy > 0) void loadSubjectsAndFee(cy);
  }, [courseYearId, loadSubjectsAndFee]);

  const toggleSubject = (subjectId: number, checked: boolean) => {
    setSubjects((prev) =>
      prev.map((s) =>
        num(s, ["subjectId"]) === subjectId ? { ...s, checked } : s,
      ),
    );
  };

  const toggleAllSubjects = (checked: boolean) => {
    setSelectAllSubjects(checked);
    setSubjects((prev) => prev.map((s) => ({ ...s, checked })));
  };

  const computeExamFeeAmount = (
    selectedCount: number,
    cyId: number,
  ): number => {
    if (!feeStructure) return 0;
    const isCurrentYear = cyId === (student?.courseYearId ?? 0);
    if (!isCurrentYear) {
      if (selectedCount === 1) return Number(feeStructure.subject1Fee ?? 0);
      if (selectedCount === 2) return Number(feeStructure.subject2Fee ?? 0);
      if (selectedCount === 3) return Number(feeStructure.subject3Fee ?? 0);
      if (selectedCount === 4) return Number(feeStructure.subject4Fee ?? 0);
      if (selectedCount === 5)
        return Number(feeStructure.subject5Fee ?? feeStructure.supplyFee ?? 0);
      if (selectedCount === 6)
        return Number(feeStructure.subject6Fee ?? feeStructure.supplyFee ?? 0);
      if (selectedCount === 7)
        return Number(feeStructure.subject7Fee ?? feeStructure.supplyFee ?? 0);
      if (selectedCount > 7) return Number(feeStructure.supplyFee ?? 0);
    }
    return Number(feeStructure.regFee ?? 0);
  };

  const handleCheckFee = () => {
    if (!student || !feeStructure || selectedSubjects.length === 0) {
      toastInfo("Select at least one subject.");
      return;
    }
    const cyId = Number(courseYearId);
    const addFeeTotal = additionalFees.reduce(
      (sum, row) => sum + Number(row.fee ?? 0),
      0,
    );
    const examFeeAmount = computeExamFeeAmount(selectedSubjects.length, cyId);
    const fineRow = fineCheck(feeStructure.examFeeFineDTOs);
    const isCurrentYear = cyId === (student.courseYearId ?? 0);
    const examFineAmount = fineRow
      ? Number(
          isCurrentYear
            ? (fineRow.regFeeFine ?? 0)
            : (fineRow.supplyFeeFine ?? 0),
        )
      : 0;
    const courseYearName =
      courseYearOptions.find((o) => o.value === courseYearId)?.label ??
      "Course Year";
    const typeLabel = examType === 1 ? "Regular" : "Supple";
    const firstSubject = selectedSubjects[0];
    const row: CourseYearFeeRow = {
      courseYearId: cyId,
      courseYearName,
      examType: typeLabel,
      examFeeAmount,
      examFineAmount,
      examAddFee: addFeeTotal,
      subjects: selectedSubjects,
      examFeeStructureId: feeStructure.examFeeStructureId,
      examAdditionalFeeReceiptDTOs: additionalFees,
      collegeCode: student.collegeCode ?? txt(firstSubject, ["collegeCode"]),
      courseName:
        txt(firstSubject, ["courseName", "courseCode"]) || student.courseCode,
      academicYear: txt(firstSubject, ["academicYear"]) || student.academicYear,
      examtypeCatId: resolveExamTypeCategoryId(examFeeTypes, typeLabel),
      examFeeFineId: fineRow
        ? Number(fineRow.examFeeFineId ?? fineRow.examfeefineId ?? 0) || null
        : null,
    };
    setCourseYearFee((prev) => {
      const without = prev.filter((p) => p.courseYearId !== cyId);
      return [...without, row];
    });
    toastSuccess("Fee calculated. Review the payment table below.");
  };

  const viewCourseYearSubjects = useCallback((row: CourseYearFeeRow) => {
    const subs: SubjectListRow[] = row.subjects.map((s) => ({
      subjectName: String(s.subjectName ?? s.shortName ?? ""),
      subjectCode: String(s.subjectCode ?? ""),
      subjectTypeCode: String(
        s.subjectTypeCode ?? s.subjectTypeName ?? s.subjecttypeName ?? "",
      ),
      credits: s.credits ?? s.subCredits ?? "",
      regulationName: String(s.regulationName ?? s.regulationCode ?? ""),
    }));
    setViewSubjRows(subs);
    setViewSubjOpen(true);
  }, []);

  const viewReceiptSubjects = useCallback((receipt: AnyRow) => {
    const details =
      receipt?.examStudentDTOs?.[0]?.examStudentDetailDTOs ??
      receipt?.examStudentDetails ??
      receipt?.subjects ??
      [];
    const rows = Array.isArray(details) ? details : [];
    const subs: SubjectListRow[] = rows.map((s: AnyRow) => ({
      subjectName: String(s.subjectName ?? s.shortName ?? ""),
      subjectCode: String(s.subjectCode ?? ""),
      subjectTypeCode: String(
        s.subjectTypeCode ??
          s.subjecttypeCode ??
          s.subjectTypeName ??
          s.subjecttypeName ??
          "",
      ),
      credits: s.credits ?? s.subCredits ?? "",
      regulationName: String(s.regulationName ?? s.regulationCode ?? ""),
    }));
    setViewSubjRows(subs);
    setViewSubjOpen(true);
  }, []);

  async function loadAllSubjects() {
    const cy = Number(courseYearId);
    if (!student || !cy) return;
    setLoading(true);
    try {
      const isCurrentYear = cy === (student.courseYearId ?? 0);
      const rows = isCurrentYear
        ? await getStudentSubjectsForRegularExam({
            collegeId: student.collegeId ?? 0,
            academicYearId: student.academicYearId ?? 0,
            studentId: student.studentId ?? 0,
            courseYearId: cy,
            examId: Number(examId),
          })
        : await getExamCourseYearSubjects({
            collegeId: student.collegeId ?? 0,
            academicYearId: student.academicYearId ?? 0,
            courseYearId: cy,
            courseGroupId: student.courseGroupId ?? 0,
          });
      const examTypeCode = examType === 1 ? "Regular" : "Supple";
      setSubjects(
        rows.map((row) => ({
          ...row,
          shortName: txt(row, ["shortName", "subjectCode", "subjectName"]),
          subjectCode: txt(row, ["subjectCode"]),
          subjectName: txt(row, ["subjectName", "shortName"]),
          examType: examTypeCode,
          checked: true,
          courseYearId: cy,
          courseYearName: txt(row, ["courseYearName", "fromCourseYearName"]),
        })),
      );
      setSelectAllSubjects(true);
    } catch (e) {
      toastError(e, "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppleSubjects() {
    const cy = Number(courseYearId);
    if (!student || !cy) return;
    setLoading(true);
    try {
      let rows = await getStudentSubjectsForSupplyExam({
        collegeId: student.collegeId ?? 0,
        courseYearId: cy,
        studentId: student.studentId ?? 0,
        examId: Number(examId),
      });
      if (rows.length === 0) {
        rows = await listExamStdCourseYearSubjects({
          collegeId: student.collegeId ?? 0,
          courseYearId: cy,
          studentId: student.studentId ?? 0,
        });
      }
      setSubjects(
        rows.map((row) => ({
          ...row,
          shortName: txt(row, ["shortName", "subjectCode", "subjectName"]),
          subjectCode: txt(row, ["subjectCode"]),
          subjectName: txt(row, ["subjectName", "shortName"]),
          examType: "Supple",
          checked: true,
          courseYearId: cy,
          courseYearName: txt(row, ["courseYearName", "fromCourseYearName"]),
        })),
      );
      setSelectAllSubjects(true);
    } catch (e) {
      toastError(e, "Failed to load supplementary subjects");
    } finally {
      setLoading(false);
    }
  }

  function printReceipt(receipt: AnyRow) {
    const receiptId = num(receipt, ["examFeeReceiptId"]);
    if (isRevaluation) {
      if (!receiptId) {
        toastError("Receipt id missing.");
        return;
      }
      void downloadStudentExamFeeReceiptPdf(receiptId)
        .then(printPdfBlob)
        .catch((e) => toastError(e, "Failed to print receipt"));
      return;
    }
    saveExamFeePrintPayload({
      ...receipt,
      stdName: receipt.studentName ?? student?.firstName,
      stdRollNumber:
        receipt.rollno ?? student?.hallticketNumber ?? student?.rollNumber,
      groupCode: receipt.courseGroupName ?? student?.groupCode,
      courseCode: student?.courseCode,
    });
    setExamFeePrintReturnHref(redirectPath);
    router.push("/examination-section/exam-fee-registration/exam-fee-receipt");
  }

  function openDeleteReceipt(receipt: AnyRow) {
    setDeleteTarget(receipt);
    setDeleteReason("");
    setDeleteOpen(true);
  }

  async function confirmDeleteReceipt() {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      toastInfo("Reason is required.");
      return;
    }
    const receiptId = num(deleteTarget, ["examFeeReceiptId"]);
    if (!receiptId) {
      toastError("Receipt id missing.");
      return;
    }
    setDeleting(true);
    try {
      await deleteExamFeeReceipt(receiptId);
      toastSuccess("Receipt deleted.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (student && examId) {
        const receipts = await listExamFeeReceipts({
          studentId: student.studentId ?? 0,
          examId: Number(examId),
        });
        if (mountedRef.current) setFeeReceipts(receipts);
      }
    } catch (e) {
      toastError(e, "Failed to delete receipt");
    } finally {
      setDeleting(false);
    }
  }

  function buildRevaluationReceipts(
    paymentModeCatId: number,
    receiptDate: string,
  ): AnyRow[] {
    if (!student || !selectedExam) return [];
    const examMasterId = num(selectedExam, ["examId", "id"]);
    return courseYearFee.map((row) => {
      const addTFee = (row.examAdditionalFeeReceiptDTOs ?? []).filter(
        (f) => Number(f.fee ?? 0) > 0,
      );
      const addFeeAmt = addTFee.reduce((s, f) => s + Number(f.fee ?? 0), 0);
      return {
        chequeNo: null,
        ddno: null,
        examFeeAmount: row.examFeeAmount,
        examFineAmount: row.examFineAmount,
        examAddtFee: addFeeAmt,
        examTotalAmount: row.examFeeAmount + row.examFineAmount + addFeeAmt,
        collegeCode: row.collegeCode,
        examName: txt(selectedExam, ["examName", "name"]),
        courseName: row.courseName,
        courseYearName: row.courseYearName,
        examType: row.examType,
        examFromDate: examFromDate(selectedExam),
        examToDate: examToDate(selectedExam),
        courseGroupName: student.groupCode,
        academicYear: row.academicYear,
        studentName: student.firstName,
        rollno: student.rollNumber ?? student.hallticketNumber,
        feeComments: null,
        employeeId: null,
        collegeId: student.collegeId,
        courseYearId: row.courseYearId,
        examFeeFineId: row.examFeeFineId,
        examFeeStructureId: row.examFeeStructureId,
        examId: examMasterId,
        examtypeCatId: row.examtypeCatId,
        paymentModeCatId,
        studentId: student.studentId,
        isActive: true,
        otherPaymentNumber: null,
        receiptDate,
        referenceNumber: null,
        transactionNo: null,
        examAdditionalFeeReceiptDTOs: addTFee.map((f) => ({
          ...f,
          collegeId: student.collegeId,
          addtFeeAmount: f.fee,
          isActive: true,
          addtExamFeeTypeCatId: f.adtExamfeetypeCatId,
          collectedEmpId: null,
          addtReceiptDate: receiptDate,
        })),
        examStudentDTOs: [
          {
            feeComments: null,
            collegeId: student.collegeId,
            courseYearId: row.courseYearId,
            examFeeAmount: row.examFeeAmount,
            examtypeCatId: row.examtypeCatId,
            regulationId: student.regulationId,
            studentId: student.studentId,
            isActive: true,
            isFeePaid: true,
            registrationDate: receiptDate,
            examId: examMasterId,
            examStudentDetailDTOs: row.subjects,
          },
        ],
      };
    });
  }

  async function payRevaluationWithRazorpay(receipts: AnyRow[]) {
    const amount = Number(receipts[0]?.examTotalAmount ?? 0);
    if (!student || amount <= 0) {
      toastError("Invalid payment amount.");
      return;
    }
    await loadRazorpayCheckoutScript();
    const amountPaise = `${amount}00`;
    const order = await createRazorpayOrder(
      student.studentId ?? 0,
      amountPaise,
    );
    const RazorpayCtor = (
      window as Window & {
        Razorpay?: new (opts: AnyRow) => { open: () => void };
      }
    ).Razorpay;
    if (!RazorpayCtor) {
      throw new Error("Razorpay checkout is not available.");
    }
    await new Promise<void>((resolve, reject) => {
      const options: AnyRow = {
        key: decodeRazorValue(order.apiKey),
        amount: amount,
        currency: "INR",
        name: "Genesis",
        description: "Exam Fee Collection",
        order_id: decodeRazorValue(order.orderId),
        modal: { escape: false },
        theme: { color: "#0c238a" },
        handler: async (response: AnyRow) => {
          try {
            const charged = await chargeRazorpayPayment({
              paymentId: String(response.razorpay_payment_id ?? ""),
              signature: String(response.razorpay_signature ?? ""),
              orderId: String(response.razorpay_order_id ?? ""),
            });
            const verify =
              charged?.signVerify ?? charged?.data?.signVerify ?? "";
            if (String(verify) !== "Success") {
              reject(new Error("Payment Failed"));
              return;
            }
            const txn =
              charged?.paymentTransaction ??
              charged?.data?.paymentTransaction ??
              {};
            receipts[0].transactionNo =
              txn.bankRefNo ?? txn.bank_ref_no ?? null;
            await payExamFeeReceipts(receipts);
            toastSuccess("Exam fee paid.");
            setPayDialogOpen(false);
            setCourseYearFee([]);
            if (student && examId) {
              const next = await listExamFeeReceipts({
                studentId: student.studentId ?? 0,
                examId: Number(examId),
              });
              if (mountedRef.current) setFeeReceipts(next);
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      };
      options.modal.ondismiss = () => {
        reject(new Error("Transaction cancelled."));
      };
      const rzp = new RazorpayCtor(options);
      rzp.open();
    });
  }

  const subjectListColumnDefs = useMemo<ColDef<SubjectListRow>[]>(
    () => [
      SUBJECT_LIST_COL_DEFS.siNo,
      {
        ...SUBJECT_LIST_COL_DEFS.subjectName,
        cellRenderer: subjectNameRenderer,
      },
      SUBJECT_LIST_COL_DEFS.subjectType,
      SUBJECT_LIST_COL_DEFS.credits,
      SUBJECT_LIST_COL_DEFS.regulation,
    ],
    [],
  );

  /** Angular payExamFees() — open StdExamFeePayDialog with examFeeReceipt rows. */
  function payExamFees() {
    if (courseYearFee.length === 0) return;
    if (!student || !selectedExam) {
      toastError("Student or exam details are missing.");
      return;
    }
    setPayDialogOpen(true);
  }

  /**
   * Angular saveExamFeeDetails() on dialog PAY:
   * 1) POST stgOnlineExamFeeReceipts
   * 2) POST paymentGateway/initiatePayment (encrypted FormData) → PhiCommerce
   */
  async function confirmPay() {
    if (!student || !selectedExam || courseYearFee.length === 0) return;

    setPaying(true);
    try {
      const examMasterId = num(selectedExam, ["examId", "id"]);
      setSecuredValue("paymentRedirectUrl", redirectPath);
      setSecuredValue("payFeeDueDetails", { examId: examMasterId });

      const paymentModes = await listPaymentModes();
      const paymentModeCatId = resolveOnlinePaymentModeId(paymentModes) ?? 132;

      if (isRevaluation) {
        const receipts = buildRevaluationReceipts(
          paymentModeCatId,
          utcMidnightIso(new Date()),
        );
        await payRevaluationWithRazorpay(receipts);
        return;
      }

      // Angular overwrites examFeePayload in the loop — last course-year wins.
      const row = courseYearFee[courseYearFee.length - 1];
      const receiptDate = utcMidnightIso(new Date());
      const payload = buildStudentExamFeeStagingPayload({
        student: {
          collegeId: student.collegeId,
          studentId: student.studentId,
          firstName: student.firstName,
          rollNumber: student.rollNumber ?? student.hallticketNumber,
          hallticketNumber: student.hallticketNumber,
          groupCode: student.groupCode,
          regulationId: student.regulationId,
        },
        exam: {
          examId: examMasterId,
          examName: txt(selectedExam, ["examName", "name"]),
          fromDate: examFromDate(selectedExam),
          toDate: examToDate(selectedExam),
        },
        row,
        paymentModeCatId,
        receiptDate,
      });

      const result = await saveStgOnlineExamFeeReceipt(payload);
      if (!result.success || !result.data) {
        toastError(result.message || "Failed to save exam fee details.");
        return;
      }

      let collegeId = Number(result.data.collegeId ?? student.collegeId ?? 0);
      let feeType = "EXAMFEE";
      if (String(student.courseCode ?? "").toUpperCase() === "PHD") {
        collegeId = 0;
        feeType = "PHD";
      }

      const orderId = result.data.orderId;
      if (orderId == null || orderId === "") {
        toastError("Order id missing from fee receipt response.");
        return;
      }

      setPayDialogOpen(false);
      await initiatePayment(
        Number(payload.examTotalAmount),
        orderId,
        collegeId,
        feeType,
      );
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Payment initiation failed.",
      );
    } finally {
      setPaying(false);
    }
  }

  if (sessionLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="student-exam-fee-page">
        <div className="student-exam-fee-page__header">
          <Banknote className="student-exam-fee-page__header-icon h-5 w-5" />
          <span className="student-exam-fee-page__header-text">
            {pageTitle}
          </span>
        </div>

        <div className="mx-[15px] mt-2.5 px-2 py-2">
          <div className="max-w-[60%]">
            <Select
              label="Exam"
              value={examId || null}
              onChange={(v) => setExamId(v ?? "")}
              options={examOptions}
              placeholder="Exam"
              searchable
              disabled={loading || exams.length === 0}
            />
          </div>
        </div>

        {examId && student ? (
          <StudentExamFeeProfileBanner student={student} />
        ) : null}

        {examId && student ? (
          <div className="yar-bordr">
            <h2>{subjectsHeading}</h2>
            <div className="radio-btn bg-white px-5 py-2.5">
              <label className="mr-8 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="examType"
                  checked={examType === 1}
                  onChange={() => setExamType(1)}
                />
                Regular
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="examType"
                  checked={examType === 2}
                  onChange={() => setExamType(2)}
                />
                Supplementary
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {courseYears.length > 0 ? (
                <div className="bordr w-full bg-white p-2 md:w-[20%]">
                  <Select
                    label="Course Year"
                    value={courseYearId || null}
                    onChange={(v) => setCourseYearId(v ?? "")}
                    options={courseYearOptions}
                    placeholder="Course Year"
                    disabled={loading || courseYearOptions.length === 0}
                  />
                  {courseYearId && examType === 2 ? (
                    <div className="mt-2 flex gap-4">
                      <span
                        className="txt-all"
                        onClick={() => void loadAllSubjects()}
                      >
                        All
                      </span>
                      <span
                        className="txt-all"
                        onClick={() => void loadSuppleSubjects()}
                      >
                        Supple
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {subjects.length > 0 ? (
                <div className="bordr first-table w-full bg-white md:w-[25%]">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="search-box flex-1">
                      <input
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        placeholder="Search..."
                      />
                    </div>
                    <span className="whitespace-nowrap text-sm font-medium text-blue-600">
                      Subjects: {selectedSubjects.length}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="w-[15%]">
                          <Checkbox
                            checked={selectAllSubjects}
                            onCheckedChange={(v) =>
                              toggleAllSubjects(Boolean(v))
                            }
                          />{" "}
                          All
                        </th>
                        <th>Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((sub) => {
                        const id = num(sub, ["subjectId"]);
                        return (
                          <tr key={id}>
                            <td>
                              <Checkbox
                                checked={Boolean(sub.checked)}
                                onCheckedChange={(v) =>
                                  toggleSubject(id, Boolean(v))
                                }
                              />
                            </td>
                            <td>
                              {sub.shortName}
                              {sub.subjectCode ? (
                                <span>
                                  {" "}
                                  -{" "}
                                  <span className="text-blue-600">
                                    {sub.subjectCode}
                                  </span>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {selectedSubjects.length > 0 ? (
                <div className="bordr first-table first-table-sub w-full md:w-[20%]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-blue-600">
                          Selected Subjects : {selectedSubjects.length}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubjects.map((sub) => (
                        <tr key={num(sub, ["subjectId"])}>
                          <td>
                            {sub.shortName}
                            {sub.subjectCode ? (
                              <span>
                                {" "}
                                -{" "}
                                <span className="text-blue-600">
                                  {sub.subjectCode}
                                </span>
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {additionalFees.length > 0 ? (
                <div className="bordr first-table first-table-sub w-full md:w-[22%]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th>Additional Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalFees.map((fee, idx) => (
                        <tr key={idx}>
                          <td>
                            {txt(fee, [
                              "adtExamfeetypeCatDisplayName",
                              "addtExamFeeTypeName",
                            ])}
                            <input
                              className="ex-amt"
                              type="number"
                              value={String(fee.fee ?? 0)}
                              disabled={Boolean(fee.isDisable)}
                              onChange={(e) => {
                                const next = Number(e.target.value);
                                setAdditionalFees((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, fee: next } : row,
                                  ),
                                );
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {subjects.length > 0 ? (
                <div className="relative w-full p-2 md:w-[10%]">
                  <button
                    type="button"
                    className="add-btn-gold absolute bottom-[-4px]"
                    onClick={handleCheckFee}
                    disabled={loading}
                  >
                    Check Fee
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {courseYearFee.length > 0 ? (
          <>
            <div className="yar-bordr-list">
              <h2>Exam Fee Payment</h2>
              <div className="table-bac">
                <table className="fee">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>SI No</th>
                      <th style={{ width: "35%" }}>Course Year</th>
                      <th className="text-right" style={{ width: "10%" }}>
                        Exam Type
                      </th>
                      <th className="text-right" style={{ width: "10%" }}>
                        No of Subjects
                      </th>
                      <th className="text-right" style={{ width: "10%" }}>
                        LateFee
                      </th>
                      <th className="text-right" style={{ width: "10%" }}>
                        Add. Fee Amt(₹)
                      </th>
                      <th className="text-right" style={{ width: "10%" }}>
                        Fee Amt (₹)
                      </th>
                      <th className="text-right" style={{ width: "10%" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseYearFee.map((row, i) => (
                      <tr key={row.courseYearId}>
                        <td>{i + 1}</td>
                        <td>{row.courseYearName}</td>
                        <td className="text-right">{row.examType}</td>
                        <td className="text-right">{row.subjects.length}</td>
                        <td className="text-right">{row.examFineAmount}</td>
                        <td className="text-right">{row.examAddFee}</td>
                        <td className="text-right">{row.examFeeAmount}</td>
                        <td className="text-center">
                          <button
                            type="button"
                            title="View Subjects"
                            onClick={() => viewCourseYearSubjects(row)}
                          >
                            <Eye className="inline h-4 w-4 text-[#9E9E9E]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-transparent">
                      <td />
                      <td
                        colSpan={7}
                        className="text-[15px] font-bold text-blue-600"
                      >
                        Summary
                      </td>
                    </tr>
                    <tr>
                      <td />
                      <td colSpan={6} className="font-bold">
                        Total Fees
                      </td>
                      <td className="text-right font-bold">
                        {totalReceiptAmt}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pay-strip">
              <button
                type="button"
                className="add-btn-gold"
                onClick={payExamFees}
                disabled={loading}
              >
                Pay fees
              </button>
            </div>
          </>
        ) : null}

        {feeReceipts.length > 0 ? (
          <div className="receipts-block">
            <h2>{receiptsHeading}</h2>
            <div className="table-bac">
              <table className="fee">
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>SI No.</th>
                    <th>Course Year</th>
                    <th>Receipt No.</th>
                    <th>Payment Date</th>
                    <th>Payment Mode</th>
                    {isRevaluation ? null : <th>Exam Type</th>}
                    <th className="text-right">Exam Fee (₹)</th>
                    <th className="text-right">Add. Fee (₹)</th>
                    <th className="text-right">LateFee(₹)</th>
                    <th className="text-right">Amount (₹)</th>
                    <th>Subjects</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeReceipts.map((receipt, i) => (
                    <tr key={num(receipt, ["examFeeReceiptId"]) || i}>
                      <td>{i + 1}</td>
                      <td>{txt(receipt, ["courseYearName"])}</td>
                      <td>{txt(receipt, ["feeReceiptNo"])}</td>
                      <td>{fmtDate(receipt.receiptDate)}</td>
                      <td>{txt(receipt, ["paymentModeCatDisplayName"])}</td>
                      {isRevaluation ? null : (
                        <td>{txt(receipt, ["examtypeCatDisplayName"])}</td>
                      )}
                      <td className="text-right">
                        {receipt.examFeeAmount != null
                          ? String(receipt.examFeeAmount)
                          : "-"}
                      </td>
                      <td className="text-right">
                        {receipt.examAddtFee != null
                          ? String(receipt.examAddtFee)
                          : "-"}
                      </td>
                      <td className="text-right">
                        {receipt.examFineAmount != null
                          ? String(receipt.examFineAmount)
                          : "-"}
                      </td>
                      <td className="text-right">
                        {receipt.examTotalAmount ?? ""}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="subj-btn-gold"
                          onClick={() => viewReceiptSubjects(receipt)}
                        >
                          Subjects
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          title="Print Receipt"
                          className="mr-2"
                          onClick={() => printReceipt(receipt)}
                        >
                          <Printer className="inline h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Exam Subject"
                          onClick={() => openDeleteReceipt(receipt)}
                        >
                          <Trash2 className="inline h-5 w-5 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="student-exam-fee-pay-dialog max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            <DialogTitle className="text-base font-semibold">
              Exam Fee Payment
            </DialogTitle>
          </div>

          <div className="space-y-4 p-4">
            {student && selectedExam ? (
              <div className="space-y-1 rounded border border-[#dedede] p-3 text-sm">
                <p className="details-off">
                  Student :{" "}
                  <span className="colr">
                    {student.firstName} (
                    {student.hallticketNumber ?? student.rollNumber})
                  </span>
                </p>
                <p className="details-off">
                  College :{" "}
                  <span className="colr">
                    {student.collegeCode}
                    {student.academicYear ? ` / (${student.academicYear})` : ""}
                  </span>
                </p>
                <p className="details-off">
                  Course :{" "}
                  <span className="colr">
                    {student.courseName ?? student.courseCode} / (
                    {student.groupCode})
                  </span>
                </p>
                <p className="details-off">
                  Exam :{" "}
                  <span className="colr">
                    {txt(selectedExam, ["examName", "name"])} (
                    {fmtDate(examFromDate(selectedExam))} -{" "}
                    {fmtDate(examToDate(selectedExam))})
                  </span>
                </p>
              </div>
            ) : null}

            <table>
              <thead>
                <tr>
                  <th>SI.No.</th>
                  <th>Course Year</th>
                  <th>Subjects</th>
                  <th>Exam Type</th>
                  <th className="text-right">Fee Amount</th>
                  <th className="text-right">Fine Amount</th>
                  <th className="text-right">Additional Amount</th>
                </tr>
              </thead>
              <tbody>
                {courseYearFee.map((row, i) => (
                  <tr key={row.courseYearId}>
                    <td>{i + 1}</td>
                    <td>{row.courseYearName}</td>
                    <td>{row.subjects.length}</td>
                    <td>{row.examType}</td>
                    <td className="text-right">{row.examFeeAmount}</td>
                    <td className="text-right">{row.examFineAmount}</td>
                    <td className="text-right">{row.examAddFee}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="text-right font-medium">
                    Total Amount
                  </td>
                  <td className="text-right font-medium">{totalReceiptAmt}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <DialogFooter className="border-t px-4 py-3">
            <Button
              variant="outline"
              disabled={paying}
              onClick={() => setPayDialogOpen(false)}
            >
              Close
            </Button>
            <button
              type="button"
              className="add-btn-gold"
              disabled={paying}
              onClick={() => void confirmPay()}
            >
              {paying ? "Processing…" : "Pay"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewSubjOpen} onOpenChange={setViewSubjOpen}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Subjects List</DialogTitle>
          </DialogHeader>
          <div className="p-5">
            <DataTable
              bordered
              rowData={viewSubjRows}
              columnDefs={subjectListColumnDefs}
              pagination
              paginationPageSize={10}
              height="auto"
              getRowId={(p) =>
                `${p.data.subjectCode}-${p.data.subjectName}-${p.data.subjectTypeCode}`
              }
              toolbar={{
                search: true,
                searchPlaceholder: "Subject Name / Code",
                columnFilters: true,
                exportExcel: true,
                pdfDocumentTitle: "Subjects List",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="student-exam-fee-pay-dialog max-w-xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Delete Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 p-5 text-sm">
            {deleteTarget ? (
              <>
                <p className="details-off">
                  College :{" "}
                  <span className="colr">
                    {txt(deleteTarget, ["collegeCode"])}
                  </span>
                </p>
                <p className="details-off">
                  Course Year :{" "}
                  <span className="colr">
                    {txt(deleteTarget, ["courseYearName"])}
                  </span>
                </p>
                <p className="details-off">
                  Exam :{" "}
                  <span className="colr">
                    {txt(deleteTarget, ["examName"])}
                  </span>
                </p>
                <p className="details-off">
                  Receipt No. :{" "}
                  <span className="colr">
                    {txt(deleteTarget, ["feeReceiptNo"])}
                  </span>
                </p>
                <p className="details-off">
                  Receipt Amount :{" "}
                  <span className="colr">
                    {String(deleteTarget.examFeeAmount ?? "")}
                  </span>
                </p>
              </>
            ) : null}
            <label className="block pt-2">
              Reason
              <input
                className="mt-1 w-full rounded border border-[#c4c4c4] px-2 py-1.5"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                required
              />
            </label>
          </div>
          <DialogFooter className="border-t px-4 py-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Close
            </Button>
            <button
              type="button"
              className="add-btn-gold"
              disabled={deleting}
              onClick={() => void confirmDeleteReceipt()}
            >
              {deleting ? "Deleting…" : "Ok"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export function StudentExamFeeCollectionPage({
  variant = "exam-fee",
}: {
  variant?: StudentExamFeeVariant;
}) {
  return <StudentExamFeeCollectionContent variant={variant} />;
}
