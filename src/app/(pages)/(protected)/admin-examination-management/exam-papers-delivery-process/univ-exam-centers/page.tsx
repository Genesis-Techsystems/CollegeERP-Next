"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createUnivExamCenter,
  listActiveCities,
  listActiveUnivExamRegionalCentersByUniversity,
  listUnivExamCentersByUniversity,
  listUnivExamRegionalCentersByUniversity,
  pickUnivExamCenterId,
  pickUnivExamRegionalCenterId,
  updateUnivExamCenter,
  type AnyRow,
} from "@/services/exam-papers-delivery";
import { listActiveUniversities } from "@/services/admin/university";

type CenterRow = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickUniversityId(u: AnyRow): number {
  return num(u.universityId ?? u.university_id ?? u.fk_university_id);
}

function pickUniversityLabel(u: AnyRow): string {
  return String(
    u.universityCode ??
      u.university_code ??
      u.university_name ??
      u.universityName ??
      "-",
  );
}

function pickRegionalCenterId(row: CenterRow): number {
  const nested =
    row.univExamRegionalCenter ??
    row.univExamReionalCenter ??
    row.UnivExamRegionalCenter;
  if (nested && typeof nested === "object") {
    return num(
      (nested as AnyRow).univExamReionalCenterId ??
        (nested as AnyRow).univExamRegionalCenterId ??
        (nested as AnyRow).univ_exam_reional_center_id,
    );
  }
  return num(
    row.univExamReionalCenterId ??
      row.univExamRegionalCenterId ??
      row.univ_exam_reional_center_id,
  );
}

function pickRegionalCenterCode(row: CenterRow): string {
  const nested =
    row.univExamRegionalCenter ??
    row.univExamReionalCenter ??
    row.UnivExamRegionalCenter;
  if (nested && typeof nested === "object") {
    return String(
      (nested as AnyRow).examReionalCenterCode ??
        (nested as AnyRow).examRegionalCenterCode ??
        "-",
    );
  }
  return String(
    row.examReionalCenterCode ??
      row.examRegionalCenterCode ??
      row.exam_reional_center_code ??
      "-",
  );
}

function pickCityCode(row: CenterRow): string {
  const nested = row.city ?? row.City;
  if (nested && typeof nested === "object") {
    return String(
      (nested as AnyRow).cityCode ?? (nested as AnyRow).city_code ?? "-",
    );
  }
  return String(row.cityCode ?? row.city_code ?? "-");
}

function pickCityId(row: CenterRow): number {
  const nested = row.city ?? row.City;
  if (nested && typeof nested === "object") {
    return num(
      (nested as AnyRow).cityId ??
        (nested as AnyRow).city_id ??
        (nested as AnyRow).id,
    );
  }
  return num(row.cityId ?? row.city_id ?? row.fk_city_id);
}

function pickCode(row: CenterRow): string {
  return String(
    row.examcenterCode ?? row.examCenterCode ?? row.exam_center_code ?? "",
  );
}

function statusRenderer(p: ICellRendererParams<CenterRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

function makeEditRenderer(onEdit: (row: CenterRow) => void) {
  return (p: ICellRendererParams<CenterRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-700"
        aria-label="Edit"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    );
  };
}

export default function UnivExamCentersPage() {
  const [loadingUni, setLoadingUni] = useState(true);
  const [universities, setUniversities] = useState<AnyRow[]>([]);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<CenterRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CenterRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [cities, setCities] = useState<AnyRow[]>([]);
  /** Active-only — Angular Add modal dropdown. */
  const [regionalCenters, setRegionalCenters] = useState<AnyRow[]>([]);
  /** All regionals — resolve codes on the grid when the center list omits them. */
  const [regionalCentersAll, setRegionalCentersAll] = useState<AnyRow[]>([]);
  const [allExamCenters, setAllExamCenters] = useState<AnyRow[]>([]);

  const [form, setForm] = useState({
    univExamReionalCenterId: "" as string,
    examcenterName: "",
    examcenterCode: "",
    longitude: "",
    latitude: "",
    addressLine1: "",
    addressLine2: "",
    cityId: "" as string,
    pincode: "",
    qpScanningCenterId: "" as string,
    isQpScanningCenter: false,
    isActive: true,
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<{ cityId?: string }>({});

  const universityOptions: SelectOption[] = useMemo(
    () =>
      universities.map((u) => ({
        value: String(pickUniversityId(u)),
        label: pickUniversityLabel(u),
      })),
    [universities],
  );

  const cityOptions: SelectOption[] = useMemo(
    () =>
      cities.map((c) => ({
        value: String(num(c.cityId ?? c.city_id)),
        label: String(
          c.cityCode ?? c.city_code ?? c.cityName ?? c.city_name ?? "-",
        ),
      })),
    [cities],
  );

  const regionalCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of regionalCentersAll) {
      const id = pickUnivExamRegionalCenterId(r);
      if (id <= 0) continue;
      const code = String(
        r.examReionalCenterCode ?? r.examRegionalCenterCode ?? "",
      ).trim();
      if (code) map.set(id, code);
    }
    return map;
  }, [regionalCentersAll]);

  const regionalCenterOptions: SelectOption[] = useMemo(
    () =>
      regionalCenters.map((r) => ({
        value: String(pickUnivExamRegionalCenterId(r)),
        label: String(
          r.examReionalCenterCode ?? r.examRegionalCenterCode ?? "-",
        ),
      })),
    [regionalCenters],
  );

  const qpScanningCenterOptions: SelectOption[] = useMemo(
    () =>
      // Angular: exam centers filtered to isQpScanningCenter === true
      allExamCenters
        .filter((c) => Boolean(c.isQpScanningCenter))
        .map((c) => ({
          value: String(
            num(
              c.univExamcenterId ?? c.univExamCenterId ?? c.univ_examcenter_id,
            ),
          ),
          label: String(c.examcenterCode ?? c.examCenterCode ?? "-"),
        })),
    [allExamCenters],
  );

  const selectedUniversityCode = useMemo(() => {
    const hit = universities.find((u) => pickUniversityId(u) === universityId);
    return hit ? pickUniversityLabel(hit) : "";
  }, [universities, universityId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingUni(true);
      try {
        // Angular getData(): load all active universities, then auto-select the first.
        const list = await listActiveUniversities();
        if (cancelled) return;
        const arr = (Array.isArray(list) ? list : []) as unknown as AnyRow[];
        setUniversities(arr);
        if (arr.length > 0) setUniversityId(pickUniversityId(arr[0]));
      } catch (e) {
        toastError(e, "Failed to load universities");
        setUniversities([]);
      } finally {
        if (!cancelled) setLoadingUni(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        const list = await listActiveCities();
        if (!cancelled) setCities(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCities([]);
      }
    }
    void loadCities();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchList = useCallback(async () => {
    if (!universityId) {
      toastError("Please select a university.");
      return;
    }
    setLoadingList(true);
    try {
      const [centers, regionalsActive, regionalsAll] = await Promise.all([
        listUnivExamCentersByUniversity(universityId),
        // Angular Add modal: Universities.universityId=={id}.and.isActive==true
        listActiveUnivExamRegionalCentersByUniversity(universityId).catch(
          () => [],
        ),
        listUnivExamRegionalCentersByUniversity(universityId).catch(() => []),
      ]);
      setRows(Array.isArray(centers) ? centers : []);
      setAllExamCenters(Array.isArray(centers) ? centers : []);
      setRegionalCenters(Array.isArray(regionalsActive) ? regionalsActive : []);
      setRegionalCentersAll(Array.isArray(regionalsAll) ? regionalsAll : []);
    } catch (e) {
      toastError(e, "Failed to load exam centers");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [universityId]);

  useEffect(() => {
    if (!universityId) {
      setRows([]);
      setAllExamCenters([]);
      setRegionalCenters([]);
      setRegionalCentersAll([]);
      return;
    }
    void fetchList();
  }, [universityId, fetchList]);

  const handleEditRow = useCallback((row: CenterRow) => {
    setEditing(row);
    setFormErrors({});
    setForm({
      univExamReionalCenterId: String(pickRegionalCenterId(row) || ""),
      examcenterName: String(row.examcenterName ?? row.examCenterName ?? ""),
      examcenterCode: pickCode(row),
      longitude: String(row.longitude ?? ""),
      latitude: String(row.latitude ?? ""),
      addressLine1: String(row.addressLine1 ?? ""),
      addressLine2: String(row.addressLine2 ?? ""),
      cityId: String(pickCityId(row) || ""),
      pincode: String(row.pincode ?? ""),
      qpScanningCenterId: String(
        num(row.qpScanningCenterId ?? row.qp_scanning_center_id ?? 0) || "",
      ),
      isQpScanningCenter: Boolean(row.isQpScanningCenter),
      isActive: Boolean(row.isActive),
      reason: String(row.reason ?? ""),
    });
    setModalOpen(true);
  }, []);

  const columnDefs = useMemo<ColDef<CenterRow>[]>(
    () => [
      { headerName: "S.No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Exam Regional Center Code",
        minWidth: 190,
        valueGetter: (p) => {
          const row = p.data ?? {};
          const fromRow = pickRegionalCenterCode(row);
          if (fromRow && fromRow !== "-") return fromRow;
          const id = pickRegionalCenterId(row);
          return (id > 0 ? regionalCodeById.get(id) : undefined) ?? "-";
        },
      },
      {
        headerName: "Exam Center Code",
        minWidth: 150,
        valueGetter: (p) => pickCode(p.data ?? {}) || "-",
      },
      {
        field: "longitude",
        headerName: "Longitude",
        minWidth: 120,
        valueGetter: (p) => String(p.data?.longitude ?? "-"),
      },
      {
        field: "latitude",
        headerName: "Latitude",
        minWidth: 120,
        valueGetter: (p) => String(p.data?.latitude ?? "-"),
      },
      {
        field: "addressLine1",
        headerName: "Address Line1",
        minWidth: 170,
        valueGetter: (p) => String(p.data?.addressLine1 ?? "-"),
      },
      {
        field: "addressLine2",
        headerName: "Address Line2",
        minWidth: 170,
        valueGetter: (p) => String(p.data?.addressLine2 ?? "-"),
      },
      {
        headerName: "City",
        minWidth: 130,
        valueGetter: (p) => pickCityCode(p.data ?? {}),
      },
      {
        field: "pincode",
        headerName: "Pincode",
        minWidth: 110,
        valueGetter: (p) => String(p.data?.pincode ?? "-"),
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
        flex: 0,
        width: 72,
        cellRenderer: makeEditRenderer(handleEditRow),
      },
    ],
    [handleEditRow, regionalCodeById],
  );

  function openCreate() {
    if (!universityId) {
      toastError("Please select a university.");
      return;
    }
    setEditing(null);
    setFormErrors({});
    setForm({
      univExamReionalCenterId: regionalCenterOptions[0]?.value ?? "",
      examcenterName: "",
      examcenterCode: "",
      longitude: "",
      latitude: "",
      addressLine1: "",
      addressLine2: "",
      cityId: cityOptions[0]?.value ?? "",
      pincode: "",
      qpScanningCenterId: "",
      // Angular form default: isQpScanningCenter: [true]
      isQpScanningCenter: true,
      isActive: true,
      reason: "",
    });
    setModalOpen(true);
  }

  async function onSubmitModal(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!universityId) return;
    if (!form.univExamReionalCenterId) {
      toastError("Select exam regional center.");
      return;
    }
    if (!form.examcenterName.trim()) {
      toastError("Exam center name is required.");
      return;
    }
    const nextErrors: typeof formErrors = {};
    if (!form.cityId.trim()) nextErrors.cityId = "City is required.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!form.isActive && !form.reason.trim()) {
      toastError("Reason is required when inactive.");
      return;
    }

    // Angular create body uses null (not 0 / "") for empty optional fields.
    const emptyToNull = (v: string) => {
      const t = v.trim();
      return t === "" ? null : t;
    };
    const payload: Record<string, unknown> = {
      universityId,
      univExamReionalCenterId: Number(form.univExamReionalCenterId),
      examcenterName: form.examcenterName.trim(),
      examcenterCode: form.examcenterCode.trim() || null,
      longitude: emptyToNull(form.longitude),
      latitude: emptyToNull(form.latitude),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      cityId: Number(form.cityId),
      pincode: form.pincode.trim(),
      qpScanningCenterId: form.qpScanningCenterId
        ? Number(form.qpScanningCenterId)
        : null,
      isQpScanningCenter: form.isQpScanningCenter,
      isActive: form.isActive,
      reason: form.isActive ? null : form.reason.trim() || null,
    };

    setSaving(true);
    try {
      const id = pickUnivExamCenterId(editing ?? {});
      if (id > 0) {
        await updateUnivExamCenter(id, { ...payload, univExamcenterId: id });
        toastSuccess("Exam center updated.");
      } else {
        await createUnivExamCenter(payload);
        toastSuccess("Exam center created.");
      }
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredListPage
      title="Exam Centers"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-full sm:w-72">
            <Label>
              University <span className="text-destructive">*</span>
            </Label>
            <Select
              options={universityOptions}
              value={universityId === null ? "" : String(universityId)}
              onChange={(v) => setUniversityId(v ? Number(v) : null)}
              placeholder={loadingUni ? "Loading…" : "Select university"}
              disabled={loadingUni || universityOptions.length === 0}
            />
          </div>
          <Button
            type="button"
            onClick={() => void fetchList()}
            disabled={loadingList || universityId == null}
          >
            Get List
          </Button>
        </div>
      }
      rowData={universityId != null ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Exam Centers",
      }}
      toolbarLeading={
        universityId != null ? (
          <span className="text-[12px] font-medium text-[hsl(var(--primary))] truncate max-w-[min(100%,24rem)]">
            {selectedUniversityCode || "-"}
          </span>
        ) : null
      }
      toolbarTrailing={
        <Button
          type="button"
          className="h-[30px] px-3 text-[12px]"
          onClick={openCreate}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Exam Centers
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? `Edit exam center${selectedUniversityCode ? ` - ${selectedUniversityCode}` : ""}`
            : `Add exam center${selectedUniversityCode ? ` - ${selectedUniversityCode}` : ""}`
        }
        onSubmit={onSubmitModal}
        isSubmitting={saving}
        size="xl"
        showFooterDivider={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>
              Exam Regional Center <span className="text-destructive">*</span>
            </Label>
            <Select
              options={regionalCenterOptions}
              value={form.univExamReionalCenterId || null}
              onChange={(v) =>
                setForm((f) => ({ ...f, univExamReionalCenterId: v ?? "" }))
              }
              placeholder="Exam Regional Center"
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Center Name</Label>
            <Input
              value={form.examcenterName}
              onChange={(e) =>
                setForm((f) => ({ ...f, examcenterName: e.target.value }))
              }
              placeholder="Exam Center Name"
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Center Code</Label>
            <Input
              value={form.examcenterCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, examcenterCode: e.target.value }))
              }
              placeholder="Exam Center Code"
            />
          </div>
          <div className="space-y-1">
            <Label>Longitude</Label>
            <Input
              value={form.longitude}
              onChange={(e) =>
                setForm((f) => ({ ...f, longitude: e.target.value }))
              }
              placeholder="Longitude"
            />
          </div>
          <div className="space-y-1">
            <Label>Latitude</Label>
            <Input
              value={form.latitude}
              onChange={(e) =>
                setForm((f) => ({ ...f, latitude: e.target.value }))
              }
              placeholder="Latitude"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line1</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine1: e.target.value }))
              }
              placeholder="Address Line1"
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line2</Label>
            <Input
              value={form.addressLine2}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine2: e.target.value }))
              }
              placeholder="Address Line2"
            />
          </div>
          <FormField label="City" required error={formErrors.cityId}>
            <Select
              options={cityOptions}
              value={form.cityId || null}
              onChange={(v) => {
                setFormErrors((prev) => {
                  if (!prev.cityId) return prev;
                  const next = { ...prev };
                  delete next.cityId;
                  return next;
                });
                setForm((f) => ({ ...f, cityId: v ?? "" }));
              }}
              placeholder="City"
            />
          </FormField>
          <div className="space-y-1">
            <Label>Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pincode: e.target.value }))
              }
              placeholder="Pincode"
            />
          </div>
          <div className="space-y-1">
            <Label>Qp Scanning Center</Label>
            <Select
              options={qpScanningCenterOptions}
              value={form.qpScanningCenterId || null}
              onChange={(v) =>
                setForm((f) => ({ ...f, qpScanningCenterId: v ?? "" }))
              }
              placeholder="Select center"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={form.isQpScanningCenter}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isQpScanningCenter: v === true }))
                }
              />
              Is Qp Scanning Center
            </label>
          </div>
        </div>

        <ActiveStatusField
          isActive={form.isActive}
          reason={form.reason}
          onActiveChange={(v) =>
            setForm((f) => ({ ...f, isActive: v === true }))
          }
          onReasonChange={(v) => setForm((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </FilteredListPage>
  );
}
