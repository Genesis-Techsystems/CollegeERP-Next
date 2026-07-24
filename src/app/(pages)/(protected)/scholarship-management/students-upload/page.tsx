"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DATE_FORMATS } from "@/config/constants/app";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  createSchStdPreceedings,
  listSchStgStdPreceedings,
  uploadStdPreceedings,
} from "@/services";

type StagingRow = Record<string, unknown> & {
  applicantNo?: string;
  studentName?: string;
  courseAndYear?: string;
  releasedFromDt?: string;
  releasedToDt?: string;
  months?: number | string;
  tutionFee?: number;
  splFee?: number;
  otherFee?: number;
  rtfAmount?: number;
  color?: string;
  isValidate?: boolean;
  balanceAmount?: number;
  applicationDTO?: Record<string, unknown>;
  schStgStdPreceedingId?: number;
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

function isEmptyObject(obj: unknown): boolean {
  return !obj || (typeof obj === "object" && Object.keys(obj as object).length === 0);
}

function studentNameRenderer(p: ICellRendererParams<StagingRow>) {
  const row = p.data;
  if (!row) return null;
  const roll = String(row.applicationDTO?.rollNumber ?? "");
  return (
    <span>
      {String(row.studentName ?? "—")}
      {roll ? (
        <span className="text-blue-700"> ({roll})</span>
      ) : null}
    </span>
  );
}

function dateFieldRenderer(field: "releasedFromDt" | "releasedToDt") {
  return (p: ICellRendererParams<StagingRow>) => formatDt(p.data?.[field]);
}

function makeTutionRenderer(onChange: (row: StagingRow, value: number) => void) {
  return (p: ICellRendererParams<StagingRow>) => {
    const row = p.data;
    if (!row) return null;
    if (!row.isValidate) {
      return (
        <span style={{ background: row.color || "transparent" }}>
          {String(row.tutionFee ?? "")}
        </span>
      );
    }
    return (
      <Input
        type="number"
        className="h-7 w-full"
        style={{ background: row.color || "#ffa0a0" }}
        value={Number(row.tutionFee ?? 0)}
        onChange={(e) => onChange(row, Number(e.target.value))}
      />
    );
  };
}

export default function ScholarshipStudentsUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const preceedingNo = searchParams.get("preceedingNo") ?? "";
  const preceedingTitle = searchParams.get("preceedingTitle") ?? "";
  const preceedingDate = searchParams.get("preceedingDate") ?? "";
  const collegeCode = searchParams.get("collegeCode") ?? "";
  const academicYear = searchParams.get("academicYear") ?? "";
  const schPreceedingId = Number(searchParams.get("schPreceedingId") ?? 0);

  const [excelRowCount, setExcelRowCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localRows, setLocalRows] = useState<StagingRow[] | null>(null);

  const {
    data: staging = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["SchStgStdPreceeding", "list", preceedingNo],
    queryFn: () => listSchStgStdPreceedings(preceedingNo),
    enabled: Boolean(preceedingNo),
  });

  const preStaggings = useMemo(() => {
    if (localRows) return localRows;
    const mapped: StagingRow[] = [];
    for (const raw of staging) {
      const row: StagingRow = { ...raw };
      const app = (row.applicationDTO ?? {}) as Record<string, unknown>;
      const balance = Number(app.balanceAmount ?? 0);
      const tution = Number(row.tutionFee ?? 0);
      row.balanceAmount = balance;
      row.color = "transparent";
      row.isValidate = false;
      if (balance > 0 && balance <= tution) {
        row.color = "#ffa0a0";
        row.isValidate = true;
      }
      if (!collegeCode || String(app.collegeCode ?? "") === collegeCode) {
        mapped.push(row);
      }
    }
    return mapped;
  }, [staging, collegeCode, localRows]);

  const handleTutionChange = useCallback((row: StagingRow, value: number) => {
    setLocalRows((prev) => {
      const base = prev ?? preStaggings;
      return base.map((r) => {
        if (r !== row && r.schStgStdPreceedingId !== row.schStgStdPreceedingId) {
          return r;
        }
        const next = { ...r, tutionFee: value, rtfAmount: value };
        const balance = Number(next.balanceAmount ?? 0);
        if (balance <= value) {
          next.color = "transparent";
        }
        return next;
      });
    });
  }, [preStaggings]);

  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setExcelRowCount(0);
      return;
    }
    void import("xlsx").then((XLSX) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const bstr = e.target?.result;
          if (typeof bstr !== "string" && !(bstr instanceof ArrayBuffer)) {
            setExcelRowCount(0);
            return;
          }
          const wb = XLSX.read(bstr, {
            type: bstr instanceof ArrayBuffer ? "array" : "binary",
          });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
          let size = 0;
          for (const row of data) {
            if (Array.isArray(row) && row.length > 0) size += 1;
          }
          setExcelRowCount(Math.max(0, size - 1));
        } catch {
          setExcelRowCount(0);
        }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  const handleUpload = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toastInfo("Please choose a file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file, file.name);
    setUploading(true);
    try {
      await uploadStdPreceedings(formData);
      toastSuccess("File uploaded.");
      setLocalRows(null);
      await refetch();
    } catch (err) {
      toastError(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [refetch]);

  const handleSave = useCallback(async () => {
    const rows = [...preStaggings];
    let flag = false;
    for (const row of rows) {
      const app = row.applicationDTO;
      if (!isEmptyObject(app) && app) {
        row.collegeId = app.collegeId;
        row.academicYearId = app.academicYearId;
        row.studentId = app.studentId;
        row.schStdApplicationId = app.schStdApplicationId;
        row.courseYearId = app.courseYearId;
        row.schPreceedingId = schPreceedingId;
        row.releaseFromDt = row.releasedFromDt
          ? new Date(String(row.releasedFromDt)).toISOString()
          : null;
        row.releaseToDt = row.releasedToDt
          ? new Date(String(row.releasedToDt)).toISOString()
          : null;
        row.isAmountSettled = 0;
        row.color = "transparent";
        row.isValidate = false;
        const balance = Number(app.balanceAmount ?? 0);
        const tution = Number(row.tutionFee ?? 0);
        if (balance > 0 && balance < tution) {
          flag = true;
          row.color = "#ffa0a0";
          row.isValidate = true;
        }
        row.schStgStdPreceeding = [
          {
            schStgStdPreceedingId: row.schStgStdPreceedingId,
            collegeName: row.collegeName,
            preceedingNo: row.preceedingNo,
            sno: row.sno,
            applicantNo: row.applicantNo,
            studentName: row.studentName,
            courseAndYear: row.courseAndYear,
            months: row.months,
            tutionFee: row.tutionFee,
            splFee: row.splFee,
            otherFee: row.otherFee,
            rtfAmount: row.rtfAmount,
            createdDt: row.createdDt,
            balanceAmount: row.balanceAmount,
            releasedFromDt: row.releasedFromDt,
            releasedToDt: row.releasedToDt,
          },
        ];
      }
    }

    if (flag) {
      setLocalRows(rows);
      toastInfo("Preceeding amount is exceeded than scholarship amount.");
      return;
    }

    setSaving(true);
    try {
      await createSchStdPreceedings(rows);
      toastSuccess("Student preceedings saved.");
      await queryClient.invalidateQueries({ queryKey: ["SchPreceeding"] });
      router.push("/scholarship-management/preceeding-details");
    } catch (err) {
      toastError(err, "Failed to save student preceedings");
    } finally {
      setSaving(false);
    }
  }, [preStaggings, schPreceedingId, queryClient, router]);

  const columnDefs = useMemo<ColDef<StagingRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      { field: "applicantNo", headerName: "Applicant No", minWidth: 120 },
      {
        field: "studentName",
        headerName: "Student Name",
        minWidth: 180,
        cellRenderer: studentNameRenderer,
      },
      { field: "courseAndYear", headerName: "Course", minWidth: 140 },
      {
        field: "releasedFromDt",
        headerName: "Released From Dt.",
        minWidth: 130,
        cellRenderer: dateFieldRenderer("releasedFromDt"),
      },
      {
        field: "releasedToDt",
        headerName: "Released To Dt.",
        minWidth: 130,
        cellRenderer: dateFieldRenderer("releasedToDt"),
      },
      { field: "months", headerName: "Months", minWidth: 90 },
      {
        field: "tutionFee",
        headerName: "Tution Fee",
        minWidth: 110,
        cellRenderer: makeTutionRenderer(handleTutionChange),
      },
      { field: "splFee", headerName: "Spl. Fee", minWidth: 90 },
      { field: "otherFee", headerName: "Other Fee", minWidth: 90 },
      { field: "rtfAmount", headerName: "RTF Amt", minWidth: 90 },
    ],
    [handleTutionChange],
  );

  return (
    <FilteredListPage
      title="Upload Students to Preceeding"
      filters={
        <div className="space-y-3">
          <div className="space-y-1.5 rounded-md border p-3 text-sm">
            <p>
              <span className="text-muted-foreground">College : </span>
              <span className="font-medium text-blue-700">
                {collegeCode}
                {academicYear ? ` (${academicYear})` : ""}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Preceeding Title : </span>
              <span className="font-medium text-blue-700">
                {preceedingTitle || "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Preceeding No. : </span>
              <span className="font-medium text-blue-700">
                {preceedingNo || "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Preceeding Date : </span>
              <span className="font-medium text-blue-700">
                {formatDt(preceedingDate)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Upload Students :</p>
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="max-w-xs"
                onChange={onFileChange}
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {excelRowCount > 0 ? (
              <p className="text-sm text-destructive">
                Total number of students listed in xsl sheet are {excelRowCount}.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-4 w-8 border border-border"
              style={{ background: "#ffa0a0" }}
            />
            <span>TF amount is exceeded.</span>
          </div>
        </div>
      }
      rowData={preStaggings}
      columnDefs={columnDefs}
      loading={isLoading || isFetching}
      pagination
      toolbar={{ search: true, searchPlaceholder: "Search" }}
      toolbarTrailing={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/scholarship-management/preceeding-details")}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || preStaggings.length === 0}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
      getRowId={(p) =>
        String(
          p.data?.schStgStdPreceedingId ??
            `${p.data?.applicantNo ?? ""}-${p.data?.sno ?? ""}`,
        )
      }
    />
  );
}
