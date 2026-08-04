"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  createSchAccountsPreceeding,
  getScholarshipCollegeFilters,
  listSchAccountsPreceedings,
} from "@/services";
import type { SchAccountsPreceeding } from "@/types/scholarship";
import {
  AccountPreceedingModal,
  type AccountPreceedingModalResult,
} from "./AccountPreceedingModal";

type AccountRow = SchAccountsPreceeding & {
  schAccountsPreceedingsId?: number;
} & Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AccountRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
  } as ColDef<AccountRow>,
  title: {
    field: "title",
    headerName: "Cheque Title",
    minWidth: 180,
  } as ColDef<AccountRow>,
  chequeNo: {
    field: "chequeNo",
    headerName: "Cheque No",
    minWidth: 130,
  } as ColDef<AccountRow>,
  chequeDate: {
    field: "chequeDate",
    headerName: "Cheque Date",
    minWidth: 130,
  } as ColDef<AccountRow>,
  bankName: {
    field: "bankName",
    headerName: "Bank",
    minWidth: 140,
  } as ColDef<AccountRow>,
  preceedings: {
    headerName: "Preceedings",
    minWidth: 110,
    flex: 0,
    width: 120,
  } as ColDef<AccountRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 110,
  } as ColDef<AccountRow>,
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

function dateRenderer(p: ICellRendererParams<AccountRow>) {
  return formatDt(p.data?.chequeDate);
}

function makeViewRenderer(onView: (row: AccountRow) => void) {
  return (p: ICellRendererParams<AccountRow>) => (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-7 px-2"
      onClick={() => p.data && onView(p.data)}
    >
      View
    </Button>
  );
}

function makeActionsRenderer(onEdit: (row: AccountRow) => void) {
  return (p: ICellRendererParams<AccountRow>) => (
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

export default function AccountsPreceedingsPage() {
  const queryClient = useQueryClient();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["SchAccountsPreceeding", "filters", orgId, employeeId],
    queryFn: () => getScholarshipCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeNum = Number(collegeId ?? 0);

  const collegeOptions = useMemo(
    () =>
      colleges
        .map((c) => ({
          value: String(pickNum(c, ["fk_college_id", "collegeId"])),
          label:
            pickText(c, ["college_code", "collegeCode"]) ||
            pickText(c, ["college_name", "collegeName"]) ||
            String(pickNum(c, ["fk_college_id", "collegeId"])),
        }))
        .filter((o) => o.value !== "0"),
    [colleges],
  );

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  const {
    data: rows = [],
    isLoading: loadingList,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QK.schAccountsPreceedings.list(collegeNum || undefined),
    queryFn: () => listSchAccountsPreceedings(collegeNum),
    enabled: collegeNum > 0,
  });

  const collegeCode = useMemo(() => {
    const opt = collegeOptions.find((o) => o.value === collegeId);
    return opt?.label ?? "";
  }, [collegeOptions, collegeId]);

  const openCreate = useCallback(() => {
    if (!collegeNum) {
      toastInfo("Select a college first.");
      return;
    }
    setModalOpen(true);
  }, [collegeNum]);

  const openEdit = useCallback((_row: AccountRow) => {
    toastInfo("Edit Accounts Preceedings will be available in a follow-up.");
  }, []);

  const openView = useCallback((_row: AccountRow) => {
    toastInfo("View Preceedings will be available in a follow-up.");
  }, []);

  const handleModalSubmit = useCallback(
    async (payload: AccountPreceedingModalResult) => {
      try {
        await createSchAccountsPreceeding({
          collegeId: payload.collegeId,
          bankId: payload.bankId,
          title: payload.title,
          chequeNo: payload.chequeNo,
          chequeDate: payload.chequeDate,
          comments: payload.comments,
          isHandOvertoAcc: payload.isHandOvertoAcc,
          isActive: payload.isActive,
          reason: payload.reason,
          schPreceedingList: payload.schPreceedingList,
          schPreceedingIds: payload.schPreceedingIds,
        });
        toastSuccess("Accounts preceeding saved.");
        setModalOpen(false);
        await queryClient.invalidateQueries({
          queryKey: QK.schAccountsPreceedings.all,
        });
        await refetch();
      } catch (err) {
        toastError(err, "Failed to save accounts preceeding");
      }
    },
    [queryClient, refetch],
  );

  const columnDefs = useMemo<ColDef<AccountRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.title,
      COL_DEFS.chequeNo,
      { ...COL_DEFS.chequeDate, cellRenderer: dateRenderer },
      COL_DEFS.bankName,
      { ...COL_DEFS.preceedings, cellRenderer: makeViewRenderer(openView) },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit, openView],
  );

  return (
    <FilteredListPage
      title="Accounts Preceedings"
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => setCollegeId(v)}
            options={collegeOptions}
            placeholder="Select college"
            isLoading={loadingFilters}
            searchable
          />
        </div>
      }
      rowData={collegeNum > 0 ? (rows as AccountRow[]) : []}
      columnDefs={columnDefs}
      loading={loadingList || isFetching}
      pagination
      toolbar={{ search: true, searchPlaceholder: "Search" }}
      toolbarTrailing={
        collegeNum > 0 ? (
          <Button type="button" onClick={openCreate}>
            Add Accounts Preceedings
          </Button>
        ) : null
      }
    >
      <AccountPreceedingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collegeId={collegeNum}
        collegeCode={collegeCode}
        onSubmit={handleModalSubmit}
      />
    </FilteredListPage>
  );
}
