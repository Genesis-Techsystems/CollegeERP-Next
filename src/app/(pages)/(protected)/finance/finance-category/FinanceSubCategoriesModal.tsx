"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/common/components/table";
import { toastError, toastSuccess } from "@/lib/toast";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  listFinSubCategoriesByCategory,
  saveFinMasterSubCategories,
} from "@/services";
import type { FinCategory, FinSubCategory } from "@/types/finance";

type DraftRow = Partial<FinSubCategory> & {
  _key: string;
  subCategoryName: string;
  isActive: boolean;
};

interface Props {
  open: boolean;
  category: FinCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

function makeKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function FinanceSubCategoriesModal({
  open,
  category,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [deletedRows, setDeletedRows] = useState<DraftRow[]>([]);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [subCategoryDescription, setSubCategoryDescription] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const finCategoryId = category?.finCategoryId ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: QK.finSubCategories.byCategory(finCategoryId),
    queryFn: () => listFinSubCategoriesByCategory(finCategoryId),
    enabled: open && finCategoryId > 0,
  });

  useEffect(() => {
    if (!open) return;
    setDeletedRows([]);
    setSubCategoryName("");
    setSubCategoryDescription("");
    setEditKey(null);
    setNameError("");
    setRows(
      (data ?? []).map((r, i) => ({
        ...r,
        _key: String(r.finSubCategoryId ?? `loaded-${i}`),
        subCategoryName: r.subCategoryName ?? "",
        subCategoryDescription: r.subCategoryDescription ?? "",
        isActive: r.isActive ?? true,
        isUnderIncome: r.isUnderIncome ?? false,
        collegeId: r.collegeId ?? category?.collegeId,
        finCategoryId: r.finCategoryId ?? finCategoryId,
      })),
    );
  }, [open, data, category?.collegeId, finCategoryId]);

  function resetForm() {
    setSubCategoryName("");
    setSubCategoryDescription("");
    setEditKey(null);
    setNameError("");
  }

  function onAddOrUpdate() {
    const name = subCategoryName.trim();
    if (!name) {
      setNameError("Sub category is required");
      return;
    }
    setNameError("");

    if (editKey == null) {
      const duplicate = rows.some(
        (r) =>
          r.subCategoryName.trim().toLowerCase() === name.toLowerCase() &&
          (r.isUnderIncome ?? false) === false,
      );
      if (duplicate) {
        toastError(new Error("Already Details exists with same name."), "Info");
        return;
      }
      setRows((prev) => [
        ...prev,
        {
          _key: makeKey("new"),
          id: 0,
          subCategoryName: name,
          subCategoryDescription: subCategoryDescription.trim(),
          isActive: true,
          isUnderIncome: false,
          collegeId: category?.collegeId,
          finCategoryId,
        },
      ]);
    } else {
      setRows((prev) =>
        prev.map((row) =>
          row._key === editKey
            ? {
                ...row,
                subCategoryName: name,
                subCategoryDescription: subCategoryDescription.trim(),
              }
            : row,
        ),
      );
    }
    resetForm();
  }

  function onEditRow(row: DraftRow) {
    setEditKey(row._key);
    setSubCategoryName(row.subCategoryName ?? "");
    setSubCategoryDescription(row.subCategoryDescription ?? "");
    setNameError("");
  }

  function onDeleteRow(row: DraftRow) {
    setRows((prev) => prev.filter((r) => r._key !== row._key));
    setDeletedRows((prev) => [...prev, { ...row, isActive: false }]);
    if (editKey === row._key) resetForm();
  }

  async function onSave() {
    if (!category) return;
    const payload: DraftRow[] = [...rows, ...deletedRows];
    if (payload.length === 0) {
      toastError(
        new Error("Please add at least one sub category."),
        "Sub Category",
      );
      return;
    }
    payload[0] = {
      ...payload[0],
      accountTypeId: category.accountTypeId,
    };

    setSaving(true);
    try {
      await saveFinMasterSubCategories(payload);
      toastSuccess("Record(s) updated successfully!");
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, "Save sub categories failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<DraftRow>[]>(
    () => [
      {
        headerName: "Sl.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        field: "subCategoryName",
        headerName: "Sub Category",
        minWidth: 160,
        flex: 1.2,
      },
      {
        field: "subCategoryDescription",
        headerName: "Description",
        minWidth: 180,
        flex: 1.4,
      },
      {
        headerName: "Actions",
        width: 110,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<DraftRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-1 h-full">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEditRow(row)}
                aria-label="Edit sub category"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground text-xs">|</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDeleteRow(row)}
                aria-label="Delete sub category"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            Add / Edit Sub-Category
          </DialogTitle>
          <p className="text-sm font-medium text-slate-700">
            Category : {category?.categoryName ?? ""}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* items-start + reserved error slot so Add stays aligned when validation shows */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.6fr_auto] gap-x-3 gap-y-2 items-start">
            <div className="space-y-0.5">
              <Label className="text-xs">Sub Category *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Sub Category"
                value={subCategoryName}
                onChange={(e) => {
                  setSubCategoryName(e.target.value);
                  if (nameError) setNameError("");
                }}
              />
              <p
                className={`text-xs min-h-4 ${nameError ? "text-red-500" : "text-transparent"}`}
              >
                {nameError || "placeholder"}
              </p>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Description"
                value={subCategoryDescription}
                onChange={(e) => setSubCategoryDescription(e.target.value)}
              />
              <p className="text-xs min-h-4 text-transparent">placeholder</p>
            </div>
            <div className="pt-5">
              <Button
                type="button"
                className="h-8 w-full sm:w-auto"
                onClick={onAddOrUpdate}
              >
                {editKey == null ? "Add" : "Update"}
              </Button>
            </div>
          </div>

          <div className="app-card p-0 overflow-hidden">
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading}
              getRowId={(p) => String(p.data?._key ?? "")}
              toolbar={{
                search: false,
                columnPicker: false,
                exportExcel: false,
                exportPdf: false,
              }}
              pagination={false}
              height="280px"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
