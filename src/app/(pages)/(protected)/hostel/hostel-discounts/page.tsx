"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { EmptyState } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { getErrorMessage } from "@/lib/errors";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listHostelDiscounts } from "@/services";
import type { HostelDiscount } from "@/types/hostel";
import { HostelDiscountModal } from "./HostelDiscountModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<HostelDiscount>,
  hstlDiscountName: {
    field: "hstlDiscountName",
    headerName: "Discount Name",
    minWidth: 140,
  } as ColDef<HostelDiscount>,
  discountType: {
    field: "discountType",
    headerName: "Discount Type",
    minWidth: 120,
  } as ColDef<HostelDiscount>,
  discountValue: {
    field: "discountValue",
    headerName: "Discount Value",
    minWidth: 120,
  } as ColDef<HostelDiscount>,
  hostelCode: {
    field: "hostelCode",
    headerName: "Hostel",
    minWidth: 100,
  } as ColDef<HostelDiscount>,
  dateRange: {
    headerName: "Valid From - Valid To",
    minWidth: 220,
  } as ColDef<HostelDiscount>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<HostelDiscount>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<HostelDiscount>,
};

function discountTypeRenderer(p: ICellRendererParams<HostelDiscount>) {
  if (p.data?.discountType === "A") return "Amount";
  if (p.data?.discountType === "P") return "Percentage";
  return p.data?.discountType ?? "—";
}

function formatDiscountDate(value?: string) {
  if (!value) return "—";
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "MMM d, y");
}

function dateRangeRenderer(p: ICellRendererParams<HostelDiscount>) {
  return `${formatDiscountDate(p.data?.validFrom)} - ${formatDiscountDate(p.data?.validTo)}`;
}

function statusRenderer(p: ICellRendererParams<HostelDiscount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: HostelDiscount | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<HostelDiscount>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit hostel discount"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function HostelDiscountsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HostelDiscount | null>(null);

  const {
    data: rows,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useCrudList({
    queryKey: QK.hostel.discounts(),
    queryFn: listHostelDiscounts,
  });

  const columnDefs = useMemo<ColDef<HostelDiscount>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hstlDiscountName,
      { ...COL_DEFS.discountType, cellRenderer: discountTypeRenderer },
      COL_DEFS.discountValue,
      COL_DEFS.hostelCode,
      { ...COL_DEFS.dateRange, cellRenderer: dateRangeRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Hostel Discounts"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{ search: true, pdfDocumentTitle: "Hostel Discounts" }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Hostel Discount
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load discounts"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <HostelDiscountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editing}
        onSaved={() => void invalidate()}
      />
    </ListPage>
  );
}
