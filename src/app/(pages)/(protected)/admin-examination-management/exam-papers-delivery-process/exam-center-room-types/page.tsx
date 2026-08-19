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
  createRoomType,
  listActiveOrganizations,
  listRoomTypes,
  updateRoomType,
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
  organizationId: string;
  roomType: string;
  isActive: boolean;
  reason: string;
}

const EMPTY_FORM: FormState = {
  organizationId: "",
  roomType: "",
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

export default function ExamCenterRoomTypesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [orgs, setOrgs] = useState<Row[]>([]);
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
      const list = await listRoomTypes();
      setRows(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load room types");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrgs = useCallback(async () => {
    try {
      const list = await listActiveOrganizations();
      setOrgs(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load organizations");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadOrgs();
  }, [loadData, loadOrgs]);

  const orgOptions: SelectOption[] = useMemo(
    () =>
      orgs.map((o) => ({
        value: String(num(o.organizationId)),
        label: txt(o.orgCode ?? o.organizationCode ?? o.organizationName),
      })),
    [orgs],
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
      organizationId: String(num(row.organizationId)),
      roomType: txt(row.roomType),
      isActive: row.isActive === true,
      reason: txt(row.reason) || "active",
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.organizationId) next.organizationId = "Organization is required";
    if (!form.roomType.trim()) next.roomType = "Room Type is required";
    if (!form.isActive && !form.reason.trim())
      next.reason = "Reason is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        organizationId: Number(form.organizationId),
        roomType: form.roomType.trim(),
        isActive: form.isActive,
        reason: form.isActive ? "active" : form.reason.trim(),
      } as unknown as Parameters<typeof createRoomType>[0];

      if (editing) {
        await updateRoomType(num(editing.roomTypeId), payload);
        toastSuccess("Room Type updated.");
      } else {
        await createRoomType(payload);
        toastSuccess("Room Type added.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isRequiredLikeMessage(message)) {
        const cleaned = message.replace(/\.+$/, "");
        if (/organization/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, organizationId: cleaned }));
        else if (/room type/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, roomType: cleaned }));
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
        headerName: "Org Code",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.orgCode ?? p.data?.organizationCode),
      },
      {
        headerName: "Room Type",
        minWidth: 200,
        valueGetter: (p) => txt(p.data?.roomType),
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
      title="Room Types"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Room Types",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Room Type
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Room Type" : "Add Room Type"}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            label="Organization"
            required
            error={fieldErrors.organizationId}
            className="md:col-span-2"
          >
            <Select
              options={orgOptions}
              value={form.organizationId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, organizationId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, organizationId: undefined }));
              }}
              placeholder="Organization"
              searchable
            />
          </FormField>
          <FormField
            label="Room Type"
            required
            error={fieldErrors.roomType}
            className="md:col-span-2"
          >
            <Input
              className={INPUT_CLASS}
              placeholder="Room Type"
              value={form.roomType}
              onChange={(e) => {
                setForm((f) => ({ ...f, roomType: e.target.value }));
                setFieldErrors((err) => ({ ...err, roomType: undefined }));
              }}
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
