"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { studentPhotoSrc } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import {
  getDigitalOnlineSyncFilters,
  listGroupSectionsByFilters,
  listStudentsForStudentDetails,
  submitAssignedStudentSections,
} from "@/services";

type AnyRow = Record<string, any>;

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function normalizeAssignRows(list: AnyRow[]): AnyRow[] {
  return (Array.isArray(list) ? list : []).map((row, idx) => {
    const sectionId =
      n(
        row.groupSectionId ?? row.fk_group_section_id ?? row.group_section_id,
      ) || null;
    return {
      ...row,
      __rowKey: `${n(row.studentId ?? row.fk_student_id) || idx + 1}`,
      assignedGroupSectionId: sectionId,
      originalGroupSectionId: sectionId,
    };
  });
}

function StudentAvatar({ row }: { row: AnyRow }) {
  const src = studentPhotoSrc(row.studentPhotoPath ?? row.student_photo_path);
  return (
    <img
      src={src}
      alt=""
      className="h-6 w-6 shrink-0 rounded-full object-cover bg-slate-200"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith("default_Student.png"))
          img.src = DEFAULT_STUDENT_PHOTO;
      }}
    />
  );
}

export default function AssignStudentsToSectionPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cardsEnabled, setCardsEnabled] = useState(false);
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, []);

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const courses = useMemo(
    () =>
      uniq(
        filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)),
        "fk_course_id",
      ),
    [filtersData, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0),
        ),
        "fk_course_group_id",
      ),
    [filtersData, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0) &&
            n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        "fk_course_year_id",
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  );
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
        ?.fk_university_id,
    );
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    ).sort((a, b) =>
      String(b.academic_year ?? "").localeCompare(
        String(a.academic_year ?? ""),
      ),
    );
  }, [academicData, filtersData, collegeId]);
  const sectionOptions = useMemo(
    () =>
      [...sections]
        .sort(
          (a, b) =>
            n(a.sortOrder ?? a.sort_order) - n(b.sortOrder ?? b.sort_order) ||
            s(a.groupSectionName ?? a.section ?? a.sectionName).localeCompare(
              s(b.groupSectionName ?? b.section ?? b.sectionName),
            ),
        )
        .map((x) => ({
          value: String(n(x.groupSectionId ?? x.pk_group_section_id)),
          label:
            s(x.groupSectionName) ||
            s(x.section) ||
            s(x.sectionName) ||
            s(x.groupSectionCode),
        }))
        .filter((x) => n(x.value) > 0),
    [sections],
  );

  // Cascade mirrors Angular: College → AY → Course → Group → Year → Section.
  // Academic Year must NOT be cleared when Course / Group / Year change.
  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setRows([]);
    setSections([]);
    setCardsEnabled(false);
  }, [collegeId]);
  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      setAcademicYearId(
        n(
          [...academicYears].sort(
            (a, b) => n(b.is_curr_ay) - n(a.is_curr_ay),
          )[0]?.fk_academic_year_id,
        ),
      );
    }
  }, [academicYears, academicYearId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setRows([]);
    setSections([]);
    setCardsEnabled(false);
  }, [academicYearId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setRows([]);
    setCardsEnabled(false);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setGroupSectionId(null);
    setRows([]);
    setCardsEnabled(false);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setGroupSectionId(null);
    setRows([]);
    setSections([]);
    setCardsEnabled(false);
  }, [courseYearId]);
  useEffect(() => {
    if (!groupSectionId && sections.length)
      setGroupSectionId(
        n(sections[0].groupSectionId ?? sections[0].pk_group_section_id),
      );
  }, [sections, groupSectionId]);

  useEffect(() => {
    async function loadSections() {
      if (!collegeId || !courseGroupId || !courseYearId || !academicYearId) {
        setSections([]);
        return;
      }
      // Same GroupSection domain list as the Sections admin page / Angular assign-student-to-section.
      const list = await listGroupSectionsByFilters({
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
      }).catch(() => []);
      setSections(list);
    }
    void loadSections();
  }, [collegeId, courseGroupId, courseYearId, academicYearId]);

  const loadStudents = useCallback(async () => {
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId
    ) {
      setRows([]);
      return;
    }
    setLoading(true);
    // Angular selectedYear: studentsList by college + AY + course + group + year (all sections).
    const list = await listStudentsForStudentDetails({
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
    }).catch(() => []);
    setRows(normalizeAssignRows(list));
    setSelectedLeft(new Set());
    setSelectedRight(new Set());
    setLoading(false);
  }, [collegeId, academicYearId, courseId, courseGroupId, courseYearId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Dual-panel UI needs a target section; partition only (no reload) when section changes.
  useEffect(() => {
    if (!groupSectionId) {
      setCardsEnabled(false);
      setSelectedLeft(new Set());
      setSelectedRight(new Set());
      return;
    }
    setCardsEnabled(true);
    setSelectedLeft(new Set());
    setSelectedRight(new Set());
  }, [groupSectionId]);

  const selectedSectionLabel = useMemo(
    () =>
      sectionOptions.find((x) => n(x.value) === (groupSectionId ?? 0))?.label ??
      "-",
    [sectionOptions, groupSectionId],
  );

  const leftRows = useMemo(() => {
    const q = leftSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (n(row.assignedGroupSectionId) === (groupSectionId ?? 0)) return false;
      const name = s(
        row.studentName ?? row.student_name ?? row.firstName,
      ).toLowerCase();
      const reg = s(
        row.registerNo ??
          row.register_number ??
          row.rollNumber ??
          row.hallticketNumber,
      ).toLowerCase();
      return !q || name.includes(q) || reg.includes(q);
    });
  }, [rows, leftSearch, groupSectionId]);

  const rightRows = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (n(row.assignedGroupSectionId) !== (groupSectionId ?? 0)) return false;
      const name = s(
        row.studentName ?? row.student_name ?? row.firstName,
      ).toLowerCase();
      const reg = s(
        row.registerNo ??
          row.register_number ??
          row.rollNumber ??
          row.hallticketNumber,
      ).toLowerCase();
      return !q || name.includes(q) || reg.includes(q);
    });
  }, [rows, rightSearch, groupSectionId]);

  function toggleLeft(key: string, checked: boolean) {
    setSelectedLeft((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }
  function toggleRight(key: string, checked: boolean) {
    setSelectedRight((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function assignSelectedToSection() {
    if (!groupSectionId || selectedLeft.size === 0) return;
    setRows((prev) =>
      prev.map((r) =>
        selectedLeft.has(s(r.__rowKey))
          ? { ...r, assignedGroupSectionId: groupSectionId }
          : r,
      ),
    );
    setSelectedLeft(new Set());
  }

  function removeSelectedFromSection() {
    if (selectedRight.size === 0) return;
    setRows((prev) =>
      prev.map((r) =>
        selectedRight.has(s(r.__rowKey))
          ? { ...r, assignedGroupSectionId: null }
          : r,
      ),
    );
    setSelectedRight(new Set());
  }

  async function onSave() {
    const changed = rows.filter(
      (r) => n(r.assignedGroupSectionId) !== n(r.originalGroupSectionId),
    );
    if (changed.length === 0) {
      toastError("No student is assigned.");
      return;
    }
    // Angular assignStudents: only moved rows, with groupSectionId + isStudentModification.
    const payload = changed.map((r) => {
      const {
        __rowKey: _key,
        assignedGroupSectionId,
        originalGroupSectionId: _orig,
        ...rest
      } = r;
      return {
        ...rest,
        groupSectionId: assignedGroupSectionId
          ? n(assignedGroupSectionId)
          : null,
        isStudentModification: true,
      };
    });
    setSaving(true);
    try {
      await submitAssignedStudentSections(payload);
      toastSuccess("Students assigned to section successfully");
      await loadStudents();
    } catch {
      toastError("Failed to assign students to section");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredListPage
      title="Assign Students to Section"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((x) => ({
              value: String(n(x.fk_college_id)),
              label: s(x.college_code),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears.map((x) => ({
              value: String(n(x.fk_academic_year_id)),
              label: s(x.academic_year),
            }))}
            searchable
            className="md:col-span-3"
          />
          <Select
            label="Course *"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((x) => ({
              value: String(n(x.fk_course_id)),
              label: s(x.course_code),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Group *"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((x) => ({
              value: String(n(x.fk_course_group_id)),
              label: s(x.group_code) || s(x.group_name),
            }))}
            searchable
            className="md:col-span-3"
          />
          <Select
            label="Course Year *"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((x) => ({
              value: String(n(x.fk_course_year_id)),
              label: s(x.course_year_name),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Section *"
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={sectionOptions}
            searchable
            className="md:col-span-2"
          />
        </div>
      }
      bodyClassName="border-t-0"
      body={
        cardsEnabled ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-4 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span>STUDENTS</span>
                  <span>{leftRows.length}</span>
                </div>
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={leftSearch}
                      onChange={(e) => setLeftSearch(e.target.value)}
                      placeholder="Search..."
                      className="h-9 pl-8"
                    />
                  </div>
                  <div className="h-[380px] overflow-y-auto border rounded-sm">
                    {loading ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        Loading students...
                      </div>
                    ) : leftRows.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No students
                      </div>
                    ) : (
                      leftRows.map((row) => (
                        <div
                          key={s(row.__rowKey)}
                          className="px-3 py-2 text-xs border-b flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLeft.has(s(row.__rowKey))}
                            onChange={(e) =>
                              toggleLeft(s(row.__rowKey), e.target.checked)
                            }
                          />
                          <StudentAvatar row={row} />
                          <span>
                            {s(
                              row.studentName ??
                                row.student_name ??
                                row.firstName,
                            )}
                          </span>{" "}
                          <span className="text-blue-700 font-semibold">
                            (
                            {s(
                              row.registerNo ??
                                row.register_number ??
                                row.rollNumber ??
                                row.hallticketNumber,
                            )}
                            )
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={assignSelectedToSection}
                  disabled={selectedLeft.size === 0 || !groupSectionId}
                >
                  {">>"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={removeSelectedFromSection}
                  disabled={selectedRight.size === 0}
                >
                  {"<<"}
                </Button>
              </div>
              <div className="md:col-span-7 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span>SECTION : {selectedSectionLabel}</span>
                  <span>{rightRows.length}</span>
                </div>
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={rightSearch}
                      onChange={(e) => setRightSearch(e.target.value)}
                      placeholder="Search..."
                      className="h-9 pl-8"
                    />
                  </div>
                  <div className="h-[380px] overflow-y-auto border rounded-sm">
                    {loading ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        Loading students...
                      </div>
                    ) : rightRows.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        No students
                      </div>
                    ) : (
                      rightRows.map((row) => (
                        <div
                          key={`r-${s(row.__rowKey)}`}
                          className="px-3 py-2 text-xs border-b flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedRight.has(s(row.__rowKey))}
                              onChange={(e) =>
                                toggleRight(s(row.__rowKey), e.target.checked)
                              }
                            />
                            <span className="truncate">
                              {s(
                                row.studentName ??
                                  row.student_name ??
                                  row.firstName,
                              )}
                            </span>{" "}
                            <span className="text-blue-700 font-semibold shrink-0">
                              (
                              {s(
                                row.registerNo ??
                                  row.register_number ??
                                  row.rollNumber ??
                                  row.hallticketNumber,
                              )}
                              )
                            </span>
                          </div>
                          <StudentAvatar row={row} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                className="h-9"
                onClick={() => {
                  void onSave();
                }}
                disabled={saving}
              >
                Save
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
