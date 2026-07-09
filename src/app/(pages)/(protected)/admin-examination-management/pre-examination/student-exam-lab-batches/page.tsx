"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import { ChevronDown, Filter } from "lucide-react";
import {
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUcLab,
  getExamLabBatchesReport,
  listExamFeeTypes,
  listStudentExamLabBatches,
  addExamLabBatchesStudentsList,
  updateExamLabBatchesStudents,
} from "@/services/pre-examination";
import { PageContainer, PageHeader } from "@/components/layout";
import { MINIO_URL } from "@/config/constants/api";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import { useLabBatchPrint } from "./_print/useLabBatchPrint";

type AnyRow = Record<string, any>;

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

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function StudentExamLabBatchesPage() {
  const [employeeId, setEmployeeId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [regRows, setRegRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [flag, setFlag] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [examStudentList, setExamStudentList] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentBatches, setStudentBatches] = useState<AnyRow[]>([]);
  const [studentBatchesData, setStudentBatchesData] = useState<AnyRow[]>([]);
  const [batchesData, setBatchesData] = useState<AnyRow[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [checkAll, setCheckAll] = useState(false);
  const [updateBatchByStdDetId, setUpdateBatchByStdDetId] = useState<
    Record<number, number>
  >({});
  const [notice, setNotice] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const collegeLogo = useCollegeLogo(collegeId);

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
      ),
    [baseRows, courseId],
  );
  const examsList = useMemo(
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
    () => dedupeBy(restRows, (r) => pickNum(r, ["fk_college_id", "collegeId"])),
    [restRows],
  );
  const courseGroups = useMemo(
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
  const courseYears = useMemo(
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
  const regulationList = useMemo(
    () =>
      dedupeBy(regRows, (r) =>
        pickNum(r, ["fk_regulation_id", "regulationId"]),
      ),
    [regRows],
  );
  const subjectData = useMemo(
    () =>
      dedupeBy(subjectRows, (r) => pickNum(r, ["fk_subject_id", "subjectId"])),
    [subjectRows],
  );

  const printMeta = useMemo(() => {
    const collegeRow = colleges.find(
      (c) => pickNum(c, ["fk_college_id", "collegeId"]) === Number(collegeId),
    );
    const logoFromFilter = pickText(collegeRow, [
      "logo_filename",
      "logoFilename",
      "logo",
    ]);
    const resolvedLogo =
      collegeLogo && !collegeLogo.endsWith("default_logo.png")
        ? collegeLogo
        : logoFromFilter
          ? `${MINIO_URL}${logoFromFilter.replace(/^\/+/, "")}`
          : collegeLogo || DEFAULT_COLLEGE_LOGO;

    return {
      collegeName: pickText(collegeRow, ["college_name", "collegeName"]),
      courseName: pickText(
        courses.find(
          (c) => pickNum(c, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["course_code", "courseCode"],
      ),
      courseGroupName: pickText(
        courseGroups.find(
          (g) =>
            pickNum(g, ["fk_course_group_id", "courseGroupId"]) ===
            Number(courseGroupId),
        ),
        ["group_code", "groupCode"],
      ),
      subjectName: pickText(
        subjectData.find(
          (s) =>
            pickNum(s, ["fk_subject_id", "subjectId"]) === Number(subjectId),
        ),
        ["subject_name", "subjectName"],
      ),
      subjectCode: pickText(
        subjectData.find(
          (s) =>
            pickNum(s, ["fk_subject_id", "subjectId"]) === Number(subjectId),
        ),
        ["subject_code", "subjectCode"],
      ),
      courseYearName: pickText(
        courseYears.find(
          (y) =>
            pickNum(y, ["fk_course_year_id", "courseYearId"]) ===
            Number(courseYearId),
        ),
        ["course_year_code", "courseYearCode"],
      ),
      examEndName: pickText(
        examsList.find(
          (e) => pickNum(e, ["fk_exam_id", "examId"]) === Number(examId),
        ),
        ["exam_end_name", "examEndName"],
      ),
      logoUrl: resolvedLogo,
    };
  }, [
    colleges,
    collegeId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    subjectData,
    subjectId,
    courseYears,
    courseYearId,
    examsList,
    examId,
    collegeLogo,
  ]);

  const { printButton } = useLabBatchPrint(
    batchesData,
    studentBatchesData,
    printMeta,
  );

  useEffect(() => {
    const id = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
    setEmployeeId(Number.isFinite(id) ? id : 0);
  }, []);

  useEffect(() => {
    void init();
  }, [employeeId]);

  useEffect(() => {
    if (academicYears[0])
      setAcademicYearId(
        pickNum(academicYears[0], ["fk_academic_year_id", "academicYearId"]),
      );
  }, [academicYears]);

  useEffect(() => {
    if (examsList[0]) {
      const eid = pickNum(examsList[0], ["fk_exam_id", "examId"]);
      setExamId(eid);
      void selectedExam(eid);
    }
  }, [examsList]);

  useEffect(() => {
    const selectedExamRow = examsList.find(
      (x) => pickNum(x, ["fk_exam_id", "examId"]) === Number(examId),
    );
    if (!selectedExamRow || examFeeTypes.length === 0) return;
    const filtered: AnyRow[] = [];
    for (const t of examFeeTypes) {
      const code = String(t.generalDetailCode ?? "").toLowerCase();
      if (selectedExamRow.is_regular_exam && code === "regular")
        filtered.push(t);
      if (selectedExamRow.is_supply_exam && code === "supple") filtered.push(t);
      if (selectedExamRow.is_internal_exam && code === "internal")
        filtered.push(t);
    }
    if (filtered.length > 0)
      setExamTypeId(Number(filtered[0].generalDetailId ?? 0));
  }, [examId, examsList, examFeeTypes]);

  useEffect(() => {
    if (courseGroups[0])
      setCourseGroupId(
        pickNum(courseGroups[0], ["fk_course_group_id", "courseGroupId"]),
      );
  }, [courseGroups]);
  useEffect(() => {
    if (courseYears[0])
      setCourseYearId(
        pickNum(courseYears[0], ["fk_course_year_id", "courseYearId"]),
      );
  }, [courseYears]);
  useEffect(() => {
    if (regulationList[0])
      setRegulationId(
        pickNum(regulationList[0], ["fk_regulation_id", "regulationId"]),
      );
  }, [regulationList]);

  useEffect(() => {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !examId ||
      !academicYearId ||
      !regulationId
    )
      return;
    void selectedRegulation(regulationId);
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    regulationId,
  ]);

  async function init() {
    setLoading(true);
    try {
      const [filters, feeTypes] = await Promise.all([
        getUnivExamFiltersRegSup(employeeId).catch(() => []),
        listExamFeeTypes().catch(() => []),
      ]);
      const rows = Array.isArray(filters) ? filters : [];
      setBaseRows(rows);
      setExamFeeTypes(Array.isArray(feeTypes) ? feeTypes : []);
      const firstCourse = dedupeBy(rows, (r) =>
        pickNum(r, ["fk_course_id", "courseId"]),
      )[0];
      if (firstCourse)
        setCourseId(pickNum(firstCourse, ["fk_course_id", "courseId"]));
    } finally {
      setLoading(false);
    }
  }

  async function selectedExam(eid?: number | null) {
    const exId = Number(eid ?? examId ?? 0);
    if (!courseId || !academicYearId || !exId) return;
    const bundle = await getUnivExamRestNoTtBundle({
      courseId: Number(courseId),
      examId: exId,
      academicYearId: Number(academicYearId),
      employeeId,
    }).catch(() => ({ restFilters: [], regulations: [] }));
    const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
    const regs = Array.isArray(bundle.regulations) ? bundle.regulations : [];
    setRestRows(rest);
    setRegRows(
      dedupeBy([...regs, ...rest], (r) =>
        pickNum(r, ["fk_regulation_id", "regulationId"]),
      ),
    );
    const firstCollege = dedupeBy(rest, (r) =>
      pickNum(r, ["fk_college_id", "collegeId"]),
    )[0];
    if (firstCollege)
      setCollegeId(pickNum(firstCollege, ["fk_college_id", "collegeId"]));
  }

  async function selectedRegulation(rid?: number | null) {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !examId ||
      !academicYearId
    )
      return;
    const rows = await getUnivExamSubjectUcLab({
      collegeId: Number(collegeId),
      courseId: Number(courseId),
      courseGroupId: Number(courseGroupId),
      courseYearId: Number(courseYearId),
      examId: Number(examId),
      academicYearId: Number(academicYearId),
      regulationId: Number(rid ?? regulationId ?? 0),
      employeeId,
    }).catch(() => []);
    const sub = Array.isArray(rows) ? rows : [];
    setSubjectRows(sub);
    if (sub[0]) setSubjectId(pickNum(sub[0], ["fk_subject_id", "subjectId"]));
  }

  async function getLabBatches() {
    if (
      !collegeId ||
      !examId ||
      !courseYearId ||
      !courseGroupId ||
      !regulationId ||
      !subjectId ||
      !examTypeId
    )
      return;
    setLoading(true);
    try {
      const [batches, reportRows] = await Promise.all([
        listStudentExamLabBatches({
          collegeId,
          examId,
          courseYearId,
          courseGroupId,
          regulationId,
          subjectId,
          examTypeId,
        }).catch(() => []),
        getExamLabBatchesReport({
          examId,
          collegeId,
          courseId: Number(courseId ?? 0),
          academicYearId: Number(academicYearId ?? 0),
          courseGroupId,
          courseYearId,
          subjectId,
          examTypeId,
        }).catch(() => []),
      ]);

      setStudentBatches(Array.isArray(batches) ? batches : []);
      const batchList = Array.isArray(batches) ? batches : [];
      if (batchList[0])
        setSelectedBatchId(
          pickNum(batchList[0], [
            "eaxmLabBatchId",
            "fk_exam_labbatch_id",
            "examLabBatchId",
          ]),
        );
      const report = Array.isArray(reportRows) ? reportRows : [];
      const unassigned = report.filter(
        (r) => !pickNum(r, ["fk_exam_labbatch_id", "examLabBatchId"]),
      );
      const assigned = report.filter(
        (r) => pickNum(r, ["fk_exam_labbatch_id", "examLabBatchId"]) > 0,
      );
      const uniqBatches = dedupeBy(assigned, (r) =>
        pickNum(r, ["fk_exam_labbatch_id", "examLabBatchId"]),
      );
      setStudents(unassigned);
      setExamStudentList(unassigned);
      setStudentBatchesData(assigned);
      setBatchesData(uniqBatches);

      const clg = colleges.find(
        (x) => pickNum(x, ["fk_college_id", "collegeId"]) === Number(collegeId),
      );
      const course = courses.find(
        (x) => pickNum(x, ["fk_course_id", "courseId"]) === Number(courseId),
      );
      const group = courseGroups.find(
        (x) =>
          pickNum(x, ["fk_course_group_id", "courseGroupId"]) ===
          Number(courseGroupId),
      );
      const year = courseYears.find(
        (x) =>
          pickNum(x, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      );
      const exam = examsList.find(
        (x) => pickNum(x, ["fk_exam_id", "examId"]) === Number(examId),
      );
      const sub = subjectData.find(
        (x) => pickNum(x, ["fk_subject_id", "subjectId"]) === Number(subjectId),
      );
      setHeaderText(
        `${pickText(clg, ["college_code", "collegeCode"])} / ${pickText(course, ["course_code", "courseCode"])} / ${pickText(group, ["group_code", "groupCode"])} / ${pickText(year, ["course_year_code", "courseYearCode"])} / ${pickText(exam, ["exam_name", "examName"])} / ${pickText(sub, ["subject_code", "subjectCode"])}`,
      );
      setFlag(true);
      setSelectedStudentIds([]);
      setCheckAll(false);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  function onSearchStudent(q: string) {
    setSearchStudent(q);
    const s = q.trim().toLowerCase();
    if (!s) {
      setExamStudentList(students);
      return;
    }
    setExamStudentList(
      students.filter((x) =>
        `${pickText(x, ["hallticket_number", "hallticketNumber"])} ${pickText(x, ["student_name", "studentName"])}`
          .toLowerCase()
          .includes(s),
      ),
    );
  }

  function onToggleAll(checked: boolean) {
    setCheckAll(checked);
    if (!checked) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(
      examStudentList
        .map((s) => pickNum(s, ["fk_student_id", "studentId"]))
        .filter((x) => x > 0),
    );
  }

  function onToggleStudent(checked: boolean, row: AnyRow) {
    const sid = pickNum(row, ["fk_student_id", "studentId"]);
    if (!sid) return;
    setSelectedStudentIds((prev) => {
      if (checked) return prev.includes(sid) ? prev : [...prev, sid];
      return prev.filter((x) => x !== sid);
    });
  }

  async function onAssignStudents() {
    if (!selectedBatchId) {
      setNotice("Please select a batch before assigning.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      setNotice("Please select at least one student.");
      return;
    }
    setLoading(true);
    try {
      const payload = selectedStudentIds.map((sid) => ({
        examLabBatchesId: selectedBatchId,
        studentDetailId: sid,
        isActive: true,
      }));
      await addExamLabBatchesStudentsList(payload).catch(() => null);
      setNotice("Students assigned successfully.");
      await getLabBatches();
    } finally {
      setLoading(false);
    }
  }

  async function onUpdateExamBatch(row: AnyRow) {
    const stdDetId = pickNum(row, [
      "fk_exam_std_det_id",
      "examLabBatchStdId",
      "examStdDetId",
    ]);
    const nextBatchId = Number(updateBatchByStdDetId[stdDetId] ?? 0);
    if (!stdDetId || !nextBatchId) return;
    setLoading(true);
    try {
      await updateExamLabBatchesStudents([
        {
          examLabBatchStdId: stdDetId,
          examLabBatchesId: nextBatchId,
        },
      ]).catch(() => null);
      setNotice("Student batch updated successfully.");
      await getLabBatches();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Lab Batches Students</h2>
          <Button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            variant="outline"
            size="sm"
            style={{ marginRight: "0px" }}
            className="h-6 px-2.5 text-[12px]"
            aria-expanded={!filtersCollapsed}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${!filtersCollapsed ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>
        {!filtersCollapsed && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((x) => ({
                    value: String(pickNum(x, ["fk_course_id", "courseId"])),
                    label: pickText(x, ["course_code", "courseCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((x) => ({
                    value: String(
                      pickNum(x, ["fk_academic_year_id", "academicYearId"]),
                    ),
                    label: pickText(x, ["academic_year", "academicYear"]),
                  }))}
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    const eid = v ? Number(v) : null;
                    setExamId(eid);
                    if (eid) void selectedExam(eid);
                  }}
                  options={examsList.map((x) => ({
                    value: String(pickNum(x, ["fk_exam_id", "examId"])),
                    label: pickText(x, ["exam_name", "examName"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Type</Label>
                <Select
                  value={examTypeId ? String(examTypeId) : null}
                  onChange={(v) => setExamTypeId(v ? Number(v) : null)}
                  options={examFeeTypes.map((x) => ({
                    value: String(pickNum(x, ["generalDetailId"])),
                    label: pickText(x, ["generalDetailCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => setCollegeId(v ? Number(v) : null)}
                  options={colleges.map((x) => ({
                    value: String(pickNum(x, ["fk_college_id", "collegeId"])),
                    label: pickText(x, ["college_code", "collegeCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                  options={courseGroups.map((x) => ({
                    value: String(
                      pickNum(x, ["fk_course_group_id", "courseGroupId"]),
                    ),
                    label: pickText(x, ["group_code", "groupCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Years</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map((x) => ({
                    value: String(
                      pickNum(x, ["fk_course_year_id", "courseYearId"]),
                    ),
                    label: pickText(x, ["course_year_code", "courseYearCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Regulation</Label>
                <Select
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => setRegulationId(v ? Number(v) : null)}
                  options={regulationList.map((x) => ({
                    value: String(
                      pickNum(x, ["fk_regulation_id", "regulationId"]),
                    ),
                    label: pickText(x, ["regulation_code", "regulationCode"]),
                  }))}
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Subject</Label>
                <Select
                  value={subjectId ? String(subjectId) : null}
                  onChange={(v) => setSubjectId(v ? Number(v) : null)}
                  options={subjectData.map((x) => ({
                    value: String(pickNum(x, ["fk_subject_id", "subjectId"])),
                    label: `${pickText(x, ["subject_name", "subjectName"])} (${pickText(x, ["subject_code", "subjectCode"])})`,
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={getLabBatches}
                  disabled={loading}
                  className="h-8 px-3 text-[12px] w-full"
                >
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {flag && (
        <div className="app-card p-3 space-y-2">
          <div className="text-[13px] font-semibold text-[hsl(var(--primary))]">
            Students - {headerText}
          </div>
          {notice && (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              {notice}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 border rounded">
              <div className="border-b p-2">
                <SearchInput
                  className="w-full max-w-sm"
                  placeholder="Search students…"
                  value={searchStudent}
                  onChange={onSearchStudent}
                />
              </div>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left w-10">
                        <input
                          type="checkbox"
                          checked={checkAll}
                          onChange={(e) => onToggleAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-2 py-1 text-left">
                        Students (Count: {examStudentList.length})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {examStudentList.map((s, i) => (
                      <tr key={`std-${i}`} className="border-t">
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(
                              pickNum(s, ["fk_student_id", "studentId"]),
                            )}
                            onChange={(e) =>
                              onToggleStudent(e.target.checked, s)
                            }
                          />
                        </td>
                        <td className="px-2 py-1">
                          {pickText(s, ["student_name", "studentName"])} (
                          {pickText(s, [
                            "hallticket_number",
                            "hallticketNumber",
                          ])}
                          )
                        </td>
                      </tr>
                    ))}
                    {examStudentList.length === 0 && (
                      <tr>
                        <td
                          className="px-2 py-2 text-muted-foreground"
                          colSpan={2}
                        >
                          No students
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:col-span-3 border rounded p-2">
              <div className="bg-[#c3d9ff] px-2 py-1 text-[12px] font-semibold">
                Exam Lab Batches
              </div>
              <div className="mt-2 space-y-2">
                <Select
                  value={selectedBatchId ? String(selectedBatchId) : null}
                  onChange={(v) => setSelectedBatchId(v ? Number(v) : null)}
                  options={studentBatches.map((b) => ({
                    value: String(
                      pickNum(b, [
                        "eaxmLabBatchId",
                        "fk_exam_labbatch_id",
                        "examLabBatchId",
                      ]),
                    ),
                    label: pickText(b, ["batchName", "labbatch_name"]),
                  }))}
                  placeholder="Select Batch"
                />
                <Button
                  type="button"
                  className="h-9 text-[12px] w-full"
                  onClick={onAssignStudents}
                  disabled={loading}
                >
                  Assign
                </Button>
              </div>
            </div>
            <div className="md:col-span-5 border rounded">
              <div className="max-h-[360px] overflow-auto">
                {batchesData.map((b, i) => (
                  <table key={`b-${i}`} className="w-full text-[12px] mb-2">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-1 text-left">
                          {pickText(b, ["labbatch_name", "batchName"])}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentBatchesData
                        .filter(
                          (x) =>
                            pickNum(x, [
                              "fk_exam_labbatch_id",
                              "examLabBatchId",
                            ]) ===
                            pickNum(b, [
                              "fk_exam_labbatch_id",
                              "examLabBatchId",
                              "eaxmLabBatchId",
                            ]),
                        )
                        .map((x, j) => {
                          const stdDetId = pickNum(x, [
                            "fk_exam_std_det_id",
                            "examLabBatchStdId",
                            "examStdDetId",
                          ]);
                          return (
                            <tr key={`as-${j}`} className="border-t">
                              <td className="px-2 py-1">
                                {pickText(x, ["student_name", "studentName"])} (
                                {pickText(x, [
                                  "hallticket_number",
                                  "hallticketNumber",
                                ])}
                                )
                              </td>
                              <td className="px-2 py-1 w-44">
                                <Select
                                  value={String(
                                    updateBatchByStdDetId[stdDetId] ??
                                      pickNum(x, [
                                        "fk_exam_labbatch_id",
                                        "examLabBatchId",
                                      ]),
                                  )}
                                  onChange={(v) =>
                                    setUpdateBatchByStdDetId((prev) => ({
                                      ...prev,
                                      [stdDetId]: v ? Number(v) : 0,
                                    }))
                                  }
                                  options={studentBatches.map((sb) => ({
                                    value: String(
                                      pickNum(sb, [
                                        "eaxmLabBatchId",
                                        "fk_exam_labbatch_id",
                                        "examLabBatchId",
                                      ]),
                                    ),
                                    label: pickText(sb, [
                                      "batchName",
                                      "labbatch_name",
                                    ]),
                                  }))}
                                />
                              </td>
                              <td className="px-2 py-1 w-20">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 px-2 text-[12px]"
                                  onClick={() => onUpdateExamBatch(x)}
                                >
                                  Update
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                ))}
                {batchesData.length === 0 && (
                  <div className="p-2 text-[12px] text-muted-foreground">
                    No assigned batches
                  </div>
                )}
              </div>
            </div>
          </div>
          {studentBatchesData.length > 0 && (
            <div className="flex justify-end">{printButton}</div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
