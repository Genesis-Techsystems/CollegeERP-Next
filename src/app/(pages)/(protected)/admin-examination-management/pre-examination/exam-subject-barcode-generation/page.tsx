"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Barcode, Eye, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/common/components/select";
import {
  generateBarcodesForExamStudents,
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from "@/services/pre-examination";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useBarcodeStickerPrint } from "./_print/useBarcodeStickerPrint";
import type { ColDef } from "ag-grid-community";

type AnyRow = Record<string, any>;
const REG_ID_KEYS = [
  "fk_regulation_id",
  "regulationId",
  "fk_regulationId",
  "regulation_id",
  "regulationCatId",
  "fk_regulation_cat_id",
  "regulation.regulationId",
  "Regulation.regulationId",
];
const REG_TEXT_KEYS = [
  "regulation_code",
  "regulationCode",
  "regulation_name",
  "regulationName",
  "regulation",
  "regulation.regulationCode",
  "Regulation.regulationCode",
  "regulation.regulationName",
  "Regulation.regulationName",
  "regulationCodeDisplayName",
  "regulation_display_name",
  "regulationdisplayname",
  "regulationcode",
];
const SUBJECT_ID_KEYS = [
  "fk_subject_id",
  "subjectId",
  "fk_subjectId",
  "subject_id",
];
const regSyntheticId = (row: AnyRow | null | undefined) => {
  const txt = pickText(row, REG_TEXT_KEYS).trim().toLowerCase();
  if (!txt) return 0;
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return h > 0 ? h : 0;
};
const pickRegValue = (row: AnyRow | null | undefined) => {
  const id = pickNum(row, REG_ID_KEYS);
  if (id > 0) return id;
  return regSyntheticId(row);
};
const pickBackendRegId = (row: AnyRow | null | undefined) =>
  pickNum(row, REG_ID_KEYS);

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getByPath = (obj: AnyRow | null | undefined, path: string): any => {
  if (!obj) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
};

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const key of keys) {
    const v = Number(getByPath(row, key));
    if (v > 0) return v;
  }
  return 0;
};

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const key of keys) {
    const v = getByPath(row, key);
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (isValid(iso)) return iso;
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

function formatExamDateLabel(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "MMM d, yyyy") : "";
}

function examTypeTags(row: AnyRow): string[] {
  const tags: string[] = [];
  if (asBool(row.is_internal_exam ?? row.isInternalExam)) tags.push("Internal");
  if (asBool(row.is_regular_exam ?? row.isRegularExam)) tags.push("Regular");
  if (asBool(row.is_supply_exam ?? row.isSupplyExam)) tags.push("Supple");
  return tags;
}

function formatExamOptionLabel(row: AnyRow): string {
  const name = pickText(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(row)
    .map((t) => `(${t})`)
    .join("");
  return `${name}${range}${tags}`;
}

function examOptionLabelNode(row: AnyRow) {
  const name = pickText(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return (
    <span>
      {name}
      {range}
      {examTypeTags(row).map((t) => (
        <span key={t} className="font-medium text-[#0014ff]">
          ({t})
        </span>
      ))}
    </span>
  );
}

const COL_DEFS = {
  slNo: {
    colId: "slNo",
    headerName: "S.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 72,
    minWidth: 64,
    flex: 0,
  } as ColDef<AnyRow>,
  student: {
    colId: "student",
    headerName: "Student Name",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data;
      if (!r) return "—";
      const name = r.student_name ?? r.studentName ?? r.firstName ?? "—";
      const ht =
        r.hallticket_number ?? r.hallticketNumber ?? r.rollNumber ?? "—";
      return `${name} (${ht})`;
    },
  } as ColDef<AnyRow>,
  barcodeNo: {
    colId: "barcodeNo",
    headerName: "Barcode No",
    minWidth: 130,
    valueGetter: (p) => p.data?.omr_serial_no ?? p.data?.omrSerialNo ?? "—",
  } as ColDef<AnyRow>,
  barcode: {
    colId: "barcode",
    headerName: "Barcode",
    minWidth: 200,
    flex: 0,
    width: 210,
    sortable: false,
    suppressColumnsToolPanel: false,
  } as ColDef<AnyRow>,
  viewOmr: {
    colId: "viewOmr",
    headerName: "View OMR Page",
    minWidth: 120,
    width: 130,
    flex: 0,
    sortable: false,
  } as ColDef<AnyRow>,
  viewAnswer: {
    colId: "viewAnswer",
    headerName: "View Answer Page",
    minWidth: 130,
    width: 140,
    flex: 0,
    sortable: false,
  } as ColDef<AnyRow>,
};

function barcodeImageRenderer(p: { data?: AnyRow }) {
  const raw = String(p.data?.omr_barcode ?? p.data?.omrBarcode ?? "");
  if (!raw || raw === "-") return <span>-</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/jpg;base64,${raw}`}
      style={{ height: 20 }}
      alt="barcode"
    />
  );
}

function makeViewRenderer(
  icon: "omr" | "answer",
  onView: (row: AnyRow) => void,
) {
  const Icon = icon === "omr" ? Eye : FileText;
  const title = icon === "omr" ? "View OMR page" : "View answer page";
  return (p: { data?: AnyRow }) => (
    <button
      type="button"
      aria-label={title}
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900"
      onClick={() => p.data && onView(p.data)}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  );
}

export default function ExamSubjectBarcodeGenerationPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [selectedBackendRegulationId, setSelectedBackendRegulationId] =
    useState<number>(0);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [employeeId, setEmployeeId] = useState(0);

  const courses = useMemo(
    () =>
      dedupeBy(baseRows, (r) =>
        pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]),
      ).filter(
        (r) => pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) > 0,
      ),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) ===
          Number(courseId),
      ),
      (r) =>
        pickNum(r, [
          "fk_academic_year_id",
          "academicYearId",
          "fk_academicYearId",
        ]),
    );
    return [...list].sort(
      (a, b) =>
        Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
          Number(a.is_curr_ay ?? a.isCurrAy ?? 0) ||
        Number(pickText(b, ["academic_year", "academicYear"]) || 0) -
          Number(pickText(a, ["academic_year", "academicYear"]) || 0),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) ===
              Number(courseId) &&
            pickNum(r, [
              "fk_academic_year_id",
              "academicYearId",
              "fk_academicYearId",
            ]) === Number(academicYearId),
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId", "fk_examId"]),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) =>
        pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]),
      ).filter(
        (r) => pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]) > 0,
      ),
    [restRows],
  );
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]) ===
            Number(collegeId),
        ),
        (r) =>
          pickNum(r, [
            "fk_course_group_id",
            "courseGroupId",
            "fk_course_groupId",
          ]),
      ),
    [restRows, collegeId],
  );
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]) ===
              Number(collegeId) &&
            pickNum(r, [
              "fk_course_group_id",
              "courseGroupId",
              "fk_course_groupId",
            ]) === Number(courseGroupId),
        ),
        (r) =>
          pickNum(r, ["fk_course_year_id", "courseYearId", "fk_course_yearId"]),
      ),
    [restRows, collegeId, courseGroupId],
  );
  const regulations = useMemo(() => {
    const fromRest = restRows.filter((r) => {
      const regId = pickRegValue(r);
      if (!regId) return false;
      if (
        collegeId &&
        pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]) !==
          Number(collegeId)
      )
        return false;
      if (
        courseGroupId &&
        pickNum(r, [
          "fk_course_group_id",
          "courseGroupId",
          "fk_course_groupId",
        ]) !== Number(courseGroupId)
      )
        return false;
      if (
        courseYearId &&
        pickNum(r, [
          "fk_course_year_id",
          "courseYearId",
          "fk_course_yearId",
        ]) !== Number(courseYearId)
      )
        return false;
      return true;
    });
    const fromBase = baseRows.filter((r) => {
      const regId = pickRegValue(r);
      if (!regId) return false;
      if (
        courseId &&
        pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) !==
          Number(courseId)
      )
        return false;
      if (
        academicYearId &&
        pickNum(r, [
          "fk_academic_year_id",
          "academicYearId",
          "fk_academicYearId",
        ]) !== Number(academicYearId)
      )
        return false;
      if (
        examId &&
        pickNum(r, ["fk_exam_id", "examId", "fk_examId"]) !== Number(examId)
      )
        return false;
      return true;
    });
    return dedupeBy([...fromRest, ...regulationRows, ...fromBase], (r) =>
      pickRegValue(r),
    ).filter((r) => pickRegValue(r) > 0);
  }, [
    restRows,
    regulationRows,
    baseRows,
    collegeId,
    courseGroupId,
    courseYearId,
    courseId,
    academicYearId,
    examId,
  ]);
  const regulationBackendIdMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of regulations) {
      map.set(pickRegValue(r), pickBackendRegId(r));
    }
    return map;
  }, [regulations]);
  const subjects = useMemo(() => {
    // Some regulation-filtered subject responses do not include regulation fields in each row.
    // In that case, use all subject rows as-is (already scoped by API).
    const hasRegInRows = subjectRows.some((r) => pickRegValue(r) > 0);
    const scoped =
      regulationId && Number(regulationId) > 0 && hasRegInRows
        ? subjectRows.filter((r) => pickRegValue(r) === Number(regulationId))
        : subjectRows;
    return dedupeBy(scoped, (r) => pickNum(r, SUBJECT_ID_KEYS));
  }, [subjectRows, regulationId]);
  const tableSummaryText = useMemo(() => {
    const college = colleges.find(
      (c) =>
        pickNum(c, ["fk_college_id", "collegeId", "fk_collegeId"]) ===
        Number(collegeId),
    );
    const ay = academicYears.find(
      (a) =>
        pickNum(a, [
          "fk_academic_year_id",
          "academicYearId",
          "fk_academicYearId",
        ]) === Number(academicYearId),
    );
    const course = courses.find(
      (c) =>
        pickNum(c, ["fk_course_id", "courseId", "fk_courseId"]) ===
        Number(courseId),
    );
    const group = groups.find(
      (g) =>
        pickNum(g, [
          "fk_course_group_id",
          "courseGroupId",
          "fk_course_groupId",
        ]) === Number(courseGroupId),
    );
    const year = years.find(
      (y) =>
        pickNum(y, [
          "fk_course_year_id",
          "courseYearId",
          "fk_course_yearId",
        ]) === Number(courseYearId),
    );
    const subject = subjects.find(
      (s) => pickNum(s, SUBJECT_ID_KEYS) === Number(subjectId),
    );
    return [
      pickText(college, [
        "college_code",
        "collegeCode",
        "college_name",
        "collegeName",
      ]) || "-",
      pickText(ay, ["academic_year", "academicYear"]) || "-",
      pickText(course, [
        "course_code",
        "courseCode",
        "course_name",
        "courseName",
      ]) || "-",
      pickText(group, ["group_code", "groupCode"]) || "-",
      pickText(year, [
        "course_year_code",
        "courseYearCode",
        "course_year_name",
        "courseYearName",
      ]) || "-",
      pickText(subject, ["subject_name", "subjectName"]) || "-",
    ].join(" / ");
  }, [
    colleges,
    academicYears,
    courses,
    groups,
    years,
    subjects,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    subjectId,
  ]);

  const printExamName =
    pickText(
      exams.find(
        (e) =>
          pickNum(e, ["fk_exam_id", "examId", "fk_examId"]) === Number(examId),
      ),
      ["exam_name", "examName"],
    ) || "Exam";
  const printCollegeName = pickText(
    colleges.find(
      (c) =>
        pickNum(c, ["fk_college_id", "collegeId", "fk_collegeId"]) ===
        Number(collegeId),
    ),
    ["college_name", "collegeName"],
  );
  const printMeta = useMemo(() => {
    const college = colleges.find(
      (c) =>
        pickNum(c, ["fk_college_id", "collegeId", "fk_collegeId"]) ===
        Number(collegeId),
    );
    const ay = academicYears.find(
      (a) =>
        pickNum(a, [
          "fk_academic_year_id",
          "academicYearId",
          "fk_academicYearId",
        ]) === Number(academicYearId),
    );
    const course = courses.find(
      (c) =>
        pickNum(c, ["fk_course_id", "courseId", "fk_courseId"]) ===
        Number(courseId),
    );
    const group = groups.find(
      (g) =>
        pickNum(g, [
          "fk_course_group_id",
          "courseGroupId",
          "fk_course_groupId",
        ]) === Number(courseGroupId),
    );
    const year = years.find(
      (y) =>
        pickNum(y, [
          "fk_course_year_id",
          "courseYearId",
          "fk_course_yearId",
        ]) === Number(courseYearId),
    );
    return {
      examName: printExamName,
      collegeName: printCollegeName,
      collegeCode: pickText(college, ["college_code", "collegeCode"]) || "",
      academicYear: pickText(ay, ["academic_year", "academicYear"]) || "",
      courseCode: pickText(course, ["course_code", "courseCode"]) || "",
      courseGroupCode: pickText(group, ["group_code", "groupCode"]) || "",
      courseYear:
        pickText(year, [
          "course_year_code",
          "courseYearCode",
          "course_year_name",
          "courseYearName",
        ]) || "",
    };
  }, [
    colleges,
    academicYears,
    courses,
    groups,
    years,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    printExamName,
    printCollegeName,
  ]);
  const { printButton, printOmrFor, printAnswerFor } = useBarcodeStickerPrint(
    rows,
    printMeta,
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.slNo,
      COL_DEFS.student,
      COL_DEFS.barcodeNo,
      { ...COL_DEFS.barcode, cellRenderer: barcodeImageRenderer },
      {
        ...COL_DEFS.viewOmr,
        cellRenderer: makeViewRenderer("omr", printOmrFor),
      },
      {
        ...COL_DEFS.viewAnswer,
        cellRenderer: makeViewRenderer("answer", printAnswerFor),
      },
    ],
    [printOmrFor, printAnswerFor],
  );

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const d = p.data;
    if (!d) return "";
    const det = Number(
      d.fk_exam_std_det_id ?? d.examStdDetId ?? d.exam_std_det_id ?? 0,
    );
    if (det > 0) return String(det);
    const sid = Number(d.student_id ?? d.studentId ?? d.fk_student_id ?? 0);
    const sub = Number(d.fk_subject_id ?? d.subjectId ?? 0);
    return `row-${sid}-${sub}-${String(d.omr_serial_no ?? d.hallticket_number ?? "")}`;
  }, []);

  function clearResults() {
    setRows([]);
    setHasFetched(false);
  }

  function clearDownstreamFromExam() {
    setCollegeId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setRestRows([]);
    setRegulationRows([]);
    setSubjectRows([]);
    clearResults();
  }

  async function onExamChange(
    cid: number,
    ayid: number,
    eid: number | null,
    _sourceRows?: AnyRow[],
  ) {
    setExamId(eid);
    clearDownstreamFromExam();
    if (!cid || !ayid || !eid) return;
    await onExamLoad(cid, ayid, eid);
  }

  async function onAcademicYearChange(
    cid: number,
    ayid: number | null,
    sourceRows?: AnyRow[],
  ) {
    const data = sourceRows ?? baseRows;
    setAcademicYearId(ayid);
    setExamId(null);
    clearDownstreamFromExam();
    if (!cid || !ayid) return;
    const examList = dedupeBy(
      data.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) === cid &&
          pickNum(r, [
            "fk_academic_year_id",
            "academicYearId",
            "fk_academicYearId",
          ]) === ayid,
      ),
      (r) => pickNum(r, ["fk_exam_id", "examId", "fk_examId"]),
    );
    const firstExam = examList[0];
    if (!firstExam) return;
    const eid = pickNum(firstExam, ["fk_exam_id", "examId", "fk_examId"]);
    if (eid > 0) await onExamChange(cid, ayid, eid, data);
  }

  async function onCourseChange(cid: number | null, sourceRows?: AnyRow[]) {
    const data = sourceRows ?? baseRows;
    setCourseId(cid);
    setAcademicYearId(null);
    setExamId(null);
    clearDownstreamFromExam();
    if (!cid) return;
    const yearsForCourse = dedupeBy(
      data.filter(
        (r) => pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) === cid,
      ),
      (r) =>
        pickNum(r, [
          "fk_academic_year_id",
          "academicYearId",
          "fk_academicYearId",
        ]),
    ).sort(
      (a, b) =>
        Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
          Number(a.is_curr_ay ?? a.isCurrAy ?? 0) ||
        Number(pickText(b, ["academic_year", "academicYear"]) || 0) -
          Number(pickText(a, ["academic_year", "academicYear"]) || 0),
    );
    const firstAy = yearsForCourse[0];
    if (!firstAy) return;
    const ayid = pickNum(firstAy, [
      "fk_academic_year_id",
      "academicYearId",
      "fk_academicYearId",
    ]);
    if (ayid > 0) await onAcademicYearChange(cid, ayid, data);
  }

  async function onCollegeChange(clid: number | null) {
    setCollegeId(clid);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setSubjectRows([]);
    clearResults();
  }

  async function onGroupChange(gid: number | null) {
    setCourseGroupId(gid);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setSubjectRows([]);
    clearResults();
  }

  async function onCourseYearChange(yid: number | null) {
    setCourseYearId(yid);
    setSubjectId(null);
    setSubjectRows([]);
    clearResults();
  }

  async function onRegulationChange(rid: number | null) {
    setRegulationId(rid);
    setSelectedBackendRegulationId(
      rid ? (regulationBackendIdMap.get(rid) ?? 0) : 0,
    );
    setSubjectId(null);
    clearResults();
  }

  function onSubjectChange(sid: number | null) {
    setSubjectId(sid);
    clearResults();
  }

  async function init() {
    setLoading(true);
    try {
      const loaded = await getUnivExamFiltersRegSup(employeeId);
      setBaseRows(loaded);
      const c = dedupeBy(loaded, (r) =>
        pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]),
      ).find(
        (r) => pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) > 0,
      );
      if (!c) {
        toastSuccess("No Records Found.");
        return;
      }
      const cid = pickNum(c, ["fk_course_id", "courseId", "fk_courseId"]);
      await onCourseChange(cid, loaded);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFilters() {
    clearResults();
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    clearDownstreamFromExam();
    await init();
  }

  async function onExamLoad(cid: number, ayid: number, eid: number) {
    try {
      const bundle = await getUnivExamRestNoTtBundle({
        courseId: cid,
        examId: eid,
        academicYearId: ayid,
        employeeId,
      });
      const rest = Array.isArray(bundle?.restFilters) ? bundle.restFilters : [];
      const regsFromFlag = Array.isArray(bundle?.regulations)
        ? bundle.regulations
        : [];
      setRestRows(rest);
      const regs = dedupeBy(
        [...regsFromFlag, ...rest].filter((r) => pickRegValue(r) > 0),
        (r) => pickRegValue(r),
      );
      setRegulationRows(regs);
      const firstReg = regs[0];
      if (firstReg) {
        const rid = pickRegValue(firstReg);
        setRegulationId(rid);
        setSelectedBackendRegulationId(pickBackendRegId(firstReg));
      }
      const clg = dedupeBy(rest, (r) =>
        pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]),
      ).find(
        (r) => pickNum(r, ["fk_college_id", "collegeId", "fk_collegeId"]) > 0,
      );
      if (clg) {
        setCollegeId(
          pickNum(clg, ["fk_college_id", "collegeId", "fk_collegeId"]),
        );
      }
      if (rest.length === 0 && regs.length === 0) {
        toastSuccess("No Records Found.");
      }
    } catch (e) {
      setRestRows([]);
      setRegulationRows([]);
      toastError(e);
    }
  }

  async function loadSubjects(targetRegulationId?: number | null) {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !examId ||
      !academicYearId
    )
      return;
    const uiRegId = Number(targetRegulationId ?? regulationId ?? 0);
    const mappedBackendId = regulationBackendIdMap.get(uiRegId) ?? 0;
    const selectedReg = regulations.find((r) => pickRegValue(r) === uiRegId);
    const regId = Number(
      mappedBackendId ||
        pickNum(selectedReg, REG_ID_KEYS) ||
        selectedBackendRegulationId ||
        0,
    );
    const rows = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: regId,
      employeeId,
    }).catch((e) => {
      toastError(e);
      return [];
    });
    const list = Array.isArray(rows) ? rows : [];
    setSubjectRows(list);

    // Legacy behavior: regulation/subject both become available from subject filter response.
    const regFromSubject = dedupeBy(
      list.filter((r) => pickRegValue(r) > 0),
      (r) => pickRegValue(r),
    );
    if (regFromSubject.length > 0) {
      setRegulationRows(regFromSubject);
      if (
        !regulationId ||
        !regFromSubject.some((r) => pickRegValue(r) === Number(regulationId))
      ) {
        setRegulationId(pickRegValue(regFromSubject[0]));
      }
    }

    if (list.length > 0) {
      const activeRegId = Number(
        targetRegulationId ??
          regulationId ??
          pickRegValue(regFromSubject[0]) ??
          0,
      );
      const firstSubject =
        activeRegId > 0
          ? list.find((r) => pickRegValue(r) === activeRegId)
          : list[0];
      if (firstSubject) {
        setSubjectId(pickNum(firstSubject, SUBJECT_ID_KEYS));
      }
    } else {
      setSubjectId(null);
    }
  }

  useEffect(() => {
    setIsMounted(true);
    const id = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
    setEmployeeId(Number.isFinite(id) ? id : 0);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    void init();
  }, [isMounted, employeeId]);

  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setSubjectRows([]);
    setSubjectId(null);
    const first = groups[0];
    if (first)
      setCourseGroupId(
        pickNum(first, [
          "fk_course_group_id",
          "courseGroupId",
          "fk_course_groupId",
        ]),
      );
  }, [collegeId]);

  useEffect(() => {
    setCourseYearId(null);
    setSubjectRows([]);
    setSubjectId(null);
    const first = years[0];
    if (first)
      setCourseYearId(
        pickNum(first, [
          "fk_course_year_id",
          "courseYearId",
          "fk_course_yearId",
        ]),
      );
  }, [courseGroupId]);

  useEffect(() => {
    if (
      collegeId &&
      courseId &&
      courseGroupId &&
      courseYearId &&
      examId &&
      academicYearId
    ) {
      void loadSubjects(0);
    }
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
  ]);

  useEffect(() => {
    if (!regulationId) return;
    // Legacy behavior: changing regulation always calls subject API with selected regulation id.
    void loadSubjects(regulationId);
  }, [regulationId]);

  useEffect(() => {
    if (!regulations.length) {
      setRegulationId(null);
      setSubjectRows([]);
      setSubjectId(null);
      return;
    }
    const exists = regulations.some(
      (r) => pickRegValue(r) === Number(regulationId),
    );
    if (!exists) {
      const firstUi = pickRegValue(regulations[0]);
      setRegulationId(firstUi);
      setSelectedBackendRegulationId(pickBackendRegId(regulations[0]));
      setSubjectRows([]);
      setSubjectId(null);
    }
  }, [regulations, regulationId]);

  async function fetchOmrStudentRows(): Promise<AnyRow[]> {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId)
      return [];
    const selectedRegRow =
      regulations.find((r) => pickRegValue(r) === Number(regulationId ?? 0)) ??
      null;
    const backendRegulationId =
      selectedBackendRegulationId || pickBackendRegId(selectedRegRow);
    const res = await getExamOmrStudents({
      examId,
      collegeId,
      courseGroupId,
      courseYearId,
      regulationId: backendRegulationId > 0 ? backendRegulationId : 0,
      subjectId,
    });
    const list = Array.isArray(res) ? res : [];
    setRows(list);
    return list;
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId)
      return;
    setTableLoading(true);
    setHasFetched(true);
    try {
      const list = await fetchOmrStudentRows();
      // Angular: empty → success toast "No Records Found." (no toast when rows exist)
      if (list.length === 0) toastSuccess("No Records Found.");
    } catch (e) {
      setRows([]);
      toastError(e);
    } finally {
      setTableLoading(false);
    }
  }

  async function generateBarcode() {
    const ids = rows
      .map((r) => Number(getRowId({ data: r })))
      .filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length === 0) {
      toastError("No students available to generate barcodes.");
      return;
    }
    setTableLoading(true);
    try {
      const result = await generateBarcodesForExamStudents(ids);
      // Angular: truthy → "Barcode Generated"; falsy → "Subject data Mismatch"
      if (result === false || result === null) {
        toastError("Subject data Mismatch");
        return;
      }
      toastSuccess("Barcode Generated");
      await fetchOmrStudentRows();
    } catch (e) {
      toastError(e);
    } finally {
      setTableLoading(false);
    }
  }

  return (
    <FilteredListPage
      title="Exam Subject Barcode"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => void onCourseChange(v ? Number(v) : null)}
              options={courses.map((c, i) => ({
                value: String(
                  pickNum(c, ["fk_course_id", "courseId", "fk_courseId"]) || i,
                ),
                label:
                  pickText(c, [
                    "course_code",
                    "courseCode",
                    "course_name",
                    "courseName",
                  ]) || "-",
              }))}
              placeholder="Course"
              disabled={loading}
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Exam Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) =>
                void onAcademicYearChange(
                  Number(courseId || 0),
                  v ? Number(v) : null,
                )
              }
              options={academicYears.map((a, i) => ({
                value: String(
                  pickNum(a, [
                    "fk_academic_year_id",
                    "academicYearId",
                    "fk_academicYearId",
                  ]) || i,
                ),
                label: pickText(a, ["academic_year", "academicYear"]) || "-",
              }))}
              placeholder="Exam Year"
              disabled={loading || !courseId}
            />
          </div>
          <div className="md:col-span-8 space-y-1">
            <Label>Exam Master</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) =>
                void onExamChange(
                  Number(courseId || 0),
                  Number(academicYearId || 0),
                  v ? Number(v) : null,
                )
              }
              options={exams.map((e, i) => {
                const id = pickNum(e, ["fk_exam_id", "examId", "fk_examId"]);
                const label = formatExamOptionLabel(e);
                return {
                  value: String(id || i),
                  label,
                  title: label,
                  labelNode: examOptionLabelNode(e),
                };
              })}
              placeholder="Exam Master"
              searchable
              disabled={loading || !courseId || !academicYearId}
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
              options={colleges.map((c, i) => ({
                value: String(
                  pickNum(c, ["fk_college_id", "collegeId", "fk_collegeId"]) ||
                    i,
                ),
                label:
                  pickText(c, [
                    "college_code",
                    "collegeCode",
                    "college_name",
                    "collegeName",
                  ]) || "-",
              }))}
              placeholder="College"
              disabled={loading || !examId}
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Course Group</Label>
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => void onGroupChange(v ? Number(v) : null)}
              options={groups.map((g, i) => ({
                value: String(
                  pickNum(g, [
                    "fk_course_group_id",
                    "courseGroupId",
                    "fk_course_groupId",
                  ]) || i,
                ),
                label:
                  pickText(g, [
                    "group_code",
                    "groupCode",
                    "course_group_code",
                    "courseGroupCode",
                  ]) || "-",
              }))}
              placeholder="Group"
              disabled={loading || !collegeId}
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Course Year</Label>
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => void onCourseYearChange(v ? Number(v) : null)}
              options={years.map((y, i) => ({
                value: String(
                  pickNum(y, [
                    "fk_course_year_id",
                    "courseYearId",
                    "fk_course_yearId",
                  ]) || i,
                ),
                label:
                  pickText(y, [
                    "course_year_code",
                    "courseYearCode",
                    "course_year_name",
                    "courseYearName",
                  ]) || "-",
              }))}
              placeholder="Course Year"
              disabled={loading || !courseGroupId}
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Regulation</Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => void onRegulationChange(v ? Number(v) : null)}
              options={regulations.map((r, i) => ({
                value: String(pickRegValue(r) || i),
                label:
                  pickText(r, REG_TEXT_KEYS) || `Regulation ${pickRegValue(r)}`,
              }))}
              placeholder="Regulation"
              disabled={loading || !courseYearId}
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label>Subject</Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => onSubjectChange(v ? Number(v) : null)}
              options={subjects.map((s, i) => ({
                value: String(pickNum(s, SUBJECT_ID_KEYS) || i),
                label:
                  (pickText(s, ["subject_name", "subjectName"]) || "-") +
                  " (" +
                  (pickText(s, ["subject_code", "subjectCode"]) || "-") +
                  ")",
              }))}
              placeholder="Subject"
              disabled={loading || !regulationId}
            />
          </div>
          <div className="md:col-span-1 flex items-end gap-2">
            <Button
              type="button"
              onClick={getList}
              disabled={loading || tableLoading || !subjectId}
              className="h-8 flex-1 px-3 text-[12px]"
            >
              Get List
            </Button>
          </div>
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={tableLoading}
      resultsVisible={hasFetched && rows.length > 0}
      hideEmptyGrid
      pagination
      paginationPageSize={10}
      getRowId={getRowId}
      tableHeader={
        hasFetched && rows.length > 0 ? (
          <TableContextHeader
            title="Exam Subject Barcode"
            info={tableSummaryText || undefined}
          />
        ) : null
      }
      toolbar={
        hasFetched && rows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search students…",
              pdfDocumentTitle: "Exam Subject Barcode",
            }
          : false
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="flex items-center gap-2">
            {printButton}
            <Button
              type="button"
              size="sm"
              onClick={generateBarcode}
              disabled={tableLoading || rows.length === 0}
              className="h-[30px] px-3 text-[12px]"
            >
              <Barcode className="mr-1.5 h-3.5 w-3.5" />
              Generate Barcode
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
