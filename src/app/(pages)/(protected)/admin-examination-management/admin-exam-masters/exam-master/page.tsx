"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type {
  ColDef,
  CellClickedEvent,
  ICellRendererParams,
} from "ag-grid-community";
import {
  PlusIcon,
  Pencil,
  Building2,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { useSessionContext } from "@/context/SessionContext";
import type { ExamMaster, CollegeWiseFilterRow } from "@/types/exam-master";
import {
  getCollegeFilters,
  fetchExamsByUniversity as fetchExamsByUniversityService,
  fetchExamsByCollege as fetchExamsByCollegeService,
} from "@/services/exam-master";
import { distinct } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ExamMasterModal from "./ExamMasterModal";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";

function filterCode(
  row: Partial<CollegeWiseFilterRow> | null | undefined,
  keys: string[],
): string {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

export default function ExamMasterPage() {
  const router = useRouter();
  const { user } = useSessionContext();

  const [mode, setMode] = useState<1 | 2>(1);
  const [filtersdata, setFiltersdata] = useState<CollegeWiseFilterRow[]>([]);
  const [academicData, setAcademicData] = useState<CollegeWiseFilterRow[]>([]);
  const [universities, setUniversities] = useState<CollegeWiseFilterRow[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<
    number | null
  >(null);
  const [courses, setCourses] = useState<CollegeWiseFilterRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<CollegeWiseFilterRow[]>(
    [],
  );
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<
    number | null
  >(null);
  const [colleges, setColleges] = useState<CollegeWiseFilterRow[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(
    null,
  );
  const [examsList, setExamsList] = useState<ExamMaster[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamMaster | null>(null);
  const fetchFilterDetails = useCallback(async () => {
    setLoadingFilters(true);
    try {
      // Angular: in_org_id / in_loginuser_empid from session; in_loginuser_roleid always 0 (no role gate on this page)
      const orgId =
        Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
        Number(user?.organizationId ?? 0);
      const empId =
        Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
        Number(user?.employeeId ?? 0);
      if (!orgId || !empId) {
        setFiltersdata([]);
        setAcademicData([]);
        setUniversities([]);
        return;
      }
      const { filtersData: filters, academicData: academic } =
        await getCollegeFilters(orgId, empId);

      setFiltersdata(filters);
      setAcademicData(academic);

      const unis = distinct(filters, (r) => r.fk_university_id);
      setUniversities(unis);

      if (unis.length > 0) {
        const firstUniId = unis[0].fk_university_id;
        setSelectedUniversityId(firstUniId);
        handleUniversityChange(firstUniId, filters, academic);
      }
    } finally {
      setLoadingFilters(false);
    }
  }, [user?.organizationId, user?.employeeId]);

  useEffect(() => {
    fetchFilterDetails();
  }, [fetchFilterDetails]);

  function handleUniversityChange(
    universityId: number,
    filtersRef = filtersdata,
    academicRef = academicData,
    modeOverride?: 1 | 2,
  ) {
    setSelectedUniversityId(universityId);
    setSelectedCourseId(null);
    setSelectedAcademicYearId(null);
    setSelectedCollegeId(null);
    setCourses([]);
    setAcademicYears([]);
    setColleges([]);
    setExamsList([]);
    setHasFetched(false);

    const filtered = filtersRef.filter(
      (r) => r.fk_university_id === universityId,
    );
    const distinctCourses = distinct(filtered, (r) => r.fk_course_id);
    setCourses(distinctCourses);

    if (distinctCourses.length > 0) {
      const firstCourseId = distinctCourses[0].fk_course_id;
      setSelectedCourseId(firstCourseId);
      handleCourseChange(
        firstCourseId,
        universityId,
        academicRef,
        filtersRef,
        modeOverride,
      );
    }
  }

  function handleCourseChange(
    courseId: number,
    universityId = selectedUniversityId!,
    academicRef = academicData,
    filtersRef = filtersdata,
    modeOverride?: 1 | 2,
  ) {
    setSelectedCourseId(courseId);
    setSelectedAcademicYearId(null);
    setSelectedCollegeId(null);
    setAcademicYears([]);
    setColleges([]);
    setExamsList([]);
    setHasFetched(false);

    const filtered = academicRef.filter(
      (r) => r.fk_university_id === universityId,
    );
    const distinctAY = distinct(filtered, (r) => r.fk_academic_year_id ?? 0);

    const sorted = [...distinctAY].sort(
      (a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0),
    );
    const currentAY = sorted[0];

    const displayList = [...distinctAY].sort((a, b) => {
      const aYear = parseInt(a.academic_year ?? "0", 10);
      const bYear = parseInt(b.academic_year ?? "0", 10);
      return bYear - aYear;
    });
    setAcademicYears(displayList);

    if (currentAY?.fk_academic_year_id) {
      const ayId = currentAY.fk_academic_year_id;
      setSelectedAcademicYearId(ayId);
      handleAcademicYearChange(
        ayId,
        universityId,
        courseId,
        filtersRef,
        modeOverride,
      );
    }
  }

  function handleAcademicYearChange(
    academicYearId: number,
    universityId = selectedUniversityId!,
    courseId = selectedCourseId!,
    filtersRef = filtersdata,
    modeOverride?: 1 | 2,
  ) {
    setSelectedAcademicYearId(academicYearId);
    setColleges([]);
    setExamsList([]);
    setHasFetched(false);

    const effectiveMode = modeOverride ?? mode;
    if (effectiveMode === 1) {
      // Angular selectedAcademicYear (check===1): auto-load exam list
      void loadExamsByUniversity(universityId, courseId, academicYearId);
    } else {
      const filtered = filtersRef.filter(
        (r) =>
          r.fk_university_id === universityId && r.fk_course_id === courseId,
      );
      const distinctColleges = distinct(filtered, (r) => r.fk_college_id ?? 0);
      setColleges(distinctColleges);
    }
  }

  async function loadExamsByUniversity(
    uniId: number,
    courseId: number,
    ayId: number,
  ) {
    if (!uniId || !courseId || !ayId) return;
    setLoadingExams(true);
    setHasFetched(true);
    try {
      const results = await fetchExamsByUniversityService(
        uniId,
        courseId,
        ayId,
      );
      setExamsList(results);
    } finally {
      setLoadingExams(false);
    }
  }

  async function loadExamsByCollege(
    colId: number,
    courseId: number,
    ayId: number,
  ) {
    if (!colId || !courseId || !ayId) return;
    setLoadingExams(true);
    setHasFetched(true);
    try {
      const results = await fetchExamsByCollegeService(colId, courseId, ayId);
      setExamsList(results);
    } finally {
      setLoadingExams(false);
    }
  }

  function handleCollegeChange(collegeId: number) {
    setSelectedCollegeId(collegeId);
    setExamsList([]);
    setHasFetched(false);
    // Angular selectedCollege: auto-load exam list
    if (selectedCourseId && selectedAcademicYearId) {
      void loadExamsByCollege(
        collegeId,
        selectedCourseId,
        selectedAcademicYearId,
      );
    }
  }

  function refreshList() {
    if (mode === 1) {
      if (selectedUniversityId && selectedCourseId && selectedAcademicYearId) {
        void loadExamsByUniversity(
          selectedUniversityId,
          selectedCourseId,
          selectedAcademicYearId,
        );
      }
    } else if (
      selectedCollegeId &&
      selectedCourseId &&
      selectedAcademicYearId
    ) {
      void loadExamsByCollege(
        selectedCollegeId,
        selectedCourseId,
        selectedAcademicYearId,
      );
    }
  }

  function handleModeChange(newMode: 1 | 2) {
    setMode(newMode);
    setSelectedCourseId(null);
    setSelectedAcademicYearId(null);
    setSelectedCollegeId(null);
    setCourses([]);
    setAcademicYears([]);
    setHasFetched(false);
    setColleges([]);
    setExamsList([]);

    if (selectedUniversityId) {
      setTimeout(() => {
        handleUniversityChange(
          selectedUniversityId!,
          filtersdata,
          academicData,
          newMode,
        );
      }, 0);
    }
  }

  const columnDefs = useMemo<ColDef<ExamMaster>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        field: "examName",
        headerName: "Exam Name",
        minWidth: 140,
        flex: 1.6,
        tooltipField: "examName",
        cellClass: "app-cell-ellipsis",
      },
      {
        field: "examShortName",
        headerName: "Exam Short Name",
        minWidth: 110,
        flex: 1,
        tooltipField: "examShortName",
        cellClass: "app-cell-ellipsis",
      },
      {
        headerName: "Exam Type",
        minWidth: 110,
        flex: 1,
        tooltipValueGetter: (p) => {
          const types: string[] = [];
          if (p.data?.isRegularExam) types.push("Regular");
          if (p.data?.isSupplyExam) types.push("Supple");
          if (p.data?.isInternalExam) types.push("Internal");
          return types.join(" / ") || "—";
        },
        valueGetter: (p) => {
          const types: string[] = [];
          if (p.data?.isRegularExam) types.push("Regular");
          if (p.data?.isSupplyExam) types.push("Supple");
          if (p.data?.isInternalExam) types.push("Internal");
          return types.join(" / ") || "—";
        },
        cellClass: "app-cell-ellipsis",
      },
      {
        field: "examMonthYr",
        headerName: "Exam Month Year",
        minWidth: 120,
        flex: 0.7,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "MMM, yyyy") : "—",
      },
      {
        field: "fromDate",
        headerName: "From Date",
        minWidth: 110,
        flex: 0.7,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "MMM d, yyyy") : "—",
      },
      {
        field: "toDate",
        headerName: "To Date",
        minWidth: 110,
        flex: 0.7,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), "MMM d, yyyy") : "—",
      },
      {
        headerName: "Exam Fee Notification Doc",
        headerTooltip: "Exam Fee Notification Doc",
        minWidth: 140,
        maxWidth: 180,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.feeNotificationFilePath ? (
            <a
              href={p.data.feeNotificationFilePath}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[hsl(var(--primary))] underline text-[12px]"
            >
              Document
            </a>
          ) : (
            <span className="text-muted-foreground text-[12px]">No Docs</span>
          ),
      },
      {
        headerName: "Exam Notification Doc",
        headerTooltip: "Exam Notification Doc",
        minWidth: 130,
        maxWidth: 170,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.notificationFilePath ? (
            <a
              href={p.data.notificationFilePath}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[hsl(var(--primary))] underline text-[12px]"
            >
              Document
            </a>
          ) : (
            <span className="text-muted-foreground text-[12px]">No Docs</span>
          ),
      },
      {
        headerName: "Exam Label",
        headerTooltip: "Exam Label",
        minWidth: 150,
        maxWidth: 180,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] whitespace-nowrap"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (p.data)
                sessionStorage.setItem(
                  "examMasterDetails",
                  JSON.stringify(p.data),
                );
              router.push(
                `/admin-examination-management/admin-exam-masters/exam-master/exam-master-details?examId=${p.data?.examId}`,
              );
            }}
          >
            Create Exam Label
          </Button>
        ),
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 90,
        maxWidth: 110,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: "Actions",
        minWidth: 80,
        maxWidth: 90,
        flex: 0,
        width: 80,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingExam(p.data ?? null);
              setModalOpen(true);
            }}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router],
  );

  const onCellClicked = useCallback(
    (event: CellClickedEvent<ExamMaster>) => {
      const header = event.colDef.headerName;
      if (header === "Exam Label") {
        if (event.data)
          sessionStorage.setItem(
            "examMasterDetails",
            JSON.stringify(event.data),
          );
        router.push(
          `/admin-examination-management/admin-exam-masters/exam-master/exam-master-details?examId=${event.data?.examId}`,
        );
      }
      if (header === "Actions") {
        setEditingExam(event.data ?? null);
        setModalOpen(true);
      }
    },
    [router],
  );

  const modalTitleContext = useMemo(() => {
    const uni = universities.find(
      (u) => u.fk_university_id === selectedUniversityId,
    );
    const course = courses.find((c) => c.fk_course_id === selectedCourseId);
    const ay = academicYears.find(
      (a) => a.fk_academic_year_id === selectedAcademicYearId,
    );
    const college = colleges.find((c) => c.fk_college_id === selectedCollegeId);
    return {
      universityCode: filterCode(uni, ["university_code", "universityCode"]),
      collegeCode:
        mode === 2 ? filterCode(college, ["college_code", "collegeCode"]) : "",
      courseCode: filterCode(course, ["course_code", "courseCode"]),
      academicYear: ay?.academic_year ?? "",
    };
  }, [
    universities,
    courses,
    academicYears,
    colleges,
    selectedUniversityId,
    selectedCourseId,
    selectedAcademicYearId,
    selectedCollegeId,
    mode,
  ]);

  // Angular: Add Exam only inside the list card (*ngIf="flag === true")
  const canAddExam =
    hasFetched &&
    !!selectedUniversityId &&
    !!selectedCourseId &&
    !!selectedAcademicYearId &&
    (mode === 1 || !!selectedCollegeId);

  return (
    <FilteredListPage
      title="Create Exam Notification"
      filters={
        <div className="space-y-3">
          <RadioGroup
            value={String(mode)}
            onValueChange={(v) => handleModeChange(Number(v) as 1 | 2)}
            className="flex gap-5"
          >
            <label className="flex items-center gap-2 cursor-pointer text-[13px]">
              <RadioGroupItem value="1" />
              <span>Is For University</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[13px]">
              <RadioGroupItem value="2" />
              <span>Is For College</span>
            </label>
          </RadioGroup>
          <GlobalFilterBarRow>
            <GlobalFilterField label="University" icon={Building2}>
              <Select
                value={
                  selectedUniversityId != null
                    ? String(selectedUniversityId)
                    : null
                }
                onChange={(v) => v && handleUniversityChange(Number(v))}
                options={universities.map((u) => ({
                  value: String(u.fk_university_id),
                  label: filterCode(u, ["university_code", "universityCode"]),
                  title: filterCode(u, [
                    "university_name",
                    "universityName",
                    "university_code",
                    "universityCode",
                  ]),
                }))}
                placeholder="University"
                disabled={loadingFilters}
                isLoading={loadingFilters}
              />
            </GlobalFilterField>

            <GlobalFilterField label="Course" icon={GraduationCap}>
              <Select
                value={
                  selectedCourseId != null ? String(selectedCourseId) : null
                }
                onChange={(v) => v && handleCourseChange(Number(v))}
                options={courses.map((c) => ({
                  value: String(c.fk_course_id),
                  label: filterCode(c, ["course_code", "courseCode"]),
                  title: filterCode(c, [
                    "course_name",
                    "courseName",
                    "course_code",
                    "courseCode",
                  ]),
                }))}
                placeholder="Course"
                disabled={courses.length === 0}
              />
            </GlobalFilterField>

            <GlobalFilterField label="Exam Year" icon={Calendar}>
              <Select
                value={
                  selectedAcademicYearId != null
                    ? String(selectedAcademicYearId)
                    : null
                }
                onChange={(v) => v && handleAcademicYearChange(Number(v))}
                options={academicYears.map((ay) => ({
                  value: String(ay.fk_academic_year_id),
                  label: ay.academic_year ?? "",
                }))}
                placeholder="Exam Year"
                disabled={academicYears.length === 0}
              />
            </GlobalFilterField>

            {mode === 2 && (
              <GlobalFilterField label="College" icon={Building2}>
                <Select
                  value={
                    selectedCollegeId != null ? String(selectedCollegeId) : null
                  }
                  onChange={(v) => v && handleCollegeChange(Number(v))}
                  options={colleges.map((c) => ({
                    value: String(c.fk_college_id),
                    label: filterCode(c, ["college_code", "collegeCode"]),
                    title: filterCode(c, [
                      "college_name",
                      "collegeName",
                      "college_code",
                      "collegeCode",
                    ]),
                  }))}
                  placeholder="College"
                  disabled={colleges.length === 0}
                />
              </GlobalFilterField>
            )}
          </GlobalFilterBarRow>
        </div>
      }
      rowData={hasFetched ? examsList : []}
      columnDefs={columnDefs}
      loading={loadingExams}
      resultsVisible={hasFetched}
      onCellClicked={onCellClicked}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        canAddExam ? (
          <Button
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            onClick={() => {
              setEditingExam(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="mr-1 h-3.5 w-3.5" />
            Add Exam
          </Button>
        ) : null
      }
    >
      <ExamMasterModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExam(null);
        }}
        exam={editingExam}
        context={{
          universityId: selectedUniversityId,
          collegeId: selectedCollegeId,
          courseId: selectedCourseId,
          academicYearId: selectedAcademicYearId,
        }}
        titleContext={modalTitleContext}
        onSaved={refreshList}
      />
    </FilteredListPage>
  );
}
