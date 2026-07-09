"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
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
import { PageContainer, PageHeader } from "@/components/layout";

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
  const [filterOpen, setFilterOpen] = useState(true);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<AnyRow[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<AnyRow[]>([]);
  const lastNonEmptyRegisteredRef = useRef<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

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
    if (registeredStudents.length > 0) {
      lastNonEmptyRegisteredRef.current = registeredStudents;
    }
  }, [registeredStudents]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const rows = await getUnivExamFiltersByType(employeeId, "INT").catch(
          () => [],
        );
        const list = Array.isArray(rows) ? rows : [];
        setBaseRows(list);
        const c = dedupeBy(list, (r) => Number(r.fk_course_id))[0];
        if (c?.fk_course_id) setCourseId(Number(c.fk_course_id));
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

  useEffect(() => {
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
      void (async () => {
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
        const regList = Array.isArray(reg) ? reg : [];
        const stableRegList = (
          regList.length > 0 ? regList : lastNonEmptyRegisteredRef.current
        ).map(normalizeStudentRow);
        setRegisteredStudents(stableRegList);
        const regSet = new Set(stableRegList.map((s) => getStudentKey(s)));

        const mapped = allList.map((s) => {
          const sid = getStudentKey(s);
          const already = regSet.has(sid);
          return { ...s, checked: true, c: true, already };
        });
        setStudents(mapped);
        setSelectedStudents(mapped.filter((s) => s.c));
      })();
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
      return { ...s, checked, c: checked };
    });
    setStudents(nextStudents);
    setSelectedStudents(nextStudents.filter((s) => s.c));
  }

  function toggleStudent(sid: number, checked: boolean) {
    const next = students.map((s) => {
      const id = getStudentId(s);
      if (id !== sid) return s;
      return { ...s, checked, c: checked };
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
    const toRegister = selectedStudents.filter((s) => !s.already);
    if (toRegister.length === 0) {
      toastError(
        "All selected students are already registered for this subject.",
      );
      return;
    }
    const selectedSubjectRow =
      subjectFilterRows.find(
        (r) =>
          Number(r.fk_subject_id ?? r.subjectId ?? 0) === Number(subjectId),
      ) ?? null;
    const resolvedExamTypeCatId =
      Number(
        selectedSubjectRow?.examtypeCatId ??
          selectedSubjectRow?.fk_examtype_catdet_id ??
          selectedSubjectRow?.examtype_catdet_id ??
          3,
      ) || 3;

    const payload = toRegister.map((s) => ({
      studentId: getStudentId(s),
      firstName: s.firstName ?? s.studentName ?? "",
      rollNumber: s.rollNumber ?? s.hallticketNumber ?? "",
      hallticketNumber: s.hallticketNumber ?? s.rollNumber ?? "",
      groupSectionId:
        Number(s.groupSectionId ?? s.group_section_id ?? 0) || undefined,
      section: s.section ?? "",
      courseId: Number(courseId),
      courseName: s.courseName ?? s.course_name ?? "",
      courseCode: s.courseCode ?? s.course_code ?? "",
      courseGroupId: Number(courseGroupId),
      groupName: s.groupName ?? s.group_name ?? "",
      groupCode: s.groupCode ?? s.group_code ?? "",
      courseYearId: Number(courseYearId),
      courseYearName: s.courseYearName ?? s.course_year_name ?? "",
      courseYearCode: s.courseYearCode ?? s.course_year_code ?? "",
      academicYearId: Number(academicYearId),
      academicYear: s.academicYear ?? s.academic_year ?? "",
      regulationId: Number(regulationId),
      regulationName: s.regulationName ?? s.regulation_name ?? "",
      regulationCode: s.regulationCode ?? s.regulation_code ?? "",
      collegeId,
      examId,
      examtypeCatId: resolvedExamTypeCatId,
      examtypeCatCode: "Internal",
      isInternalExam: true,
      isActive: true,
      registrationDate: new Date().toISOString(),
      examStudentDetailDTOs: [{ collegeId, subjectId, isActive: true }],
    }));
    setLoading(true);
    try {
      await saveRegisteredExamSubjects(payload);
      setSelectedStudents([]);
      setSearchRegistered("");

      // Optimistic update so newly saved students appear immediately in Registered list.
      const optimisticRegistered = dedupeBy(
        [...registeredStudents, ...toRegister].map(normalizeStudentRow),
        (s) => getStudentKey(s),
      );
      setRegisteredStudents(optimisticRegistered);

      // reload
      const reg = await listRegisteredStudentsForExam({
        collegeId,
        academicYearId: Number(academicYearId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        regulationId: Number(regulationId),
        subjectId: Number(subjectId),
        examId: Number(examId),
      }).catch(() => []);
      const regList = Array.isArray(reg) ? reg.map(normalizeStudentRow) : [];
      const finalRegList = regList.length > 0 ? regList : optimisticRegistered;
      setRegisteredStudents(finalRegList);
      const regSet = new Set(finalRegList.map((s) => getStudentKey(s)));
      const savedKeys = new Set(toRegister.map((s) => getStudentKey(s)));
      const persistedCount = Array.from(savedKeys).filter((k) =>
        regSet.has(k),
      ).length;
      const skipped = selectedStudents.length - toRegister.length;

      if (persistedCount === 0) {
        toastError("Students are not saved in DB. Please try again.");
      } else if (persistedCount < savedKeys.size) {
        toastError(
          `Only ${persistedCount}/${savedKeys.size} student(s) are persisted.`,
        );
      } else if (skipped > 0) {
        toastSuccess(
          `Students registered successfully. Skipped ${skipped} already-registered student(s).`,
        );
      } else {
        toastSuccess("Students registered successfully");
      }

      setStudents((prev) =>
        prev.map((s) => {
          const key = getStudentKey(s);
          if (
            regSet.has(key) ||
            toRegister.some((x) => getStudentKey(x) === key)
          )
            return { ...s, checked: false, c: false, already: true };
          return s;
        }),
      );
    } catch (e: any) {
      toastError(e?.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">
            Internal Exam Registration Multiple Students
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
        {
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({
                    value: String(c.fk_course_id),
                    label: c.course_code,
                  }))}
                  placeholder="Course"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({
                    value: String(a.fk_academic_year_id),
                    label: a.academic_year,
                  }))}
                  placeholder="Exam Year"
                />
              </div>
              <div className="md:col-span-5 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map((e) => ({
                    value: String(e.fk_exam_id),
                    label: e.exam_name,
                  }))}
                  placeholder="Exam Master"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => setCollegeId(v ? Number(v) : null)}
                  options={colleges.map((c) => ({
                    value: String(c.fk_college_id),
                    label: c.college_code,
                  }))}
                  placeholder="College"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                  options={courseGroups.map((g) => ({
                    value: String(g.fk_course_group_id),
                    label: g.group_code,
                  }))}
                  placeholder="Course Group"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map((y) => ({
                    value: String(y.fk_course_year_id),
                    label: y.course_year_code,
                  }))}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Regulation</Label>
                <Select
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => setRegulationId(v ? Number(v) : null)}
                  options={regulations.map((r) => ({
                    value: String(r.fk_regulation_id),
                    label: r.regulation_code,
                  }))}
                  placeholder="Regulation"
                />
              </div>
            </div>
          </div>
        }
      </div>

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
    </PageContainer>
  );
}
