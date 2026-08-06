"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from "@/services/pre-examination";
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
    if (seen.has(key)) return false;
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
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

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
      ).filter((r) => pickNum(r, ["fk_college_id", "collegeId"]) > 0),
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
      ),
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
      ),
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

  const printCourseYear = pickText(
    years.find(
      (y) =>
        pickNum(y, ["fk_course_year_id", "courseYearId"]) ===
        Number(courseYearId),
    ),
    [
      "course_year_name",
      "courseYearName",
      "course_year_code",
      "courseYearCode",
    ],
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
    courseYear: printCourseYear,
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
  }, [isMounted, employeeId]);

  useEffect(() => {
    if (skipCascadeRef.current) return;
    setCourseGroupId(null);
    setCourseYearId(null);
    setSubRows([]);
    setSubjectId(null);
    const first = groups[0];
    if (first)
      setCourseGroupId(pickNum(first, ["fk_course_group_id", "courseGroupId"]));
  }, [collegeId]);

  useEffect(() => {
    if (skipCascadeRef.current) return;
    setCourseYearId(null);
    setSubRows([]);
    setSubjectId(null);
    const first = years[0];
    if (first)
      setCourseYearId(pickNum(first, ["fk_course_year_id", "courseYearId"]));
  }, [courseGroupId]);

  useEffect(() => {
    if (!regulations.length) return;
    if (skipCascadeRef.current) return;
    if (!regulationId) {
      const first = regulations[0];
      setRegulationId(pickNum(first, REG_ID_KEYS));
      setSelectedBackendRegulationId(pickNum(first, REG_ID_KEYS));
    }
  }, [regulations, regulationId]);

  useEffect(() => {
    if (!regulationId) return;
    if (skipCascadeRef.current) return;
    void loadSubjects(regulationId);
  }, [regulationId]);

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
      (x) =>
        pickNum(x, ["fk_course_id", "courseId"]) === Number(opts.courseId),
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
      pickText(yr, [
        "course_year_name",
        "courseYearName",
        "course_year_code",
        "courseYearCode",
      ]),
    ]
      .filter(Boolean)
      .join(" / ");
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

      const defaultAy = dedupeBy(
        list.filter((r) => pickNum(r, ["fk_course_id", "courseId"]) === cid),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
      )[0];
      const ayid =
        (restore?.academicYearId && restore.academicYearId > 0
          ? restore.academicYearId
          : pickNum(defaultAy, ["fk_academic_year_id", "academicYearId"])) || 0;
      if (!ayid) return;

      const defaultEx = dedupeBy(
        list.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId"]) === cid &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ayid,
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId"]),
      )[0];
      const eid =
        (restore?.examId && restore.examId > 0
          ? restore.examId
          : pickNum(defaultEx, ["fk_exam_id", "examId"])) || 0;
      if (!eid) return;

      if (restore) skipCascadeRef.current = true;
      setCourseId(cid);
      setAcademicYearId(ayid);
      setExamId(eid);
      await onExamChange(eid, cid, ayid, restore, list);

      if (restore) {
        clearExamFormsReturnState();
        restoreRef.current = null;
        // Release cascade lock after state + effects flush.
        window.setTimeout(() => {
          skipCascadeRef.current = false;
        }, 0);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onExamChange(
    eid: number,
    cidArg?: number,
    ayArg?: number,
    restore?: ExamFormsReturnState | null,
    baseForSummary?: AnyRow[],
  ) {
    const cid = Number(cidArg ?? courseId ?? 0);
    const ayid = Number(ayArg ?? academicYearId ?? 0);
    if (!cid || !ayid) return;
    const bundle = await getUnivExamRestNoTtBundle({
      courseId: cid,
      examId: eid,
      academicYearId: ayid,
      employeeId,
    }).catch(() => ({ restFilters: [], regulations: [] }));
    const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
    const regs = Array.isArray(bundle.regulations) ? bundle.regulations : [];
    setRestRows(rest);
    setRegRows(dedupeBy([...regs, ...rest], (r) => pickNum(r, REG_ID_KEYS)));

    if (restore && restore.collegeId > 0) {
      const regId = restore.regulationId > 0 ? restore.regulationId : 0;
      const groupId = restore.courseGroupId > 0 ? restore.courseGroupId : 0;
      const yearId = restore.courseYearId > 0 ? restore.courseYearId : 0;
      const subId = restore.subjectId > 0 ? restore.subjectId : 0;

      setCollegeId(restore.collegeId);
      setCourseGroupId(groupId || null);
      setCourseYearId(yearId || null);
      setRegulationId(regId || null);
      setSelectedBackendRegulationId(regId);

      if (restore.collegeId && cid && groupId && yearId && eid && ayid) {
        const subList = await getUnivExamSubjectUc({
          collegeId: restore.collegeId,
          courseId: cid,
          courseGroupId: groupId,
          courseYearId: yearId,
          examId: eid,
          academicYearId: ayid,
          regulationId: regId,
          employeeId,
        }).catch(() => []);
        const subjects = Array.isArray(subList) ? subList : [];
        setSubRows(subjects);
        if (subId > 0) setSubjectId(subId);
        else if (subjects[0])
          setSubjectId(pickNum(subjects[0], SUBJECT_ID_KEYS));
      }

      setSelectedData(
        restore.selectedData ||
          buildSelectedSummary({
            courseId: cid,
            academicYearId: ayid,
            collegeId: restore.collegeId,
            courseGroupId: groupId,
            courseYearId: yearId,
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

    const clg = dedupeBy(rest, (r) =>
      pickNum(r, ["fk_college_id", "collegeId"]),
    ).find((r) => pickNum(r, ["fk_college_id", "collegeId"]) > 0);
    if (clg) setCollegeId(pickNum(clg, ["fk_college_id", "collegeId"]));
  }

  async function loadSubjects(targetRegId?: number | null) {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !examId ||
      !academicYearId
    )
      return;
    const backendReg = Number(
      targetRegId ?? selectedBackendRegulationId ?? regulationId ?? 0,
    );
    const rows = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: backendReg,
      employeeId,
    }).catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    setSubRows(list);
    if (skipCascadeRef.current) return;
    if (list[0]) setSubjectId(pickNum(list[0], SUBJECT_ID_KEYS));
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId)
      return;
    setLoading(true);
    try {
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

      const rows = await getExamOmrStudents({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId: selectedBackendRegulationId || regulationId || 0,
        subjectId,
      }).catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      setStudents(normalizeStudents(list));
      setListLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FilteredListPage
      title="Exam Forms"
      filters={
        <>
          <GlobalFilterBarRow className="global-filter-bar__row--ef-r1">
            <GlobalFilterField label="Course *" className="global-filter-field--fx20">
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : null)}
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
                onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
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
                  setExamId(eid);
                  if (eid)
                    void onExamChange(
                      eid,
                      courseId ?? undefined,
                      academicYearId ?? undefined,
                    );
                }}
                options={exams.map((e) => ({
                  value: String(pickNum(e, ["fk_exam_id", "examId"])),
                  label: pickText(e, ["exam_name", "examName"]) || "-",
                }))}
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
                onChange={(v) => setCollegeId(v ? Number(v) : null)}
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
                onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
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
                onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                options={years.map((y) => ({
                  value: String(
                    pickNum(y, ["fk_course_year_id", "courseYearId"]),
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
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Regulation *"
              className="global-filter-field--fx20"
            >
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => {
                  const id = v ? Number(v) : null;
                  setRegulationId(id);
                  setSelectedBackendRegulationId(id ?? 0);
                  setSubjectId(null);
                }}
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
                onChange={(v) => setSubjectId(v ? Number(v) : null)}
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
          <div className="flex min-h-[10rem] flex-col justify-between gap-4">
            {selectedData ? (
              <strong className="text-[14px] text-[hsl(var(--primary))]">
                {selectedData}
              </strong>
            ) : null}
            {students.length > 0 ? (
              <div className="flex justify-end">{printButtons}</div>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
