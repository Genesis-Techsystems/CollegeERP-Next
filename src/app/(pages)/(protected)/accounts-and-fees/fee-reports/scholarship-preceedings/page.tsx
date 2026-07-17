"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { ClipboardList, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
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
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getSchPreceedingById,
  getScholarshipCollegeFilters,
  listPreceedingsByAccountId,
  listSchAccountsPreceedings,
} from "@/services";
import type { SchAccountsPreceeding, SchPreceeding } from "@/types/scholarship";

type ProceedingRow = SchPreceeding & {
  caste?: string;
  noOfStudents?: number;
  academicYear?: string;
  [key: string]: unknown;
};

type StdProceedingRow = Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ProceedingRow>,
  preceedingNo: {
    field: "preceedingNo",
    headerName: "Preceeding No.",
    minWidth: 130,
  } as ColDef<ProceedingRow>,
  preceedingTitle: {
    field: "preceedingTitle",
    headerName: "Preceeding Title",
    minWidth: 180,
  } as ColDef<ProceedingRow>,
  caste: {
    field: "caste",
    headerName: "Caste",
    minWidth: 110,
  } as ColDef<ProceedingRow>,
  noOfStudents: {
    headerName: "No. of Students",
    minWidth: 120,
    valueGetter: (p) =>
      Number(p.data?.noOfStudents ?? p.data?.studentCount ?? 0),
  } as ColDef<ProceedingRow>,
  amount: {
    field: "preceedingAmount",
    headerName: "Amount",
    minWidth: 110,
  } as ColDef<ProceedingRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<ProceedingRow>,
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

function makeViewRenderer(onView: (row: ProceedingRow) => void) {
  return (p: ICellRendererParams<ProceedingRow>) => (
    <Button
      type="button"
      size="sm"
      className="h-7 bg-[#00b8ff] px-2 text-[11px] text-white hover:bg-[#00a6e6]"
      title="View Students"
      onClick={() => p.data && onView(p.data)}
    >
      View
    </Button>
  );
}

export default function ScholarshipPreceedingsReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [rows, setRows] = useState<ProceedingRow[]>([]);
  const [chequeNo, setChequeNo] = useState("");
  const [reportAy, setReportAy] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);

  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsHeader, setStudentsHeader] = useState<{
    collegeCode?: string;
    academicYear?: string;
    preceedingNo?: string;
    preceedingAmount?: number | string;
  } | null>(null);
  const [studentRows, setStudentRows] = useState<StdProceedingRow[]>([]);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["ScholarshipPreceedings", "filters", orgId, employeeId],
    queryFn: () => getScholarshipCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const academicData = useMemo(
    () => (filterBundle?.academicData ?? []) as FilterRow[],
    [filterBundle?.academicData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeNum = Number(collegeId ?? 0);

  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: QK.schAccountsPreceedings.list(collegeNum || undefined),
    queryFn: () => listSchAccountsPreceedings(collegeNum),
    enabled: collegeNum > 0,
  });

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum) {
      setAcademicYearId(null);
      setAccountId(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    const current =
      academicYears.find(
        (r) => Number(r.is_curr_ay ?? r.isCurrAy ?? 0) === 1,
      ) ?? academicYears[0];
    setAcademicYearId(
      String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
    );
  }, [collegeNum, academicYears]);

  useEffect(() => {
    if (accounts.length === 0) {
      setAccountId(null);
      return;
    }
    setAccountId(String(accounts[0].schAccountsPreceedingId));
  }, [accounts]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label:
          pickText(r, ["college_code", "collegeCode"]) ||
          String(pickNum(r, ["fk_college_id"])),
      })),
    [colleges],
  );

  const ayOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label:
          pickText(r, ["academic_year", "academicYear"]) ||
          String(pickNum(r, ["fk_academic_year_id"])),
      })),
    [academicYears],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((a: SchAccountsPreceeding) => ({
        value: String(a.schAccountsPreceedingId),
        label: String(a.title ?? a.chequeNo ?? a.schAccountsPreceedingId),
      })),
    [accounts],
  );

  const getReport = useCallback(async () => {
    const accId = Number(accountId ?? 0);
    const ayId = Number(academicYearId ?? 0);
    if (!collegeNum || !ayId || !accId) {
      toastInfo("Please select College, Academic Year and Preceeding Account.");
      return;
    }
    const account = accounts.find((a) => a.schAccountsPreceedingId === accId);
    setChequeNo(String(account?.chequeNo ?? ""));
    setReportAy(ayOptions.find((o) => o.value === academicYearId)?.label ?? "");
    setLoadingReport(true);
    try {
      const data = await listPreceedingsByAccountId(accId);
      setRows(Array.isArray(data) ? (data as ProceedingRow[]) : []);
      if (!data?.length)
        toastInfo("No proceedings found for the selected account.");
    } catch (e) {
      toastError(e, "Failed to load scholarship proceedings");
      setRows([]);
    } finally {
      setLoadingReport(false);
    }
  }, [accountId, academicYearId, collegeNum, accounts, ayOptions]);

  const viewStudents = useCallback(
    async (row: ProceedingRow) => {
      const id = Number(row.schPreceedingId ?? 0);
      if (!id) {
        toastInfo("Proceeding id missing.");
        return;
      }
      setStudentsOpen(true);
      setStudentsLoading(true);
      setStudentRows([]);
      setStudentsHeader(null);
      try {
        const detail = await getSchPreceedingById(id);
        if (!detail) {
          toastInfo("Proceeding details not found.");
          return;
        }
        setStudentsHeader({
          collegeCode: detail.collegeCode ?? String(row.collegeCode ?? ""),
          academicYear:
            detail.academicYear ?? String(row.academicYear ?? reportAy),
          preceedingNo: detail.preceedingNo ?? row.preceedingNo,
          preceedingAmount: detail.preceedingAmount ?? row.preceedingAmount,
        });
        setStudentRows(
          Array.isArray(detail.stdPreceedings) ? detail.stdPreceedings : [],
        );
      } catch (e) {
        toastError(e, "Failed to load proceeding students");
      } finally {
        setStudentsLoading(false);
      }
    },
    [reportAy],
  );

  const columnDefs = useMemo<ColDef<ProceedingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.preceedingNo,
      COL_DEFS.preceedingTitle,
      COL_DEFS.caste,
      COL_DEFS.noOfStudents,
      COL_DEFS.amount,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeViewRenderer((r) => void viewStudents(r)),
      },
    ],
    [viewStudents],
  );

  const pageTitle =
    rows.length > 0
      ? `Scholarship Preceeding Report for Cheque No. ${chequeNo}${reportAy ? ` (${reportAy})` : ""}`
      : "Scholarship Preceeding Report";

  return (
    <>
      <FilteredListPage<ProceedingRow>
        title={pageTitle}
        filters={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId(null);
                setAccountId(null);
                setRows([]);
                setChequeNo("");
              }}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingFilters}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v);
                setRows([]);
              }}
              options={ayOptions}
              placeholder="Select academic year"
              searchable
              disabled={!collegeId}
            />
            <Select
              label="Preceeding Account"
              required
              value={accountId}
              onChange={(v) => {
                setAccountId(v);
                setRows([]);
              }}
              options={accountOptions}
              placeholder="Select account"
              searchable
              disabled={!collegeId}
              isLoading={loadingAccounts}
            />
            <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
              <Button
                type="button"
                size="sm"
                className="!h-8 w-auto shrink-0 !px-3 !text-[12px] bg-[#f0c040] font-medium text-slate-900 hover:bg-[#e5b535]"
                disabled={
                  loadingReport || !collegeId || !academicYearId || !accountId
                }
                onClick={() => void getReport()}
              >
                {loadingReport ? "Loading…" : "Get Report"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="!h-8 w-auto shrink-0 gap-1.5 !px-3 !text-[12px]"
                disabled={rows.length === 0}
                onClick={() => window.print()}
              >
                <Printer className="!h-3.5 !w-3.5" />
                Print Report
              </Button>
            </div>
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loadingReport}
        height="auto"
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: rows.length > 0,
        }}
        getRowId={(p) =>
          String(
            p.data?.schPreceedingId ??
              [
                p.data?.preceedingNo,
                p.data?.preceedingTitle,
                p.data?.preceedingAmount,
                p.data?.caste,
              ].join("-"),
          )
        }
      />

      <Dialog
        open={studentsOpen}
        onOpenChange={(v) => {
          if (!v) setStudentsOpen(false);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl"
          closeOnOutsideClick={false}
          hasDescription
        >
          <DialogHeader className="shrink-0 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" aria-hidden />
              <DialogTitle>Preceeding Students</DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Students under selected proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
            {studentsHeader ? (
              <div className="space-y-1.5 rounded-md border p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">College :</span>{" "}
                  <span className="font-medium text-blue-700">
                    {[studentsHeader.collegeCode, studentsHeader.academicYear]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding No. :
                  </span>{" "}
                  <span className="font-medium text-blue-700">
                    {studentsHeader.preceedingNo ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding Amount :
                  </span>{" "}
                  <span className="font-medium text-blue-700">
                    {studentsHeader.preceedingAmount ?? "—"}
                  </span>
                </p>
              </div>
            ) : null}

            {studentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-auto rounded-md border">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-2 py-2">SI.No</th>
                      <th className="px-2 py-2">Application No.</th>
                      <th className="px-2 py-2">Roll No.</th>
                      <th className="px-2 py-2">Student</th>
                      <th className="px-2 py-2">Course</th>
                      <th className="px-2 py-2">Release From Dt</th>
                      <th className="px-2 py-2">Release To Dt</th>
                      <th className="px-2 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-2 py-3 text-muted-foreground"
                        >
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      studentRows.map((r, i) => {
                        const detail = (r.studentDetailDTOs ??
                          r.studentDetailDto ??
                          null) as Record<string, unknown> | null;
                        const roll =
                          (detail?.rollNumber as string | undefined) ??
                          String(r.rollNumber ?? "—");
                        const courseLine = [
                          r.courseName,
                          r.groupCode,
                          r.courseYearName,
                          r.section,
                        ]
                          .filter((x) => x != null && String(x).trim() !== "")
                          .join(" / ");
                        return (
                          <tr
                            key={String(
                              r.schStdPreceedingId ?? r.schApplicationNo ?? i,
                            )}
                            className="border-b border-muted/40"
                          >
                            <td className="px-2 py-1.5 text-center">{i + 1}</td>
                            <td className="px-2 py-1.5">
                              {String(r.schApplicationNo ?? "—")}
                            </td>
                            <td className="px-2 py-1.5">{roll}</td>
                            <td className="px-2 py-1.5">
                              {String(r.applicantName ?? r.firstName ?? "—")}
                            </td>
                            <td className="px-2 py-1.5">{courseLine || "—"}</td>
                            <td className="px-2 py-1.5">
                              {formatDt(r.releaseFromDt)}
                            </td>
                            <td className="px-2 py-1.5">
                              {formatDt(r.releaseToDt)}
                            </td>
                            <td className="px-2 py-1.5">
                              {String(
                                r.tutionFee ??
                                  r.tuitionFee ??
                                  r.scholarshipAmount ??
                                  "—",
                              )}
                            </td>
                          </tr>
                        );
                      })
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
              onClick={() => setStudentsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
