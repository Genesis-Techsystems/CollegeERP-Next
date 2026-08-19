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
  createRoom,
  listActiveBlocksForRooms,
  listActiveRoomTypes,
  listRooms,
  updateRoom,
} from "@/services";
import {
  listFloorsByBlock,
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
  blockId: string;
  floorId: string;
  roomTypeId: string;
  roomName: string;
  roomCode: string;
  occupancy: string;
  examrows: string;
  examcolumns: string;
  isActive: boolean;
  reason: string;
}

const EMPTY_FORM: FormState = {
  blockId: "",
  floorId: "",
  roomTypeId: "",
  roomName: "",
  roomCode: "",
  occupancy: "",
  examrows: "",
  examcolumns: "",
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

export default function ExamCenterRoomsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [blocks, setBlocks] = useState<Row[]>([]);
  const [floors, setFloors] = useState<Row[]>([]);
  const [roomTypes, setRoomTypes] = useState<Row[]>([]);
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
      const list = await listRooms();
      setRows(list as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMasters = useCallback(async () => {
    try {
      const [blockList, typeList] = await Promise.all([
        listActiveBlocksForRooms(),
        listActiveRoomTypes(),
      ]);
      setBlocks(blockList as unknown as Row[]);
      setRoomTypes(typeList as unknown as Row[]);
    } catch (e) {
      toastError(e, "Failed to load masters");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadMasters();
  }, [loadData, loadMasters]);

  useEffect(() => {
    let cancelled = false;
    async function loadFloors() {
      if (!form.blockId) {
        setFloors([]);
        return;
      }
      try {
        const list = await listFloorsByBlock(Number(form.blockId));
        if (!cancelled) setFloors(list);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load floors");
      }
    }
    void loadFloors();
    return () => {
      cancelled = true;
    };
  }, [form.blockId]);

  const blockOptions: SelectOption[] = useMemo(
    () =>
      blocks.map((b) => ({
        value: String(num(b.blockId)),
        label: `${txt(b.blockCode)} - ${txt(b.blockName)}`,
      })),
    [blocks],
  );
  const floorOptions: SelectOption[] = useMemo(
    () =>
      floors.map((f) => ({
        value: String(num(f.floorId)),
        label: `${txt(f.floorName)} - ${txt(f.floorNo)}`,
      })),
    [floors],
  );
  const roomTypeOptions: SelectOption[] = useMemo(
    () =>
      roomTypes.map((r) => ({
        value: String(num(r.roomTypeId)),
        label: txt(r.roomType),
      })),
    [roomTypes],
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
      floorId: String(num(row.floorId)),
      roomTypeId: String(num(row.roomTypeId)),
      roomName: txt(row.roomName),
      roomCode: txt(row.roomCode),
      occupancy: row.occupancy == null ? "0" : String(row.occupancy),
      examrows: row.examrows == null ? "0" : String(row.examrows),
      examcolumns: row.examcolumns == null ? "0" : String(row.examcolumns),
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
    if (!form.floorId) next.floorId = "Floor is required";
    if (!form.roomTypeId) next.roomTypeId = "Room Type is required";
    if (!form.roomName.trim()) next.roomName = "Room Name is required";
    if (!form.roomCode.trim()) next.roomCode = "Room Code is required";
    if (form.occupancy.trim() === "" || Number.isNaN(Number(form.occupancy))) {
      next.occupancy = "Occupancy is required";
    }
    if (!form.isActive && !form.reason.trim())
      next.reason = "Reason is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        blockId: Number(form.blockId),
        floorId: Number(form.floorId),
        roomTypeId: Number(form.roomTypeId),
        roomName: form.roomName.trim(),
        roomCode: form.roomCode.trim(),
        occupancy: Number(form.occupancy || 0),
        examrows: Number(form.examrows || 0),
        examcolumns: Number(form.examcolumns || 0),
        isActive: form.isActive,
        reason: form.isActive ? "active" : form.reason.trim(),
      } as unknown as Parameters<typeof createRoom>[0];

      if (editing) {
        await updateRoom(num(editing.roomId), payload);
        toastSuccess("Room updated.");
      } else {
        await createRoom(payload);
        toastSuccess("Room added.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = getErrorMessage(err);
      if (isRequiredLikeMessage(message)) {
        const cleaned = message.replace(/\.+$/, "");
        if (/block/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, blockId: cleaned }));
        else if (/floor/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, floorId: cleaned }));
        else if (/room type/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, roomTypeId: cleaned }));
        else if (/room name/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, roomName: cleaned }));
        else if (/room code/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, roomCode: cleaned }));
        else if (/occupancy/i.test(cleaned))
          setFieldErrors((e) => ({ ...e, occupancy: cleaned }));
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
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.blockName),
      },
      {
        headerName: "Floor Name",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.floorName),
      },
      {
        headerName: "Room Type",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.roomType),
      },
      {
        headerName: "Room Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.roomCode),
      },
      {
        headerName: "Room Name",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.roomName),
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
      title="Rooms"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Rooms",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Room
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Room" : "Add Room"}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Block" required error={fieldErrors.blockId}>
            <Select
              options={blockOptions}
              value={form.blockId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, blockId: v ?? "", floorId: "" }));
                setFieldErrors((e) => ({
                  ...e,
                  blockId: undefined,
                  floorId: undefined,
                }));
              }}
              placeholder="Block"
              searchable
            />
          </FormField>
          <FormField label="Floor" required error={fieldErrors.floorId}>
            <Select
              options={floorOptions}
              value={form.floorId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, floorId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, floorId: undefined }));
              }}
              placeholder="Floor"
              searchable
              disabled={!form.blockId}
            />
          </FormField>
          <FormField
            label="Room Type"
            required
            error={fieldErrors.roomTypeId}
            className="md:col-span-2"
          >
            <Select
              options={roomTypeOptions}
              value={form.roomTypeId || null}
              onChange={(v) => {
                setForm((f) => ({ ...f, roomTypeId: v ?? "" }));
                setFieldErrors((e) => ({ ...e, roomTypeId: undefined }));
              }}
              placeholder="Room Type"
              searchable
            />
          </FormField>
          <FormField label="Room Name" required error={fieldErrors.roomName}>
            <Input
              className={INPUT_CLASS}
              placeholder="Room Name"
              value={form.roomName}
              onChange={(e) => {
                setForm((f) => ({ ...f, roomName: e.target.value }));
                setFieldErrors((err) => ({ ...err, roomName: undefined }));
              }}
            />
          </FormField>
          <FormField label="Room Code" required error={fieldErrors.roomCode}>
            <Input
              className={INPUT_CLASS}
              placeholder="Room Code"
              value={form.roomCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, roomCode: e.target.value }));
                setFieldErrors((err) => ({ ...err, roomCode: undefined }));
              }}
            />
          </FormField>
          <FormField label="Occupancy" required error={fieldErrors.occupancy}>
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="Occupancy"
              value={form.occupancy}
              onChange={(e) => {
                setForm((f) => ({ ...f, occupancy: e.target.value }));
                setFieldErrors((err) => ({ ...err, occupancy: undefined }));
              }}
            />
          </FormField>
          <FormField label="Exam Rows">
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="Exam Rows"
              value={form.examrows}
              onChange={(e) =>
                setForm((f) => ({ ...f, examrows: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Exam Columns">
            <Input
              type="number"
              min={0}
              className={INPUT_CLASS}
              placeholder="Exam Columns"
              value={form.examcolumns}
              onChange={(e) =>
                setForm((f) => ({ ...f, examcolumns: e.target.value }))
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
