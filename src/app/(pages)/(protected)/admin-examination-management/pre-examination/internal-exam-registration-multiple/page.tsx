"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getUnivExamFiltersByType,
  getUnivExamRestNoTt,
  getUnivExamSubjectInss,
  listExamSubjectStudents,
  listRegisteredStudentsForExam,
  saveRegisteredExamSubjects,
} from "@/services/pre-examination";
import { listExamFeeTypeGeneralDetails } from "@/services";
import { utcMidnightIso } from "@/common/generic-functions";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";

type AnyRow = Record<string, any>;

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getStudentId = (s: AnyRow) =>
  Number(
    s.studentId ??
      s.fk_student_id ??
      s.student_id ??
      s.std_id ??
      s.studentDetailId ??
      s.fk_student_detail_id ??
      0,
  );

const getStudentKey = (s: AnyRow): string => {
  const id = getStudentId(s);
  if (id > 0) return `id:${id}`;
  const ht = String(
    s.hallticketNumber ??
      s.hallticket_number ??
      s.rollNumber ??
      s.roll_number ??
      "",
  )
    .trim()
    .toLowerCase();
  if (ht) return `ht:${ht}`;
  const name = String(
    s.firstName ?? s.studentName ?? s.stdName ?? s.student_name ?? "",
  )
    .trim()
    .toLowerCase();
  return `name:${name}`;
};

const normalizeStudentRow = (s: AnyRow): AnyRow => ({
  ...s,
  studentId: getStudentId(s),
  firstName: s.firstName ?? s.studentName ?? s.stdName ?? s.student_name ?? "",
  hallticketNumber:
    s.hallticketNumber ??
    s.rollNumber ??
    s.roll_number ??
    s.hallticket_number ??
    "",
});

export default function InternalExamRegistrationMultiplePage() {
  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<AnyRow[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [examtypeCatId, setExamtypeCatId] = useState<number | null>(null);

  const [searchAll, setSearchAll] = useState("");
  const [searchSelected, setSearchSelected] = useState("");
  const [searchRegistered, setSearchRegistered] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () =>
      dedupeBy(baseRows, (r) => Number(r.fk_course_id)).filter(
        (r) => Number(r.fk_course_id) > 0,
      ),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => Number(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)),
        (r) => Number(r.fk_course_group_id),
      ),
    [restRows, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            Number(r.fk_college_id) === Number(collegeId) &&
            Number(r.fk_course_group_id) === Number(courseGroupId),
        ),
        (r) => Number(r.fk_course_year_id),
      ),
    [restRows, collegeId, courseGroupId],
  );
  const regulations = useMemo(
    () => dedupeBy(subjectFilterRows, (r) => Number(r.fk_regulation_id)),
    [subjectFilterRows],
  );
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) => Number(r.fk_regulation_id) === Number(regulationId),
        ),
        (r) => Number(r.fk_subjecttype_catdet_id),
      ),
    [subjectFilterRows, regulationId],
  );
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) =>
            Number(r.fk_regulation_id) === Number(regulationId) &&
            Number(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        ),
        (r) => Number(r.fk_subject_id),
      ),
    [subjectFilterRows, regulationId, subjectTypeId],
  );

  const checkedCount = useMemo(
    () => students.filter((s) => !!s.c).length,
    [students],
  );

  const studentsFiltered = useMemo(() => {
    const q = searchAll.trim().toLowerCase();
    const src = students;
    if (!q) return src;
    return src.filter((s) =>
      `${s.firstName ?? s.studentName ?? ""} ${s.hallticketNumber ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [students, searchAll]);
  const selectedFiltered = useMemo(() => {
    const q = searchSelected.trim().toLowerCase();
    if (!q) return selectedStudents;
    return selectedStudents.filter((s) =>
      `${s.firstName ?? s.studentName ?? ""} ${s.hallticketNumber ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [selectedStudents, searchSelected]);
  const registeredFiltered = useMemo(() => {
    const q = searchRegistered.trim().toLowerCase();
    if (!q) return registeredStudents;
    return registeredStudents.filter((s) =>
      `${s.firstName ?? s.studentName ?? ""} ${s.hallticketNumber ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [registeredStudents, searchRegistered]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [rows, examFeeTypes] = await Promise.all([
          getUnivExamFiltersByType(employeeId, "INT").catch(() => []),
          listExamFeeTypeGeneralDetails().catch(() => []),
        ]);
        const list = Array.isArray(rows) ? rows : [];
        setBaseRows(list);
        const c = dedupeBy(list, (r) => Number(r.fk_course_id))[0];
        if (c?.fk_course_id) setCourseId(Number(c.fk_course_id));

        // Angular getData(): examtypeCatId = Internal general detail
        const internalType = (
          Array.isArray(examFeeTypes) ? examFeeTypes : []
        ).find((t) => String(t.generalDetailCode ?? "") === "Internal");
        if (internalType?.generalDetailId) {
          setExamtypeCatId(Number(internalType.generalDetailId));
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) return;
    const years = dedupeBy(
      baseRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
      (r) => Number(r.fk_academic_year_id),
    );
    const current = years.sort(
      (a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0),
    )[0];
    setAcademicYearId(
      Number(
        current?.fk_academic_year_id ?? years[0]?.fk_academic_year_id ?? 0,
      ) || null,
    );
    setExamId(null);
    setCollegeId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectTypeId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectFilterRows([]);
    setStudents([]);
    setSelectedStudents([]);
    setRegisteredStudents([]);
  }, [courseId, baseRows]);

  useEffect(() => {
    if (!courseId || !academicYearId) return;
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          Number(r.fk_course_id) === Number(courseId) &&
          Number(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => Number(r.fk_exam_id),
    );
    setExamId(Number(list[0]?.fk_exam_id ?? 0) || null);
  }, [courseId, academicYearId, baseRows]);

  useEffect(() => {
    if (!courseId || !academicYearId || !examId) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await getUnivExamRestNoTt({
          courseId,
          examId,
          academicYearId,
          employeeId,
        }).catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        setRestRows(list);
        setCollegeId(Number(list[0]?.fk_college_id ?? 0) || null);
      })();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    const list = dedupeBy(
      restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)),
      (r) => Number(r.fk_course_group_id),
    );
    setCourseGroupId(Number(list[0]?.fk_course_group_id ?? 0) || null);
  }, [restRows, collegeId]);

  useEffect(() => {
    const list = dedupeBy(
      restRows.filter(
        (r) =>
          Number(r.fk_college_id) === Number(collegeId) &&
          Number(r.fk_course_group_id) === Number(courseGroupId),
      ),
      (r) => Number(r.fk_course_year_id),
    );
    setCourseYearId(Number(list[0]?.fk_course_year_id ?? 0) || null);
  }, [restRows, collegeId, courseGroupId]);

  useEffect(() => {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !examId ||
      !academicYearId
    )
      return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rows = await getUnivExamSubjectInss({
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          examId,
          academicYearId,
          employeeId,
        }).catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        setSubjectFilterRows(list);
        // Keep regulation unselected until user picks it explicitly.
        setRegulationId(null);
      })();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    employeeId,
  ]);

  useEffect(() => {
    const list = dedupeBy(
      subjectFilterRows.filter(
        (r) => Number(r.fk_regulation_id) === Number(regulationId),
      ),
      (r) => Number(r.fk_subjecttype_catdet_id),
    );
    setSubjectTypeId(Number(list[0]?.fk_subjecttype_catdet_id ?? 0) || null);
  }, [subjectFilterRows, regulationId]);

  useEffect(() => {
    const list = dedupeBy(
      subjectFilterRows.filter(
        (r) =>
          Number(r.fk_regulation_id) === Number(regulationId) &&
          Number(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
      ),
      (r) => Number(r.fk_subject_id),
    );
    setSubjectId(Number(list[0]?.fk_subject_id ?? 0) || null);
  }, [subjectFilterRows, regulationId, subjectTypeId]);

  async function loadSubjectStudents() {
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !subjectId ||
      !subjectTypeId ||
      !examId
    ) {
      return;
    }

    const [all, reg] = await Promise.all([
      listExamSubjectStudents({
        collegeId,
        academicYearId,
        courseId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        subjectTypeId,
      }).catch(() => []),
      listRegisteredStudentsForExam({
        collegeId,
        academicYearId,
        courseId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        examId,
      }).catch(() => []),
    ]);

    const allList = Array.isArray(all) ? all : [];
    // Angular getRegisteredStudents(): always replace with API data for this subject
    // (empty list when nobody is registered — never keep another subject's rows).
    const regList = (Array.isArray(reg) ? reg : []).map(normalizeStudentRow);
    setRegisteredStudents(regList);
    const regSet = new Set(regList.map((s) => getStudentKey(s)));

    const mapped = allList.map((s) => {
      const sid = getStudentKey(s);
      const already = regSet.has(sid);
      const row = enrichStudentRow(s, { already });
      return {
        ...row,
        checked: !already,
        c: !already,
      };
    });
    setStudents(mapped);
    setSelectedStudents(mapped.filter((s) => s.c));
  }

  function enrichStudentRow(s: AnyRow, overrides?: Partial<AnyRow>): AnyRow {
    return {
      ...s,
      studentId: getStudentId(s),
      collegeId: Number(collegeId),
      courseYearId: Number(courseYearId),
      examId: Number(examId),
      examtypeCatId: examtypeCatId ?? undefined,
      subjectId: Number(subjectId),
      isActive: true,
      registrationDate: utcMidnightIso(),
      ...overrides,
    };
  }

  useEffect(() => {
    // Angular selectedSubject(): clear lists immediately, then reload for this subject.
    setStudents([]);
    setSelectedStudents([]);
    setRegisteredStudents([]);
    setSearchAll("");
    setSearchSelected("");
    setSearchRegistered("");

    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !subjectId ||
      !subjectTypeId ||
      !examId
    )
      return;
    const timer = window.setTimeout(() => {
      void loadSubjectStudents();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    regulationId,
    subjectId,
    subjectTypeId,
    examId,
  ]);

  function toggleAll(checked: boolean) {
    const nextStudents = students.map((s) => {
      if (s.already) {
        return { ...s, checked: false, c: false };
      }
      const row = enrichStudentRow(s, { checked, c: checked });
      return row;
    });
    setStudents(nextStudents);
    setSelectedStudents(nextStudents.filter((s) => s.c));
  }

  function toggleStudent(sid: number, checked: boolean) {
    const target = students.find((s) => getStudentId(s) === sid);
    if (target?.already) {
      toastError("Student is already registered with this subject.");
      return;
    }
    const next = students.map((s) => {
      const id = getStudentId(s);
      if (id !== sid) return s;
      return enrichStudentRow(s, { checked, c: checked });
    });
    setStudents(next);
    setSelectedStudents(next.filter((s) => s.c));
  }

  async function onSave() {
    if (
      !selectedStudents.length ||
      !collegeId ||
      !examId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    )
      return;
    if (!examtypeCatId) {
      toastError(
        "Internal exam type is not configured. Please contact administrator.",
      );
      return;
    }

    const toRegister = selectedStudents.filter((s) => !s.already);
    if (toRegister.length === 0) {
      toastError(
        "All selected students are already registered for this subject.",
      );
      return;
    }

    // Angular registerStudents(): selectedStudents + examStudentDetailDTOs
    const payload = toRegister.map((s) => {
      const row = enrichStudentRow(s);
      const { checked: _checked, c: _c, already: _already, ...student } = row;
      return {
        ...student,
        isInternalExam: true,
        regulationId: Number(regulationId),
        courseGroupId: Number(courseGroupId),
        examStudentDetailDTOs: [
          {
            collegeId: Number(collegeId),
            subjectId: Number(student.subjectId ?? subjectId),
            isActive: student.isActive !== false,
          },
        ],
      };
    });

    setLoading(true);
    try {
      const result = await saveRegisteredExamSubjects(payload);
      toastSuccess(
        String(result?.message ?? "Students registered successfully"),
      );
      setSelectedStudents([]);
      setStudents([]);
      setSearchRegistered("");
      // Angular: selectedSubject(subjectId) → registeredstudentforexam + examsubjectstudents
      await loadSubjectStudents();
    } catch (e: any) {
      toastError(e?.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FilteredPage
      title="Internal Exam Registration Multiple Students"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((c) => ({
                value: String(c.fk_course_id),
                label: c.course_code,
              }))}
              placeholder="Course"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((a) => ({
                value: String(a.fk_academic_year_id),
                label: a.academic_year,
              }))}
              placeholder="Exam Year"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master">
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={exams.map((e) => ({
                value: String(e.fk_exam_id),
                label: e.exam_name,
              }))}
              placeholder="Exam Master"
            />
          </GlobalFilterField>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((c) => ({
                value: String(c.fk_college_id),
                label: c.college_code,
              }))}
              placeholder="College"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group">
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroups.map((g) => ({
                value: String(g.fk_course_group_id),
                label: g.group_code,
              }))}
              placeholder="Course Group"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Year">
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((y) => ({
                value: String(y.fk_course_year_id),
                label: y.course_year_code,
              }))}
              placeholder="Course Year"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation">
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulations.map((r) => ({
                value: String(r.fk_regulation_id),
                label: r.regulation_code,
              }))}
              placeholder="Regulation"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
    >
      {!!regulationId && (
        <div className="app-card p-3 space-y-2">
          <div className="text-[13px] font-medium rounded bg-blue-100 border px-3 py-2">
            Select Exam Subjects
          </div>

          <div className="border rounded overflow-hidden">
            <div className="border-b p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-2">
                  <Label>Subject Type</Label>
                  <Select
                    value={subjectTypeId ? String(subjectTypeId) : null}
                    onChange={(v) => setSubjectTypeId(v ? Number(v) : null)}
                    options={subjectTypes.map((s) => ({
                      value: String(s.fk_subjecttype_catdet_id),
                      label: s.subject_type,
                    }))}
                    placeholder="Subject Type"
                  />
                </div>
                <div className="md:col-span-6">
                  <Label>Subject</Label>
                  <Select
                    value={subjectId ? String(subjectId) : null}
                    onChange={(v) => setSubjectId(v ? Number(v) : null)}
                    options={subjects.map((s) => ({
                      value: String(s.fk_subject_id),
                      label: `${s.subject_code} - ${s.subject_name}`,
                    }))}
                    placeholder="Subject"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b">
              <div className="md:col-span-4 border-r overflow-hidden">
                <div className="flex items-center gap-2 border-b bg-muted/40 p-2">
                  <SearchInput
                    className="w-full min-w-0"
                    placeholder="Search…"
                    value={searchAll}
                    onChange={setSearchAll}
                  />
                </div>
                <div className="p-2 border-b text-[12px] flex items-center gap-2">
                  <Checkbox
                    checked={
                      students.length > 0 &&
                      selectedStudents.length > 0 &&
                      selectedStudents.length ===
                        students.filter((s) => !s.already).length
                    }
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                  <span>All</span>
                  <span className="text-blue-600">
                    Student List: {students.length}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-auto divide-y">
                  {studentsFiltered.map((s, i) => {
                    const sid = getStudentId(s);
                    const checked = !!s.c;
                    return (
                      <div
                        key={`a-${sid || i}`}
                        className="px-2 py-2 text-[12px] flex items-center gap-2"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleStudent(sid, !!v)}
                        />
                        <span
                          className={s.already ? "text-muted-foreground" : ""}
                        >
                          {s.firstName ?? s.studentName ?? "-"} (
                          {s.hallticketNumber ?? "-"})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-4 border-r overflow-hidden">
                <div className="border-b bg-muted/40 p-2">
                  <SearchInput
                    className="w-full min-w-0"
                    placeholder="Search…"
                    value={searchSelected}
                    onChange={setSearchSelected}
                  />
                </div>
                <div className="p-2 border-b text-[12px]">
                  Selected Students:{" "}
                  <span className="text-blue-600">
                    {selectedStudents.length}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-auto divide-y">
                  {selectedFiltered.map((s, i) => (
                    <div key={`sel-${i}`} className="px-2 py-2 text-[12px]">
                      {s.firstName ?? s.studentName ?? "-"} (
                      {s.hallticketNumber ?? "-"})
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 overflow-hidden">
                <div className="border-b bg-muted/40 p-2">
                  <SearchInput
                    className="w-full min-w-0"
                    placeholder="Search…"
                    value={searchRegistered}
                    onChange={setSearchRegistered}
                  />
                </div>
                <div className="p-2 border-b text-[12px]">
                  Registered Students:{" "}
                  <span className="text-blue-600">
                    {registeredStudents.length}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-auto divide-y">
                  {registeredFiltered.map((s, i) => (
                    <div key={`reg-${i}`} className="px-2 py-2 text-[12px]">
                      {s.firstName ?? s.studentName ?? "-"} (
                      {s.hallticketNumber ?? "-"})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-16 grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-11 border-r" />
              <div className="md:col-span-1 flex items-center justify-center">
                <Button
                  type="button"
                  className="h-8 text-[12px] px-6"
                  disabled={loading || checkedCount === 0}
                  onClick={onSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FilteredPage>
  );
}
