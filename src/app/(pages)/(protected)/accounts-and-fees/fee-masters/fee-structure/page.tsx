"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
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
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getFeeMasterCollegeFilters,
  listCollegeFeeStructures,
} from "@/services";
import type { CollegeFeeStructureRow } from "@/types/fee-structure";
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
} from "../_lib/fee-master-filters";
import { ViewFeeStructureModal } from "./ViewFeeStructureModal";

type StructureMode = "batch" | "academic";

function feeStructureRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {row.classGroupName ?? "—"}
      {row.quotaDisplayName ? (
        <>
          {" "}
          <span className="font-medium text-blue-700">
            ({row.quotaDisplayName})
          </span>
        </>
      ) : null}
    </span>
  );
}

function lateralRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  const yes = Boolean(p.data?.isLateral);
  return (
    <span
      className={
        yes ? "font-medium text-emerald-700" : "font-medium text-slate-500"
      }
    >
      {yes ? "Yes" : "No"}
    </span>
  );
}

function statusRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onEdit: (row: CollegeFeeStructureRow) => void,
  onView: (row: CollegeFeeStructureRow) => void,
) {
  return (p: ICellRendererParams<CollegeFeeStructureRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        {row.isEditable ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit fee structure"
            onClick={() => onEdit(row)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-sky-600"
            aria-label="View fee structure"
            onClick={() => onView(row)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };
}

/** Angular `fee-masters/fee-structure` → `FeeStructureComponent`. */
export default function FeeStructurePage() {
  const router = useRouter();
  const { user } = useSession();

  const [mode, setMode] = useState<StructureMode>("batch");
  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [batchesData, setBatchesData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<CollegeFeeStructureRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);
  const [viewing, setViewing] = useState<CollegeFeeStructureRow | null>(null);

  const isAcademicFee = mode === "academic";

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );

  const batchOptions = useMemo(
    () => filterBatches(batchesData, courseId).map(batchOption),
    [batchesData, courseId],
  );

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  );

  const loadList = useCallback(async () => {
    if (!collegeId) {
      setRows([]);
      setShowList(false);
      return;
    }

    if (isAcademicFee) {
      if (!academicYearId) {
        setRows([]);
        setShowList(false);
        return;
      }
    } else if (!batchId) {
      setRows([]);
      setShowList(false);
      return;
    }

    setLoadingList(true);
    setShowList(true);
    try {
      const result = await listCollegeFeeStructures({
        collegeId,
        isAcademicFee,
        batchId: isAcademicFee ? undefined : (batchId ?? undefined),
        academicYearId: isAcademicFee ? (academicYearId ?? undefined) : undefined,
        page: 0,
        size: 100,
      });
      setRows(result.rows);
    } catch (err) {
      setRows([]);
      toastError(err, "Failed to load fee structures");
    } finally {
      setLoadingList(false);
    }
  }, [collegeId, batchId, academicYearId, isAcademicFee]);

  /** Angular cascade: college → course → first batch (or academic year). */
  function applyCollegeCascade(
    nextCollegeId: number,
    filters: FilterRow[],
    academic: FilterRow[],
    batches: FilterRow[],
    academicMode: boolean,
  ) {
    if (academicMode) {
      const years = filterAcademicYears(academic, nextCollegeId, filters);
      const firstYear =
        pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) || null;
      setCourseId(null);
      setBatchId(null);
      setAcademicYearId(firstYear);
      return;
    }

    const courses = filterCourses(filters, nextCollegeId);
    const firstCourse =
      pickNum(courses[0], ["fk_course_id", "courseId"]) || null;
    setAcademicYearId(null);
    setCourseId(firstCourse);
    if (!firstCourse) {
      setBatchId(null);
      return;
    }
    const courseBatches = filterBatches(batches, firstCourse);
    const firstBatch =
      pickNum(courseBatches[0], ["fk_batch_id", "batchId"]) || null;
    setBatchId(firstBatch);
  }

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const employeeId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);

    let cancelled = false;
    setLoadingFilters(true);
    void getFeeMasterCollegeFilters(orgId, employeeId)
      .then((filters) => {
        if (cancelled) return;
        setFiltersData(filters.filtersData);
        setAcademicData(filters.academicData);
        setBatchesData(filters.batchesData);
        const colleges = filterColleges(filters.filtersData);
        const firstCollege =
          pickNum(colleges[0], ["fk_college_id", "collegeId"]) || null;
        if (firstCollege) {
          setCollegeId(firstCollege);
          applyCollegeCascade(
            firstCollege,
            filters.filtersData,
            filters.academicData,
            filters.batchesData,
            false,
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
      isAcademicFee,
    );
  }

  function onCourseChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCourseId(next);
    setBatchId(null);
    resetListState();
    if (!next) return;
    const batches = filterBatches(batchesData, next);
    const firstBatch =
      pickNum(batches[0], ["fk_batch_id", "batchId"]) || null;
    if (firstBatch) setBatchId(firstBatch);
  }

  function onBatchChange(value: string | null) {
    setBatchId(value ? Number(value) : null);
  }

  function onAcademicYearChange(value: string | null) {
    setAcademicYearId(value ? Number(value) : null);
  }

  function openAdd() {
    if (!collegeId) {
      toastInfo("Select college first");
      return;
    }
    const qs = new URLSearchParams({ cId: String(collegeId) });
    if (isAcademicFee) {
      if (!academicYearId) {
        toastInfo("Select academic year first");
        return;
      }
      qs.set("aId", String(academicYearId));
      qs.set("isAcademicFee", "true");
    } else {
      if (!courseId || !batchId) {
        toastInfo("Select course and batch first");
        return;
      }
      qs.set("courseId", String(courseId));
      qs.set("batchId", String(batchId));
      qs.set("isAcademicFee", "false");
    }
    router.push(
      `/accounts-and-fees/fee-masters/add-fee-structure?${qs.toString()}`,
    );
  }

  function openEdit(row: CollegeFeeStructureRow) {
    const id = Number(row.feeStructureId ?? 0);
    if (!id) return;
    router.push(`/accounts-and-fees/fee-masters/edit-fee-structure/${id}`);
  }

  function openView(row: CollegeFeeStructureRow) {
    setViewing(row);
  }

  const columnDefs = useMemo<ColDef<CollegeFeeStructureRow>[]>(() => {
    const base: ColDef<CollegeFeeStructureRow>[] = [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Fee Structure",
        minWidth: 200,
        flex: 1.2,
        cellRenderer: feeStructureRenderer,
      },
      { field: "collegeCode", headerName: "College", minWidth: 110 },
    ];

    if (isAcademicFee) {
      base.push({
        field: "academicYear",
        headerName: "Academic Year",
        minWidth: 130,
      });
    } else {
      base.push(
        { field: "courseCode", headerName: "Course Code", minWidth: 120 },
        { field: "batchName", headerName: "Batch", minWidth: 100 },
      );
    }

    base.push(
      {
        headerName: "Is For Lateral",
        minWidth: 120,
        cellRenderer: lateralRenderer,
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 90,
        width: 90,
        flex: 0,
        cellRenderer: makeActionsRenderer(openEdit, openView),
      },
    );

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over handlers
  }, [isAcademicFee]);

  return (
    <FilteredListPage
      title="Fee Structure"
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as StructureMode)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="batch" id="fee-structure-batch" />
              <Label htmlFor="fee-structure-batch" className="font-normal">
                Batch-Wise Fee Structure
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="academic" id="fee-structure-academic" />
              <Label htmlFor="fee-structure-academic" className="font-normal">
                Academic-Wise Fee Structure
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

            {!isAcademicFee ? (
              <>
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
              </>
            ) : (
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
            )}
          </GlobalFilterBarRow>
        </div>
      }
      rowData={showList ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search fee structures…",
        pdfDocumentTitle: "Fee Structure",
      }}
      toolbarTrailing={
        <Button type="button" size="sm" onClick={openAdd}>
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Fee Structure
        </Button>
      }
    >
      <ViewFeeStructureModal
        open={viewing != null}
        onClose={() => setViewing(null)}
        row={viewing}
      />
    </FilteredListPage>
  );
}
