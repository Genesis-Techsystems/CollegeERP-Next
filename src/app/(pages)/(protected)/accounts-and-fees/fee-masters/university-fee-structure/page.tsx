"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import { rowIndexGetter } from "@/lib/utils";
import {
  getUnivFeeMasterFilters,
  getUnivFeeStructureContext,
  listUnivFeeStructures,
  setUnivFeeStructureContext,
} from "@/services";
import type { UnivFeeStructureRow } from "@/types/fee-structure";
import {
  academicYearOption,
  courseGroupOption,
  filterAcademicYearsByUniversity,
  filterCourseGroupsByUniversity,
  filterCoursesByUniversity,
  filterUniversities,
  pickNum,
  pickText,
  universityOption,
  type FilterRow,
} from "../_lib/fee-master-filters";
import {
  UniversityFeeStructureModal,
  type UnivFeeStructureModalContext,
} from "./UniversityFeeStructureModal";

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<UnivFeeStructureRow>,
  universityCode: {
    field: "universityCode",
    headerName: "University Code",
    minWidth: 130,
  } as ColDef<UnivFeeStructureRow>,
  courseCode: {
    field: "courseCode",
    headerName: "Course Code",
    minWidth: 120,
  } as ColDef<UnivFeeStructureRow>,
  courseGroupCode: {
    field: "courseGroupCode",
    headerName: "Course Group Code",
    minWidth: 150,
  } as ColDef<UnivFeeStructureRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<UnivFeeStructureRow>,
  feeStructureName: {
    field: "feeStructureName",
    headerName: "Fee Structure Name",
    minWidth: 180,
    flex: 1,
  } as ColDef<UnivFeeStructureRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<UnivFeeStructureRow>,
  actions: {
    headerName: "Actions",
    minWidth: 200,
    width: 200,
    flex: 0,
  } as ColDef<UnivFeeStructureRow>,
};

function statusRenderer(p: ICellRendererParams<UnivFeeStructureRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onEdit: (row: UnivFeeStructureRow) => void,
  onDetails: (row: UnivFeeStructureRow) => void,
) {
  return (p: ICellRendererParams<UnivFeeStructureRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="link"
          className="h-8 px-1 text-primary"
          onClick={() => onDetails(row)}
        >
          Fee Structure Details
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Edit university fee structure"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function UniversityFeeStructurePage() {
  const router = useRouter();
  const { user } = useSession();
  const restoredRef = useRef(false);

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<UnivFeeStructureRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnivFeeStructureRow | null>(null);

  const universityOptions = useMemo(
    () =>
      filterUniversities(filtersData).map((r) => {
        const opt = universityOption(r);
        const code = pickText(r, ["university_code", "universityCode"]);
        return { value: opt.value, label: code || opt.label };
      }),
    [filtersData],
  );

  const courseOptions = useMemo(
    () =>
      filterCoursesByUniversity(filtersData, universityId).map((r) => {
        const id = pickNum(r, ["fk_course_id", "courseId"]);
        const code = pickText(r, ["course_code", "courseCode"]);
        return { value: String(id), label: code || String(id) };
      }),
    [filtersData, universityId],
  );

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroupsByUniversity(filtersData, universityId, courseId).map(
        courseGroupOption,
      ),
    [filtersData, universityId, courseId],
  );

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYearsByUniversity(academicData, universityId).map(
        academicYearOption,
      ),
    [academicData, universityId],
  );

  const filterLabels = useMemo(() => {
    const universityCode =
      universityOptions.find((o) => Number(o.value) === universityId)?.label ??
      "";
    const courseCode =
      courseOptions.find((o) => Number(o.value) === courseId)?.label ?? "";
    const courseGroup =
      courseGroupOptions.find((o) => Number(o.value) === courseGroupId)
        ?.label ?? "";
    const academicYearCode =
      academicYearOptions.find((o) => Number(o.value) === academicYearId)
        ?.label ?? "";
    return { universityCode, courseCode, courseGroup, academicYearCode };
  }, [
    universityOptions,
    courseOptions,
    courseGroupOptions,
    academicYearOptions,
    universityId,
    courseId,
    courseGroupId,
    academicYearId,
  ]);

  const dataDetails = useMemo(() => {
    const parts = [
      filterLabels.universityCode,
      filterLabels.courseCode,
      filterLabels.courseGroup,
      filterLabels.academicYearCode,
    ].filter(Boolean);
    return parts.join(" / ");
  }, [filterLabels]);

  const modalContext: UnivFeeStructureModalContext = {
    universitiesId: universityId ?? 0,
    courseId: courseId ?? 0,
    courseGroupId: courseGroupId ?? 0,
    academicYearId: academicYearId ?? 0,
    universityCode: filterLabels.universityCode,
    courseCode: filterLabels.courseCode,
    courseGroup: filterLabels.courseGroup,
    academicYearCode: filterLabels.academicYearCode,
  };

  const loadList = useCallback(
    async (univId: number, crsId: number, grpId: number, ayId: number) => {
      if (!univId || !crsId || !grpId || !ayId) {
        setRows([]);
        setShowList(false);
        return;
      }
      setLoadingList(true);
      setShowList(true);
      try {
        const data = await listUnivFeeStructures({
          universityId: univId,
          courseId: crsId,
          courseGroupId: grpId,
          academicYearId: ayId,
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setRows([]);
        toastError(err, "Failed to load university fee structures");
      } finally {
        setLoadingList(false);
      }
    },
    [],
  );

  const applyUniversity = useCallback(
    (
      nextUniversityId: number,
      source: FilterRow[],
      restore?: UnivFeeStructureRow | null,
    ) => {
      setUniversityId(nextUniversityId);
      setCourseId(null);
      setCourseGroupId(null);
      setAcademicYearId(null);
      setRows([]);
      setShowList(false);

      const courses = filterCoursesByUniversity(source, nextUniversityId);
      const restoreCourseId = Number(restore?.courseId ?? 0);
      const nextCourseId =
        restoreCourseId &&
        courses.some(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === restoreCourseId,
        )
          ? restoreCourseId
          : pickNum(courses[0], ["fk_course_id", "courseId"]) || null;

      if (!nextCourseId) return;
      setCourseId(nextCourseId);

      const groups = filterCourseGroupsByUniversity(
        source,
        nextUniversityId,
        nextCourseId,
      );
      const restoreGroupId = Number(restore?.courseGroupId ?? 0);
      const nextGroupId =
        restoreGroupId &&
        groups.some(
          (r) =>
            pickNum(r, ["fk_course_group_id", "courseGroupId"]) ===
            restoreGroupId,
        )
          ? restoreGroupId
          : pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]) || null;

      if (!nextGroupId) return;
      setCourseGroupId(nextGroupId);

      const restoreAyId = Number(restore?.academicYearId ?? 0);
      if (restoreAyId > 0) {
        setAcademicYearId(restoreAyId);
      }
    },
    [],
  );

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const empId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);
    if (!orgId) return;

    let cancelled = false;
    async function loadFilters() {
      setLoadingFilters(true);
      try {
        const { filtersData: fd, academicData: ad } =
          await getUnivFeeMasterFilters(orgId, empId);
        if (cancelled) return;
        setFiltersData(fd);
        setAcademicData(ad);

        const unis = filterUniversities(fd);
        const restore = !restoredRef.current
          ? getUnivFeeStructureContext()
          : null;
        restoredRef.current = true;

        const restoreUnivId = Number(
          restore?.universitiesId ?? restore?.universityId ?? 0,
        );
        const firstUnivId =
          restoreUnivId &&
          unis.some(
            (r) =>
              pickNum(r, ["fk_university_id", "universityId"]) ===
              restoreUnivId,
          )
            ? restoreUnivId
            : pickNum(unis[0], ["fk_university_id", "universityId"]) || null;

        if (firstUnivId) {
          applyUniversity(firstUnivId, fd, restore);
        }
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load filters");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }

    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, [user?.organizationId, user?.employeeId, applyUniversity]);

  useEffect(() => {
    if (!universityId || !courseId || !courseGroupId || !academicYearId) return;
    void loadList(universityId, courseId, courseGroupId, academicYearId);
  }, [universityId, courseId, courseGroupId, academicYearId, loadList]);

  function onUniversityChange(value: string | null) {
    const next = value ? Number(value) : null;
    if (!next) {
      setUniversityId(null);
      setCourseId(null);
      setCourseGroupId(null);
      setAcademicYearId(null);
      setRows([]);
      setShowList(false);
      return;
    }
    applyUniversity(next, filtersData);
  }

  function onCourseChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCourseId(next);
    setCourseGroupId(null);
    setAcademicYearId(null);
    setRows([]);
    setShowList(false);
    if (!next || !universityId) return;
    const groups = filterCourseGroupsByUniversity(
      filtersData,
      universityId,
      next,
    );
    const firstGroup =
      pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]) || null;
    if (firstGroup) setCourseGroupId(firstGroup);
  }

  function onCourseGroupChange(value: string | null) {
    setCourseGroupId(value ? Number(value) : null);
    setAcademicYearId(null);
    setRows([]);
    setShowList(false);
  }

  function onAcademicYearChange(value: string | null) {
    setAcademicYearId(value ? Number(value) : null);
  }

  function openAdd() {
    if (!universityId || !courseId || !courseGroupId || !academicYearId) {
      toast.error(
        "Select University, Course, Course Group and Academic Year first",
      );
      return;
    }
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: UnivFeeStructureRow) {
    setEditing(row);
    setModalOpen(true);
  }

  function openDetails(row: UnivFeeStructureRow) {
    setUnivFeeStructureContext({
      ...row,
      universitiesId: row.universitiesId ?? universityId ?? undefined,
      courseId: row.courseId ?? courseId ?? undefined,
      courseGroupId: row.courseGroupId ?? courseGroupId ?? undefined,
      academicYearId: row.academicYearId ?? academicYearId ?? undefined,
    });
    router.push(
      "/accounts-and-fees/fee-masters/university-fee-structure/details",
    );
  }

  const columnDefs = useMemo<ColDef<UnivFeeStructureRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.universityCode,
      COL_DEFS.courseCode,
      COL_DEFS.courseGroupCode,
      COL_DEFS.academicYear,
      COL_DEFS.feeStructureName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit, openDetails),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable renderers close over latest handlers
    [universityId, courseId, courseGroupId, academicYearId],
  );

  const pageTitle =
    showList && dataDetails
      ? `University Fee Structure — ${dataDetails}`
      : "University Fee Structure";

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="University">
            <Select
              value={universityId ? String(universityId) : null}
              onChange={onUniversityChange}
              options={universityOptions}
              placeholder="Select university"
              searchable
              isLoading={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={onCourseChange}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!universityId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group">
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={onCourseGroupChange}
              options={courseGroupOptions}
              placeholder="Select course group"
              searchable
              disabled={!courseId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={onAcademicYearChange}
              options={academicYearOptions}
              placeholder="Select academic year"
              searchable
              disabled={!courseGroupId}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={showList ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "University Fee Structure",
      }}
      toolbarTrailing={
        showList ? (
          <Button size="sm" onClick={openAdd}>
            <PlusIcon className="h-4 w-4 mr-1" />
            University Fee Structure
          </Button>
        ) : undefined
      }
    >
      <UniversityFeeStructureModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        context={modalContext}
        onSaved={() => {
          if (universityId && courseId && courseGroupId && academicYearId) {
            void loadList(
              universityId,
              courseId,
              courseGroupId,
              academicYearId,
            );
          }
        }}
      />
    </FilteredListPage>
  );
}
