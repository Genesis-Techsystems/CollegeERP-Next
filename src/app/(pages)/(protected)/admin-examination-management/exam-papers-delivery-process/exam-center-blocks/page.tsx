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
  createBlock,
  listActiveBuildings,
  listBlocks,
  updateBlock,
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
  buildingId: string;
  blockName: string;
  blockCode: string;
  noOfFloors: string;
  isActive: boolean;
  reason: string;
}

const EMPTY_FORM: FormState = {
  buildingId: "",
  blockName: "",
  blockCode: "",
  noOfFloors: "",
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

export default function ExamCenterBlocksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [buildings, setBuildings] = useState<Row[]>([]);
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
      const list = await listBlocks();
      setRows(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load blocks");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBuildings = useCallback(async () => {
    try {
      const list = await listActiveBuildings();
      setBuildings(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load buildings");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadBuildings();
  }, [loadData, loadBuildings]);

  const buildingOptions: SelectOption[] = useMemo(
    () =>
      buildings.map((b) => ({
        value: String(num(b.buildingId)),
        label: `${txt(b.buildingCode)} - ${txt(b.buildingName)}`,
      })),
    [buildings],
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
      buildingId: String(num(row.buildingId)),
      blockName: txt(row.blockName),
      blockCode: txt(row.blockCode),
      noOfFloors: row.noOfFloors == null ? "" : String(row.noOfFloors),
      isActive: row.isActive === true,
      reason: txt(row.reason) || "active",
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.buildingId) next.buildingId = "Building is required";
    if (!form.blockName.trim()) next.blockName = "Block Name is required";
    if (!form.blockCode.trim()) next.blockCode = "Block Code is required";
    if (!form.isActive && !form.reason.trim())
      next.reason = "Reason is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        buildingId: Number(form.buildingId),
        blockName: form.blockName.trim(),
        blockCode: form.blockCode.trim(),
        noOfFloors:
          form.noOfFloors === "" ? undefined : Number(form.noOfFloors),
        isActive: form.isActive,
        reason: form.isActive ? "active" : form.reason.trim(),
      } as unknown as Parameters<typeof createBlock>[0];

      if (editing) {
        await updateBlock(num(editing.blockId), payload);
        toastSuccess("Block updated.");
      } else {
        await createBlock(payload);
        toastSuccess("Block added.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isRequiredLikeMessage(message)) {
        const cleaned = message.replace(/\.+$/, "");
        if (/building/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, buildingId: cleaned }));
        else if (/block name/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, blockName: cleaned }));
        else if (/block code/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, blockCode: cleaned }));
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
        headerName: "Building Name",
        minWidth: 170,
        valueGetter: (p) => txt(p.data?.buildingName),
      },
      {
        headerName: "Block Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.blockCode),
      },
      {
        headerName: "Block Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.blockName),
      },
      {
        headerName: "No Of Floors",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.noOfFloors),
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
      title="Blocks"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Blocks",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Block
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Block" : "Add Block"}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Building"
            required
            error={fieldErrors.buildingId}
            className="md:col-span-2"
          >
            <Select
              options={buildingOptions}
              value={form.buildingId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, buildingId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, buildingId: undefined }));
              }}
              placeholder="Building"
              searchable
            />
          </FormField>
          <FormField label="Block Name" required error={fieldErrors.blockName}>
            <Input
              className={INPUT_CLASS}
              placeholder="Block Name"
              value={form.blockName}
              onChange={(e) => {
                setForm((f) => ({ ...f, blockName: e.target.value }));
                setFieldErrors((err) => ({ ...err, blockName: undefined }));
              }}
            />
          </FormField>
          <FormField label="Block Code" required error={fieldErrors.blockCode}>
            <Input
              className={INPUT_CLASS}
              placeholder="Block Code"
              value={form.blockCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, blockCode: e.target.value }));
                setFieldErrors((err) => ({ ...err, blockCode: undefined }));
              }}
            />
          </FormField>
          <FormField label="No Of Floors">
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="No Of Floors"
              value={form.noOfFloors}
              onChange={(e) =>
                setForm((f) => ({ ...f, noOfFloors: e.target.value }))
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
