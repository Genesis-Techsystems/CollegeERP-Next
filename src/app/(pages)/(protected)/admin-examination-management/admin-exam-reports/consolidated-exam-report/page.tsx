"use client";

/**
 * Consolidated Exam Report — Angular `consolidated-exam-report`.
 * By Course / By Student radios above the filter card; Get Report only (no Reset).
 */

import { useEffect, useMemo, useState } from "react";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import {
  downloadConsolidatedExamReportPdf,
  getFeeMasterCollegeFilters,
  searchStudentsByKeyword,
} from "@/services";
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Building2,
  CalendarDays,
  FileDown,
  GraduationCap,
  Layers,
  School,
  UserRound,
} from "lucide-react";

type AnyRow = Record<string, any>;
type Mode = "course" | "student";

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[];
}

function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function ConsolidatedExamReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [mode, setMode] = useState<Mode>("course");
  const [loading, setLoading] = useState(false);
  const [searchingStudents, setSearchingStudents] = useState(false);

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeId, filtersData),
    [academicData, collegeId, filtersData],
  );
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId),
    [filtersData, collegeId],
  );
  const courseGroups = useMemo(
    () => filterCourseGroups(filtersData, collegeId, courseId),
    [filtersData, collegeId, courseId],
  );
  const courseYears = useMemo(
    () => filterCourseYears(filtersData, collegeId, courseId, courseGroupId),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const collegeFilters = await getFeeMasterCollegeFilters(
          orgId,
          employeeId,
        );
        if (cancelled) return;
        const nextFilters = toFilterRows(collegeFilters.filtersData ?? []);
        const nextAy = toFilterRows(collegeFilters.academicData ?? []);
        setFiltersData(nextFilters);
        setAcademicData(nextAy);
        const nextColleges = filterColleges(nextFilters);
        setSkipAutoSelect(false);
        setCollegeId(
          nextColleges[0]
            ? pickNum(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [orgId, employeeId]);

  useEffect(() => {
    if (!collegeId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = filterAcademicYears(academicData, collegeId, filtersData);
    const current = years.find((r) => Number(r.is_curr_ay ?? 0) === 1);
    setAcademicYearId(
      current
        ? pickNum(current, ["fk_academic_year_id", "academicYearId"])
        : years[0]
          ? pickNum(years[0], ["fk_academic_year_id", "academicYearId"])
          : null,
    );
  }, [collegeId, academicData, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId) {
      setCourseId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = filterCourses(filtersData, collegeId);
    setCourseId(
      list[0] ? pickNum(list[0], ["fk_course_id", "courseId"]) : null,
    );
  }, [collegeId, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId || !courseId) {
      setCourseGroupId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = filterCourseGroups(filtersData, collegeId, courseId);
    setCourseGroupId(
      list[0]
        ? pickNum(list[0], ["fk_course_group_id", "courseGroupId"])
        : null,
    );
  }, [collegeId, courseId, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId || !courseId || !courseGroupId) {
      setCourseYearId(0);
      return;
    }
    if (skipAutoSelect) return;
    const list = filterCourseYears(
      filtersData,
      collegeId,
      courseId,
      courseGroupId,
    );
    setCourseYearId(
      list[0] ? pickNum(list[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [collegeId, courseId, courseGroupId, filtersData, skipAutoSelect]);

  function handleModeChange(next: Mode) {
    setMode(next);
    setStudentId(null);
    setStudentOptions([]);
  }

  /** Angular `enteredStudent` — search when length > 4. */
  async function handleStudentSearch(term: string) {
    const q = term.trim();
    if (q.length <= 4) {
      if (!q) setStudentOptions([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const rows = await searchStudentsByKeyword(q);
      setStudentOptions(rows);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to search students");
    } finally {
      setSearchingStudents(false);
    }
  }

  function handleStudentChange(value: string | null) {
    const id = value ? Number(value) : null;
    setStudentId(id);
    if (!id) return;
    const std = studentOptions.find(
      (r) => Number(r.studentId ?? r.student_id ?? r.fk_student_id) === id,
    );
    if (!std) return;
    setSkipAutoSelect(false);
    const nextCollege = Number(std.collegeId ?? std.fk_college_id ?? 0) || null;
    const nextCourse = Number(std.courseId ?? std.fk_course_id ?? 0) || null;
    const nextAy =
      Number(std.academicYearId ?? std.fk_academic_year_id ?? 0) || null;
    if (nextCollege) setCollegeId(nextCollege);
    if (nextCourse) setCourseId(nextCourse);
    if (nextAy) setAcademicYearId(nextAy);
  }

  async function handleGetReport() {
    if (mode === "student") {
      if (!studentId) {
        toastError("Please select a student");
        return;
      }
      setLoading(true);
      try {
        const std = studentOptions.find(
          (r) =>
            Number(r.studentId ?? r.student_id ?? r.fk_student_id) ===
            Number(studentId),
        );
        const blob = await downloadConsolidatedExamReportPdf({
          flag: "exam_final_std_result_detail",
          examId: 0,
          collegeId:
            Number(std?.collegeId ?? std?.fk_college_id ?? collegeId ?? 0) ||
            collegeId ||
            0,
          courseId:
            Number(std?.courseId ?? std?.fk_course_id ?? courseId ?? 0) ||
            courseId ||
            0,
          courseGroupId: 0,
          courseYearId: 0,
          academicYearId:
            Number(
              std?.academicYearId ??
                std?.fk_academic_year_id ??
                academicYearId ??
                0,
            ) ||
            academicYearId ||
            0,
          studentId,
          regulationId: 0,
          subjectId: 0,
        });
        openPdfBlob(blob);
        toastSuccess("Student PDF generated");
      } catch (e) {
        toastError(
          e instanceof Error ? e.message : "Failed to generate student PDF",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!collegeId || !academicYearId || !courseId || !courseGroupId) {
      toastError(
        "Please select College, Academic Year, Course, and Course Group",
      );
      return;
    }
    setLoading(true);
    try {
      // Angular downloadCourseWise() always sends courseYearId: 0 for the PDF.
      const blob = await downloadConsolidatedExamReportPdf({
        flag: "exam_final_std_result_detail",
        examId: 0,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId: 0,
        academicYearId,
        studentId: 0,
        regulationId: 0,
        subjectId: 0,
      });
      openPdfBlob(blob);
      toastSuccess("PDF generated successfully");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  }

  const modeToggle = (
    <div className="-mx-1 rounded-md bg-muted/60 px-3 py-2">
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleModeChange(v as Mode)}
        className="flex flex-nowrap items-center gap-6"
      >
        <label className="flex items-center gap-2 whitespace-nowrap text-[14px] font-medium">
          <RadioGroupItem value="course" id="consolidated-mode-course" />
          By Course
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-[14px]font-medium">
          <RadioGroupItem value="student" id="consolidated-mode-student" />
          By Student
        </label>
      </RadioGroup>
    </div>
  );

  const getReportButton = (
    <div className="inv-allot-report-filters__fx15 flex shrink-0 items-center self-end pb-0.5">
      <Button
        type="button"
        className="h-8 gap-1.5 text-[12px] w-full"
        onClick={() => void handleGetReport()}
        disabled={loading}
      >
        {loading ? "Generating..." : "Get Report"}
      </Button>
    </div>
  );

  return (
    <FilteredPage
      title="Consolidated Exam Report"
      notice={modeToggle}
      filters={
        mode === "course" ? (
          <div className="inv-allot-report-filters space-y-2">
            <div className="inv-allot-report-filters__row">
              <div className="inv-allot-report-filters__fx15">
                <GlobalFilterField label="College">
                  <Select
                    value={collegeId ? String(collegeId) : null}
                    onChange={(v) => {
                      setSkipAutoSelect(false);
                      setCollegeId(v ? Number(v) : null);
                    }}
                    options={colleges.map((r) => ({
                      value: String(pickNum(r, ["fk_college_id", "collegeId"])),
                      label: pickText(r, [
                        "college_code",
                        "collegeCode",
                        "college_name",
                      ]),
                    }))}
                    placeholder="College"
                    searchable
                    isLoading={loading && filtersData.length === 0}
                  />
                </GlobalFilterField>
              </div>
              <div className="inv-allot-report-filters__fx15">
                <GlobalFilterField label="Academic Year">
                  <Select
                    value={academicYearId ? String(academicYearId) : null}
                    onChange={(v) => {
                      setSkipAutoSelect(false);
                      setAcademicYearId(v ? Number(v) : null);
                    }}
                    options={academicYears.map((r) => ({
                      value: String(
                        pickNum(r, ["fk_academic_year_id", "academicYearId"]),
                      ),
                      label: pickText(r, ["academic_year", "academicYear"]),
                    }))}
                    placeholder="Academic Year"
                    searchable
                  />
                </GlobalFilterField>
              </div>
              <div className="inv-allot-report-filters__fx15">
                <GlobalFilterField label="Course">
                  <Select
                    value={courseId ? String(courseId) : null}
                    onChange={(v) => {
                      setSkipAutoSelect(false);
                      setCourseId(v ? Number(v) : null);
                    }}
                    options={courses.map((r) => ({
                      value: String(pickNum(r, ["fk_course_id", "courseId"])),
                      label: pickText(r, [
                        "course_code",
                        "courseCode",
                        "course_name",
                      ]),
                    }))}
                    placeholder="Course"
                    searchable
                  />
                </GlobalFilterField>
              </div>
              <div className="inv-allot-report-filters__fx15">
                <GlobalFilterField label="Course Group">
                  <Select
                    value={courseGroupId ? String(courseGroupId) : null}
                    onChange={(v) => {
                      setSkipAutoSelect(false);
                      setCourseGroupId(v ? Number(v) : null);
                    }}
                    options={courseGroups.map((r) => ({
                      value: String(
                        pickNum(r, ["fk_course_group_id", "courseGroupId"]),
                      ),
                      label: pickText(r, [
                        "group_code",
                        "groupCode",
                        "course_group_code",
                      ]),
                    }))}
                    placeholder="Course Group"
                    searchable
                  />
                </GlobalFilterField>
              </div>
              <div className="inv-allot-report-filters__fx15">
                <GlobalFilterField label="Course Year">
                  <Select
                    value={String(courseYearId)}
                    onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
                    options={[
                      { value: "0", label: "All" },
                      ...courseYears.map((r) => ({
                        value: String(
                          pickNum(r, ["fk_course_year_id", "courseYearId"]),
                        ),
                        label: pickText(r, [
                          "course_year_name",
                          "courseYearName",
                          "course_year_code",
                          "courseYearCode",
                        ]),
                      })),
                    ]}
                    placeholder="Course Year"
                    searchable
                  />
                </GlobalFilterField>
              </div>
              {getReportButton}
            </div>
          </div>
        ) : (
          <div className="inv-allot-report-filters space-y-2">
            <div className="inv-allot-report-filters__row">
              <div className="inv-allot-report-filters__fx30">
                <GlobalFilterField label="Student">
                  <Select
                    value={studentId ? String(studentId) : null}
                    onChange={handleStudentChange}
                    onSearch={(term) => void handleStudentSearch(term)}
                    options={studentOptions.map((r) => {
                      const id = Number(
                        r.studentId ?? r.student_id ?? r.fk_student_id,
                      );
                      const roll = pickText(r, [
                        "rollNumber",
                        "roll_number",
                        "hallticketNumber",
                        "hallticket_number",
                      ]);
                      const name = pickText(r, [
                        "firstName",
                        "first_name",
                        "studentName",
                        "student_name",
                      ]);
                      return {
                        value: String(id),
                        label: name ? `${roll} (${name})` : roll || String(id),
                      };
                    })}
                    placeholder="Student"
                    searchable
                    isLoading={searchingStudents}
                  />
                </GlobalFilterField>
              </div>
              {getReportButton}
            </div>
          </div>
        )
      }
    />
  );
}
