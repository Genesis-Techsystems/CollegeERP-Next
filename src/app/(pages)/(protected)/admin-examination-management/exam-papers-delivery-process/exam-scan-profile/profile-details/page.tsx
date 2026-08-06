"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listExamScanProfileDetails,
  listScanProfileExamGroups,
  listScanProfileRoles,
  pickUnivEcProfileId,
  popScanProfileEmployees,
  saveExamScanProfileDetails,
  type AnyRow,
} from "@/services/exam-papers-delivery";

const BACK =
  "/admin-examination-management/exam-papers-delivery-process/exam-scan-profile";
const SCAN_PROFILE_CONTEXT_KEY = "examScanProfileContext";

type Row = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return txt(value);
  }
  return "";
}

function pickName(row: Row | null): string {
  if (!row) return "";
  return pickText(row, [
    "scanProfileName",
    "scan_profile_name",
    "name",
    "fullName",
    "profileName",
    "evaluatorName",
  ]);
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

function makeEditRenderer(onEdit: (row: Row, index: number) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data;
    if (!row) return null;
    const index = p.node?.rowIndex ?? 0;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-700"
        onClick={() => onEdit(row, index)}
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    );
  };
}

function readCachedProfile(): Row | null {
  try {
    const raw = globalThis?.localStorage?.getItem(SCAN_PROFILE_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Row;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function ExamScanProfileDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileIdFromQuery = num(searchParams.get("examScanProfileId") ?? 0);

  const [profile, setProfile] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [examGroups, setExamGroups] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);

  const [examGroupId, setExamGroupId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  const profileId = useMemo(() => {
    const fromProfile = profile ? pickUnivEcProfileId(profile) : 0;
    return fromProfile > 0 ? fromProfile : profileIdFromQuery;
  }, [profile, profileIdFromQuery]);

  const profileName = pickName(profile);
  const dialogTitle =
    rows.length > 0 ? "Edit Scan Profile Details" : "Add Scan Profile Details";
  const pageTitle = profileName
    ? `${dialogTitle} - ${profileName}`
    : dialogTitle;

  // Angular crumb leaf: Edit/Add Scan Profile Details
  useBreadcrumbLabel(dialogTitle);

  const examGroupOptions = useMemo<SelectOption[]>(
    () =>
      examGroups
        .map((g) => ({
          value: String(
            num(
              g.fk_univ_exam_group_id ??
                g.univExamGroupId ??
                g.examGroupId ??
                g.pk_univ_exam_group_id,
            ),
          ),
          label:
            pickText(g, [
              "exam_group_name",
              "examGroupName",
              "univExamGroupName",
              "group_name",
            ]) || `Group ${num(g.fk_univ_exam_group_id ?? g.univExamGroupId)}`,
        }))
        .filter((o) => Number(o.value) > 0),
    [examGroups],
  );

  const roleOptions = useMemo<SelectOption[]>(
    () =>
      roles
        .map((r) => ({
          value: String(num(r.pk_role_id ?? r.roleId ?? r.evaluatorRoleId)),
          label:
            pickText(r, ["role_name", "roleName"]) ||
            `Role ${num(r.pk_role_id ?? r.roleId)}`,
        }))
        .filter((o) => Number(o.value) > 0),
    [roles],
  );

  const loadDetails = useCallback(async (id: number) => {
    if (!id) return;
    try {
      const list = await listExamScanProfileDetails(id);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e, "Failed to load scan profile details");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const cached = readCachedProfile();
    const cachedId = cached ? pickUnivEcProfileId(cached) : 0;
    const id = profileIdFromQuery > 0 ? profileIdFromQuery : cachedId;

    if (id <= 0) {
      router.replace(BACK);
      return;
    }

    if (cached && (cachedId === id || cachedId === 0)) {
      setProfile(cached);
    } else {
      setProfile({ examScanProfileId: id });
    }

    let mounted = true;
    void (async () => {
      setLoading(true);
      try {
        const [groups, roleList] = await Promise.all([
          listScanProfileExamGroups().catch(() => []),
          listScanProfileRoles().catch(() => []),
          loadDetails(id),
        ]);
        if (!mounted) return;
        setExamGroups(Array.isArray(groups) ? groups : []);
        setRoles(Array.isArray(roleList) ? roleList : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profileIdFromQuery, router, loadDetails]);

  function resetForm() {
    setExamGroupId("");
    setRoleId("");
    setIsActive(true);
    setIsEditMode(false);
    setEditIndex(-1);
  }

  const onEdit = useCallback((row: Row, index: number) => {
    setIsEditMode(true);
    setEditIndex(index);
    setExamGroupId(
      String(
        num(
          row.univExamGroupId ?? row.examGroupId ?? row.fk_univ_exam_group_id,
        ),
      ),
    );
    setRoleId(String(num(row.roleId ?? row.evaluatorRoleId ?? row.pk_role_id)));
    setIsActive(row.isActive !== false);
  }, []);

  async function onAdd() {
    if (!profileId) return;
    if (!examGroupId || !roleId) {
      toastError("Please select exam group and role.");
      return;
    }

    const payloadObj: Record<string, unknown> = {
      examScanProfileId: profileId,
      univExamGroupId: Number(examGroupId),
      roleId: Number(roleId),
      isActive,
      createdUser:
        Number(globalThis?.localStorage?.getItem("employeeId") ?? 0) || null,
    };

    if (isEditMode && editIndex >= 0) {
      const existingId = num(rows[editIndex]?.examScanProfileDetailId);
      if (existingId > 0) payloadObj.examScanProfileDetailId = existingId;
    }

    setSaving(true);
    try {
      await saveExamScanProfileDetails([payloadObj]);
      await loadDetails(profileId);
      void popScanProfileEmployees(profileId);
      resetForm();
      toastSuccess("Saved successfully");
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        headerName: "Exam",
        minWidth: 220,
        valueGetter: (p) =>
          pickText(p.data ?? {}, [
            "examGroupName",
            "exam_group_name",
            "examName",
            "exam_name",
          ]),
      },
      {
        headerName: "Role",
        minWidth: 160,
        valueGetter: (p) =>
          pickText(p.data ?? {}, [
            "roleName",
            "role_name",
            "evaluatorRoleName",
          ]),
      },
      {
        headerName: "Status",
        minWidth: 110,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 90,
        width: 90,
        flex: 0,
        cellRenderer: makeEditRenderer(onEdit),
      },
    ],
    [onEdit],
  );

  if (profileIdFromQuery <= 0 && !profile) {
    return null;
  }

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[200px] w-full sm:w-56">
            <Label>Exam Group</Label>
            <Select
              options={examGroupOptions}
              value={examGroupId}
              onChange={(v) => setExamGroupId(v ?? "")}
              placeholder="Exam Group"
              isLoading={loading}
            />
          </div>
          <div className="space-y-1 min-w-[200px] w-full sm:w-56">
            <Label>Select Role</Label>
            <Select
              options={roleOptions}
              value={roleId}
              onChange={(v) => setRoleId(v ?? "")}
              placeholder="Select Role"
              isLoading={loading}
            />
          </div>
          <div className="flex items-center gap-2 pb-2 min-w-[120px]">
            <input
              id="scanProfileDetailIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="scanProfileDetailIsActive">Is Active</Label>
          </div>
          <Button
            type="button"
            className="h-[30px] px-4 text-[12px]"
            disabled={saving || loading}
            onClick={() => void onAdd()}
          >
            {isEditMode ? "Update" : "Add"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-[30px] px-4 text-[12px] bg-white"
            onClick={() => router.push(BACK)}
          >
            Back
          </Button>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading || saving}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: pageTitle,
      }}
    />
  );
}
