"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutList, Loader2 } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  fetchStudentDetail,
  getStudentInfoCollegeFilters,
  listEmployeeDataSecurityByEmployeeId,
  listStudentsForStudentDetails,
  listStudentSectionsByProc,
  normalizeStudentRow,
  searchStudentsForStudentDetailsList,
  sendStudentCredentials,
  updateStudentQuickProfile,
  type StudentDetailsEmpSecurity,
} from "@/services";
import { EditStudentProfileModal } from "./EditStudentProfileModal";
import { StudentSearchSelect } from "@/common/components/student-search";
import { StudentsListTable, headerPartsFromRow } from "./StudentsListTable";

type SectionRestore = {
  universityId?: number;
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
};

type AnyRow = Record<string, any>;

const UNIV = ["fk_university_id", "universityId"];
const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function photoSrc(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT_PHOTO;
  return raw.includes("?") ? raw : `${raw}?${Date.now()}`;
}

function normalizeRowList(list: AnyRow[]): AnyRow[] {
  return list.map((r) => ({
    ...normalizeStudentRow(r),
    ...r,
    studentPhotoPath: photoSrc(r.studentPhotoPath ?? r.student_photo_path),
  }));
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const out = String(row?.[key] ?? "").trim();
    if (out) return out;
  }
  return "-";
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSectionSelect(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function onSectionCascadeSelect(
  v: string | null,
  autoFillRef: MutableRefObject<boolean>,
) {
  autoFillRef.current = v !== null && v !== "";
}

function dedupeColleges(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const id = pickNum(r, COL);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out.sort(
    (a, b) => (Number(a.clg_sort_order) || 0) - (Number(b.clg_sort_order) || 0),
  );
}

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

const SEC = [
  "pk_group_section_id",
  "groupSectionId",
  "group_section_id",
  "fk_group_section_id",
];

// eslint-disable-next-line sonarjs/cognitive-complexity -- Angular students-list section cascade
export default function StudentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const employeeId = Number(user?.employeeId ?? 0);
  const organizationId = Number(user?.organizationId ?? 0);
  const sessionCollegeId = Number(user?.collegeId ?? 0);

  const [mode, setMode] = useState<"student" | "section">("student");

  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);
  const [sectionApiRows, setSectionApiRows] = useState<AnyRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [empSecurity, setEmpSecurity] = useState<StudentDetailsEmpSecurity[]>(
    [],
  );
  const [empSecurityReady, setEmpSecurityReady] = useState(false);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [tableFilter, setTableFilter] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<AnyRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [credOpen, setCredOpen] = useState(false);
  const [credRows, setCredRows] = useState<
    Array<{ studentId: number; collegeId: number }>
  >([]);
  const [credLabel, setCredLabel] = useState("");
  const [credSending, setCredSending] = useState(false);

  const studentsLoadSeq = useRef(0);
  const sectionUserPickRef = useRef(false);
  const sectionCascadeAutoFill = useRef(true);
  const urlRestoreApplied = useRef(false);
  const pendingSectionRestore = useRef<SectionRestore | null>(null);
  const pendingStudentRestore = useRef<{
    studentId?: number;
    rollNumber?: string;
  } | null>(null);

  const isAdmin = user?.isAdmin ?? readStorage("isAdmin") === "true";
  const isHod = user?.isHod ?? readStorage("isHOD") === "true";
  const isDeptAdmin =
    user?.isDeptAdmin ?? readStorage("isDeprtAdmin") === "true";
  const roleName = user?.roleName ?? readStorage("roleName");
  const check = mode === "section" ? 2 : 1;
  // Match Angular effective visibility: full-page Edit only for Admin or
  // Junior Accountant / Student Details / FEE COLLECTION. HOD gets modal Edit.
  // Other staff (e.g. Additional Controller) see View Profile | View details only.
  const specialEditRoles = [
    "Junior Accountant",
    "Student Details",
    "FEE COLLECTION",
  ];
  const hasSpecialEditRole = specialEditRoles.includes(roleName ?? "");
  const canNavigateEdit = isAdmin || hasSpecialEditRole;
  const canModalEdit = isHod && !isAdmin && !hasSpecialEditRole;
  const canSendCredentials = isHod || isAdmin;

  const collegeIdsForSearch = useMemo(() => {
    const ids = empSecurity
      .map((r) => Number(r.collegeId ?? 0))
      .filter((id) => id > 0);
    if (ids.length > 0) return [...new Set(ids)].join(",");
    return sessionCollegeId > 0 ? String(sessionCollegeId) : "";
  }, [empSecurity, sessionCollegeId]);

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const r = await getStudentInfoCollegeFilters(organizationId, employeeId);
      setFiltersData(Array.isArray(r.filtersData) ? r.filtersData : []);
      setAcademicYearData(Array.isArray(r.academicData) ? r.academicData : []);
    } catch (e) {
      toastError(e, "Failed to load filters");
      setFiltersData([]);
      setAcademicYearData([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [organizationId, employeeId]);

  useEffect(() => {
    if (!employeeId) {
      setEmpSecurity([]);
      setEmpSecurityReady(true);
      return;
    }
    let cancelled = false;
    setEmpSecurityReady(false);
    void listEmployeeDataSecurityByEmployeeId(employeeId)
      .then((rows) => {
        if (cancelled) return;
        setEmpSecurity(
          (Array.isArray(rows) ? rows : []).filter(
            (r) => Number(r.collegeId ?? 0) > 0,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setEmpSecurity([]);
      })
      .finally(() => {
        if (!cancelled) setEmpSecurityReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  // Angular queryParams restore on return from profile / edit-student
  useEffect(() => {
    if (urlRestoreApplied.current) return;
    const checkParam = searchParams.get("check");
    urlRestoreApplied.current = true;
    if (!checkParam) return;

    if (checkParam === "1") {
      setMode("student");
      pendingStudentRestore.current = {
        studentId: Number(searchParams.get("studentId") || 0) || undefined,
        rollNumber: searchParams.get("rollNumber") ?? undefined,
      };
      return;
    }

    if (checkParam === "2") {
      const college = Number(searchParams.get("collegeId") || 0);
      const ay = Number(searchParams.get("academicYearId") || 0);
      const course = Number(searchParams.get("courseId") || 0);
      const group = Number(searchParams.get("courseGroupId") || 0);
      const year = Number(searchParams.get("courseYearId") || 0);
      const sectionRaw = searchParams.get("groupSectionId");
      const section =
        sectionRaw == null || sectionRaw === "" ? NaN : Number(sectionRaw);
      if (
        !college ||
        !ay ||
        !course ||
        !group ||
        !year ||
        !Number.isFinite(section)
      )
        return;
      setMode("section");
      sectionCascadeAutoFill.current = false;
      pendingSectionRestore.current = {
        universityId:
          Number(searchParams.get("universityId") || 0) || undefined,
        collegeId: college,
        academicYearId: ay,
        courseId: course,
        courseGroupId: group,
        courseYearId: year,
        groupSectionId: section,
      };
      void loadFilters();
    }
  }, [searchParams, loadFilters]);

  useEffect(() => {
    if (mode === "section") void loadFilters();
  }, [mode, loadFilters]);

  // Apply section restore once filter rows are available
  useEffect(() => {
    const restore = pendingSectionRestore.current;
    if (!restore || loadingFilters || filtersData.length === 0) return;

    const collegeRow = filtersData.find(
      (r) => pickNum(r, COL) === restore.collegeId,
    );
    const univ =
      restore.universityId ||
      pickNum(collegeRow, UNIV) ||
      Number(user?.universityId ?? 0) ||
      0;
    if (!univ) return;

    pendingSectionRestore.current = null;
    sectionCascadeAutoFill.current = false;
    setUniversityId(univ);
    setCollegeId(restore.collegeId);
    setAcademicYearId(restore.academicYearId);
    setCourseId(restore.courseId);
    setCourseGroupId(restore.courseGroupId);
    setCourseYearId(restore.courseYearId);
    setGroupSectionId(restore.groupSectionId);
    sectionUserPickRef.current = true;
  }, [filtersData, loadingFilters, user?.universityId]);

  // Apply student restore (Angular enteredStudent(rollNumber, 'para'))
  useEffect(() => {
    const restore = pendingStudentRestore.current;
    if (!restore) return;
    const q = (restore.rollNumber || "").trim();
    if (q.length <= 4) {
      pendingStudentRestore.current = null;
      return;
    }
    // Wait for empSecurity fetch so dept-admin / multi-college paths match Angular.
    if (!empSecurityReady) return;

    pendingStudentRestore.current = null;
    let cancelled = false;
    void (async () => {
      setStudentSearchLoading(true);
      try {
        const list = await searchStudentsForStudentDetailsList({
          q,
          isAdmin,
          isDeptAdmin,
          empSecurity,
          collegeIds: collegeIdsForSearch,
          mode: "restore",
        });
        if (cancelled) return;
        setStudentOptions(list);
        const match =
          (restore.studentId
            ? list.find(
                (r) =>
                  pickNum(r, ["studentId", "fk_student_id"]) ===
                  restore.studentId,
              )
            : null) ??
          list[0] ??
          null;
        if (match) {
          const sid = pickNum(match, ["studentId", "fk_student_id"]);
          setSelectedStudentId(sid || null);
          setRows(normalizeRowList([match]));
        }
      } finally {
        if (!cancelled) setStudentSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    isDeptAdmin,
    empSecurity,
    empSecurityReady,
    collegeIdsForSearch,
    searchParams,
  ]);

  const universities = useMemo(
    () =>
      dedupeBy(
        filtersData.filter((r) => pickNum(r, UNIV) > 0),
        (r) => pickNum(r, UNIV),
      ),
    [filtersData],
  );

  const colleges = useMemo(() => {
    if (!universityId) return [];
    return dedupeColleges(
      filtersData.filter((r) => pickNum(r, UNIV) === universityId),
    );
  }, [filtersData, universityId]);

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const raw = academicYearData.filter(
      (r) => pickNum(r, UNIV) === universityId,
    );
    const deduped = dedupeBy(raw, (r) => pickNum(r, AY));
    return deduped.sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? b.academicYear ?? 0), 10) -
        parseInt(String(a.academic_year ?? a.academicYear ?? 0), 10),
    );
  }, [academicYearData, universityId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      filtersData.filter((x) => pickNum(x, COL) === collegeId),
      (r) => pickNum(r, CRS),
    );
  }, [collegeId, filtersData]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    return dedupeBy(
      filtersData.filter(
        (x) => pickNum(x, COL) === collegeId && pickNum(x, CRS) === courseId,
      ),
      (r) => pickNum(r, GRP),
    );
  }, [collegeId, courseId, filtersData]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    return dedupeBy(
      filtersData.filter(
        (x) =>
          pickNum(x, COL) === collegeId &&
          pickNum(x, CRS) === courseId &&
          pickNum(x, GRP) === courseGroupId,
      ),
      (r) => pickNum(r, YR),
    ).sort((a, b) => (Number(a.year_order) || 0) - (Number(b.year_order) || 0));
  }, [collegeId, courseId, courseGroupId, filtersData]);

  useEffect(() => {
    if (mode !== "section" || loadingFilters || universities.length === 0)
      return;
    if (!sectionCascadeAutoFill.current) return;
    if (!universityId) setUniversityId(pickNum(universities[0], UNIV));
  }, [mode, loadingFilters, universities, universityId]);

  useEffect(() => {
    if (!universityId || colleges.length === 0) {
      setCollegeId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCollegeId((prev) =>
      prev && colleges.some((c) => pickNum(c, COL) === prev)
        ? prev
        : pickNum(colleges[0], COL),
    );
  }, [universityId, colleges]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    const current = academicYears.find((y) => Number(y.is_curr_ay ?? 0) === 1);
    setAcademicYearId((prev) =>
      prev && academicYears.some((y) => pickNum(y, AY) === prev)
        ? prev
        : pickNum(current ?? academicYears[0], AY),
    );
  }, [academicYears]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseId((prev) =>
      prev && courses.some((c) => pickNum(c, CRS) === prev)
        ? prev
        : pickNum(courses[0], CRS),
    );
  }, [courses]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseGroupId((prev) =>
      prev && courseGroups.some((g) => pickNum(g, GRP) === prev)
        ? prev
        : pickNum(courseGroups[0], GRP),
    );
  }, [courseGroups]);

  // Angular `selectedGroup` does NOT auto-select course year (else branch commented).
  // Only keep a still-valid selection; user (or URL restore) must pick a year.
  useEffect(() => {
    if (pendingSectionRestore.current) return;
    if (!courseYears.length) {
      setCourseYearId(null);
      setGroupSectionId(null);
      setRows([]);
      return;
    }
    if (
      courseYearId != null &&
      !courseYears.some((y) => pickNum(y, YR) === courseYearId)
    ) {
      setCourseYearId(null);
      setGroupSectionId(null);
      setRows([]);
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    async function loadSections() {
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !academicYearId
      ) {
        setSectionApiRows([]);
        return;
      }
      const apiRows = await listStudentSectionsByProc({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => []);
      setSectionApiRows(Array.isArray(apiRows) ? apiRows : []);
    }
    void loadSections();
  }, [
    organizationId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
  ]);

  const sectionOpts = useMemo(
    () => [
      { value: "0", label: "All" },
      ...sectionApiRows.map((r) => ({
        value: String(pickNum(r, SEC)),
        label:
          pickText(r, ["section", "group_section_name", "groupSectionName"]) ||
          `Section ${pickNum(r, SEC)}`,
      })),
    ],
    [sectionApiRows],
  );

  const loadStudentsBySection = useCallback(
    async (
      sectionId: number | null = groupSectionId,
      showEmptyToast = false,
    ) => {
      if (
        !collegeId ||
        !academicYearId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId
      )
        return;
      if (sectionId === null) {
        setRows([]);
        return;
      }
      const seq = ++studentsLoadSeq.current;
      setLoadingStudents(true);
      try {
        const list = await listStudentsForStudentDetails({
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
          groupSectionId: sectionId > 0 ? sectionId : undefined,
        });
        if (seq !== studentsLoadSeq.current) return;
        setRows(normalizeRowList(list));
        if (!list.length && showEmptyToast) toastSuccess("No students found.");
      } catch (e) {
        if (seq !== studentsLoadSeq.current) return;
        toastError(e, "Failed to load students");
        setRows([]);
      } finally {
        if (seq === studentsLoadSeq.current) setLoadingStudents(false);
      }
    },
    [
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      groupSectionId,
    ],
  );

  // Angular `getStudents` — load when section filters are complete (All = 0 or specific section).
  useEffect(() => {
    if (mode !== "section") return;
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId
    )
      return;
    if (groupSectionId === null) {
      setRows([]);
      return;
    }
    const showEmptyToast = sectionUserPickRef.current;
    sectionUserPickRef.current = false;
    void loadStudentsBySection(groupSectionId, showEmptyToast);
  }, [
    mode,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId,
    loadStudentsBySection,
  ]);

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setStudentOptions([]);
      return;
    }
    if (q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const list = await searchStudentsForStudentDetailsList({
        q,
        isAdmin,
        isDeptAdmin,
        empSecurity,
        collegeIds: collegeIdsForSearch,
        mode: "type",
      });
      setStudentOptions(Array.isArray(list) ? list : []);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  function onStudentSelect(nextId: number | null, match: AnyRow | null) {
    setSelectedStudentId(nextId);
    if (!nextId || !match) {
      setRows([]);
      return;
    }
    setRows(normalizeRowList([match]));
  }

  function resetForMode(next: "student" | "section") {
    setMode(next);
    setRows([]);
    setTableFilter("");
    if (next === "student") {
      setStudentOptions([]);
      setSelectedStudentId(null);
    } else {
      sectionCascadeAutoFill.current = true;
      setGroupSectionId(null);
      void loadFilters();
    }
  }

  function clearSectionCascade() {
    setRows([]);
    setGroupSectionId(null);
  }

  const univOpts = universities.map((r) => ({
    value: String(pickNum(r, UNIV)),
    label: pickText(r, ["university_code", "universityCode"]) || "University",
  }));
  const collegeOpts = colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label: pickText(r, ["college_code", "collegeCode"]) || "College",
  }));
  const ayOpts = academicYears.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
  const courseOpts = courses.map((r) => ({
    value: String(pickNum(r, CRS)),
    label: pickText(r, ["course_code", "courseCode"]) || "Course",
  }));
  const groupOpts = courseGroups.map((r) => ({
    value: String(pickNum(r, GRP)),
    label: pickText(r, ["group_code", "groupCode"]) || "Group",
  }));
  const yearOpts = courseYears.map((r) => ({
    value: String(pickNum(r, YR)),
    label:
      pickText(r, ["course_year_name", "courseYearName", "course_year_code"]) ||
      "Year",
  }));

  const tableHeaderParts = useMemo(() => {
    if (rows.length > 0) return headerPartsFromRow(rows[0]);
    if (mode !== "section") return [];
    const college = colleges.find((c) => pickNum(c, COL) === collegeId);
    const ay = academicYears.find((y) => pickNum(y, AY) === academicYearId);
    const course = courses.find((c) => pickNum(c, CRS) === courseId);
    const group = courseGroups.find((g) => pickNum(g, GRP) === courseGroupId);
    const year = courseYears.find((y) => pickNum(y, YR) === courseYearId);
    const sec =
      groupSectionId !== null && groupSectionId > 0
        ? sectionApiRows.find((s) => pickNum(s, SEC) === groupSectionId)
        : null;
    return [
      pickText(college, ["college_code", "collegeCode"]),
      pickText(ay, ["academic_year", "academicYear"]),
      pickText(course, ["course_code", "courseCode"]),
      pickText(group, ["group_code", "groupCode"]),
      pickText(year, ["course_year_name", "courseYearName"]),
      groupSectionId === null
        ? ""
        : groupSectionId > 0
          ? pickText(sec, ["section", "group_section_name"])
          : "All",
    ].filter((p) => p && p !== "-");
  }, [
    rows,
    mode,
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    groupSectionId,
    sectionApiRows,
  ]);

  function navigateProfile(studentId: number) {
    router.push(
      `/admin-student-information-system/students-profile?studentId=${studentId}&check=${check}`,
    );
  }

  function navigateEdit(studentId: number) {
    router.push(
      `/admin-student-information-system/edit-student?studentId=${studentId}&check=${check}`,
    );
  }

  function navigateViewProfile(row: AnyRow) {
    const sid = pickNum(row, ["studentId", "fk_student_id"]);
    const roll = pickText(row, ["rollNumber", "hallticketNumber"]);
    const params = new URLSearchParams({
      studentId: String(sid),
      check: String(check),
    });
    if (roll) params.set("rollNumber", roll);
    router.push(
      `/principal-student-information-system/student-details?${params.toString()}`,
    );
  }

  async function openHodEdit(row: AnyRow) {
    const sid = pickNum(row, ["studentId", "fk_student_id"]);
    if (!sid) return;
    try {
      const detail = await fetchStudentDetail(sid);
      setEditStudent(detail ?? row);
      setEditOpen(true);
    } catch (e) {
      toastError(e, "Failed to load student details");
    }
  }

  async function saveHodEdit(payload: AnyRow) {
    setEditSaving(true);
    try {
      await updateStudentQuickProfile(payload);
      toastSuccess("Student details updated.");
      setEditOpen(false);
      setEditStudent(null);
      if (mode === "student" && selectedStudentId) {
        const match = studentOptions.find(
          (r) =>
            pickNum(r, ["studentId", "fk_student_id"]) === selectedStudentId,
        );
        if (match) onStudentSelect(selectedStudentId, match);
      } else {
        await loadStudentsBySection();
      }
    } catch (e) {
      toastError(e, "Failed to save student details");
    } finally {
      setEditSaving(false);
    }
  }

  function openSendCredentials(row?: AnyRow) {
    if (row) {
      setCredRows([
        {
          studentId: pickNum(row, ["studentId", "fk_student_id"]),
          collegeId: pickNum(row, ["collegeId", "fk_college_id"]),
        },
      ]);
      setCredLabel(
        `${pickText(row, ["firstName", "studentName"])} (${pickText(row, ["hallticketNumber", "rollNumber"])})`,
      );
    } else {
      setCredRows(
        rows.map((s) => ({
          studentId: pickNum(s, ["studentId", "fk_student_id"]),
          collegeId: pickNum(s, ["collegeId", "fk_college_id"]),
        })),
      );
      setCredLabel("All Students");
    }
    setCredOpen(true);
  }

  async function confirmSendCredentials() {
    setCredSending(true);
    try {
      await sendStudentCredentials(credRows);
      toastSuccess("Credentials sent successfully.");
      setCredOpen(false);
      if (mode === "student" && selectedStudentId) {
        const match = studentOptions.find(
          (r) =>
            pickNum(r, ["studentId", "fk_student_id"]) === selectedStudentId,
        );
        if (match) onStudentSelect(selectedStudentId, match);
      } else {
        await loadStudentsBySection();
      }
    } catch (e) {
      toastError(e, "Failed to send credentials");
    } finally {
      setCredSending(false);
    }
  }

  return (
    <FilteredPage
      title="Student Details"
      notice={
        <div className="px-1">
          <Tabs
            value={mode}
            onValueChange={(v) =>
              resetForMode(v === "section" ? "section" : "student")
            }
          >
            <TabsList className="h-auto rounded-none border-b border-border bg-transparent p-0 text-muted-foreground">
              <TabsTrigger
                className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-[#2f8fd4] data-[state=active]:bg-[#eaf4ff] data-[state=active]:text-[#1f4f7a] data-[state=active]:shadow-none"
                value="student"
              >
                Search By Student
              </TabsTrigger>
              <TabsTrigger
                className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-[#2f8fd4] data-[state=active]:bg-[#eaf4ff] data-[state=active]:text-[#1f4f7a] data-[state=active]:shadow-none"
                value="section"
              >
                Search By Section
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
      filters={
        mode === "student" ? (
          <StudentSearchSelect
            value={selectedStudentId}
            students={studentOptions}
            selectedStudent={rows[0] ?? null}
            isLoading={studentSearchLoading}
            onSearch={(term) => void onSearchStudents(term)}
            onChange={onStudentSelect}
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className={selectClass()}>
                <Select
                  label="University"
                  value={universityId ? String(universityId) : null}
                  options={univOpts}
                  placeholder="Select University"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setUniversityId(parseSelectNumber(v));
                    setCollegeId(null);
                    setCourseId(null);
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters}
                  searchable
                />
              </div>
              <div className={selectClass()}>
                <Select
                  label="College"
                  value={collegeId ? String(collegeId) : null}
                  options={collegeOpts}
                  placeholder="Select College"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setCollegeId(parseSelectNumber(v));
                    setCourseId(null);
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters || !collegeOpts.length}
                  searchable
                />
              </div>
              <div className={selectClass()}>
                <Select
                  label="Course"
                  value={courseId ? String(courseId) : null}
                  options={courseOpts}
                  placeholder="Select Course"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setCourseId(parseSelectNumber(v));
                    setCourseGroupId(null);
                    setCourseYearId(null);
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters || !courseOpts.length}
                  searchable
                />
              </div>
              <div className={selectClass()}>
                <Select
                  label="Course Group"
                  value={courseGroupId ? String(courseGroupId) : null}
                  options={groupOpts}
                  placeholder="Select Course Group"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setCourseGroupId(parseSelectNumber(v));
                    setCourseYearId(null);
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters || !groupOpts.length}
                  searchable
                />
              </div>
              <div className={selectClass()}>
                <Select
                  label="Course Year"
                  value={courseYearId ? String(courseYearId) : null}
                  options={yearOpts}
                  placeholder="Select Course Year"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setCourseYearId(parseSelectNumber(v));
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters || !yearOpts.length}
                  searchable
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className={selectClass()}>
                <Select
                  label="Academic Year"
                  value={academicYearId ? String(academicYearId) : null}
                  options={ayOpts}
                  placeholder="Select Academic Year"
                  clearable
                  onChange={(v) => {
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setAcademicYearId(parseSelectNumber(v));
                    clearSectionCascade();
                  }}
                  disabled={loadingFilters || !ayOpts.length}
                  searchable
                />
              </div>
              <div className={selectClass()}>
                <Select
                  label="Section"
                  value={
                    groupSectionId === null ? null : String(groupSectionId)
                  }
                  options={sectionOpts}
                  placeholder="Select Section"
                  clearable
                  onChange={(v) => {
                    sectionUserPickRef.current = true;
                    onSectionCascadeSelect(v, sectionCascadeAutoFill);
                    setGroupSectionId(parseSectionSelect(v));
                  }}
                  disabled={loadingFilters || !courseYearId}
                  searchable
                />
              </div>
            </div>
            {loadingStudents && (
              <p className="text-xs text-muted-foreground">Loading students…</p>
            )}
          </div>
        )
      }
    >
      <StudentsListTable
        mode={mode}
        rows={rows}
        headerParts={tableHeaderParts}
        tableFilter={tableFilter}
        onTableFilterChange={setTableFilter}
        canSendCredentials={canSendCredentials}
        showBulkSendCredentials
        canNavigateEdit={canNavigateEdit}
        canModalEdit={canModalEdit}
        onViewProfile={navigateViewProfile}
        onEditNavigate={(row) =>
          navigateEdit(pickNum(row, ["studentId", "fk_student_id"]))
        }
        onEditModal={(row) => void openHodEdit(row)}
        onViewDetails={(row) =>
          navigateProfile(pickNum(row, ["studentId", "fk_student_id"]))
        }
        onSendCredentials={(row) => openSendCredentials(row)}
        onSendBulkCredentials={() => openSendCredentials()}
      />

      <EditStudentProfileModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditStudent(null);
        }}
        student={editStudent}
        saving={editSaving}
        onSave={saveHodEdit}
      />

      <Dialog
        open={credOpen}
        onOpenChange={(open) => !open && setCredOpen(false)}
      >
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--primary))]">
              <LayoutList
                className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]"
                aria-hidden
              />
              <span>Send Credentials</span>
            </div>
            <div className="mt-2 h-px w-full bg-[#e2e7ee]" />
          </div>
          <div className="px-4 py-5">
            <p className="text-[13px] font-semibold text-foreground">
              Send Credentials To :{" "}
              <span className="font-bold text-blue-600">
                {credLabel.toUpperCase()}
              </span>
            </p>
          </div>
          <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button
              type="button"
              className="h-8 min-w-[72px] text-xs"
              disabled={credSending}
              onClick={() => void confirmSendCredentials()}
            >
              {credSending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Send
                </>
              ) : (
                "Send"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 min-w-[72px] text-xs"
              disabled={credSending}
              onClick={() => setCredOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
