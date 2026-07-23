"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  createSchPreceeding,
  getScholarshipCollegeFilters,
  listFinancialYearsByUniversity,
  listSchPreceedings,
} from "@/services";
import type { SchPreceeding } from "@/types/scholarship";
import {
  PreceedingModal,
  type PreceedingModalResult,
} from "./PreceedingModal";

type PreceedingRow = SchPreceeding & {
  stdPreceedings?: Record<string, unknown>[];
  academicYear?: string;
  noOfStudents?: number;
  preceedingDescription?: string;
  bankAmountCreditedOn?: string;
  reason?: string;
  schAccountsPreceedingsId?: number;
} & Record<string, unknown>;

const PAGE_SIZE = 50;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PreceedingRow>,
  preceedingNo: {
    field: "preceedingNo",
    headerName: "Preceeding Number",
    minWidth: 140,
  } as ColDef<PreceedingRow>,
  preceedingTitle: {
    field: "preceedingTitle",
    headerName: "Preceeding Title",
    minWidth: 180,
  } as ColDef<PreceedingRow>,
  college: {
    headerName: "College",
    minWidth: 160,
  } as ColDef<PreceedingRow>,
  preceedingAmount: {
    field: "preceedingAmount",
    headerName: "Amount",
    minWidth: 110,
  } as ColDef<PreceedingRow>,
  preceedingDate: {
    field: "preceedingDate",
    headerName: "Date",
    minWidth: 130,
  } as ColDef<PreceedingRow>,
  upload: {
    headerName: "Upload",
    minWidth: 140,
    flex: 0,
    width: 150,
  } as ColDef<PreceedingRow>,
  actions: {
    headerName: "Actions",
    minWidth: 150,
    flex: 0,
    width: 160,
  } as ColDef<PreceedingRow>,
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

function collegeRenderer(p: ICellRendererParams<PreceedingRow>) {
  const row = p.data;
  if (!row) return null;
  const code = pickText(row, ["collegeCode"]);
  const ay = pickText(row, ["academicYear"]);
  if (!code && !ay) return "—";
  return (
    <span>
      {code}
      {ay ? ` (${ay})` : ""}
    </span>
  );
}

function dateRenderer(p: ICellRendererParams<PreceedingRow>) {
  return formatDt(p.data?.preceedingDate);
}

function makeUploadRenderer(onUpload: (row: PreceedingRow) => void) {
  return (p: ICellRendererParams<PreceedingRow>) => (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-7 px-2"
      onClick={() => p.data && onUpload(p.data)}
    >
      Upload Students
    </Button>
  );
}

function makeActionsRenderer(
  onEdit: (row: PreceedingRow) => void,
  onView: (row: PreceedingRow) => void,
) {
  return (p: ICellRendererParams<PreceedingRow>) => (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        title="Edit"
        onClick={() => p.data && onEdit(p.data)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <span className="text-muted-foreground">|</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 px-2"
        onClick={() => p.data && onView(p.data)}
      >
        View
      </Button>
    </div>
  );
}

export default function ScholarshipPreceedingDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new" | "edit">("new");
  const [editing, setEditing] = useState<PreceedingRow | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState<PreceedingRow | null>(null);
  const [viewSearch, setViewSearch] = useState("");

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["SchPreceeding", "filters", orgId, employeeId],
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
  const academicYearNum = Number(academicYearId ?? 0);
  const financialYearNum = Number(financialYearId ?? 0);

  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );

  const universityId = useMemo(
    () =>
      pickNum(
        filtersData.find(
          (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
        ),
        ["fk_university_id", "universityId"],
      ),
    [filtersData, collegeNum],
  );

  const { data: financialYears = [], isLoading: loadingFy } = useQuery({
    queryKey: ["FinancialYear", "byUniversity", universityId],
    queryFn: () => listFinancialYearsByUniversity(universityId),
    enabled: universityId > 0,
  });

  const collegeOptions = useMemo(
    () =>
      colleges
        .map((c) => ({
          value: String(pickNum(c, ["fk_college_id", "collegeId"])),
          label:
            pickText(c, ["college_code", "collegeCode"]) ||
            pickText(c, ["college_name", "collegeName"]) ||
            String(pickNum(c, ["fk_college_id", "collegeId"])),
        }))
        .filter((o) => o.value !== "0"),
    [colleges],
  );

  const academicYearOptions = useMemo(
    () =>
      academicYears
        .map((ay) => ({
          value: String(pickNum(ay, ["fk_academic_year_id", "academicYearId"])),
          label:
            pickText(ay, ["academic_year", "academicYear"]) ||
            String(pickNum(ay, ["fk_academic_year_id", "academicYearId"])),
        }))
        .filter((o) => o.value !== "0"),
    [academicYears],
  );

  const financialYearOptions = useMemo(
    () =>
      financialYears
        .map((fy) => ({
          value: String(pickNum(fy, ["financialYearId", "financial_year_id"])),
          label:
            pickText(fy, ["financialYear", "financial_year"]) ||
            String(pickNum(fy, ["financialYearId", "financial_year_id"])),
        }))
        .filter((o) => o.value !== "0"),
    [financialYears],
  );

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
      setFinancialYearId(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    if (
      academicYearId &&
      academicYears.some(
        (r) =>
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
          Number(academicYearId),
      )
    ) {
      return;
    }
    setAcademicYearId(
      String(
        pickNum(academicYears[0], ["fk_academic_year_id", "academicYearId"]),
      ),
    );
  }, [collegeNum, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearNum) {
      setFinancialYearId(null);
      return;
    }
    setFinancialYearId(null);
  }, [academicYearNum, collegeNum]);

  const {
    data: listResult,
    isLoading: loadingList,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QK.schPreceedings.list({
      collegeId: collegeNum,
      academicYearId: academicYearNum,
      financialYearId: financialYearNum,
      page,
    }),
    queryFn: () =>
      listSchPreceedings({
        collegeId: collegeNum,
        academicYearId: academicYearNum,
        financialYearId: financialYearNum,
        page,
        size: PAGE_SIZE,
      }),
    enabled: collegeNum > 0 && academicYearNum > 0 && financialYearNum > 0,
  });

  const rows = (listResult?.rows ?? []) as PreceedingRow[];
  const totalCount = listResult?.totalCount ?? 0;

  const collegeCode = useMemo(() => {
    const opt = collegeOptions.find((o) => o.value === collegeId);
    return opt?.label ?? "";
  }, [collegeOptions, collegeId]);

  const academicYearCode = useMemo(() => {
    const opt = academicYearOptions.find((o) => o.value === academicYearId);
    return opt?.label ?? "";
  }, [academicYearOptions, academicYearId]);

  const financialYearCode = useMemo(() => {
    const opt = financialYearOptions.find((o) => o.value === financialYearId);
    return opt?.label ?? "";
  }, [financialYearOptions, financialYearId]);

  const openCreate = useCallback(() => {
    if (!collegeNum || !academicYearNum || !financialYearNum) {
      toastInfo("Select college, academic year and financial year first.");
      return;
    }
    setModalMode("new");
    setEditing(null);
    setModalOpen(true);
  }, [collegeNum, academicYearNum, financialYearNum]);

  const openEdit = useCallback((row: PreceedingRow) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  }, []);

  const openView = useCallback((row: PreceedingRow) => {
    setViewRow(row);
    setViewSearch("");
    setViewOpen(true);
  }, []);

  const goUpload = useCallback(
    (row: PreceedingRow) => {
      const params = new URLSearchParams({
        preceedingNo: String(row.preceedingNo ?? ""),
        preceedingTitle: String(row.preceedingTitle ?? ""),
        preceedingDate: String(row.preceedingDate ?? ""),
        collegeCode: String(row.collegeCode ?? collegeCode),
        collegeName: String(row.collegeName ?? ""),
        academicYear: String(row.academicYear ?? academicYearCode),
        schPreceedingId: String(row.schPreceedingId ?? ""),
        collegeId: String(row.collegeId ?? collegeNum),
        academicYearId: String(row.academicYearId ?? academicYearNum),
      });
      router.push(
        `/scholarship-management/students-upload?${params.toString()}`,
      );
    },
    [router, collegeCode, academicYearCode, collegeNum, academicYearNum],
  );

  const columnDefs = useMemo<ColDef<PreceedingRow>[]>(
    () => [
      {
        ...COL_DEFS.siNo,
        valueGetter: (p) =>
          (page * PAGE_SIZE) + (p.node?.rowIndex ?? 0) + 1,
      },
      COL_DEFS.preceedingNo,
      COL_DEFS.preceedingTitle,
      { ...COL_DEFS.college, cellRenderer: collegeRenderer },
      COL_DEFS.preceedingAmount,
      { ...COL_DEFS.preceedingDate, cellRenderer: dateRenderer },
      { ...COL_DEFS.upload, cellRenderer: makeUploadRenderer(goUpload) },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit, openView),
      },
    ],
    [page, goUpload, openEdit, openView],
  );

  const handleModalSubmit = useCallback(
    async (payload: PreceedingModalResult) => {
      try {
        const body: Record<string, unknown> = { ...payload };
        if (modalMode === "edit" && editing) {
          body.schPreceedingId = editing.schPreceedingId;
          body.schAccountsPreceedingsId = editing.schAccountsPreceedingsId;
        }
        // Angular uses POST add for both create and edit.
        await createSchPreceeding(body);
        toastSuccess(
          modalMode === "edit"
            ? "Scholarship preceeding updated."
            : "Scholarship preceeding saved.",
        );
        setModalOpen(false);
        await queryClient.invalidateQueries({ queryKey: QK.schPreceedings.all });
        await refetch();
      } catch (err) {
        toastError(
          err,
          modalMode === "edit"
            ? "Failed to update preceeding"
            : "Failed to save preceeding",
        );
      }
    },
    [editing, modalMode, queryClient, refetch],
  );

  const studentRows = useMemo(() => {
    const list = Array.isArray(viewRow?.stdPreceedings)
      ? viewRow.stdPreceedings
      : [];
    const q = viewSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(q),
    );
  }, [viewRow, viewSearch]);

  return (
    <FilteredListPage
      title="Scholarship Preceedings"
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setAcademicYearId(null);
              setFinancialYearId(null);
              setPage(0);
            }}
            options={collegeOptions}
            placeholder="Select college"
            isLoading={loadingFilters}
            searchable
          />
          <Select
            label="Academic Year"
            value={academicYearId}
            onChange={(v) => {
              setAcademicYearId(v);
              setFinancialYearId(null);
              setPage(0);
            }}
            options={academicYearOptions}
            placeholder="Select academic year"
            disabled={!collegeNum}
            searchable
          />
          <Select
            label="Financial Year"
            value={financialYearId}
            onChange={(v) => {
              setFinancialYearId(v);
              setPage(0);
            }}
            options={financialYearOptions}
            placeholder="Select financial year"
            disabled={!academicYearNum}
            isLoading={loadingFy}
            searchable
          />
        </div>
      }
      rowData={financialYearNum > 0 ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || isFetching}
      serverSide
      totalCount={totalCount}
      currentPage={page}
      onPageChange={(nextPage) => setPage(nextPage)}
      pagination={false}
      paginationPageSize={PAGE_SIZE}
      toolbar={{ search: true, searchPlaceholder: "Search" }}
      toolbarTrailing={
        financialYearNum > 0 ? (
          <Button type="button" onClick={openCreate}>
            Add Preceedings
          </Button>
        ) : null
      }
      getRowId={(p) => String(p.data?.schPreceedingId ?? "")}
    >
      <PreceedingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        collegeId={collegeNum}
        academicYearId={academicYearNum}
        financialYearId={financialYearNum}
        collegeCode={collegeCode}
        academicYearCode={academicYearCode}
        financialYearCode={financialYearCode}
        row={editing}
        onSubmit={handleModalSubmit}
      />

      <Dialog
        open={viewOpen}
        onOpenChange={(v) => {
          if (!v) setViewOpen(false);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl"
          closeOnOutsideClick={false}
          hasDescription
        >
          <DialogHeader className="shrink-0 border-b border-border pb-3">
            <DialogTitle>View Student Preceedings</DialogTitle>
            <DialogDescription className="sr-only">
              Students under selected proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
            {viewRow ? (
              <div className="space-y-1.5 rounded-md border p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">College : </span>
                  <span className="font-medium text-blue-700">
                    {[viewRow.collegeCode, viewRow.academicYear]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding Title :{" "}
                  </span>
                  <span className="font-medium text-blue-700">
                    {viewRow.preceedingTitle ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding No. :{" "}
                  </span>
                  <span className="font-medium text-blue-700">
                    {viewRow.preceedingNo ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Preceeding Date :{" "}
                  </span>
                  <span className="font-medium text-blue-700">
                    {formatDt(viewRow.preceedingDate)}
                  </span>
                </p>
              </div>
            ) : null}

            <input
              className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Search"
              value={viewSearch}
              onChange={(e) => setViewSearch(e.target.value)}
            />

            <div className="overflow-auto rounded-md border">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    <th className="px-2 py-2">SI.No</th>
                    <th className="px-2 py-2">Applicant No</th>
                    <th className="px-2 py-2">Roll No.</th>
                    <th className="px-2 py-2">Student Name</th>
                    <th className="px-2 py-2">Course</th>
                    <th className="px-2 py-2">Released From Dt.</th>
                    <th className="px-2 py-2">Released To Dt.</th>
                    <th className="px-2 py-2">Tution Fee</th>
                    <th className="px-2 py-2">Spl. Fee</th>
                    <th className="px-2 py-2">Other Fee</th>
                    <th className="px-2 py-2">RTF Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
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
                            {String(r.firstName ?? r.applicantName ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.courseYearName ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDt(r.releaseFromDt)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDt(r.releaseToDt)}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.tutionFee ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.splFee ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.otherFee ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.rtfAmount ?? "—")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
