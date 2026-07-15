"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getExamCenterProfilesReportCenters,
  getExamCenterProfilesReportList,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

/** Angular hardcoded roles list */
const ROLES = [
  { roleId: 64, roleName: "Evaluator" },
  { roleId: 67, roleName: "Moderator" },
  { roleId: 70, roleName: "QuestionPapersetter" },
  { roleId: 96, roleName: "External Evaluator" },
  { roleId: 97, roleName: "Internal Evaluator" },
] as const;

const EXPORT_COLS = [
  { key: "si", header: "SI.No" },
  { key: "examcenter", header: "Exam Center" },
  { key: "role", header: "Role" },
  { key: "evaluator", header: "Evaluator Name" },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function centerId(row: AnyRow): number {
  return num(row.univExamcenterId ?? row.univ_examcenter_id);
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    examcenter: txt(row.examcenterCode ?? row.examcenter_code),
    role: txt(row.profileRoleName ?? row.profile_role_name),
    evaluator: txt(
      row.examEvaluatorProfilesName ?? row.exam_evaluator_profiles_name,
    ),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Center Profiles Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Exam Center Profiles Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

export default function ExamcenterProfilesReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [centers, setCenters] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [univExamCentersId, setUnivExamCentersId] = useState("");
  const [profileRoleId, setProfileRoleId] = useState("");

  const selectedCenter = useMemo(
    () => centers.find((c) => centerId(c) === Number(univExamCentersId)),
    [centers, univExamCentersId],
  );
  const selectedRole = useMemo(
    () => ROLES.find((r) => r.roleId === Number(profileRoleId)),
    [profileRoleId],
  );

  const reportSubtitle = useMemo(() => {
    return [
      txt(selectedCenter?.examcenterCode ?? selectedCenter?.examcenter_code),
      selectedRole?.roleName ?? "",
    ]
      .filter(Boolean)
      .join(" / ");
  }, [selectedCenter, selectedRole]);

  useEffect(() => {
    async function loadCenters() {
      setLoadingFilters(true);
      try {
        const list = await getExamCenterProfilesReportCenters();
        setCenters(list);
        if (list.length > 0) {
          setUnivExamCentersId(String(centerId(list[0])));
        }
      } catch (e) {
        toastError(e, "Failed to load exam centers");
        setCenters([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadCenters();
  }, []);

  async function onGetList() {
    if (!univExamCentersId || !profileRoleId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamCenterProfilesReportList({
        univExamcenterId: Number(univExamCentersId),
        profileRoleId: Number(profileRoleId),
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Exam Center Profiles Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Center Profiles Report - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Exam Center",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data?.examcenterCode ?? p.data?.examcenter_code),
      },
      {
        headerName: "Role",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data?.profileRoleName ?? p.data?.profile_role_name),
      },
      {
        headerName: "Evaluator Name",
        minWidth: 200,
        valueGetter: (p) =>
          txt(
            p.data?.examEvaluatorProfilesName ??
              p.data?.exam_evaluator_profiles_name,
          ),
      },
    ],
    [],
  );

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Exam Centers *">
        <Select
          value={univExamCentersId || undefined}
          onChange={(v) => {
            setUnivExamCentersId(v ?? "");
            setRows([]);
          }}
          isLoading={loadingFilters}
          options={centers.map((c) => ({
            value: String(centerId(c)),
            label: txt(c.examcenterCode ?? c.examcenter_code ?? c.ec_code),
          }))}
          placeholder="Exam Centers"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Select Role">
        <Select
          value={profileRoleId || undefined}
          onChange={(v) => {
            setProfileRoleId(v ?? "");
            setRows([]);
          }}
          options={ROLES.map((r) => ({
            value: String(r.roleId),
            label: r.roleName,
          }))}
          placeholder="Select Role"
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
    <FilteredListPage
      title={
        rows.length > 0
          ? `Exam Center Profiles Report - ${reportSubtitle}`
          : "Exam Center Profiles Report"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, reportSubtitle)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
