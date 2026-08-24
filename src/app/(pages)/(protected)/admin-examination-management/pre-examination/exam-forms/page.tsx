"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from "@/services";
import { toastSuccess } from "@/lib/toast";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { useExamFormsPrint } from "./_print/useExamFormsPrint";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  clearExamFormsReturnState,
  loadExamFormsReturnState,
  type ExamFormsReturnState,
} from "./_print/store";

type AnyRow = Record<string, any>;

const REG_ID_KEYS = [
  "fk_regulation_id",
  "regulationId",
  "fk_regulationId",
  "regulation_id",
];
const SUBJECT_ID_KEYS = [
  "fk_subject_id",
  "subjectId",
  "fk_subjectId",
  "subject_id",
];

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
};

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "" && String(v) !== "undefined") {
      return String(v);
    }
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

/** Label: Exam Name (Dec 22, 2025 - May 6, 2026)(Regular)(Supple) */
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

function yearLabel(row: AnyRow): string {
  // Prefer code (Angular mat-option); name is often missing → "undefined" in summary.
  return (
    pickText(row, [
      "course_year_code",
      "courseYearCode",
      "course_year_name",
      "courseYearName",
    ]) || "-"
  );
}

export default function ExamFormsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [regRows, setRegRows] = useState<AnyRow[]>([]);
  const [subRows, setSubRows] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [selectedData, setSelectedData] = useState("");
  /** Bottom results card — only after Get List (or restore from print). */
  const [listLoaded, setListLoaded] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [selectedBackendRegulationId, setSelectedBackendRegulationId] =
    useState(0);

  /** Angular AFormData/FormData — restore after Back from print. */
  const restoreRef = useRef<ExamFormsReturnState | null>(null);
  /** Skip college/group cascade defaults while applying restore. */
  const skipCascadeRef = useRef(false);
  /** Latest filter ids for async cascade (avoid stale closures). */
  const idsRef = useRef({
    courseId: 0,
    academicYearId: 0,
    examId: 0,
    collegeId: 0,
    courseGroupId: 0,
    courseYearId: 0,
    regulationId: 0,
    employeeId: 0,
  });

  const courses = useMemo(
    () =>
      dedupeBy(baseRows, (r) =>
        pickNum(r, ["fk_course_id", "courseId"]),
      ).filter((r) => pickNum(r, ["fk_course_id", "courseId"]) > 0),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
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
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) =>
        pickNum(r, ["fk_college_id", "collegeId"]),
      ).filter((r) => {
        const id = pickNum(r, ["fk_college_id", "collegeId"]);
        const code = pickText(r, ["college_code", "collegeCode"]);
        return id > 0 && !!code;
      }),
    [restRows],
  );
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
      ).filter((r) => {
        const id = pickNum(r, ["fk_course_group_id", "courseGroupId"]);
        const code = pickText(r, ["group_code", "groupCode"]);
        return id > 0 && !!code;
      }),
    [restRows, collegeId],
  );
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
            pickNum(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId),
        ),
        (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]),
      ).filter((r) => {
        const id = pickNum(r, ["fk_course_year_id", "courseYearId"]);
        const code = pickText(r, [
          "course_year_code",
          "courseYearCode",
          "course_year_name",
          "courseYearName",
        ]);
        return id > 0 && !!code;
      }),
    [restRows, collegeId, courseGroupId],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(regRows, (r) => pickNum(r, REG_ID_KEYS)).filter(
        (r) => pickNum(r, REG_ID_KEYS) > 0,
      ),
    [regRows],
  );
  const subjects = useMemo(
    () => dedupeBy(subRows, (r) => pickNum(r, SUBJECT_ID_KEYS)),
    [subRows],
  );

  idsRef.current = {
    courseId: Number(courseId ?? 0),
    academicYearId: Number(academicYearId ?? 0),
    examId: Number(examId ?? 0),
    collegeId: Number(collegeId ?? 0),
    courseGroupId: Number(courseGroupId ?? 0),
    courseYearId: Number(courseYearId ?? 0),
    regulationId: Number(regulationId ?? 0),
    employeeId,
  };

  const printCourseYear = yearLabel(
    years.find(
      (y) =>
        pickNum(y, ["fk_course_year_id", "courseYearId"]) ===
        Number(courseYearId),
    ) ?? {},
  );
  const printExamName = pickText(
    exams.find((e) => pickNum(e, ["fk_exam_id", "examId"]) === Number(examId)),
    ["exam_name", "examName"],
  );
  const printGroupName = pickText(
    groups.find(
      (x) =>
        pickNum(x, ["fk_course_group_id", "courseGroupId"]) ===
        Number(courseGroupId),
    ),
    ["group_name", "groupName", "group_code", "groupCode"],
  );
  const collegeLogo = useCollegeLogo(collegeId);
  const { printButtons } = useExamFormsPrint(students, {
    courseYear: printCourseYear === "-" ? "" : printCourseYear,
    examName: printExamName,
    logoUrl: collegeLogo,
    groupName: printGroupName,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    subjectId,
    regulationId,
  });

  useEffect(() => {
    setIsMounted(true);
    restoreRef.current = loadExamFormsReturnState();
    const id = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
    setEmployeeId(Number.isFinite(id) ? id : 0);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once when employee ready
  }, [isMounted, employeeId]);

  function clearResults() {
    setStudents([]);
    setListLoaded(false);
    setSelectedData("");
  }

  function buildSelectedSummary(opts: {
    courseId: number;
    academicYearId: number;
    collegeId: number;
    courseGroupId: number;
    courseYearId: number;
    base: AnyRow[];
    rest: AnyRow[];
  }) {
    const course = dedupeBy(opts.base, (r) =>
      pickNum(r, ["fk_course_id", "courseId"]),
    ).find(
      (x) => pickNum(x, ["fk_course_id", "courseId"]) === Number(opts.courseId),
    );
    const ay = dedupeBy(
      opts.base.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId"]) === Number(opts.courseId),
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    ).find(
      (x) =>
        pickNum(x, ["fk_academic_year_id", "academicYearId"]) ===
        Number(opts.academicYearId),
    );
    const col = dedupeBy(opts.rest, (r) =>
      pickNum(r, ["fk_college_id", "collegeId"]),
    ).find(
      (x) =>
        pickNum(x, ["fk_college_id", "collegeId"]) === Number(opts.collegeId),
    );
    const grp = dedupeBy(
      opts.rest.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === Number(opts.collegeId),
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    ).find(
      (x) =>
        pickNum(x, ["fk_course_group_id", "courseGroupId"]) ===
        Number(opts.courseGroupId),
    );
    const yr = dedupeBy(
      opts.rest.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) ===
            Number(opts.collegeId) &&
          pickNum(r, ["fk_course_group_id", "courseGroupId"]) ===
            Number(opts.courseGroupId),
      ),
      (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]),
    ).find(
      (x) =>
        pickNum(x, ["fk_course_year_id", "courseYearId"]) ===
        Number(opts.courseYearId),
    );
    return [
      pickText(col, ["college_code", "collegeCode"]),
      pickText(ay, ["academic_year", "academicYear"]),
      pickText(course, ["course_code", "courseCode"]),
      pickText(grp, ["group_code", "groupCode"]),
      yearLabel(yr ?? {}),
    ]
      .filter((p) => p && p !== "-")
      .join(" / ");
  }

  function normalizeStudents(list: AnyRow[]) {
    return list.map((r) => ({
      ...r,
      hallticket_number: r.hallticket_number ?? r.hallticketNumber,
      StudentName: r.StudentName ?? r.student_name ?? r.studentName,
      student_name: r.student_name ?? r.studentName ?? r.StudentName,
      omr_serial_no: r.omr_serial_no ?? r.omrSerialNo,
      is_present: r.is_present ?? r.isPresent ?? null,
      isPresent: r.is_present ?? r.isPresent ?? null,
      isUfm: r.isUfm ?? r.is_ufm ?? false,
    }));
  }

  /** Angular `selectedRegulation` — load subjects for univ_exam_subject_uc. */
  async function loadSubjectsFor(
    params: {
      collegeId: number;
      courseId: number;
      courseGroupId: number;
      courseYearId: number;
      examId: number;
      academicYearId: number;
      regulationId: number;
    },
    opts?: { selectFirst?: boolean; restoreSubjectId?: number },
  ) {
    if (
      !params.collegeId ||
      !params.courseId ||
      !params.courseGroupId ||
      !params.courseYearId ||
      !params.examId ||
      !params.academicYearId
    ) {
      setSubRows([]);
      setSubjectId(null);
      return;
    }
    const rows = await getUnivExamSubjectUc({
      collegeId: params.collegeId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      examId: params.examId,
      academicYearId: params.academicYearId,
      regulationId: params.regulationId || 0,
      employeeId: idsRef.current.employeeId,
    }).catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    setSubRows(list);
    if (skipCascadeRef.current && opts?.restoreSubjectId) {
      setSubjectId(opts.restoreSubjectId);
      return;
    }
    if (opts?.selectFirst === false) return;
    if (list[0]) setSubjectId(pickNum(list[0], SUBJECT_ID_KEYS));
    else setSubjectId(null);
  }

  /** Angular `selectedYear` — regulations from exam bundle, then subjects. */
  async function applyCourseYear(
    yearId: number,
    rest: AnyRow[],
    regs: AnyRow[],
    ctx: {
      collegeId: number;
      courseId: number;
      courseGroupId: number;
      examId: number;
      academicYearId: number;
    },
    restore?: ExamFormsReturnState | null,
  ) {
    setCourseYearId(yearId || null);
    setSubjectId(null);
    setSubRows([]);

    const regList = dedupeBy(regs, (r) => pickNum(r, REG_ID_KEYS)).filter(
      (r) => pickNum(r, REG_ID_KEYS) > 0,
    );
    setRegRows(regList);

    const regId =
      restore?.regulationId && restore.regulationId > 0
        ? restore.regulationId
        : pickNum(regList[0], REG_ID_KEYS);
    setRegulationId(regId || null);
    setSelectedBackendRegulationId(regId || 0);

    if (regId > 0 || yearId > 0) {
      await loadSubjectsFor(
        {
          collegeId: ctx.collegeId,
          courseId: ctx.courseId,
          courseGroupId: ctx.courseGroupId,
          courseYearId: yearId,
          examId: ctx.examId,
          academicYearId: ctx.academicYearId,
          regulationId: regId,
        },
        {
          restoreSubjectId:
            restore?.subjectId && restore.subjectId > 0
              ? restore.subjectId
              : undefined,
        },
      );
    }

    void rest;
  }

  /** Angular `selectedGroup`. */
  async function applyCourseGroup(
    groupId: number,
    rest: AnyRow[],
    regs: AnyRow[],
    ctx: {
      collegeId: number;
      courseId: number;
      examId: number;
      academicYearId: number;
    },
    restore?: ExamFormsReturnState | null,
  ) {
    setCourseGroupId(groupId || null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setSubRows([]);

    const yearList = dedupeBy(
      rest.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === ctx.collegeId &&
          pickNum(r, ["fk_course_group_id", "courseGroupId"]) === groupId,
      ),
      (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]),
    ).filter((r) => {
      const id = pickNum(r, ["fk_course_year_id", "courseYearId"]);
      const code = pickText(r, [
        "course_year_code",
        "courseYearCode",
        "course_year_name",
        "courseYearName",
      ]);
      return id > 0 && !!code;
    });
    const yearId =
      restore?.courseYearId && restore.courseYearId > 0
        ? restore.courseYearId
        : pickNum(yearList[0], ["fk_course_year_id", "courseYearId"]);
    if (yearId > 0) {
      await applyCourseYear(
        yearId,
        rest,
        regs,
        { ...ctx, courseGroupId: groupId },
        restore,
      );
    }
  }

  /** Angular `selectedCollege`. */
  async function applyCollege(
    clgId: number,
    rest: AnyRow[],
    regs: AnyRow[],
    ctx: { courseId: number; examId: number; academicYearId: number },
    restore?: ExamFormsReturnState | null,
  ) {
    setCollegeId(clgId || null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setSubRows([]);

    const groupList = dedupeBy(
      rest.filter((r) => pickNum(r, ["fk_college_id", "collegeId"]) === clgId),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    ).filter((r) => {
      const id = pickNum(r, ["fk_course_group_id", "courseGroupId"]);
      const code = pickText(r, ["group_code", "groupCode"]);
      return id > 0 && !!code;
    });
    const groupId =
      restore?.courseGroupId && restore.courseGroupId > 0
        ? restore.courseGroupId
        : pickNum(groupList[0], ["fk_course_group_id", "courseGroupId"]);
    if (groupId > 0) {
      await applyCourseGroup(
        groupId,
        rest,
        regs,
        { ...ctx, collegeId: clgId },
        restore,
      );
    }
  }

  /** Angular `selectedExam` — univ_exam_rest_no_tt. */
  async function onExamChange(
    eid: number,
    cidArg?: number,
    ayArg?: number,
    restore?: ExamFormsReturnState | null,
    baseForSummary?: AnyRow[],
  ) {
    const cid = Number(cidArg ?? idsRef.current.courseId);
    const ayid = Number(ayArg ?? idsRef.current.academicYearId);
    if (!cid || !ayid || !eid) return;

    setExamId(eid);
    if (!restore) {
      setCollegeId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setRegulationId(null);
      setSelectedBackendRegulationId(0);
      setSubjectId(null);
      setSubRows([]);
      setRestRows([]);
      setRegRows([]);
      clearResults();
    }

    const bundle = await getUnivExamRestNoTtBundle({
      courseId: cid,
      examId: eid,
      academicYearId: ayid,
      employeeId: idsRef.current.employeeId,
    }).catch(() => ({ restFilters: [], regulations: [] }));
    const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
    const regs = Array.isArray(bundle.regulations) ? bundle.regulations : [];
    setRestRows(rest);
    setRegRows(dedupeBy(regs, (r) => pickNum(r, REG_ID_KEYS)));

    if (restore && restore.collegeId > 0) {
      await applyCollege(
        restore.collegeId,
        rest,
        regs,
        { courseId: cid, examId: eid, academicYearId: ayid },
        restore,
      );
      setSelectedData(
        restore.selectedData ||
          buildSelectedSummary({
            courseId: cid,
            academicYearId: ayid,
            collegeId: restore.collegeId,
            courseGroupId: restore.courseGroupId,
            courseYearId: restore.courseYearId,
            base: baseForSummary ?? baseRows,
            rest,
          }),
      );
      if (Array.isArray(restore.students) && restore.students.length > 0) {
        setStudents(normalizeStudents(restore.students as AnyRow[]));
      }
      setListLoaded(true);
      return;
    }

    const clgList = dedupeBy(rest, (r) =>
      pickNum(r, ["fk_college_id", "collegeId"]),
    ).filter((r) => {
      const id = pickNum(r, ["fk_college_id", "collegeId"]);
      const code = pickText(r, ["college_code", "collegeCode"]);
      return id > 0 && !!code;
    });
    const clgId = pickNum(clgList[0], ["fk_college_id", "collegeId"]);
    if (clgId > 0) {
      await applyCollege(
        clgId,
        rest,
        regs,
        { courseId: cid, examId: eid, academicYearId: ayid },
        null,
      );
    } else {
      setCollegeId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubRows([]);
    }
  }

  /** Angular `selectedAcademicYear`. */
  async function onAcademicYearChange(
    ayid: number,
    cidArg?: number,
    restore?: ExamFormsReturnState | null,
    baseList?: AnyRow[],
  ) {
    const cid = Number(cidArg ?? idsRef.current.courseId);
    const list = baseList ?? baseRows;
    setAcademicYearId(ayid || null);
    setExamId(null);
    setCollegeId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setRestRows([]);
    setRegRows([]);
    setSubRows([]);
    if (!restore) clearResults();

    const examList = dedupeBy(
      list.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId"]) === cid &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ayid,
      ),
      (r) => pickNum(r, ["fk_exam_id", "examId"]),
    );
    const eid =
      restore?.examId && restore.examId > 0
        ? restore.examId
        : pickNum(examList[0], ["fk_exam_id", "examId"]);
    if (eid > 0) {
      await onExamChange(eid, cid, ayid, restore, list);
    }
  }

  /** Angular `selectedCourse`. */
  async function onCourseChange(
    cid: number,
    restore?: ExamFormsReturnState | null,
    baseList?: AnyRow[],
  ) {
    const list = baseList ?? baseRows;
    setCourseId(cid || null);
    setAcademicYearId(null);
    setExamId(null);
    setCollegeId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSelectedBackendRegulationId(0);
    setSubjectId(null);
    setRestRows([]);
    setRegRows([]);
    setSubRows([]);
    if (!restore) clearResults();

    const ayList = dedupeBy(
      list.filter((r) => pickNum(r, ["fk_course_id", "courseId"]) === cid),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    );
    const sorted = [...ayList].sort(
      (a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0),
    );
    const ayid =
      restore?.academicYearId && restore.academicYearId > 0
        ? restore.academicYearId
        : pickNum(sorted[0], ["fk_academic_year_id", "academicYearId"]);
    if (ayid > 0) {
      await onAcademicYearChange(ayid, cid, restore, list);
    }
  }

  async function init() {
    setLoading(true);
    try {
      const restore = restoreRef.current;
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      setBaseRows(list);

      const defaultCourse = dedupeBy(list, (r) =>
        pickNum(r, ["fk_course_id", "courseId"]),
      ).find((r) => pickNum(r, ["fk_course_id", "courseId"]) > 0);
      const cid =
        (restore?.courseId && restore.courseId > 0
          ? restore.courseId
          : pickNum(defaultCourse, ["fk_course_id", "courseId"])) || 0;
      if (!cid) return;

      if (restore) skipCascadeRef.current = true;
      await onCourseChange(cid, restore, list);

      if (restore) {
        clearExamFormsReturnState();
        restoreRef.current = null;
        window.setTimeout(() => {
          skipCascadeRef.current = false;
        }, 0);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onCollegeUserChange(clgId: number | null) {
    clearResults();
    const rest = restRows;
    const regs = regRows;
    const ctx = {
      courseId: idsRef.current.courseId,
      examId: idsRef.current.examId,
      academicYearId: idsRef.current.academicYearId,
    };
    if (!clgId) {
      setCollegeId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubRows([]);
      return;
    }
    await applyCollege(clgId, rest, regs, ctx, null);
  }

  async function onGroupUserChange(groupId: number | null) {
    clearResults();
    const rest = restRows;
    const regs = regRows;
    const ctx = {
      collegeId: idsRef.current.collegeId,
      courseId: idsRef.current.courseId,
      examId: idsRef.current.examId,
      academicYearId: idsRef.current.academicYearId,
    };
    if (!groupId) {
      setCourseGroupId(null);
      setCourseYearId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubRows([]);
      return;
    }
    await applyCourseGroup(groupId, rest, regs, ctx, null);
  }

  async function onYearUserChange(yearId: number | null) {
    clearResults();
    const rest = restRows;
    const regs = regRows;
    const ctx = {
      collegeId: idsRef.current.collegeId,
      courseId: idsRef.current.courseId,
      courseGroupId: idsRef.current.courseGroupId,
      examId: idsRef.current.examId,
      academicYearId: idsRef.current.academicYearId,
    };
    if (!yearId) {
      setCourseYearId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubRows([]);
      return;
    }
    await applyCourseYear(yearId, rest, regs, ctx, null);
  }

  async function onRegulationUserChange(regId: number | null) {
    clearResults();
    setRegulationId(regId);
    setSelectedBackendRegulationId(regId ?? 0);
    setSubjectId(null);
    await loadSubjectsFor({
      collegeId: idsRef.current.collegeId,
      courseId: idsRef.current.courseId,
      courseGroupId: idsRef.current.courseGroupId,
      courseYearId: idsRef.current.courseYearId,
      examId: idsRef.current.examId,
      academicYearId: idsRef.current.academicYearId,
      regulationId: regId ?? 0,
    });
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId)
      return;
    setLoading(true);
    try {
      // Angular getDetails: build summary first, then load OMR students.
      setSelectedData(
        buildSelectedSummary({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          collegeId: Number(collegeId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          base: baseRows,
          rest: restRows,
        }),
      );

      // Angular listByFourteenIds always passes in_regulation_id = 0 for exam forms.
      const rows = await getExamOmrStudents({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId: 0,
        subjectId,
      }).catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      setStudents(normalizeStudents(list));
      setListLoaded(true);
      // Angular: empty → success toast "No Records Found." (print buttons stay hidden)
      if (list.length === 0) toastSuccess("No Records Found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FilteredListPage
      title="Exam Forms"
      tableTitle={selectedData}
      filters={
        <>
          <GlobalFilterBarRow className="global-filter-bar__row--ef-r1">
            <GlobalFilterField
              label="Course *"
              className="global-filter-field--fx20"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  const cid = v ? Number(v) : null;
                  if (cid) void onCourseChange(cid);
                  else {
                    setCourseId(null);
                    setAcademicYearId(null);
                    setExamId(null);
                    setCollegeId(null);
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    setRegulationId(null);
                    setSubjectId(null);
                    setRestRows([]);
                    setRegRows([]);
                    setSubRows([]);
                    clearResults();
                  }
                }}
                options={courses.map((c) => ({
                  value: String(pickNum(c, ["fk_course_id", "courseId"])),
                  label:
                    pickText(c, [
                      "course_code",
                      "courseCode",
                      "course_name",
                      "courseName",
                    ]) || "-",
                }))}
                placeholder="Course"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year *"
              className="global-filter-field--fx20"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  const ayid = v ? Number(v) : null;
                  if (ayid) void onAcademicYearChange(ayid);
                  else {
                    setAcademicYearId(null);
                    setExamId(null);
                    setCollegeId(null);
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    setRegulationId(null);
                    setSubjectId(null);
                    setRestRows([]);
                    setRegRows([]);
                    setSubRows([]);
                    clearResults();
                  }
                }}
                options={academicYears.map((a) => ({
                  value: String(
                    pickNum(a, ["fk_academic_year_id", "academicYearId"]),
                  ),
                  label: pickText(a, ["academic_year", "academicYear"]) || "-",
                }))}
                placeholder="Exam Year"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Master *"
              className="global-filter-field--fx60"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  const eid = v ? Number(v) : null;
                  if (eid) void onExamChange(eid);
                  else {
                    setExamId(null);
                    setCollegeId(null);
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    setRegulationId(null);
                    setSubjectId(null);
                    setRestRows([]);
                    setRegRows([]);
                    setSubRows([]);
                    clearResults();
                  }
                }}
                searchable
                wrapOptionLabels
                options={exams.map((e) => {
                  const label = formatExamOptionLabel(e);
                  return {
                    value: String(pickNum(e, ["fk_exam_id", "examId"])),
                    label,
                    title: label,
                    labelNode: examOptionLabelNode(e),
                  };
                })}
                placeholder="Exam Master"
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow className="global-filter-bar__row--ef-r2">
            <GlobalFilterField
              label="College *"
              className="global-filter-field--fx20"
            >
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => void onCollegeUserChange(v ? Number(v) : null)}
                options={colleges.map((c) => ({
                  value: String(pickNum(c, ["fk_college_id", "collegeId"])),
                  label:
                    pickText(c, [
                      "college_code",
                      "collegeCode",
                      "college_name",
                      "collegeName",
                    ]) || "-",
                }))}
                placeholder="College"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Group *"
              className="global-filter-field--fx20"
            >
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => void onGroupUserChange(v ? Number(v) : null)}
                options={groups.map((g) => ({
                  value: String(
                    pickNum(g, ["fk_course_group_id", "courseGroupId"]),
                  ),
                  label: pickText(g, ["group_code", "groupCode"]) || "-",
                }))}
                placeholder="Course Group"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Years *"
              className="global-filter-field--fx20"
            >
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => void onYearUserChange(v ? Number(v) : null)}
                options={years.map((y) => ({
                  value: String(
                    pickNum(y, ["fk_course_year_id", "courseYearId"]),
                  ),
                  label: yearLabel(y),
                }))}
                placeholder="Course Year"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Regulation *"
              className="global-filter-field--fx20"
            >
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) =>
                  void onRegulationUserChange(v ? Number(v) : null)
                }
                options={regulations.map((r) => ({
                  value: String(pickNum(r, REG_ID_KEYS)),
                  label:
                    pickText(r, [
                      "regulation_code",
                      "regulationCode",
                      "regulation_name",
                      "regulationName",
                    ]) || "-",
                }))}
                placeholder="Regulation"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Subject *"
              className="global-filter-field--fx30"
            >
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => {
                  clearResults();
                  setSubjectId(v ? Number(v) : null);
                }}
                searchable
                wrapOptionLabels
                options={subjects.map((s) => ({
                  value: String(pickNum(s, SUBJECT_ID_KEYS)),
                  label:
                    (pickText(s, ["subject_name", "subjectName"]) || "-") +
                    " (" +
                    (pickText(s, ["subject_code", "subjectCode"]) || "-") +
                    ")",
                }))}
                placeholder="Subject"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=" "
              className="global-filter-field--action global-filter-field--fx10"
            >
              <Button
                type="button"
                onClick={getList}
                disabled={loading}
                className="h-[30px] px-3 text-[12px] shrink-0 w-full"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
      body={
        listLoaded ? (
          <div className="flex min-h-[4rem] flex-col gap-4">
            {/* Angular: print buttons only when subjectModerationStudents.length > 0 */}
            {students.length > 0 ? (
              <div className="printbtn flex flex-wrap justify-end gap-3">
                {printButtons}
              </div>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
