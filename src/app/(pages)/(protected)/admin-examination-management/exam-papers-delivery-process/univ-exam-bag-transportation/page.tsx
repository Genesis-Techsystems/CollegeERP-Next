"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
  ActiveStatusField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createExamBagTransportation,
  listAllActiveUnivExamBags,
  listAllActiveUnivExamCenters,
  listAllActiveUnivExamRegionalCenters,
  listExamBagTransportationByFilters,
  pickUnivExamBagTransportationId,
  updateExamBagTransportation,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const toastInfo = (msg: string) => toast.info(msg);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
function regionalIdOf(r: Row): number {
  return num(r.univExamReionalCenterId ?? r.univExamRegionalCenterId);
}
function regionalCodeOf(r: Row): string {
  return txt(r.examReionalCenterCode ?? r.examRegionalCenterCode);
}
function centerIdOf(r: Row): number {
  return num(r.univExamcenterId ?? r.univExamCenterId);
}
function bagIdOf(r: Row): number {
  return num(r.univExamBagId ?? r.univ_exam_bag_id);
}
function toDate(v: string): Date | null {
  if (!v) return null;
  try {
    const d = parseISO(v.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
function fromDate(d: Date | null): string {
  return d ? format(d, "yyyy-MM-dd") : "";
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

export default function UnivExamBagTransportationPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [regionalCenters, setRegionalCenters] = useState<Row[]>([]);
  const [centers, setCenters] = useState<Row[]>([]);
  const [bags, setBags] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const [form, setForm] = useState({
    univExamReionalCenterId: "",
    univExamcenterId: "",
    univExamBagId: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formModal, setFormModal] = useState({
    univExamReionalCenterId: "",
    univExamcenterId: "",
    univExamBagId: "",
    vehicleNumber: "",
    vehicleDetails: "",
    driverName: "",
    driverPhoneNumber: "",
    receiveDate: "",
    dispatchDate: "",
    isActive: true,
    reason: "active",
  });

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true);
      try {
        const [r, c, b] = await Promise.all([
          listAllActiveUnivExamRegionalCenters().catch(() => []),
          listAllActiveUnivExamCenters().catch(() => []),
          listAllActiveUnivExamBags().catch(() => []),
        ]);
        setRegionalCenters(Array.isArray(r) ? r : []);
        setCenters(Array.isArray(c) ? c : []);
        setBags(Array.isArray(b) ? b : []);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadFilters();
  }, []);

  // Angular auto-selects first of each
  useEffect(() => {
    if (!regionalCenters.length || form.univExamReionalCenterId) return;
    setForm((f) => ({
      ...f,
      univExamReionalCenterId: String(regionalIdOf(regionalCenters[0])),
    }));
  }, [regionalCenters, form.univExamReionalCenterId]);

  useEffect(() => {
    if (!centers.length || form.univExamcenterId) return;
    setForm((f) => ({
      ...f,
      univExamcenterId: String(centerIdOf(centers[0])),
    }));
  }, [centers, form.univExamcenterId]);

  useEffect(() => {
    if (!bags.length || form.univExamBagId) return;
    setForm((f) => ({
      ...f,
      univExamBagId: String(bagIdOf(bags[0])),
    }));
  }, [bags, form.univExamBagId]);

  const headerText = useMemo(() => {
    const r = regionalCenters.find(
      (x) => regionalIdOf(x) === Number(form.univExamReionalCenterId),
    );
    const c = centers.find(
      (x) => centerIdOf(x) === Number(form.univExamcenterId),
    );
    const b = bags.find((x) => bagIdOf(x) === Number(form.univExamBagId));
    return [
      regionalCodeOf(r ?? {}),
      txt(c?.examcenterName ?? c?.examCenterName ?? c?.examcenterCode),
      txt(b?.bagSerialNo),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [regionalCenters, centers, bags, form]);

  async function onGetList() {
    if (
      !form.univExamReionalCenterId ||
      !form.univExamcenterId ||
      !form.univExamBagId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await listExamBagTransportationByFilters(
        Number(form.univExamReionalCenterId),
        Number(form.univExamcenterId),
        Number(form.univExamBagId),
      );
      setRows(Array.isArray(list) ? list : []);
      setShowTable(true);
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load bag transportation");
      setRows([]);
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  }

  function openCreate() {
    if (!showTable) {
      toastInfo("Please Get List first.");
      return;
    }
    setEditing(null);
    setFormModal({
      univExamReionalCenterId: form.univExamReionalCenterId,
      univExamcenterId: form.univExamcenterId,
      univExamBagId: form.univExamBagId,
      vehicleNumber: "",
      vehicleDetails: "",
      driverName: "",
      driverPhoneNumber: "",
      receiveDate: "",
      dispatchDate: "",
      isActive: true,
      reason: "active",
    });
    setModalOpen(true);
  }

  function onEdit(row: Row) {
    setEditing(row);
    setFormModal({
      univExamReionalCenterId: String(
        num(row.univExamReionalCenterId ?? row.univExamRegionalCenterId) ||
          Number(form.univExamReionalCenterId),
      ),
      univExamcenterId: String(
        centerIdOf(row) || Number(form.univExamcenterId),
      ),
      univExamBagId: String(bagIdOf(row) || Number(form.univExamBagId)),
      vehicleNumber: txt(row.vehicleNumber),
      vehicleDetails: txt(row.vehicleDetails),
      driverName: txt(row.driverName),
      driverPhoneNumber: txt(row.driverPhoneNumber),
      receiveDate: txt(row.receiveDate)?.slice(0, 10),
      dispatchDate: txt(row.dispatchDate)?.slice(0, 10),
      isActive: row.isActive !== false,
      reason: txt(row.reason) || "active",
    });
    setModalOpen(true);
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (
      !formModal.univExamReionalCenterId ||
      !formModal.univExamcenterId ||
      !formModal.univExamBagId
    ) {
      toastError("Select Exam Regional Center, Exam Center and Exam Bags.");
      return;
    }
    if (!formModal.vehicleNumber.trim()) {
      toastError("Vehicle Number is required.");
      return;
    }
    if (!formModal.vehicleDetails.trim()) {
      toastError("Vehicle Details is required.");
      return;
    }
    if (!formModal.driverName.trim()) {
      toastError("Driver Name is required.");
      return;
    }
    if (!/^\d{10}$/.test(formModal.driverPhoneNumber.trim())) {
      toastError("Enter valid 10-digit driver phone number.");
      return;
    }
    if (!formModal.receiveDate) {
      toastError("Receive Date is required.");
      return;
    }
    if (!formModal.dispatchDate) {
      toastError("Dispatch Date is required.");
      return;
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError("Reason is required when inactive.");
      return;
    }

    const bagId = Number(formModal.univExamBagId);
    // Angular submit also sets univExamBagsId from the filter bag id
    const payload: Record<string, unknown> = {
      univExamReionalCenterId: Number(formModal.univExamReionalCenterId),
      univExamcenterId: Number(formModal.univExamcenterId),
      univExamBagId: bagId,
      univExamBagsId: bagId,
      vehicleNumber: formModal.vehicleNumber.trim(),
      vehicleDetails: formModal.vehicleDetails.trim(),
      driverName: formModal.driverName.trim(),
      driverPhoneNumber: formModal.driverPhoneNumber.trim(),
      receiveDate: formModal.receiveDate,
      dispatchDate: formModal.dispatchDate,
      isActive: formModal.isActive,
      reason: formModal.isActive ? "active" : formModal.reason.trim(),
    };

    setSaving(true);
    try {
      const id = pickUnivExamBagTransportationId(editing ?? {});
      if (id > 0) {
        await updateExamBagTransportation(id, {
          ...payload,
          univExamBagTransportationId: id,
        });
        toastSuccess("Bag transportation updated.");
      } else {
        await createExamBagTransportation(payload);
        toastSuccess("Bag transportation created.");
      }
      setModalOpen(false);
      await onGetList();
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo(
    (): ColDef<Row>[] => [
      { headerName: "SL No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Vehicle Number",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.vehicleNumber),
      },
      {
        headerName: "Vehicle Details",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.vehicleDetails),
      },
      {
        headerName: "Driver Name",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.driverName),
      },
      {
        headerName: "Driver Phone Number",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.driverPhoneNumber),
      },
      {
        headerName: "Receive Date",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.receiveDate),
      },
      {
        headerName: "Dispatch Date",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.dispatchDate),
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 72,
        width: 72,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-700"
              onClick={() => onEdit(p.data!)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  // Angular disables Regional / Center / Bag on Add (prefilled from filters)
  const filtersLocked = !editing;

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Exam Regional Center *">
        <Select
          options={regionalCenters.map((r) => ({
            value: String(regionalIdOf(r)),
            label: regionalCodeOf(r),
          }))}
          value={form.univExamReionalCenterId || null}
          onChange={(v) => {
            setShowTable(false);
            setRows([]);
            setForm((f) => ({ ...f, univExamReionalCenterId: v ?? "" }));
          }}
          disabled={loadingFilters}
          placeholder="Exam Regional Center"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Center *">
        <Select
          options={centers.map((r) => ({
            value: String(centerIdOf(r)),
            label: txt(r.examcenterCode ?? r.examCenterCode),
          }))}
          value={form.univExamcenterId || null}
          onChange={(v) => {
            setShowTable(false);
            setRows([]);
            setForm((f) => ({ ...f, univExamcenterId: v ?? "" }));
          }}
          placeholder="Exam Center"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Bags *">
        <Select
          options={bags.map((r) => ({
            value: String(bagIdOf(r)),
            label: txt(r.bagSerialNo),
          }))}
          value={form.univExamBagId || null}
          onChange={(v) => {
            setShowTable(false);
            setRows([]);
            setForm((f) => ({ ...f, univExamBagId: v ?? "" }));
          }}
          placeholder="Exam Bags"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField
        label=""
        className="global-filter-field--shrink global-filter-field--action"
      >
        <Button
          type="button"
          onClick={() => void onGetList()}
          disabled={loadingList}
          className="h-[30px] px-3 text-[12px]"
        >
          Get List
        </Button>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  return (
    <FilteredPage title="Exam Bag Transportation" filters={filters}>
      {showTable && (
        <DataTable
          title={`Exam Bag Transportation - ${headerText}`}
          rowData={rows}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          bordered
          toolbar={SEARCH_ONLY_TOOLBAR}
          toolbarTrailing={
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Bag Transportation
            </Button>
          }
          getRowId={(p) =>
            String(
              pickUnivExamBagTransportationId(p.data ?? {}) ||
                txt(p.data?.vehicleNumber) ||
                "row",
            )
          }
        />
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? "Edit Exam Bag Transportation"
            : "Add Exam Bag Transportation"
        }
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Exam Regional Center *</Label>
            <Select
              options={regionalCenters.map((r) => ({
                value: String(regionalIdOf(r)),
                label: regionalCodeOf(r),
              }))}
              value={formModal.univExamReionalCenterId || null}
              onChange={(v) =>
                setFormModal((f) => ({
                  ...f,
                  univExamReionalCenterId: v ?? "",
                }))
              }
              disabled={filtersLocked}
              placeholder="Exam Regional Center"
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Center *</Label>
            <Select
              options={centers.map((r) => ({
                value: String(centerIdOf(r)),
                label: txt(r.examcenterCode ?? r.examCenterCode),
              }))}
              value={formModal.univExamcenterId || null}
              onChange={(v) =>
                setFormModal((f) => ({ ...f, univExamcenterId: v ?? "" }))
              }
              disabled={filtersLocked}
              placeholder="Exam Center"
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Bags *</Label>
            <Select
              options={bags.map((r) => ({
                value: String(bagIdOf(r)),
                label: txt(r.bagSerialNo),
              }))}
              value={formModal.univExamBagId || null}
              onChange={(v) =>
                setFormModal((f) => ({ ...f, univExamBagId: v ?? "" }))
              }
              disabled={filtersLocked}
              placeholder="Exam Bags"
            />
          </div>

          <div className="space-y-1">
            <Label>Vehicle Number *</Label>
            <Input
              value={formModal.vehicleNumber}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, vehicleNumber: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Vehicle Details *</Label>
            <Input
              value={formModal.vehicleDetails}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, vehicleDetails: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Driver Name *</Label>
            <Input
              value={formModal.driverName}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, driverName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Driver Phone Number *</Label>
            <Input
              value={formModal.driverPhoneNumber}
              onChange={(e) =>
                setFormModal((f) => ({
                  ...f,
                  driverPhoneNumber: e.target.value,
                }))
              }
              maxLength={10}
            />
          </div>
          <DatePicker
            label="receiveDate"
            required
            value={toDate(formModal.receiveDate)}
            onChange={(d) =>
              setFormModal((f) => ({ ...f, receiveDate: fromDate(d) }))
            }
            placeholder="receiveDate"
            displayFormat="dd/MM/yyyy"
          />
          <DatePicker
            label="dispatchDate"
            required
            value={toDate(formModal.dispatchDate)}
            onChange={(d) =>
              setFormModal((f) => ({ ...f, dispatchDate: fromDate(d) }))
            }
            placeholder="dispatchDate"
            displayFormat="dd/MM/yyyy"
          />
        </div>

        <ActiveStatusField
          isActive={formModal.isActive}
          reason={formModal.reason}
          onActiveChange={(v) =>
            setFormModal((f) => ({ ...f, isActive: v === true }))
          }
          onReasonChange={(v) => setFormModal((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </FilteredPage>
  );
}
