"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Pencil, PlusIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/common/components/data-display";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
  filterFieldIcon,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  createScholarshipApplication,
  getScholarshipCollegeFilters,
  listScholarshipApplications,
  updateScholarshipApplication,
} from "@/services";
import type { ScholarshipApplication } from "@/types/scholarship";
import {
  ApplicationModal,
  type ApplicationModalResult,
} from "./ApplicationModal";

type AppRow = ScholarshipApplication & Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AppRow>,
  schApplicationNo: {
    field: "schApplicationNo",
    headerName: "Application Number",
    minWidth: 140,
  } as ColDef<AppRow>,
  rollNumber: {
    field: "rollNumber",
    headerName: "Roll Number",
    minWidth: 120,
  } as ColDef<AppRow>,
  firstName: {
    field: "firstName",
    headerName: "Applicant Name",
    minWidth: 150,
  } as ColDef<AppRow>,
  course: {
    headerName: "Course",
    minWidth: 280,
  } as ColDef<AppRow>,
  appliedOn: {
    field: "appliedOn",
    headerName: "Applied On",
    minWidth: 120,
  } as ColDef<AppRow>,
  scholarshipAmount: {
    field: "scholarshipAmount",
    headerName: "ScholarShip Amt",
    minWidth: 120,
  } as ColDef<AppRow>,
  totalAmountReceived: {
    field: "totalAmountReceived",
    headerName: "Received Amt",
    minWidth: 120,
  } as ColDef<AppRow>,
  dueAmount: {
    field: "dueAmount",
    headerName: "Due Amt",
    minWidth: 100,
  } as ColDef<AppRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AppRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<AppRow>,
};

function formatDt(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return raw;
  }
}

function courseRenderer(p: ICellRendererParams<AppRow>) {
  const row = p.data;
  if (!row) return null;
  const parts = [
    pickText(row, ["collegeCode"]),
    pickText(row, ["academicYear"]),
    pickText(row, ["courseCode"]),
    pickText(row, ["groupCode"]),
    pickText(row, ["courseYearName", "courseYearCode"]),
  ].filter(Boolean);
  const section = pickText(row, ["section"]);
  const label = parts.join(" / ");
  return (
    <span>
      {label || "—"}
      {section ? ` / section ${section}` : ""}
    </span>
  );
}

function appliedOnRenderer(p: ICellRendererParams<AppRow>) {
  return formatDt(p.data?.appliedOn);
}

function statusRenderer(p: ICellRendererParams<AppRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: AppRow) => void) {
  return (p: ICellRendererParams<AppRow>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2"
      title="Edit"
      onClick={() => p.data && onEdit(p.data)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ScholarshipApplicationPage() {
  const queryClient = useQueryClient();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const defaultAcademicYearId = Number(
    globalThis?.localStorage?.getItem("academicYearId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "edit">("new");
  const [editing, setEditing] = useState<AppRow | null>(null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["ScholarshipApplication", "filters", orgId, employeeId],
    queryFn: () => getScholarshipCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const academicData = useMemo(
    () => (filterBundle?.academicData ?? []) as FilterRow[],
    [filterBundle?.academicData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeNum = Number(collegeId ?? 0);
  const academicYearNum = Number(academicYearId ?? 0);

  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );

  const universityId = useMemo(
    () =>
      pickNum(
        filtersData.find((r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum),
        ["fk_university_id", "universityId"],
      ),
    [filtersData, collegeNum],
  );

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(pickNum(c, ["fk_college_id", "collegeId"])),
        label:
          pickText(c, ["college_code", "collegeCode"]) ||
          pickText(c, ["college_name", "collegeName"]) ||
          String(pickNum(c, ["fk_college_id", "collegeId"])),
      })).filter((o) => o.value !== "0"),
    [colleges],
  );

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(pickNum(ay, ["fk_academic_year_id", "academicYearId"])),
        label:
          pickText(ay, ["academic_year", "academicYear"]) ||
          String(pickNum(ay, ["fk_academic_year_id", "academicYearId"])),
      })).filter((o) => o.value !== "0"),
    [academicYears],
  );

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum) {
      setAcademicYearId(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    if (
      academicYearId &&
      academicYears.some(
        (r) =>
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
          Number(academicYearId),
      )
    ) {
      return;
    }
    const preferred =
      (defaultAcademicYearId > 0 &&
        academicYears.find(
          (r) =>
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
            defaultAcademicYearId,
        )) ||
      academicYears.find(
        (r) => Number(r.is_curr_ay ?? r.isCurrAy ?? 0) === 1,
      ) ||
      academicYears[0];
    setAcademicYearId(
      String(pickNum(preferred, ["fk_academic_year_id", "academicYearId"])),
    );
  }, [collegeNum, academicYears, academicYearId, defaultAcademicYearId]);

  const {
    data: applications = [],
    isLoading: loadingApps,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QK.scholarshipApplications.list(collegeNum, academicYearNum),
    queryFn: () => listScholarshipApplications(collegeNum, academicYearNum),
    enabled: collegeNum > 0 && academicYearNum > 0,
  });

  const openCreate = useCallback(() => {
    if (!collegeNum || !academicYearNum) {
      toastInfo("Select college and academic year first.");
      return;
    }
    setModalMode("new");
    setEditing(null);
    setModalOpen(true);
  }, [collegeNum, academicYearNum]);

  const openEdit = useCallback((row: AppRow) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  }, []);

  const columnDefs = useMemo<ColDef<AppRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.schApplicationNo,
      COL_DEFS.rollNumber,
      COL_DEFS.firstName,
      { ...COL_DEFS.course, cellRenderer: courseRenderer },
      { ...COL_DEFS.appliedOn, cellRenderer: appliedOnRenderer },
      COL_DEFS.scholarshipAmount,
      COL_DEFS.totalAmountReceived,
      COL_DEFS.dueAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  );

  const handleModalSubmit = useCallback(
    async (payload: ApplicationModalResult) => {
      const studentId = Number(payload.studentId ?? 0);
      const courseYearId = Number(payload.courseYearId ?? 0);

      if (modalMode === "new") {
        const duplicate = applications.some(
          (a) =>
            Number(a.studentId) === studentId &&
            Number(a.courseYearId) === courseYearId,
        );
        if (duplicate) {
          toastInfo("Already student exists for same course year.");
          return;
        }
        try {
          await createScholarshipApplication(payload as Record<string, unknown>);
          toastSuccess("Scholarship application saved.");
          setModalOpen(false);
          await queryClient.invalidateQueries({
            queryKey: QK.scholarshipApplications.all,
          });
          await refetch();
        } catch (err) {
          toastError(err, "Failed to save application");
        }
        return;
      }

      const schStdApplicationId = Number(editing?.schStdApplicationId ?? 0);
      if (!schStdApplicationId) {
        toastError(new Error("Missing application id"), "Update failed");
        return;
      }
      const duplicate = applications.some(
        (a) =>
          Number(a.studentId) === studentId &&
          Number(a.courseYearId) === courseYearId &&
          Number(a.schStdApplicationId) !== schStdApplicationId,
      );
      if (duplicate) {
        toastInfo("Already student exists with same course year.");
        await refetch();
        return;
      }
      try {
        await updateScholarshipApplication(schStdApplicationId, {
          ...payload,
          schStdApplicationId,
        } as Record<string, unknown>);
        toastSuccess("Scholarship application updated.");
        setModalOpen(false);
        await queryClient.invalidateQueries({
          queryKey: QK.scholarshipApplications.all,
        });
        await refetch();
      } catch (err) {
        toastError(err, "Failed to update application");
      }
    },
    [applications, editing, modalMode, queryClient, refetch],
  );

  return (
    <FilteredListPage
      title="Scholarship Applications"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField
            label="College"
            icon={filterFieldIcon("College")}
            className="w-full sm:!flex-[0_0_16%] sm:!max-w-[16%] sm:!min-w-[9rem]"
          >
            <Select
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId(null);
              }}
              options={collegeOptions}
              placeholder="Select college"
              isLoading={loadingFilters}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Academic Year"
            icon={filterFieldIcon("Academic Year")}
            className="w-full sm:!flex-[0_0_16%] sm:!max-w-[16%] sm:!min-w-[9rem]"
          >
            <Select
              value={academicYearId}
              onChange={setAcademicYearId}
              options={academicYearOptions}
              placeholder="Select academic year"
              disabled={!collegeNum}
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={academicYearNum > 0 ? (applications as AppRow[]) : []}
      columnDefs={columnDefs}
      loading={loadingApps || isFetching}
      pagination
      toolbar={{ search: true, searchPlaceholder: "Search" }}
      toolbarTrailing={
        academicYearNum > 0 ? (
          <Button type="button" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" />
            Apply Scholarship
          </Button>
        ) : null
      }
    >
      <ApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        collegeId={collegeNum}
        academicYearId={academicYearNum}
        universityId={universityId}
        row={editing}
        onSubmit={handleModalSubmit}
      />
    </FilteredListPage>
  );
}
