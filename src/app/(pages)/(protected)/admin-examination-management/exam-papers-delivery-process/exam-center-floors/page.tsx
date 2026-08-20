"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { isRequiredLikeMessage } from "@/lib/zod-fields";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";
import {
  createFloor,
  listActiveBlocksForFloors,
  listFloors,
  updateFloor,
} from "@/services";
import type { AnyRow } from "@/services/exam-papers-delivery";

type Row = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

interface FormState {
  blockId: string;
  floorName: string;
  floorNo: string;
  noOfRooms: string;
  isActive: boolean;
  reason: string;
}

const EMPTY_FORM: FormState = {
  blockId: "",
  floorName: "",
  floorNo: "",
  noOfRooms: "",
  isActive: true,
  reason: "active",
};

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={p.data?.isActive === true} />;
}

function makeActionsRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-blue-700"
      onClick={() => p.data && onEdit(p.data)}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

export default function ExamCenterFloorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [blocks, setBlocks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listFloors();
      setRows(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load floors");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlocks = useCallback(async () => {
    try {
      const list = await listActiveBlocksForFloors();
      setBlocks(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load blocks");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadBlocks();
  }, [loadData, loadBlocks]);

  const blockOptions: SelectOption[] = useMemo(
    () =>
      blocks.map((b) => ({
        value: String(num(b.blockId)),
        label: `${txt(b.blockCode)} - ${txt(b.blockName)}`,
      })),
    [blocks],
  );

  function onAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  }

  function onEdit(row: Row) {
    setEditing(row);
    setForm({
      blockId: String(num(row.blockId)),
      floorName: txt(row.floorName),
      floorNo: row.floorNo == null ? "" : String(row.floorNo),
      noOfRooms: row.noOfRooms == null ? "" : String(row.noOfRooms),
      isActive: row.isActive === true,
      reason: txt(row.reason) || "active",
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.blockId) next.blockId = "Block is required";
    if (!form.floorName.trim()) next.floorName = "Floor Name is required";
    if (!form.floorNo.trim()) next.floorNo = "Floor No is required";
    if (!form.isActive && !form.reason.trim())
      next.reason = "Reason is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        blockId: Number(form.blockId),
        floorName: form.floorName.trim(),
        floorNo: Number(form.floorNo),
        noOfRooms: form.noOfRooms === "" ? undefined : Number(form.noOfRooms),
        isActive: form.isActive,
        reason: form.isActive ? "active" : form.reason.trim(),
      } as unknown as Parameters<typeof createFloor>[0];

      if (editing) {
        await updateFloor(num(editing.floorId), payload);
        toastSuccess("Floor updated.");
      } else {
        await createFloor(payload);
        toastSuccess("Floor added.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isRequiredLikeMessage(message)) {
        const cleaned = message.replace(/\.+$/, "");
        if (/block/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, blockId: cleaned }));
        else if (/floor name/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, floorName: cleaned }));
        else if (/floor no/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, floorNo: cleaned }));
        else if (/reason/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, reason: cleaned }));
        return;
      }
      toastError(err, editing ? "Update failed" : "Add failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Block Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.blockName),
      },
      {
        headerName: "Floor Name",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.floorName),
      },
      {
        headerName: "Floor No",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.floorNo),
      },
      {
        headerName: "No Of Rooms",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.noOfRooms),
      },
      { headerName: "Status", minWidth: 100, cellRenderer: statusRenderer },
      {
        headerName: "Actions",
        minWidth: 90,
        width: 90,
        flex: 0,
        cellRenderer: makeActionsRenderer(onEdit),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Floors"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Floors",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Floor
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Floor" : "Add Floor"}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Block"
            required
            error={fieldErrors.blockId}
            className="md:col-span-2"
          >
            <Select
              options={blockOptions}
              value={form.blockId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, blockId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, blockId: undefined }));
              }}
              placeholder="Block"
              searchable
            />
          </FormField>
          <FormField label="Floor Name" required error={fieldErrors.floorName}>
            <Input
              className={INPUT_CLASS}
              placeholder="Floor Name"
              value={form.floorName}
              onChange={(e) => {
                setForm((f) => ({ ...f, floorName: e.target.value }));
                setFieldErrors((err) => ({ ...err, floorName: undefined }));
              }}
            />
          </FormField>
          <FormField label="Floor No" required error={fieldErrors.floorNo}>
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="Floor No"
              value={form.floorNo}
              onChange={(e) => {
                setForm((f) => ({ ...f, floorNo: e.target.value }));
                setFieldErrors((err) => ({ ...err, floorNo: undefined }));
              }}
            />
          </FormField>
          <FormField label="No Of Rooms">
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="No Of Rooms"
              value={form.noOfRooms}
              onChange={(e) =>
                setForm((f) => ({ ...f, noOfRooms: e.target.value }))
              }
            />
          </FormField>
          <div className="md:col-span-2">
            <ActiveStatusField
              isActive={form.isActive}
              reason={form.reason === "active" ? "" : form.reason}
              onActiveChange={(v) => {
                setForm((f) => ({
                  ...f,
                  isActive: v === true,
                  reason: v ? "active" : "",
                }));
                setFieldErrors((e) => ({ ...e, reason: undefined }));
              }}
              onReasonChange={(v) => {
                setForm((f) => ({ ...f, reason: v }));
                setFieldErrors((e) => ({ ...e, reason: undefined }));
              }}
              reasonRequired={!form.isActive}
              reasonPlaceholder="Reason"
              reasonError={fieldErrors.reason}
            />
          </div>
        </div>
      </FormModal>
    </ListPage>
  );
}
