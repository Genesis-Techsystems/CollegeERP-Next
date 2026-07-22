"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { LibraryGridPage } from "../_components/LibraryGridPage";
import { QK } from "@/lib/query-keys";
import { listLibrarySettings, type LibraryRow } from "@/services";
import type { LibrarySetting } from "@/types/library";
import { LibrarySettingModal } from "./_components/LibrarySettingModal";

function fineRenderer(p: ICellRendererParams<LibraryRow>) {
  const isFine = p.data?.isFine === true;
  return <StatusBadge status={isFine} label={isFine ? "Yes" : "No"} />;
}

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />;
}

function makeActionsRenderer(
  setEditing: (row: LibraryRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit library setting"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function LibrarySettingsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryRow | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: QK.library.settings() });
  };

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      {
        field: "orgCode",
        headerName: "Organization",
        minWidth: 120,
      },
      {
        field: "libraryCode",
        headerName: "Library",
        minWidth: 100,
      },
      {
        field: "settingName",
        headerName: "Name",
        minWidth: 140,
      },
      {
        field: "libSettingCatdetCode",
        headerName: "Settings Category",
        minWidth: 140,
      },
      {
        field: "value",
        headerName: "Value",
        minWidth: 90,
      },
      {
        field: "isFine",
        headerName: "Fine",
        minWidth: 80,
        flex: 0,
        cellRenderer: fineRenderer,
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        flex: 0,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 86,
        width: 86,
        flex: 0,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  return (
    <>
      <LibraryGridPage
        title="Library Settings"
        showHeaderCard={false}
        tableTitle="Library Settings"
        subtitle=""
        queryKey={QK.library.settings()}
        queryFn={() => listLibrarySettings() as Promise<LibraryRow[]>}
        columns={columnDefs}
        searchPlaceholder="Search"
        pdfDocumentTitle="Library Settings"
        toolbarTrailing={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Library Settings
          </Button>
        }
      />
      <LibrarySettingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing as LibrarySetting | null}
        onSaved={invalidate}
      />
    </>
  );
}
