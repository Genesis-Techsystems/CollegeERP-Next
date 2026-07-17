"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable, TableCard } from "@/common/components/table";
import {
  FilterCard,
  FILTER_CARD_SELECT_CLASS,
} from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { FilteredListPage, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import {
  listStudentFeeStructuresByStudent,
  searchStudentsForFeeCollection,
} from "@/services";
import type {
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import { buildPayFeesSearchParams } from "../_lib/pay-fees-params";
import { FeeDetailsModal, type FeeDetailsModalTarget } from "./FeeDetailsModal";
import { FeeStudentProfileCard } from "./FeeStudentProfileCard";

const YELLOW_BTN =
  "h-[30px] bg-[#f0c040] px-4 text-[12px] font-medium text-slate-900 hover:bg-[#e5b535]";
const VIEW_BTN =
  "h-[30px] bg-[#00b8ff] px-4 text-[12px] font-medium text-white hover:bg-[#00a6e6]";

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? "Student";
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId;
  return id ? `${name} (${id})` : name;
}

function statusRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const bal = Number(p.data?.balanceAmount ?? 0);
  return (
    <span
      className={
        bal > 0 ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"
      }
    >
      {bal > 0 ? "Due" : "Paid"}
    </span>
  );
}

function courseYearRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const row = p.data;
  if (!row) return null;
  const yearNo = row.courseYearNo;
  const yearLabel =
    yearNo != null && Number(yearNo) > 0
      ? `${yearNo} year`
      : (row.courseYearName ?? "—");
  return (
    <span>
      <span className="text-[15px] font-medium">{yearLabel}</span>
      {row.academicYear ? (
        <>
          {" "}
          (<span className="font-medium text-blue-600">{row.academicYear}</span>
          )
        </>
      ) : null}
    </span>
  );
}

function amtValue(v: unknown): string {
  if (v == null || v === "") return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

function makePayRenderer(
  onPay: (row: StudentFeeStructureRow) => void,
  label: string,
  yellow = false,
) {
  return (p: ICellRendererParams<StudentFeeStructureRow>) => (
    <Button
      type="button"
      size="sm"
      className={yellow ? YELLOW_BTN : undefined}
      onClick={() => p.data && onPay(p.data)}
    >
      {label}
    </Button>
  );
}

function makeViewRenderer(onView: (row: StudentFeeStructureRow) => void) {
  return (p: ICellRendererParams<StudentFeeStructureRow>) => (
    <Button
      type="button"
      size="sm"
      className={VIEW_BTN}
      onClick={() => p.data && onView(p.data)}
    >
      View
    </Button>
  );
}

export function StudentCategoryFeeList({
  title,
  payPage,
  payColumnHeader = "Pay Details",
  backHref,
  /** Angular Fee Payment table (amounts + View + yellow Payment). */
  layout = "compact",
  /** Use FilteredListPage shell (bus fee payment only). */
  filteredShell = false,
}: {
  title: string;
  payPage: string;
  payColumnHeader?: string;
  backHref?: string;
  layout?: "compact" | "fee-payment";
  filteredShell?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedQueryKey = useRef<string | null>(null);
  const isFeePayment = layout === "fee-payment";
  const useFilteredShell = isFeePayment || filteredShell;

  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([]);
  const [studentId, setStudentId] = useState<string | null>(
    searchParams.get("studentId"),
  );
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [detailsTarget, setDetailsTarget] =
    useState<FeeDetailsModalTarget | null>(null);

  const studentNum = Number(studentId ?? 0);

  const { data: feeRows = [], isLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  });

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudentRows([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsForFeeCollection(q);
      setStudentRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toastError(e, "Student search failed");
      setStudentRows([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  const studentOptions = useMemo(() => {
    const base = studentRows.map((s) => ({
      value: String(s.studentId),
      label: studentOptionLabel(s),
    }));
    const sid = studentId;
    if (sid && selectedStudent && !base.some((o) => o.value === sid)) {
      return [
        { value: sid, label: studentOptionLabel(selectedStudent) },
        ...base,
      ];
    }
    return base;
  }, [studentRows, studentId, selectedStudent]);

  useEffect(() => {
    const roll = searchParams.get("rollNumber");
    const sid = searchParams.get("studentId");
    if (!roll && !sid) return;

    const key = searchParams.toString();
    if (appliedQueryKey.current === key) return;
    appliedQueryKey.current = key;

    void (async () => {
      const q = roll?.trim() ?? "";
      if (q.length < 5 && !sid) return;

      setStudentSearchLoading(true);
      try {
        const rows =
          q.length >= 5 ? await searchStudentsForFeeCollection(q) : [];
        setStudentRows(rows);
        const pick = sid
          ? (rows.find((r) => String(r.studentId) === sid) ?? null)
          : (rows[0] ?? null);
        if (pick) {
          setStudentId(String(pick.studentId));
          setSelectedStudent(pick);
        }
      } catch (e) {
        toastError(e, "Student search failed");
      } finally {
        setStudentSearchLoading(false);
      }
    })();
  }, [searchParams]);

  function handleStudentChange(v: string | null) {
    setStudentId(v);
    if (!v) {
      setSelectedStudent(null);
      return;
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v
        ? selectedStudent
        : null);
    setSelectedStudent(row);
  }

  function clearSelection() {
    setStudentId(null);
    setSelectedStudent(null);
    setStudentRows([]);
  }

  const goPay = useCallback(
    (row: StudentFeeStructureRow) => {
      if (!selectedStudent) return;
      const params = buildPayFeesSearchParams(selectedStudent, row, payPage);
      router.push(
        `/accounts-and-fees/fees-collection/payment/pay-fees?${params}`,
      );
    },
    [selectedStudent, payPage, router],
  );

  const goView = useCallback(
    (row: StudentFeeStructureRow) => {
      if (!selectedStudent) return;
      setDetailsTarget({
        row: {
          ...row,
          section: row.section ?? selectedStudent.section,
        },
        student: selectedStudent,
      });
    },
    [selectedStudent],
  );

  const columnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(() => {
    if (isFeePayment) {
      return [
        {
          headerName: "Course Year",
          minWidth: 180,
          cellRenderer: courseYearRenderer,
        },
        {
          headerName: "Gross Amt",
          width: 110,
          valueGetter: (p) => amtValue(p.data?.grossAmount),
        },
        {
          headerName: "Discount Amt",
          width: 120,
          valueGetter: (p) => amtValue(p.data?.discountAmount),
        },
        {
          headerName: "LateFee",
          width: 100,
          valueGetter: (p) => amtValue(p.data?.fineAmount),
        },
        {
          headerName: "Net Amt",
          width: 100,
          valueGetter: (p) => amtValue(p.data?.netAmount),
        },
        {
          headerName: "Paid Amt",
          width: 100,
          valueGetter: (p) => amtValue(p.data?.paidAmount),
        },
        {
          headerName: "Balance Due",
          width: 120,
          valueGetter: (p) => amtValue(p.data?.balanceAmount),
          cellClass: "font-medium",
        },
        {
          headerName: "Fee Details",
          minWidth: 110,
          flex: 0,
          width: 120,
          cellRenderer: makeViewRenderer(goView),
        },
        {
          headerName: "Payment",
          minWidth: 110,
          flex: 0,
          width: 120,
          cellRenderer: makePayRenderer(goPay, "Payment", true),
        },
      ];
    }

    return [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: "structureName", headerName: "Structure", minWidth: 160 },
      {
        headerName: "Course",
        minWidth: 180,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) return "";
          const year = row.courseYearName ?? "";
          const ay = row.academicYear ? ` (${row.academicYear})` : "";
          return `${year}${ay}`;
        },
      },
      { headerName: "Status", minWidth: 90, cellRenderer: statusRenderer },
      {
        headerName: payColumnHeader,
        minWidth: 120,
        flex: 0,
        width: 130,
        cellRenderer: makePayRenderer(goPay, payColumnHeader, false),
      },
    ];
  }, [isFeePayment, payColumnHeader, goPay, goView]);

  const showBack =
    Boolean(backHref) ||
    (isFeePayment && Boolean(selectedStudent) && feeRows.length > 0);

  const studentFilter = (
    <div className="grid max-w-xl grid-cols-1 gap-4">
      <Select
        className={FILTER_CARD_SELECT_CLASS}
        label="Student"
        required
        value={studentId}
        onChange={handleStudentChange}
        options={studentOptions}
        placeholder="Search by student name or roll no."
        searchable
        onSearch={(t) => void onStudentSearch(t)}
        isLoading={studentSearchLoading}
        clearable
      />
    </div>
  );

  if (useFilteredShell) {
    return (
      <FilteredListPage
        title={title}
        filters={
          <div className="space-y-4">
            {studentFilter}
            {selectedStudent && studentNum > 0 ? (
              <FeeStudentProfileCard student={selectedStudent} />
            ) : null}
          </div>
        }
        columnDefs={columnDefs}
        rowData={selectedStudent && studentNum > 0 ? feeRows : []}
        loading={isLoading && studentNum > 0}
        height="auto"
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: isFeePayment ? "Search fee data…" : "Search…",
          exportExcel: true,
          exportPdf: true,
        }}
      >
        {showBack ? (
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
              onClick={() => {
                if (backHref) {
                  router.push(backHref);
                  return;
                }
                clearSelection();
              }}
            >
              Back
            </Button>
          </div>
        ) : null}

        <FeeDetailsModal
          open={detailsTarget != null}
          onClose={() => setDetailsTarget(null)}
          target={detailsTarget}
        />
      </FilteredListPage>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title={title} fieldMaxWidth="32rem">
        {studentFilter}
      </FilterCard>

      {selectedStudent && studentNum > 0 ? (
        <>
          <FeeStudentProfileCard student={selectedStudent} />

          {feeRows.length > 0 || isLoading ? (
            <TableCard
              headerLeft={
                <span className="text-sm font-medium">Student Fee Data</span>
              }
            >
              <DataTable
                columnDefs={columnDefs}
                rowData={feeRows}
                loading={isLoading}
                height="auto"
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search…",
                  exportExcel: true,
                  exportPdf: true,
                }}
              />
            </TableCard>
          ) : null}
        </>
      ) : null}

      {showBack ? (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
            onClick={() => {
              if (backHref) {
                router.push(backHref);
                return;
              }
              clearSelection();
            }}
          >
            Back
          </Button>
        </div>
      ) : null}

      <FeeDetailsModal
        open={detailsTarget != null}
        onClose={() => setDetailsTarget(null)}
        target={detailsTarget}
      />
    </PageContainer>
  );
}
