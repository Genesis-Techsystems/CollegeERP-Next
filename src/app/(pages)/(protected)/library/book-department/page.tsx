"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listLibraryBookCategories } from "@/services";
import type { LibraryBookCategory } from "@/types/library";
import { BookDepartmentModal } from "./BookDepartmentModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryBookCategory>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
  } as ColDef<LibraryBookCategory>,
  libraryCode: {
    field: "libraryCode",
    headerName: "Library Name",
    minWidth: 130,
  } as ColDef<LibraryBookCategory>,
  bookCategoryCode: {
    field: "bookCategoryCode",
    headerName: "Book Department Code",
    minWidth: 170,
  } as ColDef<LibraryBookCategory>,
  bookCategoryName: {
    field: "bookCategoryName",
    headerName: "Book Department Name",
    minWidth: 170,
  } as ColDef<LibraryBookCategory>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryBookCategory>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<LibraryBookCategory>,
};

function statusRenderer(p: ICellRendererParams<LibraryBookCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: LibraryBookCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryBookCategory>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit book department"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function BookDepartmentPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryBookCategory | null>(null);

  const {
    data: rows,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: QK.library.bookCategories(),
    queryFn: listLibraryBookCategories,
  });

  const columnDefs = useMemo<ColDef<LibraryBookCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.libraryCode,
      COL_DEFS.bookCategoryCode,
      COL_DEFS.bookCategoryName,
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
      title="Book Department"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search book departments…",
        pdfDocumentTitle: "Book Departments",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Book Department
        </Button>
      }
    >
      <BookDepartmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
