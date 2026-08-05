"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/hooks/useSession";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  academicYearOption,
  batchOption,
  collegeOption,
  courseOption,
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourses,
  pickNum,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getScholarshipCollegeFilters,
  listFeeSchStructures,
} from "@/services";
import type { FeeSchStructureRow } from "@/types/scholarship";

type StructureMode = "batch" | "academic";

const COL_DEFS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeSchStructureRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College Code",
    minWidth: 120,
  } as ColDef<FeeSchStructureRow>,
  courseCode: {
    field: "courseCode",
    headerName: "Course Code",
    minWidth: 120,
  } as ColDef<FeeSchStructureRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 130,
  } as ColDef<FeeSchStructureRow>,
  batchName: {
    field: "batchName",
    headerName: "Batch",
    minWidth: 110,
  } as ColDef<FeeSchStructureRow>,
  scholarshipType: {
    field: "scholarshipType",
    headerName: "Scholarship Type",
    minWidth: 150,
  } as ColDef<FeeSchStructureRow>,
  scholarshipAmount: {
    field: "scholarshipAmount",
    headerName: "Scholarship Amount",
    minWidth: 150,
  } as ColDef<FeeSchStructureRow>,
  actions: {
    headerName: "Action",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<FeeSchStructureRow>,
};

function makeActionsRenderer(onEdit: (row: FeeSchStructureRow) => void) {
  return (p: ICellRendererParams<FeeSchStructureRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit scholarship structure"
        onClick={() => onEdit(row)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

/** Angular `scholarship-management/scholarship-value` → Scholarship Structure. */
export default function ScholarshipValuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();

  const initialAcademic =
    searchParams.get("isAcademicScholarship") === "true";

  const [mode, setMode] = useState<StructureMode>(
    initialAcademic ? "academic" : "batch",
  );
  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [batchesData, setBatchesData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<FeeSchStructureRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);

  const isAcademicScholarship = mode === "academic";

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );

  const batchOptions = useMemo(() => {
    const batches = filterBatches(batchesData, courseId).sort(
      (a, b) =>
        Number(pickNum(b, ["batch_name", "batchName"]) || 0) -
        Number(pickNum(a, ["batch_name", "batchName"]) || 0),
    );
    return batches.map(batchOption);
  }, [batchesData, courseId]);

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  );

  const universityId = useMemo(() => {
    if (!collegeId) return 0;
    const row = filtersData.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeId,
    );
    return pickNum(row, ["fk_university_id", "universityId"]);
  }, [collegeId, filtersData]);

  const loadList = useCallback(async () => {
    if (!collegeId || !courseId) {
      setRows([]);
      setShowList(false);
      return;
    }
    if (isAcademicScholarship && !academicYearId) {
      setRows([]);
      setShowList(false);
      return;
    }
    if (!isAcademicScholarship && !batchId) {
      setRows([]);
      setShowList(false);
      return;
    }

    setLoadingList(true);
    setShowList(true);
    try {
      const result = await listFeeSchStructures({
        collegeId,
        courseId,
        isAcademicScholarship,
        batchId: isAcademicScholarship ? undefined : (batchId ?? undefined),
        academicYearId: isAcademicScholarship
          ? (academicYearId ?? undefined)
          : undefined,
      });
      setRows(result);
    } catch (err) {
      setRows([]);
      toastInfo(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [
    collegeId,
    courseId,
    batchId,
    academicYearId,
    isAcademicScholarship,
  ]);

  /** Angular cascade: college → (AY + course) or (course + batch). */
  function applyCollegeCascade(
    nextCollegeId: number,
    filters: FilterRow[],
    academic: FilterRow[],
    batches: FilterRow[],
    academicMode: boolean,
    prefer?: {
      academicYearId?: number;
      courseId?: number;
      batchId?: number;
    },
  ) {
    if (academicMode) {
      const years = filterAcademicYears(academic, nextCollegeId, filters);
      const preferredYear = prefer?.academicYearId;
      const yearFromPrefer =
        preferredYear &&
        years.some(
          (y) =>
            pickNum(y, ["fk_academic_year_id", "academicYearId"]) ===
            preferredYear,
        )
          ? preferredYear
          : null;
      const currentAy =
        years.find((y) => Number(y.is_curr_ay ?? 0) === 1) ?? null;
      const firstYear =
        yearFromPrefer ||
        pickNum(currentAy, ["fk_academic_year_id", "academicYearId"]) ||
        pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) ||
        null;
      setAcademicYearId(firstYear);
      setBatchId(null);

      const courses = filterCourses(filters, nextCollegeId);
      const preferredCourse = prefer?.courseId;
      const courseFromPrefer =
        preferredCourse &&
        courses.some(
          (c) => pickNum(c, ["fk_course_id", "courseId"]) === preferredCourse,
        )
          ? preferredCourse
          : null;
      const firstCourse =
        courseFromPrefer ||
        pickNum(courses[0], ["fk_course_id", "courseId"]) ||
        null;
      setCourseId(firstCourse);
      return;
    }

    setAcademicYearId(null);
    const courses = filterCourses(filters, nextCollegeId);
    const preferredCourse = prefer?.courseId;
    const courseFromPrefer =
      preferredCourse &&
      courses.some(
        (c) => pickNum(c, ["fk_course_id", "courseId"]) === preferredCourse,
      )
        ? preferredCourse
        : null;
    const firstCourse =
      courseFromPrefer ||
      pickNum(courses[0], ["fk_course_id", "courseId"]) ||
      null;
    setCourseId(firstCourse);
    if (!firstCourse) {
      setBatchId(null);
      return;
    }
    const courseBatches = filterBatches(batches, firstCourse).sort(
      (a, b) =>
        Number(pickNum(b, ["batch_name", "batchName"]) || 0) -
        Number(pickNum(a, ["batch_name", "batchName"]) || 0),
    );
    const preferredBatch = prefer?.batchId;
    const batchFromPrefer =
      preferredBatch &&
      courseBatches.some(
        (b) => pickNum(b, ["fk_batch_id", "batchId"]) === preferredBatch,
      )
        ? preferredBatch
        : null;
    const firstBatch =
      batchFromPrefer ||
      pickNum(courseBatches[0], ["fk_batch_id", "batchId"]) ||
      null;
    setBatchId(firstBatch);
  }

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const employeeId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);

    const preferCollegeId = Number(searchParams.get("collegeId") ?? 0) || 0;
    const preferCourseId = Number(searchParams.get("courseId") ?? 0) || 0;
    const preferBatchId = Number(searchParams.get("batchId") ?? 0) || 0;
    const preferAyId = Number(searchParams.get("academicYearId") ?? 0) || 0;

    let cancelled = false;
    setLoadingFilters(true);
    void getScholarshipCollegeFilters(orgId, employeeId)
      .then((filters) => {
        if (cancelled) return;
        setFiltersData(filters.filtersData);
        setAcademicData(filters.academicData);
        setBatchesData(filters.batchesData);
        const colleges = filterColleges(filters.filtersData);
        const firstCollege =
          (preferCollegeId &&
          colleges.some(
            (c) =>
              pickNum(c, ["fk_college_id", "collegeId"]) === preferCollegeId,
          )
            ? preferCollegeId
            : null) ||
          pickNum(colleges[0], ["fk_college_id", "collegeId"]) ||
          null;
        if (firstCollege) {
          setCollegeId(firstCollege);
          applyCollegeCascade(
            firstCollege,
            filters.filtersData,
            filters.academicData,
            filters.batchesData,
            initialAcademic,
            {
              academicYearId: preferAyId || undefined,
              courseId: preferCourseId || undefined,
              batchId: preferBatchId || undefined,
            },
          );
        }
      })
      .catch((err) => toastError(err, "Failed to load filters"))
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once from session/query
  }, [user?.organizationId, user?.employeeId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function resetListState() {
    setRows([]);
    setShowList(false);
  }

  function onModeChange(next: StructureMode) {
    setMode(next);
    setCourseId(null);
    setBatchId(null);
    setAcademicYearId(null);
    resetListState();
    if (collegeId) {
      applyCollegeCascade(
        collegeId,
        filtersData,
        academicData,
        batchesData,
        next === "academic",
      );
    }
  }

  function onCollegeChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCollegeId(next);
    setCourseId(null);
    setBatchId(null);
    setAcademicYearId(null);
    resetListState();
    if (!next) return;
    applyCollegeCascade(
      next,
      filtersData,
      academicData,
      batchesData,
      isAcademicScholarship,
    );
  }

  function onCourseChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCourseId(next);
    setBatchId(null);
    resetListState();
    if (!next || isAcademicScholarship) return;
    const batches = filterBatches(batchesData, next).sort(
      (a, b) =>
        Number(pickNum(b, ["batch_name", "batchName"]) || 0) -
        Number(pickNum(a, ["batch_name", "batchName"]) || 0),
    );
    const firstBatch = pickNum(batches[0], ["fk_batch_id", "batchId"]) || null;
    if (firstBatch) setBatchId(firstBatch);
  }

  function onBatchChange(value: string | null) {
    setBatchId(value ? Number(value) : null);
  }

  function onAcademicYearChange(value: string | null) {
    setAcademicYearId(value ? Number(value) : null);
  }

  function openAdd() {
    if (!collegeId || !courseId) {
      toastInfo("Select college and course first");
      return;
    }
    if (!universityId) {
      toastInfo("University not found for selected college");
      return;
    }
    const qs = new URLSearchParams({
      universityId: String(universityId),
      collegeId: String(collegeId),
      courseId: String(courseId),
    });
    if (isAcademicScholarship) {
      if (!academicYearId) {
        toastInfo("Select academic year first");
        return;
      }
      qs.set("academicYearId", String(academicYearId));
      qs.set("isAcademicScholarship", "true");
    } else {
      if (!batchId) {
        toastInfo("Select batch first");
        return;
      }
      qs.set("batchId", String(batchId));
      qs.set("isAcademicScholarship", "false");
    }
    router.push(
      `/scholarship-management/scholarship-value/add-scholarship-value?${qs.toString()}`,
    );
  }

  function openEdit(row: FeeSchStructureRow) {
    const id = Number(row.feeSchStructureId ?? 0);
    if (!id || !collegeId || !courseId || !universityId) return;
    const qs = new URLSearchParams({
      universityId: String(universityId),
      collegeId: String(collegeId),
      courseId: String(courseId),
      feeSchStructureId: String(id),
    });
    if (isAcademicScholarship) {
      qs.set("academicYearId", String(academicYearId ?? row.academicYearId ?? ""));
      qs.set("isAcademicScholarship", "true");
    } else {
      qs.set("batchId", String(batchId ?? row.batchId ?? ""));
      qs.set("isAcademicScholarship", "false");
    }
    router.push(
      `/scholarship-management/scholarship-value/edit-scholarship-value?${qs.toString()}`,
    );
  }

  const columnDefs = useMemo<ColDef<FeeSchStructureRow>[]>(() => {
    const cols: ColDef<FeeSchStructureRow>[] = [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.courseCode,
    ];
    if (isAcademicScholarship) {
      cols.push(COL_DEFS.academicYear);
    } else {
      cols.push(COL_DEFS.batchName);
    }
    cols.push(
      COL_DEFS.scholarshipType,
      COL_DEFS.scholarshipAmount,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit),
      },
    );
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over handlers
  }, [isAcademicScholarship, universityId, collegeId, courseId, batchId, academicYearId]);

  return (
    <FilteredListPage
      title="ScholarShip Structure"
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as StructureMode)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="batch" id="sch-value-batch" />
              <Label htmlFor="sch-value-batch" className="font-normal">
                Batch-Wise ScholarShip Structure
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="academic" id="sch-value-academic" />
              <Label htmlFor="sch-value-academic" className="font-normal">
                Academic-Wise ScholarShip Structure
              </Label>
            </div>
          </RadioGroup>

          <GlobalFilterBarRow>
            <GlobalFilterField label="College">
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                isLoading={loadingFilters}
              />
            </GlobalFilterField>

            {isAcademicScholarship ? (
              <GlobalFilterField label="Academic Year">
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={onAcademicYearChange}
                  options={academicYearOptions}
                  placeholder="Select academic year"
                  searchable
                  disabled={!collegeId}
                />
              </GlobalFilterField>
            ) : null}

            <GlobalFilterField label="Course">
              <Select
                value={courseId ? String(courseId) : null}
                onChange={onCourseChange}
                options={courseOptions}
                placeholder="Select course"
                searchable
                disabled={!collegeId}
              />
            </GlobalFilterField>

            {!isAcademicScholarship ? (
              <GlobalFilterField label="Batch">
                <Select
                  value={batchId ? String(batchId) : null}
                  onChange={onBatchChange}
                  options={batchOptions}
                  placeholder="Select batch"
                  searchable
                  disabled={!courseId}
                />
              </GlobalFilterField>
            ) : null}

            <div className="flex items-end pb-0.5">
              <Button
                type="button"
                size="sm"
                onClick={() => void loadList()}
                disabled={loadingList}
              >
                Get Details
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      rowData={showList ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Scholarship Structure",
      }}
      toolbarTrailing={
        <Button type="button" size="sm" onClick={openAdd}>
          <PlusIcon className="mr-1 h-4 w-4" />
          Add ScholarShip Structure
        </Button>
      }
    />
  );
}
