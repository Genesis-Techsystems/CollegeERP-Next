"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { ListPage } from "@/components/layout";
import {
  createInvigilatorRemuneration,
  listActiveColleges,
  listInvigilatorDesignationTypes,
  listInvigilatorRemunerations,
  updateInvigilatorRemuneration,
} from "@/services/invigilator-remuneration";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type AnyRow = Record<string, any>;

function getRemunerationId(r: AnyRow | null | undefined): number {
  return Number(
    r?.examInvgRemunerationId ??
      r?.examInvigilationRemunerationId ??
      r?.examInvigilatorRemunerationId ??
      r?.invigilatorRemunerationId ??
      r?.invigRemunerationId ??
      0,
  );
}

// ── Column shape ─────────────────────────────────────────────────────────────
const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 60,
    flex: 0,
  } as ColDef,
  designation: {
    field: "invgdesignationCatCode",
    headerName: "Invigilator Designation",
    flex: 1,
    minWidth: 160,
  } as ColDef,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
  } as ColDef,
  amount: {
    field: "amount",
    headerName: "Amount",
    width: 130,
    flex: 0,
  } as ColDef,
  fromDate: {
    field: "fromDate",
    headerName: "From Date",
    width: 120,
    flex: 0,
  } as ColDef,
  toDate: {
    field: "toDate",
    headerName: "To Date",
    width: 120,
    flex: 0,
  } as ColDef,
  isActive: {
    field: "isActive",
    headerName: "Status",
    width: 90,
    flex: 0,
  } as ColDef,
  actions: { headerName: "Actions", width: 90, flex: 0 } as ColDef,
};

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function dateFormatter(p: ValueFormatterParams) {
  if (!p.value) return "—";
  try {
    return format(parseISO(String(p.value)), "dd MMM yyyy");
  } catch {
    return String(p.value);
  }
}

function makeActionsRenderer(openEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      aria-label="Edit invigilator remuneration"
      onClick={() => p.data && openEdit(p.data)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function InvigilatorRemunerationPage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [designations, setDesignations] = useState<AnyRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [invgdesignationCatId, setInvgdesignationCatId] = useState<
    number | null
  >(null);
  const [amount, setAmount] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setFieldErrors({});
  }

  async function loadAll() {
    const [list, clgs, desg] = await Promise.all([
      listInvigilatorRemunerations().catch(() => []),
      listActiveColleges().catch(() => []),
      listInvigilatorDesignationTypes().catch(() => []),
    ]);
    setRows(Array.isArray(list) ? list : []);
    setColleges(Array.isArray(clgs) ? clgs : []);
    setDesignations(Array.isArray(desg) ? desg : []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAdd() {
    // Add starts blank — no college/designation/amount/dates pre-selected.
    setEditing(null);
    setFieldErrors({});
    setCollegeId(null);
    setInvgdesignationCatId(null);
    setAmount("");
    setFromDate("");
    setToDate("");
    setIsActive(true);
    setReason("active");
    setOpen(true);
  }

  const openEdit = useCallback((r: AnyRow) => {
    setFieldErrors({});
    setEditing(r);
    setCollegeId(
      Number(r.collegeId ?? r.fk_college_id ?? r.college?.collegeId ?? null),
    );
    setInvgdesignationCatId(
      Number(
        r.invgdesignationCatId ??
          r.invgdesignationCat?.generalDetailId ??
          r.generalDetailId ??
          null,
      ),
    );
    setAmount(String(r.amount ?? ""));
    try {
      setFromDate(
        r.fromDate ? format(parseISO(String(r.fromDate)), "yyyy-MM-dd") : "",
      );
    } catch {
      setFromDate("");
    }
    try {
      setToDate(
        r.toDate ? format(parseISO(String(r.toDate)), "yyyy-MM-dd") : "",
      );
    } catch {
      setToDate("");
    }
    setIsActive(Boolean(r.isActive));
    setReason(String(r.reason ?? ""));
    setOpen(true);
  }, []);

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c, i) => ({
        value: String(c.collegeId ?? c.fk_college_id ?? i),
        label: String(c.collegeCode ?? c.college_code ?? ""),
      })),
    [colleges],
  );

  const designationOptions = useMemo<SelectOption[]>(
    () =>
      designations.map((d, i) => ({
        value: String(d.generalDetailId ?? i),
        label: String(d.generalDetailCode ?? ""),
      })),
    [designations],
  );

  async function save() {
    const cleanAmount = amount.trim();
    const nextErrors: Record<string, string> = {};
    if (!collegeId) nextErrors.collegeId = "College is required.";
    if (!invgdesignationCatId)
      nextErrors.invgdesignationCatId = "Invigilator Designation is required.";
    if (!cleanAmount) nextErrors.amount = "Amount is required.";
    setFieldErrors(nextErrors);
    if (!fromDate) nextErrors.fromDate = "From Date is required.";
    if (!toDate) nextErrors.toDate = "To Date is required.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (fromDate > toDate) {
      toast.error("From date should be less than To date.");
      return;
    }
    const editId = getRemunerationId(editing);
    const basePayload = {
      collegeId,
      invgdesignationCatId,
      amount: Number(cleanAmount),
      fromDate,
      toDate,
      isActive,
      reason: reason || (isActive ? "active" : "inactive"),
    };

    let res: AnyRow | null = null;
    if (editing && !editId) {
      toast.error(
        "Unable to identify selected record for update. Please refresh and try again.",
      );
      return;
    }
    if (editId) {
      const updatePayload = {
        ...basePayload,
        examInvgRemunerationId: editId,
      };
      res = await updateInvigilatorRemuneration(editId, updatePayload).catch(
        (e) => ({ __error: e }),
      );
    } else {
      res = await createInvigilatorRemuneration(basePayload).catch((e) => ({
        __error: e,
      }));
    }
    if ((res as AnyRow | null)?.__error) {
      const err = (res as AnyRow).__error;
      const msg =
        err?.message ??
        err?.response?.data?.message ??
        err?.body?.message ??
        "Unable to save changes. Please verify fields and try again.";
      toast.error(msg);
      return;
    }
    toast.success(
      editId
        ? "Invigilator remuneration updated successfully."
        : "Invigilator remuneration added successfully.",
    );
    closeModal();
    await loadAll();
  }

  // ── Column assembly ─────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.designation,
      COL_DEFS.college,
      COL_DEFS.amount,
      { ...COL_DEFS.fromDate, valueFormatter: dateFormatter },
      { ...COL_DEFS.toDate, valueFormatter: dateFormatter },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  );

  return (
    <ListPage
      title="Exam Invigilator Remuneration"
      rowData={rows}
      columnDefs={columnDefs}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search by college, designation, amount…",
        pdfDocumentTitle: "Invigilator Remuneration",
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={openAdd}
        >
          + Add Invigilator Remuneration
        </Button>
      }
    >
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal();
        }}
      >
        <DialogContent
          key={editing ? `edit-${getRemunerationId(editing)}` : "add"}
          className="max-w-2xl"
          closeOnOutsideClick={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="pr-12">
            <DialogTitle className="text-[hsl(var(--primary))]">
              {editing
                ? "Edit Invigilator Remuneration"
                : "Add Invigilator Remuneration"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-3">
            <Select
              label="College"
              required
              searchable
              clearable
              placeholder="Select college"
              options={collegeOptions}
              value={collegeId ? String(collegeId) : null}
              error={fieldErrors.collegeId}
              onChange={(v) => {
                setCollegeId(v ? Number(v) : null);
                if (fieldErrors.collegeId) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.collegeId;
                    return next;
                  });
                }
              }}
            />
            <Select
              label="Invigilator Designation"
              required
              searchable
              clearable
              placeholder="Select invigilator"
              options={designationOptions}
              value={invgdesignationCatId ? String(invgdesignationCatId) : null}
              error={fieldErrors.invgdesignationCatId}
              onChange={(v) => {
                setInvgdesignationCatId(v ? Number(v) : null);
                if (fieldErrors.invgdesignationCatId) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.invgdesignationCatId;
                    return next;
                  });
                }
              }}
            />
            <FormField label="Amount" required error={fieldErrors.amount}>
              <Input
                className="min-h-9 text-[13px]"
                type="number"
                placeholder="Enter amount"
                value={amount}
                aria-invalid={Boolean(fieldErrors.amount)}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (fieldErrors.amount) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.amount;
                      return next;
                    });
                  }
                }}
              />
            </FormField>
            <FormField label="From Date" error={fieldErrors.fromDate}>
              <DatePicker
                value={fromDate ? parseISO(fromDate) : null}
                onChange={(d) => {
                  setFromDate(d ? format(d, "yyyy-MM-dd") : "");
                  if (fieldErrors.fromDate) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.fromDate;
                      return next;
                    });
                  }
                }}
                placeholder="Select date"
              />
            </FormField>
            <FormField label="To Date" error={fieldErrors.toDate}>
              <DatePicker
                value={toDate ? parseISO(toDate) : null}
                minDate={fromDate ? parseISO(fromDate) : undefined}
                onChange={(d) => {
                  setToDate(d ? format(d, "yyyy-MM-dd") : "");
                  if (fieldErrors.toDate) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.toDate;
                      return next;
                    });
                  }
                }}
                placeholder="Select date"
              />
            </FormField>
            <div className="flex items-end pb-1 md:col-span-1">
              <ActiveStatusField
                isActive={isActive}
                reason={reason === "active" ? "" : reason}
                onActiveChange={(v) => {
                  const active = v === true;
                  setIsActive(active);
                  setReason(active ? "active" : "");
                }}
                onReasonChange={setReason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}
