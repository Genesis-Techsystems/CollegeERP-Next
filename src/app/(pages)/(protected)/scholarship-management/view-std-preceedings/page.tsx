"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Eye, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getSchPreceedingById,
  listFeeReceiptsByReference,
  printFeeReceiptById,
} from "@/services";
import type { FeeReceiptRow } from "@/types/fees-collection";

type StdRow = Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<StdRow>,
  rollNo: {
    headerName: "Roll No.",
    minWidth: 120,
    valueGetter: (p) => {
      const detail = (p.data?.studentDetailDTOs ??
        p.data?.studentDetailDto ??
        null) as Record<string, unknown> | null;
      return (
        (detail?.rollNumber as string | undefined) ??
        String(p.data?.rollNumber ?? "—")
      );
    },
  } as ColDef<StdRow>,
  firstName: {
    field: "firstName",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<StdRow>,
  course: {
    headerName: "Course",
    minWidth: 260,
    valueGetter: (p) =>
      [
        p.data?.collegeCode,
        p.data?.academicYear,
        p.data?.courseName,
        p.data?.groupCode,
        p.data?.courseYearName,
      ]
        .filter((x) => x != null && String(x).trim() !== "")
        .join(" / ") || "—",
  } as ColDef<StdRow>,
  releaseFrom: {
    field: "releaseFromDt",
    headerName: "Released From Dt.",
    minWidth: 130,
  } as ColDef<StdRow>,
  releaseTo: {
    field: "releaseToDt",
    headerName: "Released To Dt.",
    minWidth: 130,
  } as ColDef<StdRow>,
  tutionFee: {
    field: "tutionFee",
    headerName: "Tution Fee",
    minWidth: 110,
  } as ColDef<StdRow>,
  splFee: {
    field: "splFee",
    headerName: "Spl. Fee",
    minWidth: 100,
  } as ColDef<StdRow>,
  otherFee: {
    field: "otherFee",
    headerName: "Other Fee",
    minWidth: 100,
  } as ColDef<StdRow>,
  rtfAmount: {
    field: "rtfAmount",
    headerName: "RTF Amt",
    minWidth: 100,
  } as ColDef<StdRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 110,
  } as ColDef<StdRow>,
  receipt: {
    headerName: "Receipt",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<StdRow>,
};

function formatDt(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return raw;
  }
}

function dateRenderer(field: "releaseFromDt" | "releaseToDt") {
  return (p: ICellRendererParams<StdRow>) => formatDt(p.data?.[field]);
}

function rollNumberOf(row: StdRow): string {
  const detail = (row.studentDetailDTOs ??
    row.studentDetailDto ??
    null) as Record<string, unknown> | null;
  return String(detail?.rollNumber ?? row.rollNumber ?? "");
}

export default function ViewStdPreceedingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schPreceedingId = Number(searchParams.get("schPreceedingId") ?? 0);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState<StdRow | null>(null);
  const [receiptRows, setReceiptRows] = useState<FeeReceiptRow[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState("");

  const { data: detail, isLoading } = useQuery({
    queryKey: [...QK.schStdPreceedings.list(schPreceedingId), "header"],
    queryFn: () => getSchPreceedingById(schPreceedingId),
    enabled: schPreceedingId > 0,
  });

  const studentRows = useMemo(() => {
    const list = Array.isArray(detail?.stdPreceedings)
      ? detail.stdPreceedings
      : [];
    return list.map((r) => {
      const row = { ...r } as StdRow;
      const nested = (row.studentDetailDTOs ??
        row.studentDetailDto ??
        null) as Record<string, unknown> | null;
      if (nested?.rollNumber != null) {
        row.rollNumber = nested.rollNumber;
      }
      return row;
    });
  }, [detail]);

  const pay = useCallback((_row: StdRow) => {
    toastInfo("Scholarship Payment will be available in a follow-up.");
  }, []);

  const openReceipt = useCallback(
    async (row: StdRow) => {
      const preceedingNo = String(detail?.preceedingNo ?? "");
      const collegeId = Number(row.collegeId ?? 0);
      const studentId = Number(row.studentId ?? 0);
      if (!preceedingNo || !collegeId || !studentId) {
        toastInfo("Receipt lookup details missing.");
        return;
      }
      setReceiptHeader({
        ...row,
        preceedingNo,
        preceedingTitle: detail?.preceedingTitle,
      });
      setReceiptOpen(true);
      setReceiptLoading(true);
      setReceiptRows([]);
      setReceiptSearch("");
      try {
        const rows = await listFeeReceiptsByReference({
          referenceNo: preceedingNo,
          collegeId,
          studentId,
        });
        setReceiptRows(rows);
      } catch (e) {
        toastError(e, "Failed to load receipts");
      } finally {
        setReceiptLoading(false);
      }
    },
    [detail],
  );

  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return receiptRows;
    return receiptRows.filter((r) =>
      [
        r.classGroupName,
        r.feeReceiptsId,
        r.createdDt,
        r.referenceNumber,
        r.receiptAmount,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ")
        .includes(q),
    );
  }, [receiptRows, receiptSearch]);

  const columnDefs = useMemo<ColDef<StdRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNo,
      COL_DEFS.firstName,
      COL_DEFS.course,
      { ...COL_DEFS.releaseFrom, cellRenderer: dateRenderer("releaseFromDt") },
      { ...COL_DEFS.releaseTo, cellRenderer: dateRenderer("releaseToDt") },
      COL_DEFS.tutionFee,
      COL_DEFS.splFee,
      COL_DEFS.otherFee,
      COL_DEFS.rtfAmount,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<StdRow>) => {
          const settled = Boolean(p.data?.isAmountSettled);
          if (settled) {
            return (
              <span className="text-xs font-medium text-emerald-600">Paid</span>
            );
          }
          return (
            <Button
              type="button"
              size="sm"
              className="h-7 bg-[#00b8ff] px-2 text-[11px] text-white hover:bg-[#00a6e6]"
              onClick={() => p.data && pay(p.data)}
            >
              pay
            </Button>
          );
        },
      },
      {
        ...COL_DEFS.receipt,
        cellRenderer: (p: ICellRendererParams<StdRow>) => {
          const settled = Boolean(p.data?.isAmountSettled);
          if (!settled) return <span className="text-muted-foreground">--</span>;
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              title="View"
              onClick={() => p.data && void openReceipt(p.data)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [pay, openReceipt],
  );

  const headerLine = detail
    ? `${detail.collegeCode ?? "—"} (${detail.academicYear ?? "—"})`
    : "—";

  const showStudentTable = !isLoading && studentRows.length > 0;

  return (
    <>
      <FilteredPage
        title="Student Preceeding"
        filters={
          isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : detail ? (
            <div className="space-y-1.5 rounded-md border border-sky-200 p-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                <span className="text-foreground">College :</span>
                <span className="font-medium text-blue-700">{headerLine}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                <span className="text-foreground">Preceeding Title :</span>
                <span className="font-medium text-blue-700">
                  {detail.preceedingTitle ?? "—"}
                </span>
              </div>
              <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                <span className="text-foreground">Preceeding No. :</span>
                <span className="font-medium text-blue-700">
                  {detail.preceedingNo ?? "—"}
                </span>
              </div>
              <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                <span className="text-foreground">Preceeding Date :</span>
                <span className="font-medium text-blue-700">
                  {formatDt(detail.preceedingDate)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {schPreceedingId > 0
                ? "Proceeding not found."
                : "Missing schPreceedingId."}
            </p>
          )
        }
        body={
          <div className="space-y-4">
            {/* Angular: table only when stdPreceedings.length > 0 */}
            {showStudentTable ? (
              <DataTable<StdRow>
                rowData={studentRows}
                columnDefs={columnDefs}
                bordered={false}
                height="auto"
                pagination
                toolbar={{ search: true, searchPlaceholder: "Search" }}
                getRowId={(p) =>
                  String(
                    p.data?.schStdPreceedingId ?? p.data?.studentId ?? "",
                  )
                }
              />
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-9 min-w-[5.5rem] bg-[#f0c040] font-medium text-slate-900 hover:bg-[#e5b535]"
                onClick={() => router.back()}
              >
                Back
              </Button>
            </div>
          </div>
        }
        bodyClassName="border-t-0 pt-2"
      />

      <Dialog
        open={receiptOpen}
        onOpenChange={(v) => {
          if (!v) setReceiptOpen(false);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl"
          closeOnOutsideClick={false}
          hasDescription
        >
          <DialogHeader className="shrink-0 border-b border-border pb-3">
            <DialogTitle>View Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Fee receipts for selected student proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
            {receiptHeader ? (
              <div className="space-y-1.5 rounded-md border p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">College : </span>
                  <span className="font-medium text-blue-700">
                    {[receiptHeader.collegeCode, receiptHeader.academicYear]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding Title :{" "}
                  </span>
                  <span className="font-medium text-blue-700">
                    {String(receiptHeader.preceedingTitle ?? "—")} (
                    {String(receiptHeader.preceedingNo ?? "—")})
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Student : </span>
                  <span className="font-medium text-blue-700">
                    {String(receiptHeader.firstName ?? "—")} (
                    {rollNumberOf(receiptHeader) || "—"})
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Course : </span>
                  <span className="font-medium text-blue-700">
                    {[
                      receiptHeader.courseName,
                      receiptHeader.groupCode,
                      receiptHeader.courseYearName,
                      receiptHeader.section
                        ? `section ${receiptHeader.section}`
                        : "",
                    ]
                      .filter((x) => x != null && String(x).trim() !== "")
                      .join(" / ") || "—"}
                  </span>
                </p>
              </div>
            ) : null}

            <input
              className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Search"
              value={receiptSearch}
              onChange={(e) => setReceiptSearch(e.target.value)}
            />

            {receiptLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-auto rounded-md border">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-2 py-2">SI.No</th>
                      <th className="px-2 py-2">Fee Structure</th>
                      <th className="px-2 py-2">Fee Receipt</th>
                      <th className="px-2 py-2">Payment Date</th>
                      <th className="px-2 py-2">Reference No.</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-2 py-3 text-muted-foreground"
                        >
                          No receipts found.
                        </td>
                      </tr>
                    ) : (
                      filteredReceipts.map((r, i) => (
                        <tr
                          key={String(r.feeReceiptsId ?? i)}
                          className="border-b border-muted/40"
                        >
                          <td className="px-2 py-1.5 text-center">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            {String(r.classGroupName ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.feeReceiptsId ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDt(r.createdDt)}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.referenceNumber ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.receiptAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              title="Print Receipt"
                              onClick={() => {
                                const id = Number(r.feeReceiptsId ?? 0);
                                if (!id) return;
                                void printFeeReceiptById(id).catch((e) =>
                                  toastError(e, "Failed to print receipt"),
                                );
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-[5.5rem]"
              onClick={() => setReceiptOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
