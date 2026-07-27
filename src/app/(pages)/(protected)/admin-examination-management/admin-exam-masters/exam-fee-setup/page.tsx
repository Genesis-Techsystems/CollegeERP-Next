"use client";

import { FilteredListPage } from "@/components/layout";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionContext } from "@/context/SessionContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { distinct } from "@/lib/utils";
import {
  computeCascadeFromRows,
  deriveExamOptions,
  sortAcademicYearsDesc,
} from "@/lib/univ-exam-filter-cascade";
import {
  listCollegesByCourseForExamFee,
  listExamFeeStructuresByCollegeAndExam,
  listExamFeeStructuresByExam,
  resolveExamLoginEmpId,
  getUnivExamFiltersForExamFeeSetup,
} from "@/services";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import {
  Building2,
  Calendar,
  GraduationCap,
  ScrollText,
  School,
  Eye,
  Pencil,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import ViewExamFeeStructureModal, {
  type ExamFeeStructureViewData,
} from "./ViewExamFeeStructureModal";

function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "d MMM, yyyy");
}

/** Angular list Supple Fee: Subject-1..7 + `, More than 4 - {supplyFee}` when supplyFee present. */
function getSuppleFeeText(row: Record<string, unknown>): string {
  const asText = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
    return "";
  };
  const parts: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const text = asText(row[`subject${i}Fee`]).trim();
    if (text !== "") parts.push(`Subject-${i} - ${text}`);
  }
  const supply = asText(row.supplyFee ?? row.suppleFee).trim();
  if (supply !== "") parts.push(`More than 4 - ${supply}`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function examOptionLabel(exam: {
  examName?: string;
  fromDate?: unknown;
  toDate?: unknown;
  isInternalExam?: unknown;
  isRegularExam?: unknown;
  isSupplyExam?: unknown;
}): string {
  const name = String(exam.examName ?? "—");
  const from = formatDisplayDate(exam.fromDate);
  const to = formatDisplayDate(exam.toDate);
  const range = from || to ? ` (${from || "—"} - ${to || "—"})` : "";
  const tags: string[] = [];
  if (exam.isInternalExam) tags.push("(Internal)");
  if (exam.isRegularExam) tags.push("(Regular)");
  if (exam.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

export default function ExamFeeSetupPage() {
  const { user } = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"university" | "college">(
    searchParams.get("check") === "2" ? "college" : "university",
  );

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filtersData, setFiltersData] = useState<any[]>([]);

  const [universities, setUniversities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [examMasters, setExamMasters] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] = useState<
    number | null
  >(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<
    number | null
  >(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(
    null,
  );

  const [rows, setRows] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<ExamFeeStructureViewData | null>(null);

  const selectedExam = useMemo(
    () =>
      examMasters.find(
        (e) => Number(e.examId ?? e.id) === Number(selectedExamId),
      ) ?? null,
    [examMasters, selectedExamId],
  );
  const selectedCollege = useMemo(
    () =>
      colleges.find(
        (c) => Number(c.fk_college_id) === Number(selectedCollegeId),
      ) ?? null,
    [colleges, selectedCollegeId],
  );
  const selectedUniversity = useMemo(
    () =>
      universities.find(
        (u) => Number(u.fk_university_id) === Number(selectedUniversityId),
      ) ?? null,
    [universities, selectedUniversityId],
  );
  const selectedCourse = useMemo(
    () =>
      courses.find(
        (c) => Number(c.fk_course_id) === Number(selectedCourseId),
      ) ?? null,
    [courses, selectedCourseId],
  );
  const selectedAy = useMemo(
    () =>
      academicYears.find(
        (a) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId),
      ) ?? null,
    [academicYears, selectedAcademicYearId],
  );

  const loadList = useCallback(
    async (
      examId: number | null,
      collegeId: number | null,
      forMode: "university" | "college",
    ) => {
      if (!examId) {
        setRows([]);
        setHasFetched(false);
        return;
      }
      setLoadingList(true);
      setHasFetched(true);
      try {
        const data =
          forMode === "college"
            ? await listExamFeeStructuresByCollegeAndExam(
                collegeId ?? 0,
                examId,
              )
            : await listExamFeeStructuresByExam(examId);
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [],
  );

  const loadCollegesForCourse = useCallback(
    async (
      courseId: number | null,
      examId: number | null,
      preferredCollegeId?: number | null,
    ) => {
      if (!courseId) {
        setColleges([]);
        setSelectedCollegeId(null);
        return;
      }
      const list = await listCollegesByCourseForExamFee(courseId).catch(
        () => [],
      );
      setColleges(list);
      const preferred =
        preferredCollegeId &&
        list.some((c) => Number(c.fk_college_id) === Number(preferredCollegeId))
          ? Number(preferredCollegeId)
          : null;
      const nextCollegeId =
        preferred ?? (list[0] ? Number(list[0].fk_college_id) : null);
      setSelectedCollegeId(nextCollegeId);
      if (examId) {
        await loadList(examId, nextCollegeId, "college");
      }
    },
    [loadList],
  );

  const applyCascade = useCallback(
    (
      universityId: number,
      list: any[],
      preferred?: {
        courseId?: number | null;
        academicYearId?: number | null;
        examId?: number | null;
        collegeId?: number | null;
        mode?: "university" | "college";
      },
    ) => {
      const c = computeCascadeFromRows(universityId, list);
      let courseId = c.firstCourse;
      let academicYearsLocal = c.academicYears;
      let ayId = c.firstAy;
      let exams = c.exams;
      let examId = c.firstExam;

      if (
        preferred?.courseId &&
        c.courses.some(
          (x) => Number(x.fk_course_id) === Number(preferred.courseId),
        )
      ) {
        courseId = preferred.courseId;
        const aySource = list.filter(
          (r: any) =>
            r &&
            Number(r.fk_university_id) === Number(universityId) &&
            Number(r.fk_course_id) === Number(courseId),
        );
        academicYearsLocal = sortAcademicYearsDesc(
          distinct(aySource, (r: any) => r.fk_academic_year_id).filter(
            (r: any) => r.fk_academic_year_id != null,
          ),
        );
        ayId =
          preferred.academicYearId &&
          academicYearsLocal.some(
            (a) =>
              Number(a.fk_academic_year_id) ===
              Number(preferred.academicYearId),
          )
            ? preferred.academicYearId
            : (academicYearsLocal[0]?.fk_academic_year_id ?? null);
        exams =
          ayId != null
            ? deriveExamOptions(list, universityId, courseId, ayId)
            : [];
        examId =
          preferred.examId &&
          exams.some((e) => Number(e.examId) === Number(preferred.examId))
            ? preferred.examId
            : (exams[0]?.examId ?? null);
      }

      setCourses(c.courses);
      setSelectedCourseId(courseId);
      setAcademicYears(academicYearsLocal);
      setSelectedAcademicYearId(ayId);
      setExamMasters(exams);
      setSelectedExamId(examId);

      const nextMode = preferred?.mode ?? mode;
      if (nextMode === "college" && courseId && examId) {
        void loadCollegesForCourse(
          courseId,
          examId,
          preferred?.collegeId ?? null,
        );
      } else if (nextMode === "university" && examId) {
        setColleges([]);
        setSelectedCollegeId(null);
        void loadList(examId, null, "university");
      } else {
        setColleges([]);
        setSelectedCollegeId(null);
        setRows([]);
        setHasFetched(false);
      }
    },
    [loadCollegesForCourse, loadList, mode],
  );

  const fetchFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const empId = resolveExamLoginEmpId(user?.employeeId);
      const list = await getUnivExamFiltersForExamFeeSetup(empId);
      const rowsList = Array.isArray(list) ? list : [];
      setFiltersData(rowsList);

      const unis = distinct(
        rowsList.filter(
          (r: any) =>
            r && r.fk_university_id != null && r.fk_university_id !== "",
        ),
        (r: any) => r.fk_university_id,
      );
      setUniversities(unis);

      const preferredUniId =
        Number(searchParams.get("universityId") ?? 0) || null;
      const uniId =
        preferredUniId &&
        unis.some((u) => Number(u.fk_university_id) === preferredUniId)
          ? preferredUniId
          : (unis[0]?.fk_university_id ?? null);

      if (uniId != null) {
        setSelectedUniversityId(uniId);
        applyCascade(uniId, rowsList, {
          courseId: Number(searchParams.get("courseId") ?? 0) || null,
          academicYearId:
            Number(searchParams.get("academicYearId") ?? 0) || null,
          examId: Number(searchParams.get("examId") ?? 0) || null,
          collegeId: Number(searchParams.get("collegeId") ?? 0) || null,
          mode: searchParams.get("check") === "2" ? "college" : "university",
        });
      } else {
        setSelectedUniversityId(null);
        setCourses([]);
        setSelectedCourseId(null);
        setAcademicYears([]);
        setSelectedAcademicYearId(null);
        setExamMasters([]);
        setSelectedExamId(null);
        setColleges([]);
        setSelectedCollegeId(null);
        setRows([]);
        setHasFetched(false);
      }
    } finally {
      setLoadingFilters(false);
    }
  }, [applyCascade, searchParams, user?.employeeId]);

  useEffect(() => {
    void fetchFilters();
    // Restore filters once on mount from query params / default cascade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.employeeId]);

  function clearForMode(nextMode: "university" | "college") {
    setMode(nextMode);
    setRows([]);
    setHasFetched(false);
    setColleges([]);
    setSelectedCollegeId(null);
    setSelectedUniversityId(null);
    setCourses([]);
    setSelectedCourseId(null);
    setAcademicYears([]);
    setSelectedAcademicYearId(null);
    setExamMasters([]);
    setSelectedExamId(null);

    if (filtersData.length > 0) {
      const unis = distinct(
        filtersData.filter(
          (r: any) =>
            r && r.fk_university_id != null && r.fk_university_id !== "",
        ),
        (r: any) => r.fk_university_id,
      );
      setUniversities(unis);
      const uniId = unis[0]?.fk_university_id ?? null;
      if (uniId != null) {
        setSelectedUniversityId(uniId);
        applyCascade(uniId, filtersData, { mode: nextMode });
      }
    }
  }

  function handleUniversityChange(universityId: number) {
    setSelectedUniversityId(universityId);
    setRows([]);
    setHasFetched(false);
    applyCascade(universityId, filtersData, { mode });
  }

  function handleCourseChange(courseId: number) {
    if (!selectedUniversityId) return;
    setSelectedCourseId(courseId);
    setSelectedAcademicYearId(null);
    setSelectedExamId(null);
    setSelectedCollegeId(null);
    setColleges([]);
    setRows([]);
    setHasFetched(false);

    const aySource = filtersData.filter(
      (r: any) =>
        r &&
        Number(r.fk_university_id) === Number(selectedUniversityId) &&
        Number(r.fk_course_id) === Number(courseId),
    );
    const ayDistinct = sortAcademicYearsDesc(
      distinct(aySource, (r: any) => r.fk_academic_year_id).filter(
        (r: any) => r.fk_academic_year_id != null,
      ),
    );
    setAcademicYears(ayDistinct);
    const firstAy = ayDistinct[0]?.fk_academic_year_id ?? null;
    setSelectedAcademicYearId(firstAy);
    if (firstAy != null) {
      const examOpts = deriveExamOptions(
        filtersData,
        selectedUniversityId,
        courseId,
        firstAy,
      );
      setExamMasters(examOpts);
      const firstExam = examOpts[0]?.examId ?? null;
      setSelectedExamId(firstExam);
      if (mode === "college" && firstExam) {
        void loadCollegesForCourse(courseId, firstExam, null);
      } else if (mode === "university" && firstExam) {
        void loadList(firstExam, null, "university");
      }
    } else {
      setExamMasters([]);
      setSelectedExamId(null);
    }
  }

  function handleAcademicYearChange(ayId: number) {
    if (!selectedUniversityId || !selectedCourseId) return;
    setSelectedAcademicYearId(ayId);
    setSelectedExamId(null);
    setSelectedCollegeId(null);
    setColleges([]);
    setRows([]);
    setHasFetched(false);
    const examOpts = deriveExamOptions(
      filtersData,
      selectedUniversityId,
      selectedCourseId,
      ayId,
    );
    setExamMasters(examOpts);
    const firstExam = examOpts[0]?.examId ?? null;
    setSelectedExamId(firstExam);
    if (mode === "college" && firstExam) {
      void loadCollegesForCourse(selectedCourseId, firstExam, null);
    } else if (mode === "university" && firstExam) {
      void loadList(firstExam, null, "university");
    }
  }

  function handleExamChange(examId: number | null) {
    setSelectedExamId(examId);
    setRows([]);
    setHasFetched(false);
    if (!examId) return;
    if (mode === "college") {
      void loadCollegesForCourse(selectedCourseId, examId, selectedCollegeId);
    } else {
      void loadList(examId, null, "university");
    }
  }

  function handleCollegeChange(collegeId: number | null) {
    setSelectedCollegeId(collegeId);
    if (selectedExamId) {
      void loadList(selectedExamId, collegeId, "college");
    }
  }

  const buildNavQuery = useCallback(
    (extra?: Record<string, string>): string => {
      const qp = new URLSearchParams({
        check: mode === "college" ? "2" : "1",
        universityId: String(selectedUniversityId ?? 0),
        universityCode: String(selectedUniversity?.university_code ?? ""),
        courseId: String(selectedCourseId ?? 0),
        courseName: String(
          selectedCourse?.course_code ??
            selectedCourse?.course_name ??
            selectedExam?.courseCode ??
            "",
        ),
        academicYearId: String(selectedAcademicYearId ?? 0),
        academicYear: String(selectedAy?.academic_year ?? ""),
        examId: String(selectedExamId ?? 0),
        examName: String(selectedExam?.examName ?? ""),
        fromDate: String(selectedExam?.fromDate ?? ""),
        toDate: String(selectedExam?.toDate ?? ""),
        collegeId: mode === "college" ? String(selectedCollegeId ?? 0) : "null",
        collegeName:
          mode === "college" ? String(selectedCollege?.college_code ?? "") : "",
        ...extra,
      });
      return qp.toString();
    },
    [
      mode,
      selectedAcademicYearId,
      selectedAy,
      selectedCollege,
      selectedCollegeId,
      selectedCourse,
      selectedCourseId,
      selectedExam,
      selectedExamId,
      selectedUniversity,
      selectedUniversityId,
    ],
  );

  const titleLine = useMemo(() => {
    if (!hasFetched || !selectedExam) return "";
    const uniLabel = String(selectedUniversity?.university_code ?? "");
    const collegeLabel =
      mode === "college" ? String(selectedCollege?.college_code ?? "") : "";
    const ayLabel = String(selectedAy?.academic_year ?? "");
    const courseLabel = String(
      selectedExam.courseCode ?? selectedCourse?.course_code ?? "",
    );
    const examLabel = String(selectedExam.examName ?? "");
    const from = formatDisplayDate(selectedExam.fromDate);
    const to = formatDisplayDate(selectedExam.toDate);
    const tags: string[] = [];
    if (selectedExam.isInternalExam) tags.push("(Internal)");
    if (selectedExam.isRegularExam) tags.push("(Regular)");
    if (selectedExam.isSupplyExam) tags.push("(Supple)");
    const left = [uniLabel, collegeLabel].filter(Boolean).join(" ");
    const mid = [ayLabel, courseLabel, examLabel].filter(Boolean).join(" / ");
    const range = from || to ? ` (${from || "—"} - ${to || "—"})` : "";
    return `${left}${left && mid ? " / " : ""}${mid}${range}${tags.length ? ` ${tags.join("")}` : ""}`.trim();
  }, [
    hasFetched,
    mode,
    selectedAy,
    selectedCollege,
    selectedCourse,
    selectedExam,
    selectedUniversity,
  ]);

  const cols = useMemo<ColDef<any>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        minWidth: 70,
        flex: 0,
      },
      {
        field: "examFeeStructureName",
        headerName: "Exam Fee Structure",
        minWidth: 170,
      },
      {
        headerName: "Exam Master",
        field: "examName",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) =>
          p.data?.examName ??
          p.data?.examMaster?.examName ??
          p.data?.examMasterName ??
          "—",
      },
      {
        headerName: "Collection Start Date",
        minWidth: 140,
        valueGetter: (p) => {
          const v = p.data?.collectionStartDate;
          if (!v) return "—";
          const d = new Date(v);
          return Number.isNaN(d.getTime())
            ? String(v)
            : format(d, "dd MMM, yyyy");
        },
      },
      {
        headerName: "Collection End Date",
        minWidth: 140,
        valueGetter: (p) => {
          const v = p.data?.collectionEndDate;
          if (!v) return "—";
          const d = new Date(v);
          return Number.isNaN(d.getTime())
            ? String(v)
            : format(d, "dd MMM, yyyy");
        },
      },
      {
        headerName: "Regular Fee",
        minWidth: 100,
        valueGetter: (p) => p.data?.regFee ?? p.data?.regularFee ?? "—",
      },
      {
        headerName: "Supple Fee",
        minWidth: 260,
        flex: 1,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="whitespace-normal leading-snug">
            {getSuppleFeeText((p.data ?? {}) as Record<string, unknown>)}
          </span>
        ),
        tooltipValueGetter: (p) =>
          getSuppleFeeText((p.data ?? {}) as Record<string, unknown>),
      },
      {
        field: "isActive",
        headerName: "Status",
        width: 100,
        flex: 0,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 110,
        flex: 0,
        cellRenderer: (p: ICellRendererParams) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="View exam fee structure"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setViewing({
                  ...(p.data ?? {}),
                  collegeCode:
                    p.data?.collegeCode ??
                    (mode === "college"
                      ? String(selectedCollege?.college_code ?? "")
                      : ""),
                  courseCode:
                    p.data?.courseCode ??
                    String(
                      selectedExam?.courseCode ??
                        selectedCourse?.course_code ??
                        "",
                    ),
                  examYear:
                    p.data?.examYear ?? String(selectedAy?.academic_year ?? ""),
                  examName:
                    p.data?.examName ??
                    p.data?.examMaster?.examName ??
                    String(selectedExam?.examName ?? ""),
                  regFee: p.data?.regFee ?? p.data?.regularFee,
                  supplyFee: p.data?.supplyFee ?? p.data?.suppleFee,
                });
                setViewOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedExamId) return;
                router.push(
                  `/admin-examination-management/admin-exam-masters/exam-fee-setup/create?${buildNavQuery(
                    {
                      examFeeStructureId: String(
                        p.data?.examFeeStructureId ?? p.data?.id ?? 0,
                      ),
                    },
                  )}`,
                );
              }}
              disabled={!selectedExamId}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [
      buildNavQuery,
      mode,
      router,
      selectedAy,
      selectedCollege,
      selectedCourse,
      selectedExam,
      selectedExamId,
    ],
  );

  return (
    <FilteredListPage
      title="Exam Fee Setup"
      filters={
        <div className="space-y-3">
          <RadioGroup
            value={mode}
            onValueChange={(v) => clearForMode(v as "university" | "college")}
            className="flex items-center gap-10"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="university" id="feeModeUniversity" />
              <Label
                htmlFor="feeModeUniversity"
                className="cursor-pointer text-[13px] font-medium"
              >
                Is For University
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="college" id="feeModeCollege" />
              <Label
                htmlFor="feeModeCollege"
                className="cursor-pointer text-[13px] font-medium"
              >
                Is For College
              </Label>
            </div>
          </RadioGroup>

          <GlobalFilterBarRow>
            <GlobalFilterField label="University" icon={Building2}>
              <Select
                value={
                  selectedUniversityId != null
                    ? String(selectedUniversityId)
                    : null
                }
                onChange={(v) => {
                  if (v) handleUniversityChange(Number(v));
                }}
                options={universities.map((u) => ({
                  value: String(u.fk_university_id),
                  label: String(u.university_code ?? u.university_name ?? "—"),
                }))}
                disabled={loadingFilters}
                placeholder={loadingFilters ? "Loading…" : "University"}
                isLoading={loadingFilters}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course" icon={GraduationCap}>
              <Select
                value={
                  selectedCourseId != null ? String(selectedCourseId) : null
                }
                onChange={(v) => {
                  if (v) handleCourseChange(Number(v));
                }}
                options={courses.map((c) => ({
                  value: String(c.fk_course_id),
                  label: String(c.course_code ?? c.course_name ?? "—"),
                }))}
                disabled={courses.length === 0}
                placeholder="Course"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Year" icon={Calendar}>
              <Select
                value={
                  selectedAcademicYearId != null
                    ? String(selectedAcademicYearId)
                    : null
                }
                onChange={(v) => {
                  if (v) handleAcademicYearChange(Number(v));
                }}
                options={academicYears.map((a) => ({
                  value: String(a.fk_academic_year_id),
                  label: String(a.academic_year ?? "—"),
                }))}
                disabled={academicYears.length === 0}
                placeholder="Exam Year"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Master" icon={ScrollText}>
              <Select
                value={selectedExamId != null ? String(selectedExamId) : null}
                onChange={(v) => handleExamChange(v != null ? Number(v) : null)}
                options={examMasters.map((e) => ({
                  value: String(e.examId ?? e.id),
                  label: examOptionLabel(e),
                }))}
                disabled={examMasters.length === 0}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
            {mode === "college" ? (
              <GlobalFilterField label="College" icon={School}>
                <Select
                  value={
                    selectedCollegeId != null ? String(selectedCollegeId) : null
                  }
                  onChange={(v) =>
                    handleCollegeChange(v != null ? Number(v) : null)
                  }
                  options={colleges.map((c) => ({
                    value: String(c.fk_college_id),
                    label: String(c.college_code ?? c.college_name ?? "—"),
                  }))}
                  disabled={colleges.length === 0}
                  placeholder="College"
                />
              </GlobalFilterField>
            ) : null}
          </GlobalFilterBarRow>

          {hasFetched && titleLine ? (
            <div className="flex items-start gap-2 pt-1">
              <span className="shrink-0 text-[13px] font-medium text-slate-800">
                Exam Fee Structure :
              </span>
              <span className="text-[13px] font-semibold text-[hsl(var(--primary))]">
                {titleLine}
              </span>
            </div>
          ) : null}
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={cols}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
        exportExcel: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => {
            if (!selectedExamId) return;
            router.push(
              `/admin-examination-management/admin-exam-masters/exam-fee-setup/create?${buildNavQuery()}`,
            );
          }}
          disabled={
            !selectedExamId || (mode === "college" && !selectedCollegeId)
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Exam Fee Structure
        </Button>
      }
    >
      <ViewExamFeeStructureModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewing(null);
        }}
        data={viewing}
      />
    </FilteredListPage>
  );
}
