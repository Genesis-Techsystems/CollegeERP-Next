"use client";

/**
 * Class & Student Wise PTM Report —
 * Angular `class-student-wise-ptm-report` parity:
 * student select loads list immediately (no Get List / Back).
 */

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { Eye, FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MeetingOverviewModal } from "@/app/(pages)/(protected)/mentorship/_components/MeetingOverviewModal";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter, cn } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getClassStudentWisePtmReport,
  getCollegeById,
  searchStudentsForCertificate,
  type MentorshipRow,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Class & Student Wise PTM Report";

type PtmRow = {
  activityTypeCode: string;
  nextScheduledActivityDate: string;
  employee: string;
  attendeesName: string;
  discussionPoints: string;
  summary: string;
  activityDate: string;
  activityStatusCode: string;
  raw: MentorshipRow;
};

type AnyRow = Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PtmRow>,
  activityType: {
    field: "activityTypeCode",
    headerName: "Activity Type",
    minWidth: 120,
  } as ColDef<PtmRow>,
  scheduleDate: {
    field: "nextScheduledActivityDate",
    headerName: "Schedule Date",
    minWidth: 120,
  } as ColDef<PtmRow>,
  employee: {
    field: "employee",
    headerName: "Employee Name",
    minWidth: 160,
  } as ColDef<PtmRow>,
  attendees: {
    field: "attendeesName",
    headerName: "Attendees Name",
    minWidth: 140,
  } as ColDef<PtmRow>,
  discussion: {
    field: "discussionPoints",
    headerName: "Discussion Points",
    minWidth: 160,
  } as ColDef<PtmRow>,
  summary: {
    field: "summary",
    headerName: "Summary",
    minWidth: 140,
  } as ColDef<PtmRow>,
  activityDate: {
    field: "activityDate",
    headerName: "Activity Date",
    minWidth: 120,
  } as ColDef<PtmRow>,
  status: {
    field: "activityStatusCode",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<PtmRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<PtmRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "No." },
  { key: "activityTypeCode", header: "Activity Type" },
  { key: "nextScheduledActivityDate", header: "Schedule Date" },
  { key: "employee", header: "Employee Name" },
  { key: "attendeesName", header: "Attendees Name" },
  { key: "discussionPoints", header: "Discussion Points" },
  { key: "summary", header: "Summary" },
  { key: "activityDate", header: "Activity Date" },
  { key: "activityStatusCode", header: "Status" },
];

function dash(v: unknown): string {
  if (v == null || String(v).trim() === "") return "-";
  return String(v);
}

function extractPtmActivities(raw: AnyRow[]): AnyRow[] {
  if (raw.length === 0) return [];
  const first = raw[0];
  const nested = first?.counselorActivityDTOs;
  if (Array.isArray(nested)) return nested as AnyRow[];
  return raw;
}

function mapPtmRow(row: AnyRow, parent?: AnyRow): PtmRow {
  const empName = String(row.empFirstName ?? row.emp_first_name ?? "");
  const empNum = String(row.empNumber ?? row.emp_number ?? "");
  return {
    activityTypeCode: dash(row.activityTypeCode),
    nextScheduledActivityDate: dash(row.nextScheduledActivityDate),
    employee: empNum ? `${empName} (${empNum})` : empName || "-",
    attendeesName: dash(row.attendeesName),
    discussionPoints: dash(row.discussionPoints),
    summary: dash(row.summary ?? row.outputFromMeeting),
    activityDate: dash(row.activityDate),
    activityStatusCode: dash(row.activityStatusCode),
    raw: {
      ...row,
      collegeName: parent?.collegeName ?? row.collegeName,
      summary: row.summary ?? row.outputFromMeeting,
    },
  };
}

function statusRenderer(p: ICellRendererParams<PtmRow>) {
  const code = String(p.data?.activityStatusCode ?? "").toUpperCase();
  if (!code || code === "-") return "-";
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        code === "COMPLETED" && "text-emerald-600",
        code === "CANCELLED" && "text-red-600",
        code === "SCHEDULED" && "text-amber-600",
      )}
    >
      {code}
    </span>
  );
}

function makeActionsRenderer(onView: (row: PtmRow) => void) {
  return (p: ICellRendererParams<PtmRow>) => {
    if (!p.data) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="View Meeting Details"
        onClick={() => onView(p.data!)}
      >
        <Eye className="h-4 w-4 text-[#042956]" />
      </Button>
    );
  };
}

export default function ClassStudentWisePtmReportPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [rows, setRows] = useState<PtmRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  /** Angular `flag` — table card visible after student selection. */
  const [showTable, setShowTable] = useState(false);
  const [overviewRow, setOverviewRow] = useState<MentorshipRow | null>(null);

  const collegeIdForLogo = Number(
    selectedStudent?.collegeId ??
      (typeof window !== "undefined"
        ? localStorage.getItem("collegeId")
        : null) ??
      0,
  );
  const collegeLogo = useCollegeLogo(
    collegeIdForLogo > 0 ? collegeIdForLogo : null,
  );

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setCollegeName("");
  }, []);

  const studentOptions = useMemo(
    () =>
      students.map((s) => {
        const name = String(s.firstName ?? "");
        const roll = String(s.rollNumber ?? s.hallticketNumber ?? "");
        return {
          value: String(s.studentId),
          label: roll ? `${name} (${roll})` : name || String(s.studentId),
        };
      }),
    [students],
  );

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudents([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      setStudents(await searchStudentsForCertificate(q));
    } catch (err) {
      toastError(getErrorMessage(err));
      setStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const columnDefs = useMemo<ColDef<PtmRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.activityType,
      COL_DEFS.scheduleDate,
      COL_DEFS.employee,
      COL_DEFS.attendees,
      COL_DEFS.discussion,
      COL_DEFS.summary,
      COL_DEFS.activityDate,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => setOverviewRow(row.raw)),
      },
    ],
    [],
  );

  /** Angular `selectedStudent` — load on selection, no Get List button. */
  const loadForStudent = useCallback(
    async (sid: number, student: StudentFeeSearchRow | null) => {
      if (!sid) {
        clearResults();
        return;
      }
      const collegeId =
        Number(student?.collegeId ?? 0) ||
        Number(
          typeof window !== "undefined" ? localStorage.getItem("collegeId") : 0,
        );
      // Angular: both fromDate/toDate = today (`momentFormatYMD`)
      const today = format(new Date(), "yyyy/MM/dd");

      setLoadingList(true);
      setRows([]);
      setShowTable(true);
      try {
        let name = String(student?.collegeCode ?? "") || "College";
        if (collegeId > 0) {
          try {
            const college = await getCollegeById(collegeId);
            if (college?.collegeName) name = String(college.collegeName);
          } catch {
            /* keep code fallback */
          }
        }
        setCollegeName(name);

        const raw = await getClassStudentWisePtmReport({
          studentId: sid,
          collegeId,
          fromDate: today,
          toDate: today,
        });
        const parent = (raw as AnyRow[])[0];
        let activities = extractPtmActivities(raw as AnyRow[]).filter(
          (r) => String(r.activityTypeCode ?? "") !== "STDABSCALL",
        );
        activities = [...activities].sort((a, b) => {
          const ta = Date.parse(String(a.nextScheduledActivityDate ?? ""));
          const tb = Date.parse(String(b.nextScheduledActivityDate ?? ""));
          if (Number.isFinite(tb) && Number.isFinite(ta)) return tb - ta;
          return 0;
        });
        setRows(activities.map((r) => mapPtmRow(r, parent)));
      } catch (err) {
        toastError(getErrorMessage(err));
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [clearResults],
  );

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Student Wise PTM Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      collegeIdForLogo,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  return (
    <>
      <FilteredListPage<PtmRow>
        title={PRINT_REPORT_TITLE}
        filters={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Student"
              required
              value={studentId}
              onChange={(v) => {
                setStudentId(v);
                if (!v) {
                  setSelectedStudent(null);
                  clearResults();
                  return;
                }
                const found =
                  students.find((s) => String(s.studentId) === String(v)) ??
                  null;
                setSelectedStudent(found);
                void loadForStudent(Number(v), found);
              }}
              options={studentOptions}
              placeholder="Search student (min 5 chars)"
              searchable
              onSearch={(term) => void onStudentSearch(term)}
              isLoading={studentSearchLoading}
              clearable
            />
          </div>
        }
        rowData={showTable ? rows : []}
        columnDefs={columnDefs}
        loading={loadingList}
        resultsVisible={showTable}
        hideEmptyGrid={false}
        pagination
        paginationPageSize={10}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
        onExportExcel={handleExcelExport}
        toolbarTrailing={
          showTable ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={handleExcelExport}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={() => void printReport()}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </>
          ) : null
        }
      />
      <MeetingOverviewModal
        open={overviewRow != null}
        onClose={() => setOverviewRow(null)}
        row={overviewRow}
      />
    </>
  );
}
