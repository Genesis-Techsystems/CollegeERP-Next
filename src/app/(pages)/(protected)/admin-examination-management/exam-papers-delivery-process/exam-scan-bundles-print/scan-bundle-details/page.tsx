"use client";

/**
 * Scan Bundle Details (scan / assign answer papers).
 *
 * Faithful React port of Angular `scan-bundle-details-new`. Reached from the
 * Exam Scan Bundles Print page via "Bundle Details". Shows the OMRs already
 * scanned into the bundle, lets the operator scan more answer-paper barcodes
 * (resolved via searchByExamOmrSerialNo), and bulk-assigns them to the bundle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { ScanLine } from "lucide-react";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getExamScanBundleStickers,
  searchExamOmrSerialNo,
  saveScanBundleDetails,
  updateExamScanBundleDetail,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

const PRINT_ROUTE =
  "/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const txt = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

interface SelectedOmr {
  omrSerialNo: string;
  examStdDetId: number;
  hallticketNumber: string;
  ecSeatNo: string;
}

export default function ScanBundleDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => ({
      academicYearId: Number(searchParams?.get("academicYearId") ?? 0),
      examGroupId: Number(searchParams?.get("examGroupId") ?? 0),
      examCenterId: Number(searchParams?.get("examCenterId") ?? 0),
      examDate: searchParams?.get("examDate") ?? "",
      questionPaperCode: searchParams?.get("questionPaperCode") ?? "",
      examGroupCode: searchParams?.get("examGroupCode") ?? "",
      examCenterCode: searchParams?.get("examCenterCode") ?? "",
      scanBundleId: Number(searchParams?.get("scanBundleId") ?? 0),
      scanBundleName: searchParams?.get("scanBundleName") ?? "",
      bundleNumber: Number(searchParams?.get("bundleNumber") ?? 0),
      scannerProfileDetailId: Number(
        searchParams?.get("scannerProfileDetailId") ?? 0,
      ),
    }),
    [searchParams],
  );

  const [scanned, setScanned] = useState<Row[]>([]);
  const [selected, setSelected] = useState<SelectedOmr[]>([]);
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const lastQueryRef = useRef("");

  // Edit existing scanned row (Angular editDialog → updateDetails)
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ isActive: true, reason: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const dataDetails = useMemo(
    () =>
      [
        params.examGroupCode,
        params.examCenterCode,
        params.examDate,
        params.questionPaperCode,
        params.scanBundleName,
      ]
        .filter(Boolean)
        .join(" / "),
    [params],
  );

  const loadScanned = useCallback(async () => {
    if (!params.scanBundleId) return;
    setBusy(true);
    try {
      const rows = await getExamScanBundleStickers({
        univExamcenterId: params.examCenterId,
        examGroupId: params.examGroupId,
        academicYearId: params.academicYearId,
        examDate: params.examDate,
        questionPaperCode: params.questionPaperCode,
        scanBundleId: params.scanBundleId,
        bundleNumber: params.bundleNumber,
      });
      setScanned(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toastError(e, "Failed to load scanned answer papers");
    } finally {
      setBusy(false);
    }
  }, [params]);

  useEffect(() => {
    // No bundle context → bounce back (Angular ngOnInit guard).
    if (!params.scanBundleId) {
      router.replace(PRINT_ROUTE);
      return;
    }
    void loadScanned();
  }, [params.scanBundleId, loadScanned, router]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Angular enteredOmr: on input > 3 chars, search and add the exact match.
  async function handleBarcode(value: string) {
    setBarcode(value);
    if (value.length <= 3) return;
    if (value === lastQueryRef.current) return;
    lastQueryRef.current = value;
    const rows = await searchExamOmrSerialNo(value).catch(() => []);
    const exact = rows.filter((r) => txt(r.omrSerialNo) === value);
    if (exact.length === 0) return;
    for (const r of exact) {
      const omr = txt(r.omrSerialNo);
      const dupSelected = selected.some((s) => s.omrSerialNo === omr);
      const dupScanned = scanned.some((s) => txt(s.omr_serial_no) === omr);
      if (dupSelected || dupScanned) {
        toast.info(`OMR Serial No ${omr} already exists`);
        continue;
      }
      const examStdDetId = num(r.examStdDetId);
      setSelected((prev) => {
        const exists = prev.some(
          (s) => s.omrSerialNo === omr && s.examStdDetId === examStdDetId,
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            omrSerialNo: omr,
            examStdDetId,
            hallticketNumber: txt(r.hallticketNumber),
            ecSeatNo: txt(r.ecSeatNo),
          },
        ];
      });
    }
    setBarcode("");
    lastQueryRef.current = "";
    barcodeRef.current?.focus();
  }

  function deleteSelectedByKey(omrSerialNo: string, examStdDetId: number) {
    setSelected((prev) =>
      prev.filter(
        (row) =>
          !(
            row.omrSerialNo === omrSerialNo && row.examStdDetId === examStdDetId
          ),
      ),
    );
  }

  async function assignScanBundles() {
    if (selected.length === 0) {
      toast.info("No Answer Papers Scanned…!");
      return;
    }
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    const rows = selected.map((s) => ({
      univExamScanbundleId: params.scanBundleId,
      examStdDetId: s.examStdDetId,
      omrSerialNo: s.omrSerialNo,
      ecSeatNo: s.ecSeatNo,
      scannerProfileDetailId: params.scannerProfileDetailId || null,
      isActive: true,
      createdUser: empId,
    }));
    setSaving(true);
    try {
      await saveScanBundleDetails(rows);
      toastSuccess("Answer papers assigned to bundle.");
      setSelected([]);
      await loadScanned();
    } catch (e) {
      toastError(e, "Failed to assign answer papers");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row: Row) {
    setEditRow(row);
    setEditForm({
      isActive: row.isActive == null ? true : row.isActive === true,
      reason: txt(row.reason),
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    const id = num(
      editRow.pk_univ_exam_scan_bundle_detail_id ??
        editRow.univExamScanbundleDetId,
    );
    if (!id) {
      toastError("Missing scan bundle detail id.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateExamScanBundleDetail(id, {
        univExamScanbundleDetId: id,
        isActive: editForm.isActive,
        reason: editForm.reason || null,
        omrSerialNo: txt(editRow.omr_serial_no),
        examStdDetId: num(editRow.fk_exam_std_det_id),
      });
      toastSuccess("Scan bundle detail updated.");
      setEditOpen(false);
      await loadScanned();
    } catch (e) {
      toastError(e, "Failed to update scan bundle detail");
    } finally {
      setSavingEdit(false);
    }
  }

  function goBack() {
    const qp = new URLSearchParams({
      academicYearId: String(params.academicYearId),
      examGroupId: String(params.examGroupId),
      examCenterId: String(params.examCenterId),
      examDate: params.examDate,
      questionPaperCode: params.questionPaperCode,
    });
    router.push(`${PRINT_ROUTE}?${qp.toString()}`);
  }

  const selectedColumnDefs = useMemo<ColDef<SelectedOmr>[]>(
    () => [
      { headerName: "SL No.", valueGetter: rowIndexGetter, width: 78, flex: 0 },
      {
        headerName: "Ec Seat No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.ecSeatNo),
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.omrSerialNo),
      },
      {
        headerName: "Hall Ticket No.",
        minWidth: 170,
        valueGetter: (p) => txt(p.data?.hallticketNumber),
      },
      {
        headerName: "Actions",
        width: 90,
        minWidth: 90,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<SelectedOmr>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <button
              type="button"
              className="text-red-600 hover:underline text-[12px]"
              onClick={() =>
                deleteSelectedByKey(txt(row.omrSerialNo), num(row.examStdDetId))
              }
            >
              Delete
            </button>
          );
        },
      },
    ],
    [],
  );

  const scannedColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Bundle No",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.bundle_number),
      },
      {
        headerName: "OMR Serial No",
        minWidth: 170,
        valueGetter: (p) => txt(p.data?.omr_serial_no),
      },
      {
        headerName: "Student",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.ec_seatno),
      },
      {
        headerName: "Actions",
        minWidth: 90,
        width: 90,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          return (
            <button
              type="button"
              className="text-[hsl(var(--primary))] hover:underline text-[12px]"
              onClick={() => openEdit(p.data as Row)}
            >
              Edit
            </button>
          );
        },
      },
    ],
    [],
  );

  return (
    <PageContainer className="space-y-4">
      <div className="flex justify-between">
        <div className="flex items-center justify-between mb-4 rounded bg-[#edf0f3] px-2 p-1.5 text-[15px]">
          <strong className="font-medium text-primary">
            Exam Scan Bundle Details {dataDetails && `— ${dataDetails}`}
          </strong>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-6"
          onClick={goBack}
        >
          Back
        </Button>
      </div>

      {/* Barcode scan + to-assign list */}
      <div className="app-card space-y-3 border-2 border-[#80a7eb]">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-blue-700" aria-hidden />
          <div className="relative flex-1 max-w-xl">
            <Input
              ref={barcodeRef}
              autoFocus
              className="h-9 pl-3 text-[13px]"
              placeholder="Scan barcode here – input always focused"
              value={barcode}
              onChange={(e) => void handleBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </div>
        </div>

        <div className="overflow-auto">
          <DataTable
            title=""
            subtitle=""
            rowData={selected}
            columnDefs={selectedColumnDefs}
            toolbar={{
              search: true,
              searchPlaceholder: "Search...",
              pdfDocumentTitle: "Exam Scan Bundle Details",
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            className="h-8 px-6"
            disabled={saving || selected.length === 0}
            onClick={() => void assignScanBundles()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Already-scanned answer papers */}
      <div className="app-card overflow-hidden">
        <div className="p-2 overflow-auto">
          <DataTable
            title=""
            subtitle=""
            rowData={scanned}
            columnDefs={scannedColumnDefs}
            loading={busy}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: "Search...",
              pdfDocumentTitle: "Exam Scan Bundle Details",
            }}
          />
        </div>
      </div>

      {/* Edit scanned detail */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Scan Bundle Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div className="text-muted-foreground">
              OMR: {txt(editRow?.omr_serial_no)} · Seat:{" "}
              {txt(editRow?.ec_seatno)}
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={editForm.isActive}
                onCheckedChange={(v) =>
                  setEditForm((s) => ({ ...s, isActive: v === true }))
                }
              />
              Active
            </label>
            {!editForm.isActive && (
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input
                  className="h-8 text-[12px]"
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, reason: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
