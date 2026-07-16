"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  UNIV_FEE_CATEGORY_DETAIL_IDS,
  createUnivFeeStructureDetails,
  getGeneralDetails,
  getUnivFeeStructureContext,
  listCasteQuotas,
  listColleges,
  listUnivFeeStructureDetails,
  setUnivFeeStructureContext,
  updateUnivFeeStructureDetails,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";
import type {
  UnivFeeStructureDetailRow,
  UnivFeeStructureRow,
} from "@/types/fee-structure";
import type { College } from "@/types/college";

type Mode = "university" | "college";

type DetailForm = {
  collegeId: number | null;
  quotaId: number | null;
  feeCategoryId: number | null;
  feeAmount: number;
  lateFeeAmount: number;
  lastDayOfPayment: Date | null;
  lastDayOfLatePayment: Date | null;
  isActive: boolean;
  reason: string;
};

const emptyForm = (): DetailForm => ({
  collegeId: null,
  quotaId: null,
  feeCategoryId: null,
  feeAmount: 0,
  lateFeeAmount: 0,
  lastDayOfPayment: new Date(),
  lastDayOfLatePayment: new Date(),
  isActive: true,
  reason: "",
});

function toDatePayload(d: Date | null): string | undefined {
  if (!d) return undefined;
  return format(d, "yyyy-MM-dd");
}

function parseMaybeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

const UNI_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<UnivFeeStructureDetailRow>,
  casteQuota: {
    field: "casteQuota",
    headerName: "Caste Quota",
    minWidth: 120,
  } as ColDef<UnivFeeStructureDetailRow>,
  categoryName: {
    headerName: "Fee Category",
    minWidth: 140,
    valueGetter: (p) =>
      p.data?.feeCategoryCatDetCode ?? p.data?.categoryName ?? "",
  } as ColDef<UnivFeeStructureDetailRow>,
  feestructureName: {
    field: "feestructureName",
    headerName: "Fee Structure Name",
    minWidth: 160,
    flex: 1,
  } as ColDef<UnivFeeStructureDetailRow>,
  feeAmount: {
    field: "feeAmount",
    headerName: "Fee Amount",
    minWidth: 110,
  } as ColDef<UnivFeeStructureDetailRow>,
  lateFeeAmount: {
    field: "lateFeeAmount",
    headerName: "Late Fee Amount",
    minWidth: 120,
  } as ColDef<UnivFeeStructureDetailRow>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<UnivFeeStructureDetailRow>,
};

const CLG_COL_DEFS = {
  ...UNI_COL_DEFS,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
  } as ColDef<UnivFeeStructureDetailRow>,
};

function makeEditRenderer(onEdit: (row: UnivFeeStructureDetailRow) => void) {
  return (p: ICellRendererParams<UnivFeeStructureDetailRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit fee structure detail"
      onClick={() => p.data && onEdit(p.data)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function UniversityFeeStructureDetailsPage() {
  const router = useRouter();
  const [context, setContext] = useState<UnivFeeStructureRow | null>(null);
  const [mode, setMode] = useState<Mode>("university");
  const [form, setForm] = useState<DetailForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [allDetails, setAllDetails] = useState<UnivFeeStructureDetailRow[]>([]);
  const [quotas, setQuotas] = useState<{ value: string; label: string }[]>([]);
  const [univFeeCategories, setUnivFeeCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [clgFeeCategories, setClgFeeCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [colleges, setColleges] = useState<{ value: string; label: string }[]>(
    [],
  );

  const contextLabel = useMemo(() => {
    if (!context) return "";
    return [
      context.universityCode,
      context.courseCode,
      context.courseGroupCode,
      context.academicYear,
      context.feeStructureName,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [context]);

  const univRows = useMemo(
    () => allDetails.filter((r) => r.collegeId == null),
    [allDetails],
  );
  const clgRows = useMemo(
    () => allDetails.filter((r) => r.collegeId != null),
    [allDetails],
  );

  const feeCategoryOptions =
    mode === "university" ? univFeeCategories : clgFeeCategories;

  const loadDetails = useCallback(async (univFeeStructureId: number) => {
    setLoading(true);
    try {
      const rows = await listUnivFeeStructureDetails(univFeeStructureId);
      setAllDetails(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setAllDetails([]);
      toastError(err, "Failed to load fee structure details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctx = getUnivFeeStructureContext();
    if (!ctx?.univFeeStructureId) {
      router.replace("/accounts-and-fees/fee-masters/university-fee-structure");
      return;
    }
    setContext(ctx);
    void loadDetails(ctx.univFeeStructureId);

    async function loadLookups() {
      try {
        const [quotaRows, categoryRows, collegeRows] = await Promise.all([
          listCasteQuotas(),
          getGeneralDetails(GM_CODES.UNIVERSITY_FEE_CATEGORY),
          listColleges(),
        ]);
        setQuotas(
          (quotaRows ?? [])
            .filter((q) => q.isActive !== false)
            .map((q) => ({
              value: String(q.casteQuotaId),
              label: q.casteQuota ?? q.caste ?? String(q.casteQuotaId),
            })),
        );
        const cats = categoryRows ?? [];
        setUnivFeeCategories(
          cats
            .filter(
              (c) =>
                Number(c.generalDetailId) ===
                UNIV_FEE_CATEGORY_DETAIL_IDS.REGISTRATION,
            )
            .map((c) => ({
              value: String(c.generalDetailId),
              label:
                c.generalDetailCode ??
                c.generalDetailName ??
                String(c.generalDetailId),
            })),
        );
        setClgFeeCategories(
          cats
            .filter(
              (c) =>
                Number(c.generalDetailId) ===
                UNIV_FEE_CATEGORY_DETAIL_IDS.COLLEGE,
            )
            .map((c) => ({
              value: String(c.generalDetailId),
              label:
                c.generalDetailCode ??
                c.generalDetailName ??
                String(c.generalDetailId),
            })),
        );
        setColleges(
          (collegeRows as College[])
            .filter((c) => c.isActive !== false)
            .map((c) => ({
              value: String(c.collegeId),
              label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
            })),
        );
      } catch (err) {
        toastError(err, "Failed to load lookup data");
      }
    }
    void loadLookups();
  }, [router, loadDetails]);

  function clearForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function onModeChange(next: Mode) {
    setMode(next);
    clearForm();
  }

  function onEdit(row: UnivFeeStructureDetailRow) {
    setEditingId(row.univFeeStructureDetId ?? null);
    setMode(row.collegeId != null ? "college" : "university");
    setForm({
      collegeId: row.collegeId ?? null,
      quotaId: row.casteQuotaId ?? null,
      feeCategoryId: row.feeCategoryCatDetId ?? null,
      feeAmount: Number(row.feeAmount ?? 0),
      lateFeeAmount: Number(row.lateFeeAmount ?? 0),
      lastDayOfPayment: parseMaybeDate(row.lastDayOfPayment) ?? new Date(),
      lastDayOfLatePayment:
        parseMaybeDate(row.lastDayOfLatePayment) ?? new Date(),
      isActive: row.isActive ?? true,
      reason: row.reason ?? "",
    });
  }

  async function onSave() {
    if (!context?.univFeeStructureId) return;
    if (!form.quotaId || !form.feeCategoryId) {
      toast.error("Quota and Fee Category are required");
      return;
    }
    if (mode === "college" && !form.collegeId) {
      toast.error("College is required");
      return;
    }

    const payload = {
      univFeeStructureId: context.univFeeStructureId,
      casteQuotaId: form.quotaId,
      feeCategoryCatDetId: form.feeCategoryId,
      feeAmount: Number(form.feeAmount) || 0,
      lateFeeAmount: Number(form.lateFeeAmount) || 0,
      lastDayOfPayment: toDatePayload(form.lastDayOfPayment),
      lastDayOfLatePayment: toDatePayload(form.lastDayOfLatePayment),
      isActive: form.isActive,
      reason: form.isActive
        ? form.reason.trim() || "active"
        : form.reason.trim(),
      collegeId: mode === "college" ? form.collegeId : null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateUnivFeeStructureDetails(editingId, {
          ...payload,
          univFeeStructureDetId: editingId,
        });
        toastSuccess("Fee structure detail updated");
      } else {
        await createUnivFeeStructureDetails(payload);
        toastSuccess("Fee structure detail saved");
      }
      clearForm();
      await loadDetails(context.univFeeStructureId);
    } catch (err) {
      toastError(
        err,
        `Failed to ${editingId ? "update" : "save"} fee structure detail`,
      );
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (context) setUnivFeeStructureContext(context);
    router.push("/accounts-and-fees/fee-masters/university-fee-structure");
  }

  const uniColumnDefs = useMemo<ColDef<UnivFeeStructureDetailRow>[]>(
    () => [
      UNI_COL_DEFS.siNo,
      UNI_COL_DEFS.casteQuota,
      UNI_COL_DEFS.categoryName,
      UNI_COL_DEFS.feestructureName,
      UNI_COL_DEFS.feeAmount,
      UNI_COL_DEFS.lateFeeAmount,
      { ...UNI_COL_DEFS.actions, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  );

  const clgColumnDefs = useMemo<ColDef<UnivFeeStructureDetailRow>[]>(
    () => [
      CLG_COL_DEFS.siNo,
      CLG_COL_DEFS.college,
      CLG_COL_DEFS.casteQuota,
      CLG_COL_DEFS.categoryName,
      CLG_COL_DEFS.feestructureName,
      CLG_COL_DEFS.feeAmount,
      CLG_COL_DEFS.lateFeeAmount,
      { ...CLG_COL_DEFS.actions, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  );

  if (!context) return null;

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="University Fee Structure Details" />

      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as Mode)}
        className="flex flex-wrap gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="university" id="ufs-univ" />
          <Label htmlFor="ufs-univ">
            University Wise Fee Structure Details
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="college" id="ufs-clg" />
          <Label htmlFor="ufs-clg">College Wise Fee Structure Details</Label>
        </div>
      </RadioGroup>

      <div className="app-card space-y-4 p-4">
        <h2 className="text-sm font-semibold">
          {mode === "university"
            ? `Add University Fee Structure Details — ${contextLabel}`
            : `Add College Fee Structure Details — ${contextLabel}`}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mode === "college" && (
            <div className="space-y-1.5">
              <Label>College</Label>
              <Select
                value={form.collegeId ? String(form.collegeId) : null}
                onChange={(v) =>
                  setForm((f) => ({ ...f, collegeId: v ? Number(v) : null }))
                }
                options={colleges}
                placeholder="Select college"
                searchable
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Quota</Label>
            <Select
              value={form.quotaId ? String(form.quotaId) : null}
              onChange={(v) =>
                setForm((f) => ({ ...f, quotaId: v ? Number(v) : null }))
              }
              options={quotas}
              placeholder="Select quota"
              searchable
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fee Category</Label>
            <Select
              value={form.feeCategoryId ? String(form.feeCategoryId) : null}
              onChange={(v) =>
                setForm((f) => ({ ...f, feeCategoryId: v ? Number(v) : null }))
              }
              options={feeCategoryOptions}
              placeholder="Select fee category"
              searchable
            />
          </div>
          <div className="space-y-1.5">
            <DatePicker
              label="Last Day Of Payment"
              value={form.lastDayOfPayment}
              onChange={(d) => setForm((f) => ({ ...f, lastDayOfPayment: d }))}
            />
          </div>
          <div className="space-y-1.5">
            <DatePicker
              label="Last Day Of Late Payment"
              value={form.lastDayOfLatePayment}
              onChange={(d) =>
                setForm((f) => ({ ...f, lastDayOfLatePayment: d }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feeAmount">Fee Amount</Label>
            <Input
              id="feeAmount"
              type="number"
              value={form.feeAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  feeAmount: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
            <Input
              id="lateFeeAmount"
              type="number"
              value={form.lateFeeAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  lateFeeAmount: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <ActiveStatusField
              isActive={form.isActive}
              reason={form.reason}
              onActiveChange={(v) =>
                setForm((f) => ({ ...f, isActive: v === true }))
              }
              onReasonChange={(v) =>
                setForm((f) => ({ ...f, reason: String(v) }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editingId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearForm}
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {editingId ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      {mode === "university" && univRows.length > 0 && (
        <DataTable
          title="University Fee Structure Details"
          bordered
          rowData={univRows}
          columnDefs={uniColumnDefs}
          loading={loading}
          pagination
          toolbar={{ search: true, searchPlaceholder: "Search…" }}
        />
      )}

      {mode === "college" && clgRows.length > 0 && (
        <DataTable
          title="College Fee Structure Details"
          bordered
          rowData={clgRows}
          columnDefs={clgColumnDefs}
          loading={loading}
          pagination
          toolbar={{ search: true, searchPlaceholder: "Search…" }}
        />
      )}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={goBack}>
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>
    </PageContainer>
  );
}
