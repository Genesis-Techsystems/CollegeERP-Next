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
import { createBuilding, listBuildings, updateBuilding } from "@/services";
import {
  listAllActiveUnivExamCenters,
  type AnyRow,
} from "@/services/exam-papers-delivery";

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
  univExamCenterId: string;
  campusId: number;
  buildingName: string;
  buildingCode: string;
  landmark: string;
  noOfFloors: string;
  isActive: boolean;
  reason: string;
}

const EMPTY_FORM: FormState = {
  univExamCenterId: "",
  campusId: 0,
  buildingName: "",
  buildingCode: "",
  landmark: "",
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

export default function ExamCenterBuildingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [centers, setCenters] = useState<Row[]>([]);
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
      const list = await listBuildings();
      // Angular: filter buildings tied to an exam center (univExamCenterId !== null)
      setRows(
        (list as unknown as Row[]).filter((r) => num(r.univExamCenterId) > 0),
      );
    } catch (e) {
      toastError(e, "Failed to load buildings");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCenters = useCallback(async () => {
    try {
      const list = await listAllActiveUnivExamCenters();
      setCenters(list);
    } catch (e) {
      toastError(e, "Failed to load exam centers");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadCenters();
  }, [loadData, loadCenters]);

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [centers],
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
      univExamCenterId: String(num(row.univExamCenterId)),
      campusId: num(row.campusId),
      buildingName: txt(row.buildingName),
      buildingCode: txt(row.buildingCode),
      landmark: txt(row.landmark ?? row.landMark),
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
    if (!form.univExamCenterId)
      next.univExamCenterId = "Exam Center is required";
    if (!form.buildingName.trim())
      next.buildingName = "Building Name is required";
    if (!form.buildingCode.trim())
      next.buildingCode = "Building Code is required";
    if (!form.isActive && !form.reason.trim())
      next.reason = "Reason is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        univExamCenterId: Number(form.univExamCenterId),
        campusId: form.campusId || 0,
        buildingName: form.buildingName.trim(),
        buildingCode: form.buildingCode.trim(),
        landmark: form.landmark.trim(),
        landMark: form.landmark.trim(),
        noOfFloors:
          form.noOfFloors === "" ? undefined : Number(form.noOfFloors),
        isActive: form.isActive,
        reason: form.isActive ? "active" : form.reason.trim(),
      } as unknown as Parameters<typeof createBuilding>[0];

      if (editing) {
        await updateBuilding(num(editing.buildingId), payload);
        toastSuccess("Building updated.");
      } else {
        await createBuilding(payload);
        toastSuccess("Building added.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isRequiredLikeMessage(message)) {
        const cleaned = message.replace(/\.+$/, "");
        if (/exam center/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, univExamCenterId: cleaned }));
        else if (/building name/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, buildingName: cleaned }));
        else if (/building code/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, buildingCode: cleaned }));
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
        headerName: "Exam Center",
        minWidth: 160,
        valueGetter: (p) =>
          txt(p.data?.examcenterName ?? p.data?.examCenterName),
      },
      {
        headerName: "Building Code",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.buildingCode),
      },
      {
        headerName: "Building Name",
        minWidth: 170,
        valueGetter: (p) => txt(p.data?.buildingName),
      },
      {
        headerName: "Landmark",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.landmark ?? p.data?.landMark),
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
      title="Buildings"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Buildings",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Building
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Building" : "Add Building"}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Exam Center"
            required
            error={fieldErrors.univExamCenterId}
            className="md:col-span-2"
          >
            <Select
              options={centerOptions}
              value={form.univExamCenterId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, univExamCenterId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, univExamCenterId: undefined }));
              }}
              placeholder="Exam Center"
              searchable
            />
          </FormField>
          <FormField
            label="Building Name"
            required
            error={fieldErrors.buildingName}
          >
            <Input
              className={INPUT_CLASS}
              placeholder="Building Name"
              value={form.buildingName}
              onChange={(e) => {
                setForm((f) => ({ ...f, buildingName: e.target.value }));
                setFieldErrors((err) => ({ ...err, buildingName: undefined }));
              }}
            />
          </FormField>
          <FormField
            label="Building Code"
            required
            error={fieldErrors.buildingCode}
          >
            <Input
              className={INPUT_CLASS}
              placeholder="Building Code"
              value={form.buildingCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, buildingCode: e.target.value }));
                setFieldErrors((err) => ({ ...err, buildingCode: undefined }));
              }}
            />
          </FormField>
          <FormField label="Landmark">
            <Input
              className={INPUT_CLASS}
              placeholder="Landmark"
              value={form.landmark}
              onChange={(e) =>
                setForm((f) => ({ ...f, landmark: e.target.value }))
              }
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
