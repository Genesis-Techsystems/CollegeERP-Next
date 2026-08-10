"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { readStorageId } from "@/lib/employee-login-context";
import {
  getGrandTotal,
  getSectionATotal,
  getSubTotal1,
  getSubTotal2,
  listNaacAcademicYears,
  listNaacColleges,
  listNaacCourseGroups,
  listNaacCourseOutcomes,
  listNaacCourses,
  listNaacCourseYears,
  listNaacSections,
  listNaacStudents,
  subjectsFromCourseOutcomes,
  withDefaultNaacMarks,
  type NaacAcademicYear,
  type NaacCollege,
  type NaacCourse,
  type NaacCourseGroup,
  type NaacCourseYear,
  type NaacSection,
  type NaacStudentMarks,
  type NaacSubjectOption,
} from "@/services";
import { toast } from "sonner";

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  try {
    return globalThis.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** Angular Course Assessment — `staff-naac/staff-naac-assessment`. */
export default function StaffNaacCourseAssessmentPage() {
  const { user, loading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [colleges, setColleges] = useState<NaacCollege[]>([]);
  const [academicYears, setAcademicYears] = useState<NaacAcademicYear[]>([]);
  const [courses, setCourses] = useState<NaacCourse[]>([]);
  const [courseGroups, setCourseGroups] = useState<NaacCourseGroup[]>([]);
  const [courseYears, setCourseYears] = useState<NaacCourseYear[]>([]);
  const [sections, setSections] = useState<NaacSection[]>([]);
  const [subjects, setSubjects] = useState<NaacSubjectOption[]>([]);
  const [employeeName, setEmployeeName] = useState("");

  const [collegeId, setCollegeId] = useState(0);
  const [academicYearId, setAcademicYearId] = useState(0);
  const [courseId, setCourseId] = useState(0);
  const [courseGroupId, setCourseGroupId] = useState(0);
  const [courseYearId, setCourseYearId] = useState(0);
  const [groupSectionId, setGroupSectionId] = useState(0);
  const [subjectId, setSubjectId] = useState(0);

  const [students, setStudents] = useState<NaacStudentMarks[]>([]);
  const [searchText, setSearchText] = useState("");
  const [inputDisable, setInputDisable] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [cascadeBusy, setCascadeBusy] = useState(false);

  const defaultAyId = useMemo(
    () => positiveId(readStorage("academicYearId"), user?.academicYearId),
    [user?.academicYearId],
  );
  const defaultCollegeId = useMemo(
    () => positiveId(readStorageId("collegeId"), user?.collegeId),
    [user?.collegeId],
  );
  const defaultCourseGroupId = useMemo(
    () => positiveId(readStorage("courseGroupId")),
    [],
  );

  const empId = employeeId || positiveId(readStorage("employeeId"));

  const selectedCollegeName =
    colleges.find((c) => c.collegeId === collegeId)?.collegeCode ?? "";
  const selectedAcademicYearValue =
    academicYears.find((a) => a.academicYearId === academicYearId)
      ?.academicYear ?? "";
  const selectedCourseName =
    courses.find((c) => c.courseId === courseId)?.courseCode ?? "";
  const selectedCourseYearValue =
    courseYears.find((y) => y.courseYearId === courseYearId)?.courseYearName ??
    "";
  const subjectName =
    subjects.find((s) => s.subjectId === subjectId)?.subjectName ?? "";

  const formValid =
    collegeId > 0 &&
    academicYearId > 0 &&
    courseId > 0 &&
    courseGroupId > 0 &&
    courseYearId > 0 &&
    groupSectionId > 0 &&
    subjectId > 0;

  // Load colleges + course outcomes (Angular ngOnInit)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCascadeBusy(true);
        const rows = await listNaacColleges();
        if (cancelled) return;
        setColleges(rows);
        const cid =
          rows.find((c) => c.collegeId === defaultCollegeId)?.collegeId ??
          rows[0]?.collegeId ??
          0;
        if (cid) setCollegeId(cid);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load colleges");
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultCollegeId]);

  useEffect(() => {
    if (!empId || isResolving) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listNaacCourseOutcomes(empId);
        if (cancelled) return;
        setEmployeeName(String(rows[0]?.employeeName ?? ""));
        setSubjects(subjectsFromCourseOutcomes(rows));
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to load subjects",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empId, isResolving, collegeId]);

  // College → Academic years
  useEffect(() => {
    if (!collegeId) return;
    let cancelled = false;
    (async () => {
      setCascadeBusy(true);
      setAcademicYearId(0);
      setCourseId(0);
      setCourseGroupId(0);
      setCourseYearId(0);
      setGroupSectionId(0);
      setCourses([]);
      setCourseGroups([]);
      setCourseYears([]);
      setSections([]);
      setStudents([]);
      try {
        const rows = await listNaacAcademicYears(collegeId);
        if (cancelled) return;
        setAcademicYears(rows);
        const ay =
          rows.find((r) => r.academicYearId === defaultAyId)?.academicYearId ??
          rows[0]?.academicYearId ??
          0;
        if (ay) setAcademicYearId(ay);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to load academic years",
        );
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collegeId, defaultAyId]);

  // Academic year → Courses
  useEffect(() => {
    if (!collegeId || !academicYearId) return;
    let cancelled = false;
    (async () => {
      setCascadeBusy(true);
      setCourseId(0);
      setCourseGroupId(0);
      setCourseYearId(0);
      setGroupSectionId(0);
      setCourseGroups([]);
      setCourseYears([]);
      setSections([]);
      setStudents([]);
      try {
        const rows = await listNaacCourses(collegeId);
        if (cancelled) return;
        setCourses(rows);
        if (rows[0]?.courseId) setCourseId(rows[0].courseId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load courses");
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collegeId, academicYearId]);

  // Course → Course groups
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      setCascadeBusy(true);
      setCourseGroupId(0);
      setCourseYearId(0);
      setGroupSectionId(0);
      setCourseYears([]);
      setSections([]);
      setStudents([]);
      try {
        const rows = await listNaacCourseGroups(courseId);
        if (cancelled) return;
        setCourseGroups(rows);
        const gid =
          rows.find((r) => r.courseGroupId === defaultCourseGroupId)
            ?.courseGroupId ??
          rows[0]?.courseGroupId ??
          0;
        if (gid) setCourseGroupId(gid);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to load course groups",
        );
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, defaultCourseGroupId]);

  // Course group → Course years (by courseId, Angular selectedGroup)
  useEffect(() => {
    if (!courseId || !courseGroupId) return;
    let cancelled = false;
    (async () => {
      setCascadeBusy(true);
      setCourseYearId(0);
      setGroupSectionId(0);
      setSections([]);
      setStudents([]);
      try {
        const rows = await listNaacCourseYears(courseId);
        if (cancelled) return;
        setCourseYears(rows);
        if (rows[0]?.courseYearId) setCourseYearId(rows[0].courseYearId);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to load course years",
        );
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, courseGroupId]);

  // Course year → Sections
  useEffect(() => {
    if (!courseYearId || !academicYearId || !courseGroupId) return;
    let cancelled = false;
    (async () => {
      setCascadeBusy(true);
      setGroupSectionId(0);
      setSections([]);
      setStudents([]);
      try {
        const rows = await listNaacSections({
          courseYearId,
          academicYearId,
          courseGroupId,
        });
        if (cancelled) return;
        setSections(rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load sections");
      } finally {
        if (!cancelled) setCascadeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseYearId, academicYearId, courseGroupId]);

  // Angular valueChanges → getStudents when form valid
  const studentsKeyRef = useRef("");
  useEffect(() => {
    if (!formValid) {
      setStudents([]);
      studentsKeyRef.current = "";
      return;
    }
    const key = `${collegeId}|${courseGroupId}|${groupSectionId}|${subjectId}`;
    if (studentsKeyRef.current === key) return;
    studentsKeyRef.current = key;
    let cancelled = false;
    (async () => {
      setLoadingStudents(true);
      try {
        const rows = await listNaacStudents({
          collegeId,
          courseGroupId,
          groupSectionId,
        });
        if (cancelled) return;
        const stamped = rows.map((s) => {
          const photo = s.studentPhotoPath
            ? `${String(s.studentPhotoPath)}?${Date.now()}`
            : s.studentPhotoPath;
          return withDefaultNaacMarks({ ...s, studentPhotoPath: photo });
        });
        setStudents(stamped);
        setInputDisable(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load students");
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formValid, collegeId, courseGroupId, groupSectionId, subjectId]);

  const filteredStudents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = String(s.firstName ?? "").toLowerCase();
      const ht = String(s.hallticketNumber ?? "").toLowerCase();
      return name.includes(q) || ht.includes(q);
    });
  }, [students, searchText]);

  const updateStudent = (
    index: number,
    patch: Partial<NaacStudentMarks> | ((s: NaacStudentMarks) => NaacStudentMarks),
  ) => {
    setStudents((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      next[index] =
        typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return next;
    });
  };

  const collegeOptions = colleges.map((c) => ({
    value: String(c.collegeId),
    label: c.collegeCode || c.collegeName || String(c.collegeId),
  }));
  const ayOptions = academicYears.map((a) => ({
    value: String(a.academicYearId),
    label: a.academicYear || String(a.academicYearId),
  }));
  const courseOptions = courses.map((c) => ({
    value: String(c.courseId),
    label: c.courseCode || c.courseName || String(c.courseId),
  }));
  const groupOptions = courseGroups.map((g) => ({
    value: String(g.courseGroupId),
    label: g.groupCode || g.groupName || String(g.courseGroupId),
  }));
  const yearOptions = courseYears.map((y) => ({
    value: String(y.courseYearId),
    label: y.courseYearName || y.courseYearCode || String(y.courseYearId),
  }));
  const sectionOptions = sections.map((s) => ({
    value: String(s.groupSectionId),
    label: s.section || String(s.groupSectionId),
  }));
  const subjectOptions = subjects.map((s) => ({
    value: String(s.subjectId),
    label: `${s.subjectName ?? ""} (${s.subjectCode ?? ""})`.trim(),
  }));

  return (
    <FilteredPage
      title="Course Assessment"
      filtersCollapsible={false}
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : ""}
            onChange={(v) => setCollegeId(Number(v) || 0)}
            options={collegeOptions}
            disabled
            searchable={false}
            clearable={false}
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : ""}
            onChange={(v) => setAcademicYearId(Number(v) || 0)}
            options={ayOptions}
            isLoading={cascadeBusy && academicYears.length === 0}
            searchable
            clearable={false}
          />
          <Select
            label="Course"
            value={courseId ? String(courseId) : ""}
            onChange={(v) => setCourseId(Number(v) || 0)}
            options={courseOptions}
            disabled
            searchable={false}
            clearable={false}
          />
          <Select
            label="Course Group"
            value={courseGroupId ? String(courseGroupId) : ""}
            onChange={(v) => setCourseGroupId(Number(v) || 0)}
            options={groupOptions}
            disabled
            searchable={false}
            clearable={false}
          />
          <Select
            label="Course Year *"
            value={courseYearId ? String(courseYearId) : ""}
            onChange={(v) => setCourseYearId(Number(v) || 0)}
            options={yearOptions}
            searchable
            clearable={false}
          />
          <Select
            label="Section"
            value={groupSectionId ? String(groupSectionId) : ""}
            onChange={(v) => setGroupSectionId(Number(v) || 0)}
            options={sectionOptions}
            searchable
            clearable={false}
          />
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <Select
              label="Subject"
              value={subjectId ? String(subjectId) : ""}
              onChange={(v) => setSubjectId(Number(v) || 0)}
              options={subjectOptions}
              searchable
              clearable={false}
            />
          </div>
        </div>
      }
      body={
        formValid ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="h-10 w-10" />
              </div>
              <div className="grid flex-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Course Name</span>:{" "}
                  {subjectName}
                </p>
                <p>
                  <span className="text-muted-foreground">Academic Year</span>:{" "}
                  {selectedAcademicYearValue}
                </p>
                <p>
                  <span className="text-muted-foreground">Faculty Name</span>:{" "}
                  {employeeName}
                </p>
                <p>
                  <span className="text-muted-foreground">Course Year</span>:{" "}
                  {selectedCourseYearValue}
                </p>
                <p>
                  <span className="text-muted-foreground">Course Code</span>:{" "}
                  {selectedCourseName}
                </p>
                <p>
                  <span className="text-muted-foreground">College</span>:{" "}
                  {selectedCollegeName}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold">Students List</h3>
                <div className="w-full sm:w-56">
                  <SearchInput
                    value={searchText}
                    onChange={setSearchText}
                    placeholder="Search..."
                  />
                </div>
              </div>

              {loadingStudents && (
                <p className="text-sm text-muted-foreground">Loading students…</p>
              )}

              {!loadingStudents && filteredStudents.length === 0 && (
                <p className="text-sm text-muted-foreground">No students found.</p>
              )}

              {filteredStudents.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full min-w-[1100px] border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="border border-border p-1" colSpan={2} />
                          <th
                            className="border border-border p-1 text-center font-semibold"
                            colSpan={11}
                          >
                            Internal
                          </th>
                          <th
                            className="border border-border p-1 text-center font-semibold"
                            colSpan={5}
                          >
                            External
                          </th>
                        </tr>
                        <tr className="bg-muted/40">
                          <th className="border border-border p-1" colSpan={2} />
                          <th
                            className="border border-border p-1 text-center"
                            colSpan={8}
                          >
                            Section-A
                          </th>
                          <th className="border border-border p-1 text-center">
                            Section-B
                          </th>
                          <th className="border border-border p-1 text-center">
                            Section-C
                          </th>
                          <th className="border border-border p-1" colSpan={6} />
                        </tr>
                        <tr className="bg-muted/30">
                          <th className="border border-border px-2 py-1">S.no</th>
                          <th className="border border-border px-2 py-1 text-left">
                            Roll No
                          </th>
                          {filteredStudents[0]?.questions.map((_, j) => (
                            <th
                              key={`qh-${j}`}
                              className="border border-border px-1 py-1"
                            >
                              Q{j + 1}
                            </th>
                          ))}
                          <th className="border border-border px-1 py-1">Total</th>
                          <th className="border border-border px-1 py-1">
                            Case Study
                          </th>
                          <th className="border border-border px-1 py-1">
                            Short Ans
                          </th>
                          <th className="border border-border px-1 py-1">
                            SubTotal I
                          </th>
                          <th className="border border-border px-1 py-1">CA</th>
                          <th className="border border-border px-1 py-1">OA</th>
                          <th className="border border-border px-1 py-1">
                            Attendence
                          </th>
                          <th className="border border-border px-1 py-1">
                            Sub Total II
                          </th>
                          <th className="border border-border px-1 py-1">
                            Grand Total
                          </th>
                        </tr>
                        <tr className="bg-muted/20 font-medium">
                          <th
                            className="border border-border px-2 py-1"
                            colSpan={2}
                          >
                            Max. Marks
                          </th>
                          {/* Angular hardcodes 4 for every Q max cell */}
                          {filteredStudents[0]?.questions.map((_, j) => (
                            <th
                              key={`qm-${j}`}
                              className="border border-border px-1 py-1"
                            >
                              4
                            </th>
                          ))}
                          <th className="border border-border px-1 py-1">20</th>
                          <th className="border border-border px-1 py-1">10</th>
                          <th className="border border-border px-1 py-1">10</th>
                          <th className="border border-border px-1 py-1">40</th>
                          <th className="border border-border px-1 py-1">35</th>
                          <th className="border border-border px-1 py-1">20</th>
                          <th className="border border-border px-1 py-1">5</th>
                          <th className="border border-border px-1 py-1">60</th>
                          <th className="border border-border px-1 py-1">100</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, i) => {
                          const sourceIndex = students.indexOf(student);
                          const rowIndex = sourceIndex >= 0 ? sourceIndex : i;
                          return (
                            <tr
                              key={`${student.studentId ?? i}-${student.hallticketNumber ?? i}`}
                              className="odd:bg-background even:bg-muted/10"
                            >
                              <td className="border border-border px-2 py-1 text-center">
                                {i + 1}
                              </td>
                              <td className="border border-border px-2 py-1 text-left whitespace-nowrap">
                                {student.firstName} ({student.hallticketNumber})
                              </td>
                              {student.questions.map((q, j) => (
                                <td
                                  key={`q-${j}`}
                                  className="border border-border px-0.5 py-0.5"
                                >
                                  <input
                                    type="number"
                                    className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                    value={q.marks}
                                    disabled={inputDisable}
                                    onChange={(e) => {
                                      const marks = Number(e.target.value) || 0;
                                      updateStudent(rowIndex, (s) => {
                                        const questions = s.questions.map(
                                          (qq, idx) =>
                                            idx === j ? { marks } : qq,
                                        );
                                        return { ...s, questions };
                                      });
                                    }}
                                  />
                                </td>
                              ))}
                              <td className="border border-border px-1 py-1 text-center">
                                {getSectionATotal(student.questions)}
                              </td>
                              <td className="border border-border px-0.5 py-0.5">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                  value={student.caseStudy}
                                  disabled={inputDisable}
                                  onChange={(e) =>
                                    updateStudent(rowIndex, {
                                      caseStudy: Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="border border-border px-0.5 py-0.5">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                  value={student.shortAnswers}
                                  disabled={inputDisable}
                                  onChange={(e) =>
                                    updateStudent(rowIndex, {
                                      shortAnswers: Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="border border-border px-1 py-1 text-center">
                                {getSubTotal1(student)}
                              </td>
                              <td className="border border-border px-0.5 py-0.5">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                  value={student.continuousAssessment}
                                  disabled={inputDisable}
                                  onChange={(e) =>
                                    updateStudent(rowIndex, {
                                      continuousAssessment:
                                        Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="border border-border px-0.5 py-0.5">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                  value={student.onlineAssessment}
                                  disabled={inputDisable}
                                  onChange={(e) =>
                                    updateStudent(rowIndex, {
                                      onlineAssessment:
                                        Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="border border-border px-0.5 py-0.5">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center disabled:opacity-70"
                                  value={student.attendence}
                                  disabled={inputDisable}
                                  onChange={(e) =>
                                    updateStudent(rowIndex, {
                                      attendence: Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="border border-border px-1 py-1 text-center">
                                {getSubTotal2(student)}
                              </td>
                              <td className="border border-border px-1 py-1 text-center font-medium">
                                {getGrandTotal(student)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => setInputDisable(false)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setInputDisable(true)}
                    >
                      Save
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
