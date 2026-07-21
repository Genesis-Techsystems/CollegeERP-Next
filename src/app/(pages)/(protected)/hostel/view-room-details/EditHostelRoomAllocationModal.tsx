"use client";

import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { FormField } from "@/common/components/forms";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listActiveHostelRoomsForDetails,
  updateHostelRoomAllocation,
} from "@/services";
import type { HostelRoom, HostelRoomAllocationRow } from "@/types/hostel";

function parseDate(value?: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function roomLabel(room: HostelRoom): string {
  const type = room.roomTypeDisplayName;
  return type
    ? `${room.roomNumber ?? room.hstlRoomId} ( ${type} )`
    : String(room.roomNumber ?? room.hstlRoomId);
}

export function EditHostelRoomAllocationModal({
  open,
  row,
  hostels,
  organizationId,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: HostelRoomAllocationRow | null;
  hostels: SelectOption[];
  organizationId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hostelId, setHostelId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [paymentDueDate, setPaymentDueDate] = useState(new Date());
  const [isAmountSetteled, setIsAmountSetteled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setHostelId(Number(row.hostelId ?? 0) || null);
    setRoomId(Number(row.hstlRoomId ?? 0) || null);
    setFromDate(parseDate(row.fromDate));
    setToDate(parseDate(row.toDate));
    setPaymentDueDate(parseDate(row.paymentDueDate));
    setIsAmountSetteled(row.isAmountSetteled === true);
    setIsActive(row.isActive !== false);
  }, [open, row]);

  useEffect(() => {
    if (!open || !hostelId) {
      setRooms([]);
      return;
    }
    setLoadingRooms(true);
    void listActiveHostelRoomsForDetails(hostelId)
      .then(setRooms)
      .catch((error) => {
        setRooms([]);
        toastError(error, "Failed to load hostel rooms");
      })
      .finally(() => setLoadingRooms(false));
  }, [hostelId, open]);

  const roomOptions = useMemo<SelectOption[]>(
    () =>
      rooms.map((room) => ({
        value: String(room.hstlRoomId),
        label: roomLabel(room),
      })),
    [rooms],
  );

  const hostelerName =
    row?.stdFirstName ?? row?.empFirstName ?? row?.firstName ?? "Hosteler";

  const changeFromDate = (date: Date | null) => {
    if (!date) return;
    setFromDate(date);
    if (date.getTime() > toDate.getTime()) {
      toastInfo("To Date should be greater than or equal to From Date");
      setToDate(date);
    }
  };

  const save = async () => {
    if (!row?.hstlRoomAllotId || !hostelId || !roomId) {
      toastInfo("Hostel and room are required");
      return;
    }
    setSaving(true);
    try {
      await updateHostelRoomAllocation(row.hstlRoomAllotId, {
        hostelId,
        hstlRoomId: roomId,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        paymentDueDate: paymentDueDate.toISOString(),
        isAmountSetteled,
        isActive,
        organizationId: Number(row.organizationId ?? organizationId),
      });
      toastSuccess("Hostel room details updated");
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, "Failed to update hostel room details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Hostel Room Details"
      onSubmit={save}
      submitLabel="Save"
      isSubmitting={saving}
      size="lg"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Hosteler Name:{" "}
        <strong className="text-foreground">{hostelerName}</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hostel" required>
          <Select
            value={hostelId ? String(hostelId) : null}
            onChange={(value) => {
              setHostelId(value ? Number(value) : null);
              setRoomId(null);
            }}
            options={hostels}
            clearable={false}
            placeholder="Select hostel"
          />
        </FormField>
        <FormField label="Room" required>
          <Select
            value={roomId ? String(roomId) : null}
            onChange={(value) => setRoomId(value ? Number(value) : null)}
            options={roomOptions}
            isLoading={loadingRooms}
            disabled={!hostelId}
            clearable={false}
            placeholder="Select room"
          />
        </FormField>
        <FormField label="From Date">
          <DatePicker value={fromDate} onChange={changeFromDate} />
        </FormField>
        <FormField label="To Date">
          <DatePicker
            value={toDate}
            onChange={(date) => date && setToDate(date)}
            minDate={fromDate}
          />
        </FormField>
        <FormField label="Payment Due Date">
          <DatePicker
            value={paymentDueDate}
            onChange={(date) => date && setPaymentDueDate(date)}
          />
        </FormField>
        <div className="flex items-end gap-6 pb-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isAmountSetteled}
              onCheckedChange={(checked) =>
                setIsAmountSetteled(checked === true)
              }
            />
            Amount Setteled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            Active
          </label>
        </div>
      </div>
    </FormModal>
  );
}
