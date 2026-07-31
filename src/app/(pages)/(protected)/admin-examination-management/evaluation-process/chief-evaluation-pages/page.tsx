"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import {
  DataTableFooter,
  type DataTablePageSize,
} from "@/common/components/table";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  assignChiefEvaluation,
  getChiefEvaluationFilters,
  getChiefEvaluationSubjectFilters,
  getChiefEvaluatorDetails,
  getEvalSetting,
  getEvaluatedAnswerPaperPresignedUrl,
} from "@/services";

type AnyRow = Record<string, any>;

/** Angular exam matTooltip / option: `MMM d, y` */
function fmtExamDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Angular exam option label + tooltip text */
function examOptionMeta(row: AnyRow): { label: string; title: string } {
  const name =
    pickText(row, ["exam_name", "examName"]) ||
    `Exam ${pickNum(row, ["fk_exam_id", "examId"])}`;
  const from = fmtExamDate(row.from_date ?? row.fromDate);
  const to = fmtExamDate(row.to_date ?? row.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    row.is_internal_exam || row.isInternalExam ? "(Internal)" : "",
    row.is_regular_exam || row.isRegularExam ? "(Regular)" : "",
    row.is_supply_exam || row.isSupplyExam ? "(Supple)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = `${name}${range}${tags ? ` ${tags}` : ""}`;
  const title = from && to ? `${name} (${from} - ${to})` : name;
  return { label, title };
}

/** Angular subject option: `name - code (regulation)` */
function subjectOptionMeta(row: AnyRow): { label: string; title: string } {
  const name = pickText(row, ["subject_name", "subjectName"]);
  const code = pickText(row, ["subject_code", "subjectCode"]);
  const reg = pickText(row, ["regulation_code", "regulationCode"]);
  const label = [name, code ? `- ${code}` : "", reg ? `(${reg})` : ""]
    .filter(Boolean)
    .join(" ");
  const title = `${name}${code ? ` - ${code}` : ""}${reg ? ` (${reg})` : ""}`;
  return { label: label || title, title };
}

/**
 * Angular chief-evaluation-pages `view(path)`:
 * GET generatePresignedUrls?evaluatedAnswerPaperPath=<path>
 * then window.open(data.evaluatedAnswerPaperUrl + '#toolbar=0&navpanes=0&scrollbar=0', …)
 */
async function viewEvaluatedAnswerPaper(path: string) {
  const paperPath = String(path ?? "").trim();
  if (!paperPath) return;
  try {
    const data = await getEvaluatedAnswerPaperPresignedUrl(paperPath);
    const url = data?.evaluatedAnswerPaperUrl;
    if (url == null || String(url).trim() === "") {
      toastError("Evaluated answer paper URL not available.");
      return;
    }
    globalThis?.open?.(
      `${url}#toolbar=0&navpanes=0&scrollbar=0`,
      "pdfViewer",
      "width=680,height=600",
    );
  } catch (err) {
    toastError(
      err instanceof Error ? err.message : "Failed to open answer paper.",
    );
  }
}

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row[key]);
    if (value > 0) return value;
  }
  return 0;
};

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
};

const dedupeBy = <T,>(rows: T[], keyFn: (row: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function ChiefEvaluationPagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([]);
  const [evaluationRows, setEvaluationRows] = useState<AnyRow[]>([]);
  const [chiefDetails, setChiefDetails] = useState<AnyRow[]>([]);
  const [chiefEvaluations, setChiefEvaluations] = useState<AnyRow[]>([]);
  const [settingValue, setSettingValue] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<DataTablePageSize>(10);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 1,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
      ).sort(
        (a, b) =>
          Number.parseInt(pickText(b, ["academic_year"]) || "0", 10) -
          Number.parseInt(pickText(a, ["academic_year"]) || "0", 10),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId"]),
      ),
    [baseRows, courseId, academicYearId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(subjectFilterRows, (r) =>
        pickNum(r, ["fk_course_year_id", "courseYearId"]),
      ),
    [subjectFilterRows],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) =>
            pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
            Number(courseYearId),
        ),
        (r) => pickNum(r, ["fk_regulation_id", "regulationId"]),
      ),
    [subjectFilterRows, courseYearId],
  );
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) =>
            pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
              Number(courseYearId) &&
            pickNum(r, ["fk_regulation_id", "regulationId"]) ===
              Number(regulationId),
        ),
        (r) => pickNum(r, ["fk_subject_id", "subjectId"]),
      ),
    [subjectFilterRows, courseYearId, regulationId],
  );

  const uniqueOmrRows = useMemo(
    () =>
      dedupeBy(evaluationRows, (r) =>
        pickText(r, ["omr_serial_no", "omrSerialNo"]),
      ),
    [evaluationRows],
  );
  const filteredOmrRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return uniqueOmrRows;
    return uniqueOmrRows.filter((r) =>
      String(r?.omr_serial_no ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [uniqueOmrRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOmrRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedOmrRows = useMemo(
    () =>
      filteredOmrRows.slice(
        safePage * pageSize,
        safePage * pageSize + pageSize,
      ),
    [filteredOmrRows, safePage, pageSize],
  );

  useEffect(() => {
    setPage(0);
  }, [search, filteredOmrRows.length]);

  const selectedCourseLabel = useMemo(
    () =>
      pickText(
        courses.find(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["course_code", "courseCode"],
      ),
    [courses, courseId],
  );
  const selectedExamLabel = useMemo(
    () =>
      pickText(
        exams.find(
          (r) => pickNum(r, ["fk_exam_id", "examId"]) === Number(examId),
        ),
        ["exam_name", "examName"],
      ),
    [exams, examId],
  );
  const selectedCourseYearLabel = useMemo(
    () =>
      pickText(
        courseYears.find(
          (r) =>
            pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
            Number(courseYearId),
        ),
        ["course_year_code", "courseYearCode"],
      ),
    [courseYears, courseYearId],
  );
  const selectedSubject = useMemo(
    () =>
      subjects.find(
        (r) => pickNum(r, ["fk_subject_id", "subjectId"]) === Number(subjectId),
      ) ?? null,
    [subjects, subjectId],
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [filters, pdfSetting] = await Promise.all([
          getChiefEvaluationFilters(employeeId).catch(() => []),
          getEvalSetting("EVALPDFSTARTEND").catch(() => null),
        ]);
        const rows = Array.isArray(filters) ? filters : [];
        setBaseRows(rows);
        setSettingValue(pdfSetting ?? "");
        if (rows[0]) {
          setCourseId(pickNum(rows[0], ["fk_course_id", "courseId"]));
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    if (academicYears[0])
      setAcademicYearId(
        pickNum(academicYears[0], ["fk_academic_year_id", "academicYearId"]),
      );
  }, [academicYears]);

  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ["fk_exam_id", "examId"]));
  }, [exams]);

  useEffect(() => {
    async function loadSubjectFilters() {
      if (!courseId || !academicYearId || !examId) return;
      const rows = await getChiefEvaluationSubjectFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      setSubjectFilterRows(list);
      setCourseYearId(
        pickNum(list[0], ["fk_course_year_id", "courseYearId"]) || null,
      );
    }
    void loadSubjectFilters();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    if (regulations[0])
      setRegulationId(
        pickNum(regulations[0], ["fk_regulation_id", "regulationId"]),
      );
  }, [regulations]);

  useEffect(() => {
    if (subjects[0])
      setSubjectId(pickNum(subjects[0], ["fk_subject_id", "subjectId"]));
  }, [subjects]);

  useEffect(() => {
    setEvaluationRows([]);
    setChiefDetails([]);
    setChiefEvaluations([]);
    setHasFetched(false);
  }, [courseId, academicYearId, examId, courseYearId, regulationId, subjectId]);

  // allowChiefEval gates the per-evaluator Edit (Angular chiefEvaluatorDetails[0].assignment_allowed).
  const allowChiefEval = Number(chiefDetails[0]?.assignment_allowed ?? 0) === 1;

  function getEvaluation(serialNo: string, evaluatorNumber: number) {
    return evaluationRows.find(
      (row) =>
        String(row?.omr_serial_no ?? "") === serialNo &&
        Number(row?.evaluator_number ?? 0) === evaluatorNumber,
    );
  }

  // chief's own evaluation for an OMR (Angular getChiefEval, result[2]).
  function getChiefEval(serialNo: string) {
    return chiefEvaluations.find(
      (row) => String(row?.omr_serial_no ?? "") === serialNo,
    );
  }

  // chief_evaluation_exists for an OMR (Angular getAllowEvalAssignment).
  function chiefEvaluationExists(serialNo: string) {
    const row = evaluationRows.find(
      (r) => String(r?.omr_serial_no ?? "") === serialNo,
    );
    return (
      Number(row?.chief_evaluation_exists ?? 0) === 1 ||
      row?.chief_evaluation_exists === true
    );
  }

  // Per-evaluator cell: marks + Edit (chief reassign, gated) + View (Angular HTML 166-196).
  function evaluatorCell(serialNo: string, n: number) {
    const ev = getEvaluation(serialNo, n);
    if (!ev || ev.evaluated_totalmarks == null) return <span>-</span>;
    const path = pickText(ev, ["evaluated_answerpaper_path"]);
    return (
      <span className="inline-flex items-center gap-1">
        {String(ev.evaluated_totalmarks ?? "")}
        {allowChiefEval && chiefEvaluationExists(serialNo) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Reassign to chief"
            onClick={() => void onEdit(serialNo, n)}
          >
            <PencilIcon className="h-3.5 w-3.5 text-blue-700" />
          </Button>
        )}
        {path && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="View answer paper"
            onClick={() => void viewEvaluatedAnswerPaper(path)}
          >
            <Eye className="h-3.5 w-3.5 text-slate-600" />
          </Button>
        )}
      </span>
    );
  }

  // Chief "My Evaluations" cell (Angular getChiefEval): marks + Edit on status 628 + View.
  function chiefCell(serialNo: string) {
    const ce = getChiefEval(serialNo);
    if (!ce) return <span>-</span>;
    const status = pickNum(ce, [
      "fk_evaluationstatus_catdet_id",
      "evaluationStatusCatDetId",
    ]);
    const path = pickText(ce, ["evaluated_answerpaper_path"]);
    return (
      <span className="inline-flex items-center gap-1">
        {String(ce.evaluated_totalmarks ?? "")}
        {status === 628 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Continue chief evaluation"
            onClick={() =>
              routeToEvaluation(
                pickNum(ce, [
                  "pk_exam_evaluationassignment_id",
                  "examEvaluationAssignmentId",
                ]),
                pickNum(ce, ["fk_std_answerpaper_id", "studentAnswerPaperId"]),
              )
            }
          >
            <PencilIcon className="h-3.5 w-3.5 text-blue-700" />
          </Button>
        )}
        {path && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="View chief answer paper"
            onClick={() => void viewEvaluatedAnswerPaper(path)}
          >
            <Eye className="h-3.5 w-3.5 text-slate-600" />
          </Button>
        )}
      </span>
    );
  }

  function routeToEvaluation(
    assignmentId: number,
    studentAnswerPaperId: number,
  ) {
    const params = new URLSearchParams({
      examEvaluationAssignmentId: String(assignmentId),
      studentAnswerPaperId: String(studentAnswerPaperId),
      examEvaluatorProfileId: String(
        pickNum(chiefDetails[0], [
          "fk_exam_evaluator_profile_id",
          "examEvaluatorProfileId",
        ]),
      ),
      examEvaluatorProfileDetId: String(
        pickNum(chiefDetails[0], [
          "fk_examevaluator_profiledet_id",
          "examEvaluatorProfileDetId",
        ]),
      ),
      subjectName: pickText(selectedSubject, ["subject_name", "subjectName"]),
      subjectCode: pickText(selectedSubject, ["subject_code", "subjectCode"]),
      settingValue,
      isChiefEvaluation: "true",
    });
    router.push(
      `/admin-examination-management/evaluation-process/evaluator-subjects/paper?${params.toString()}`,
    );
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    ) {
      toastError("Please select all filters.");
      return;
    }
    setLoading(true);
    try {
      // Angular getChiefEvaluatorDetails(): result[0]=chief details,
      // result[1]=per-evaluator marks (pivot source), result[2]=chief's own evals.
      const chief = await getChiefEvaluatorDetails({
        employeeId,
        organizationId,
        examId,
        courseId,
        academicYearId,
        courseYearId,
        regulationId,
        subjectId,
      }).catch(() => ({ chiefDetails: [], marks: [], chiefEvaluations: [] }));
      setEvaluationRows(chief.marks);
      setChiefDetails(chief.chiefDetails);
      setChiefEvaluations(chief.chiefEvaluations);
      setHasFetched(true);
      setPage(0);
    } finally {
      setLoading(false);
    }
  }

  async function onEdit(serialNo: string, evaluatorNumber: number) {
    const evaluation = getEvaluation(serialNo, evaluatorNumber);
    const chiefProfileId = pickNum(chiefDetails[0], [
      "fk_exam_evaluator_profile_id",
      "examEvaluatorProfileId",
    ]);
    if (!evaluation || chiefProfileId <= 0) {
      toastError("Unable to open this assignment.");
      return;
    }

    const currentStatus = pickNum(evaluation, [
      "fk_evaluationstatus_catdet_id",
      "evaluationStatusCatDetId",
    ]);
    const assignmentId = pickNum(evaluation, [
      "pk_exam_evaluationassignment_id",
      "examEvaluationAssignmentId",
    ]);
    const answerPaperId = pickNum(evaluation, [
      "fk_std_answerpaper_id",
      "studentAnswerPaperId",
    ]);
    const assignedProfileId = pickNum(evaluation, [
      "fk_exam_evaluator_profile_id",
      "examEvaluatorProfileId",
    ]);

    if (assignmentId <= 0 || answerPaperId <= 0) {
      toastError("Invalid evaluation assignment.");
      return;
    }

    if (assignedProfileId === chiefProfileId) {
      if ([629, 630, 631].includes(currentStatus)) {
        toastSuccess("You have completed the evaluation.");
        return;
      }
      routeToEvaluation(assignmentId, answerPaperId);
      return;
    }

    setLoading(true);
    try {
      const result = await assignChiefEvaluation({
        evaluatorProfileId: chiefProfileId,
        evaluatorProfileDetId: pickNum(chiefDetails[0], [
          "fk_examevaluator_profiledet_id",
          "examEvaluatorProfileDetId",
        ]),
        examEvaluationAssignmentId: assignmentId,
        omrSerialNo: String(evaluation?.omr_serial_no ?? serialNo),
      });
      const row = (result as AnyRow)?.result?.[0]?.[0] ?? {};
      const newId = Number(row?.new_evalassignment_id ?? 0);
      if (String(row?.Flag ?? "").toLowerCase() === "success" && newId > 0) {
        routeToEvaluation(newId, answerPaperId);
      } else {
        toastSuccess(String(row?.Flag ?? "Assignment updated."));
      }
    } catch (error) {
      toastError(error, "Failed to assign chief evaluation");
    } finally {
      setLoading(false);
    }
  }

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((row) => ({
        value: String(pickNum(row, ["fk_course_id", "courseId"])),
        label: pickText(row, [
          "course_code",
          "courseCode",
          "course_name",
          "courseName",
        ]),
      })),
    [courses],
  );
  const yearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((row) => ({
        value: String(pickNum(row, ["fk_academic_year_id", "academicYearId"])),
        label: pickText(row, ["academic_year", "academicYear"]),
      })),
    [academicYears],
  );
  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((row) => {
        const meta = examOptionMeta(row);
        return {
          value: String(pickNum(row, ["fk_exam_id", "examId"])),
          label: meta.label,
          title: meta.title,
        };
      }),
    [exams],
  );
  const courseYearOptions = useMemo<SelectOption[]>(
    () =>
      courseYears.map((row) => ({
        value: String(pickNum(row, ["fk_course_year_id", "courseYearId"])),
        label: pickText(row, ["course_year_code", "courseYearCode"]),
      })),
    [courseYears],
  );
  const regulationOptions = useMemo<SelectOption[]>(
    () =>
      regulations.map((row) => ({
        value: String(pickNum(row, ["fk_regulation_id", "regulationId"])),
        label: pickText(row, ["regulation_code", "regulationCode"]),
      })),
    [regulations],
  );
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((row) => {
        const meta = subjectOptionMeta(row);
        return {
          value: String(pickNum(row, ["fk_subject_id", "subjectId"])),
          label: meta.label,
          title: meta.title,
        };
      }),
    [subjects],
  );

  return (
    <FilteredPage
      title="Chief Evaluation Pages"
      filters={
        <>
          <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r1">
            <GlobalFilterField
              label="Course"
              className="global-filter-field--fx15"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : null)}
                options={courseOptions}
                placeholder="Course"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Academic Year"
              className="global-filter-field--fx15"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                options={yearOptions}
                placeholder="Academic Year"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam"
              className="global-filter-field--fx69"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : null)}
                options={examOptions}
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r2">
            <GlobalFilterField
              label="Course Year"
              className="global-filter-field--fx15"
            >
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                options={courseYearOptions}
                placeholder="Course Year"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Regulation"
              className="global-filter-field--fx15"
            >
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => setRegulationId(v ? Number(v) : null)}
                options={regulationOptions}
                placeholder="Regulation"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Subject"
              className="global-filter-field--fx49"
            >
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : null)}
                options={subjectOptions}
                placeholder="Subject"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=" "
              className="global-filter-field--action global-filter-field--fx10"
            >
              <Button
                size="sm"
                className="h-10 shrink-0 w-full"
                onClick={() => void onGetList()}
                disabled={loading}
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
    >
      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-blue-700 font-medium">
              {selectedCourseLabel} / {selectedExamLabel} /{" "}
              {selectedCourseYearLabel}
            </div>
            <div className="w-full max-w-xs">
              <SearchInput
                className="w-full max-w-sm"
                placeholder="Search OMR serial no…"
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>
          <div className="p-4 overflow-auto">
            <table className="w-full text-[13px] min-w-[860px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-2 w-16">S.No</th>
                  <th className="text-left px-3 py-2">Omr Serial No</th>
                  <th className="text-left px-3 py-2">Evaluator 1</th>
                  <th className="text-left px-3 py-2">Evaluator 2</th>
                  <th className="text-left px-3 py-2">Evaluator 3</th>
                  <th className="text-left px-3 py-2">My Evaluations</th>
                </tr>
              </thead>
              <tbody>
                {pagedOmrRows.map((row, index) => {
                  const serialNo = String(row?.omr_serial_no ?? "");
                  return (
                    <tr
                      key={`${serialNo}-${safePage * pageSize + index}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        {safePage * pageSize + index + 1}
                      </td>
                      <td className="px-3 py-2">{serialNo || "-"}</td>
                      <td className="px-3 py-2">
                        {evaluatorCell(serialNo, 1)}
                      </td>
                      <td className="px-3 py-2">
                        {evaluatorCell(serialNo, 2)}
                      </td>
                      <td className="px-3 py-2">
                        {evaluatorCell(serialNo, 3)}
                      </td>
                      <td className="px-3 py-2">{chiefCell(serialNo)}</td>
                    </tr>
                  );
                })}
                {pagedOmrRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DataTableFooter
            totalRows={filteredOmrRows.length}
            page={safePage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      )}
    </FilteredPage>
  );
}
