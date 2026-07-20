"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, ClipboardList } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  utcMidnightIso,
} from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  buildStudentExamFeeStagingPayload,
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
  listPaymentModes,
  listStudentPortalExams,
  resolveExamTypeCategoryId,
  resolveOnlinePaymentModeId,
  saveStgOnlineExamFeeReceipt,
  searchStudentsByKeyword,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

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

const FEE_PAYMENT_COL_DEFS = {
  siNo: {
    headerName: "SI No",
    valueGetter: rowIndexGetter,
    width: 72,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<CourseYearFeeRow>,
  courseYearName: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<CourseYearFeeRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 100,
    flex: 0.8,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  subjectCount: {
    headerName: "No of Subjects",
    valueGetter: (p) => p.data?.subjects?.length ?? 0,
    minWidth: 120,
    flex: 0.8,
    cellClass: "ag-right-aligned-cell",
    filter: false,
  } as ColDef<CourseYearFeeRow>,
  examFineAmount: {
    field: "examFineAmount",
    headerName: "Late Fee",
    minWidth: 90,
    flex: 0.7,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  examAddFee: {
    field: "examAddFee",
    headerName: "Add. Fee Amt(₹)",
    minWidth: 120,
    flex: 0.9,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  examFeeAmount: {
    field: "examFeeAmount",
    headerName: "Fee Amt (₹)",
    minWidth: 110,
    flex: 0.9,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  actions: {
    headerName: "Action",
    colId: "actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    filter: false,
    sortable: false,
    cellClass: "ag-center-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
};

const PAY_DIALOG_COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 72,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<CourseYearFeeRow>,
  courseYearName: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 140,
    flex: 1.2,
  } as ColDef<CourseYearFeeRow>,
  subjectCount: {
    headerName: "Subjects",
    valueGetter: (p) => p.data?.subjects?.length ?? 0,
    minWidth: 90,
    flex: 0.7,
    cellClass: "ag-right-aligned-cell",
    filter: false,
  } as ColDef<CourseYearFeeRow>,
  examType: {
    field: "examType",
    headerName: "Exam Type",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<CourseYearFeeRow>,
  examFeeAmount: {
    field: "examFeeAmount",
    headerName: "Fee Amount",
    minWidth: 100,
    flex: 0.8,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  examFineAmount: {
    field: "examFineAmount",
    headerName: "Fine Amount",
    minWidth: 100,
    flex: 0.8,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
  examAddFee: {
    field: "examAddFee",
    headerName: "Additional Amount",
    minWidth: 120,
    flex: 0.9,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<CourseYearFeeRow>,
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

function makeViewSubjectsRenderer(onView: (row: CourseYearFeeRow) => void) {
  return (p: ICellRendererParams<CourseYearFeeRow>) => (
    <button
      type="button"
      className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground"
      title="View Subjects"
      onClick={() => p.data && onView(p.data)}
    >
      <Eye className="h-4 w-4" aria-hidden />
      <span className="sr-only">View subjects</span>
    </button>
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
  if (c.includes("INCOLLEGE")) return "text-emerald-700 font-semibold";
  if (c.includes("PASSEDOUT")) return "text-[#461eb6] font-semibold";
  if (c.includes("DETAIN")) return "text-orange-600 font-semibold";
  if (c.includes("DISCONTINUED") || c.includes("DTND"))
    return "text-red-600 font-semibold";
  return "text-slate-700 font-medium";
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
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt=""
            className="h-[110px] w-[88px] rounded border border-border object-cover object-top"
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
  const from = txt(exam, ["fromDate"]);
  const to = txt(exam, ["toDate"]);
  const range = from && to ? ` (${from} - ${to})` : "";
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

function StudentExamFeeCollectionContent() {
  const { user, isLoading: sessionLoading } = useSessionContext();
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
      if (courseId > 0) {
        const examRows = await listStudentPortalExams(courseId);
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
  }, [user]);

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
      years = years.filter((cy) =>
        filteredDetails.some(
          (ed) =>
            num(ed, ["courseYearId"]) ===
            num(cy, ["fromCourseYearId", "courseYearId"]),
        ),
      );
      setCourseYears(years);
      if (years.length > 0) {
        const firstId = String(
          num(years[0], ["fromCourseYearId", "courseYearId"]),
        );
        setCourseYearId(firstId);
      } else {
        setCourseYearId("");
        toastInfo(
          type === 1
            ? "No regular course years in exam details."
            : "No supplementary course years found.",
        );
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
          getExamMasterDetailsByGroup({
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
    [student],
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
    if (!student || !examDetails.length) return;
    resolveCourseYearsForExam(examDetails, examType, academicBatches, student);
    setSubjects([]);
    setCourseYearFee([]);
    setFeeStructure(null);
    setAdditionalFees([]);
  }, [
    examType,
    examDetails,
    academicBatches,
    student,
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
      examFineAmount: 0,
      examAddFee: addFeeTotal,
      subjects: selectedSubjects,
      examFeeStructureId: feeStructure.examFeeStructureId,
      examAdditionalFeeReceiptDTOs: additionalFees,
      collegeCode: student.collegeCode ?? txt(firstSubject, ["collegeCode"]),
      courseName:
        txt(firstSubject, ["courseName", "courseCode"]) || student.courseCode,
      academicYear: txt(firstSubject, ["academicYear"]) || student.academicYear,
      examtypeCatId: resolveExamTypeCategoryId(examFeeTypes, typeLabel),
      examFeeFineId: null,
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

  const feePaymentColumnDefs = useMemo<ColDef<CourseYearFeeRow>[]>(
    () => [
      FEE_PAYMENT_COL_DEFS.siNo,
      FEE_PAYMENT_COL_DEFS.courseYearName,
      FEE_PAYMENT_COL_DEFS.examType,
      FEE_PAYMENT_COL_DEFS.subjectCount,
      FEE_PAYMENT_COL_DEFS.examFineAmount,
      FEE_PAYMENT_COL_DEFS.examAddFee,
      FEE_PAYMENT_COL_DEFS.examFeeAmount,
      {
        ...FEE_PAYMENT_COL_DEFS.actions,
        cellRenderer: makeViewSubjectsRenderer(viewCourseYearSubjects),
      },
    ],
    [viewCourseYearSubjects],
  );

  const payDialogColumnDefs = useMemo<ColDef<CourseYearFeeRow>[]>(
    () => [
      PAY_DIALOG_COL_DEFS.siNo,
      PAY_DIALOG_COL_DEFS.courseYearName,
      PAY_DIALOG_COL_DEFS.subjectCount,
      PAY_DIALOG_COL_DEFS.examType,
      PAY_DIALOG_COL_DEFS.examFeeAmount,
      PAY_DIALOG_COL_DEFS.examFineAmount,
      PAY_DIALOG_COL_DEFS.examAddFee,
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
      setSecuredValue(
        "paymentRedirectUrl",
        "/examination-section/exam-fee-registration",
      );
      setSecuredValue("payFeeDueDetails", { examId: examMasterId });

      const paymentModes = await listPaymentModes();
      const paymentModeCatId =
        resolveOnlinePaymentModeId(paymentModes) ?? 132;

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
          fromDate: selectedExam.fromDate,
          toDate: selectedExam.toDate,
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
      <FilteredPage
        title="Exam Fee Registration"
        filtersCollapsible={false}
        filters={null}
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FilteredPage>
    );
  }

  return (
    <>
      <FilteredPage
        title="Exam Fee Registration"
        filters={
          <GlobalFilterBarRow columns={3}>
            <GlobalFilterField label="Exam">
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? "")}
                options={examOptions}
                placeholder="Select exam"
                searchable
                disabled={loading || exams.length === 0}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
        }
        body={
          examId && student ? (
            <StudentExamFeeProfileBanner student={student} />
          ) : null
        }
      >
        {examId && student ? (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <h2 className="text-sm font-semibold">Select Exam Fee Subjects</h2>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="examType"
                  checked={examType === 1}
                  onChange={() => setExamType(1)}
                />
                Regular
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="examType"
                  checked={examType === 2}
                  onChange={() => setExamType(2)}
                />
                Supplementary
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId || null}
                  onChange={(v) => setCourseYearId(v ?? "")}
                  options={courseYearOptions}
                  placeholder="Select course year"
                  disabled={loading || courseYearOptions.length === 0}
                />
              </div>
            </div>

            {subjects.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-md border bg-background p-3 lg:col-span-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Input
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Search subjects…"
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-blue-600 whitespace-nowrap">
                      Subjects: {selectedSubjects.length}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-1 pr-2">
                            <Checkbox
                              checked={selectAllSubjects}
                              onCheckedChange={(v) =>
                                toggleAllSubjects(Boolean(v))
                              }
                            />
                          </th>
                          <th className="py-1">Subject</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.map((sub) => {
                          const id = num(sub, ["subjectId"]);
                          return (
                            <tr key={id} className="border-b border-dashed">
                              <td className="py-1 pr-2">
                                <Checkbox
                                  checked={Boolean(sub.checked)}
                                  onCheckedChange={(v) =>
                                    toggleSubject(id, Boolean(v))
                                  }
                                />
                              </td>
                              <td className="py-1">
                                {sub.shortName}
                                {sub.subjectCode ? (
                                  <span className="text-blue-600">
                                    {" "}
                                    — {sub.subjectCode}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSubjects.length > 0 ? (
                  <div className="overflow-hidden rounded-md border bg-background lg:col-span-1">
                    <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-blue-700">
                      Selected Subjects: {selectedSubjects.length}
                    </p>
                    <ul className="max-h-64 space-y-1 overflow-auto p-3 text-xs">
                      {selectedSubjects.map((sub) => (
                        <li key={num(sub, ["subjectId"])}>
                          {sub.shortName}
                          {sub.subjectCode ? (
                            <span className="text-blue-600">
                              {" "}
                              — {sub.subjectCode}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {additionalFees.length > 0 ? (
                  <div className="overflow-hidden rounded-md border bg-background lg:col-span-1">
                    <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold">
                      Additional Fee
                    </p>
                    <div className="space-y-2 p-3">
                      {additionalFees.map((fee, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span>
                            {txt(fee, [
                              "adtExamfeetypeCatDisplayName",
                              "addtExamFeeTypeName",
                            ])}
                          </span>
                          <Input
                            type="number"
                            className="h-8 w-24"
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
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {subjects.length > 0 && feeReceipts.length === 0 ? (
              <Button type="button" onClick={handleCheckFee} disabled={loading}>
                Check Fee
              </Button>
            ) : null}
          </div>
        ) : null}

        {courseYearFee.length > 0 ? (
          <div className="exam-fee-payment-table app-data-table app-data-table-card flex flex-col">
            <div className="app-data-table-heading px-5 pt-5 pb-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Exam Fee Payment
              </h2>
            </div>
            <DataTable
              title=""
              bordered={false}
              rowData={courseYearFee}
              columnDefs={feePaymentColumnDefs}
              loading={loading}
              pagination
              paginationPageSize={10}
              height="auto"
              getRowId={(p) => String(p.data.courseYearId)}
              toolbar={{
                search: true,
                searchPlaceholder: "Search…",
                columnFilters: true,
                exportExcel: true,
                pdfDocumentTitle: "Exam Fee Payment",
              }}
            />
            <div className="exam-fee-payment-footer border-t border-border bg-primary/[0.04] px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Summary
                  </p>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Fees
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      ₹{totalReceiptAmt.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  className="shrink-0 self-end sm:self-auto"
                  onClick={payExamFees}
                  disabled={loading}
                >
                  Pay fees
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {feeReceipts.length > 0 ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 text-sm text-emerald-800">
            You already have {feeReceipts.length} fee receipt(s) for this exam.
          </div>
        ) : null}
      </FilteredPage>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            <DialogTitle className="text-base font-semibold">
              Exam Fee Payment
            </DialogTitle>
          </div>

          <div className="space-y-4 p-4">
            {student && selectedExam ? (
              <div className="space-y-2 rounded-lg bg-muted/20 p-3 text-sm">
                <div className="grid grid-cols-[minmax(5rem,20%)_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Student :</span>
                  <span className="text-blue-700">
                    {student.firstName} (
                    {student.hallticketNumber ?? student.rollNumber})
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(5rem,20%)_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">College :</span>
                  <span className="text-blue-700">
                    {student.collegeCode}
                    {student.academicYear ? ` / (${student.academicYear})` : ""}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(5rem,20%)_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Course :</span>
                  <span className="text-blue-700">
                    {student.courseName ?? student.courseCode} / (
                    {student.groupCode})
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(5rem,20%)_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Exam :</span>
                  <span className="text-blue-700">
                    {txt(selectedExam, ["examName", "name"])} (
                    {fmtDate(selectedExam.fromDate)} -{" "}
                    {fmtDate(selectedExam.toDate)})
                  </span>
                </div>
              </div>
            ) : null}

            <div className="exam-fee-payment-table app-data-table app-data-table-card flex flex-col overflow-hidden">
              <DataTable
                bordered={false}
                rowData={courseYearFee}
                columnDefs={payDialogColumnDefs}
                height="auto"
                getRowId={(p) => String(p.data.courseYearId)}
                toolbar={false}
              />
              <div className="exam-fee-payment-footer border-t border-border bg-primary/[0.04] px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    ₹{totalReceiptAmt.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-3">
            <Button
              variant="outline"
              disabled={paying}
              onClick={() => setPayDialogOpen(false)}
            >
              Close
            </Button>
            <Button disabled={paying} onClick={() => void confirmPay()}>
              {paying ? "Processing…" : "Pay"}
            </Button>
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
    </>
  );
}

export function StudentExamFeeCollectionPage() {
  return <StudentExamFeeCollectionContent />;
}
