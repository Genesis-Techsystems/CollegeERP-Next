"use client";

import { useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  importEmployeeBulkFile,
  processEmployeeBulkStagingRows,
  type EmployeeBulkRow,
} from "@/services";

const EMP_COLS: ColDef<EmployeeBulkRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  { field: "firstName", headerName: "Employee", minWidth: 150, flex: 1.1 },
  {
    headerName: "Department",
    minWidth: 220,
    flex: 1.3,
    valueGetter: (p) =>
      [p.data?.college, p.data?.department].filter(Boolean).join(" / "),
  },
  { field: "designation", headerName: "Designation", minWidth: 140, flex: 1 },
  { field: "dateOfBirth", headerName: "D.O.B", minWidth: 120, flex: 0.9 },
  { field: "dateOfJoin", headerName: "D.O.J", minWidth: 120, flex: 0.9 },
  { field: "email", headerName: "Email", minWidth: 180, flex: 1.3 },
  { field: "mobileNumber", headerName: "Mobile", minWidth: 120, flex: 0.9 },
  {
    field: "qualification",
    headerName: "Qualification",
    minWidth: 130,
    flex: 1,
  },
];

export default function EmployeeUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<EmployeeBulkRow[]>([]);
  const [notSavedRows, setNotSavedRows] = useState<EmployeeBulkRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xlsxCount, setXlsxCount] = useState(0);
  const [showTable, setShowTable] = useState(false);

  function clearSelectedFile() {
    setSelectedFile(null);
    setXlsxCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file) {
      setXlsxCount(0);
      return;
    }
    const text = await file.text().catch(() => "");
    setXlsxCount(Math.max(0, text.split("\n").length - 1));
  }

  async function onUpload() {
    const file = selectedFile;
    if (!file) {
      toastError(new Error("Please choose a file."), "Employee Bulk Upload");
      return;
    }
    setUploading(true);
    setShowTable(true);
    try {
      const list = await importEmployeeBulkFile(file);
      setRows(Array.isArray(list) ? list : []);
      setNotSavedRows([]);
      toastSuccess("Employee file uploaded successfully");
    } catch (err) {
      toastError(err, "Employee upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await processEmployeeBulkStagingRows();
      setNotSavedRows(
        Array.isArray(res.notSavedRecords) ? res.notSavedRecords : [],
      );
      setRows([]);
      clearSelectedFile();
      toastSuccess(res.message || "Saved successfully");
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);
  const hasNotSaved = useMemo(
    () => notSavedRows.length > 0,
    [notSavedRows.length],
  );

  return (
    <FilteredListPage
      title="Employee Bulk Upload"
      filters={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="employee-bulk-file"
              className="text-sm font-medium text-slate-700 shrink-0"
            >
              Upload Employees :
            </label>
            <input
              id="employee-bulk-file"
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => void handleFileChange(e)}
              className="w-fit max-w-full text-sm bg-transparent border-0 p-0 shadow-none outline-none
                file:mr-2 file:cursor-pointer
                file:rounded-sm file:border file:border-slate-400
                file:bg-gradient-to-b file:from-[#f0f0f0] file:to-[#e3e3e3]
                file:px-3 file:py-1 file:text-sm file:font-normal file:text-slate-800
                file:shadow-none"
            />
            <Button
              type="button"
              onClick={() => void onUpload()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <Button asChild variant="outline">
              <a
                href="/assets/docs/University_Level_Employee_Bulk_Upload.xlsx"
                download
              >
                Download Sample XLSX
              </a>
            </Button>
          </div>

          {xlsxCount > 0 ? (
            <p className="text-xs text-red-600">
              Total number of employees listed in xlsx sheet are {xlsxCount}.
            </p>
          ) : null}
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={EMP_COLS}
      loading={uploading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search employees…",
        columnPicker: false,
        exportPdf: false,
      }}
    >
      {hasRows && (
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
      {hasNotSaved && (
        <DataTable
          title="UnSaved List"
          subtitle=""
          bordered
          rowData={notSavedRows}
          columnDefs={EMP_COLS}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Search unsaved…",
            columnPicker: false,
            exportPdf: false,
          }}
        />
      )}
    </FilteredListPage>
  );
}
