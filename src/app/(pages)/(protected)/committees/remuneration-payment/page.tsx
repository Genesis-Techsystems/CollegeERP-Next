"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  listRemunerationPaymentSummary,
  listUnivExamFilters,
  submitRemunerationPayment,
} from "@/services";
import type {
  RemunerationPaymentSummary,
  RemunerationPaymentWritePayload,
  UnivExamFilterRow,
} from "@/types/committees";
import { PaymentModal, type PaymentModalContext } from "./PaymentModal";

/** Angular remuneration-payment hardcodes `in_orgid: 1` for filter + list SPs. */
const FILTER_ORG_ID = 1;

/** Angular HTML hardcodes roles (API role list is unused). */
const ROLE_OPTIONS = [
  { value: "0", label: "All" },
  { value: "64", label: "Evaluator" },
  { value: "67", label: "Moderator" },
  { value: "70", label: "Question Paper Setter" },
];

const BTN_NAVY = "bg-[#001f3f] text-white hover:bg-[#002a54]";

function pickText(
  row: UnivExamFilterRow | null | undefined,
  key: keyof UnivExamFilterRow,
): string {
  if (!row) return "";
  const value = row[key];
  if (value != null && String(value).trim() !== "") return String(value);
  return "";
}

function pickNum(
  row: UnivExamFilterRow | null | undefined,
  key: keyof UnivExamFilterRow,
): number {
  if (!row) return 0;
  const n = Number(row[key]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (!key && key !== 0) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fmtDisplayDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd/MM/yyyy");
}

function fmtExamOptionDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MMM d, y");
}

function examOptionLabel(row: UnivExamFilterRow): string {
  const name =
    pickText(row, "exam_name") ||
    `Exam ${pickNum(row, "pk_university_exam_id")}`;
  // Angular template uses from_date for both ends of the range.
  const from = fmtExamOptionDate(pickText(row, "from_date"));
  let label = from ? `${name} (${from} - ${from})` : name;
  if (isTruthyFlag(row.is_internal_exam)) label += " (Internal)";
  if (isTruthyFlag(row.is_regular_exam)) label += " (Regular)";
  if (isTruthyFlag(row.is_supply_exam)) label += " (Supple)";
  return label;
}

function rowKey(row: RemunerationPaymentSummary): string {
  return (
    row.pk_univ_examinationremuneration_ids ??
    String(
      row.fk_univ_remuneration_trsansaction_id ?? row.remuneration_to ?? "",
    )
  );
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<RemunerationPaymentSummary>,
  role: {
    field: "role_name",
    headerName: "Role",
    minWidth: 140,
  } as ColDef<RemunerationPaymentSummary>,
  profileName: {
    field: "remuneration_to",
    headerName: "Profile Name",
    minWidth: 180,
  } as ColDef<RemunerationPaymentSummary>,
  examDate: {
    field: "exam_month_yr",
    headerName: "Exam Date",
    minWidth: 120,
  } as ColDef<RemunerationPaymentSummary>,
  totalPapers: {
    field: "total_nos",
    headerName: "Total No.Of Papers",
    minWidth: 140,
    flex: 0,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<RemunerationPaymentSummary>,
  amount: {
    field: "total_amount",
    headerName: "Total Amount",
    minWidth: 120,
    flex: 0,
    cellClass: "ag-right-aligned-cell",
  } as ColDef<RemunerationPaymentSummary>,
  receipt: {
    headerName: "Receipt",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<RemunerationPaymentSummary>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    flex: 0,
    width: 110,
  } as ColDef<RemunerationPaymentSummary>,
};

function makeReceiptRenderer(
  onView: (row: RemunerationPaymentSummary) => void,
) {
  return (p: ICellRendererParams<RemunerationPaymentSummary>) => {
    const row = p.data;
    if (!row) return null;
    if (row.fk_univ_remuneration_trsansaction_id == null) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    return (
      <button
        type="button"
        className="cursor-pointer text-xs font-medium text-[#001f3f] underline"
        onClick={() => onView(row)}
      >
        View
      </button>
    );
  };
}

function makeActionsRenderer(onPay: (row: RemunerationPaymentSummary) => void) {
  return (p: ICellRendererParams<RemunerationPaymentSummary>) => {
    const row = p.data;
    if (!row) return null;
    if (row.fk_univ_remuneration_trsansaction_id != null) {
      return (
        <span className="text-xs font-semibold text-emerald-700">Paid</span>
      );
    }
    return (
      <Button
        type="button"
        size="sm"
        className={`h-[30px] px-4 text-[12px] font-medium ${BTN_NAVY}`}
        disabled={!row.pk_univ_examinationremuneration_ids}
        onClick={() => onPay(row)}
      >
        Pay
      </Button>
    );
  };
}

export default function RemunerationPaymentPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving: empResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [orgCode, setOrgCode] = useState<string | null>(null);
  const [examMonthYear, setExamMonthYear] = useState<string | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);

  const [showTable, setShowTable] = useState(false);
  const [rows, setRows] = useState<RemunerationPaymentSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentRow, setPaymentRow] =
    useState<RemunerationPaymentSummary | null>(null);
  const [paymentContext, setPaymentContext] =
    useState<PaymentModalContext | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtersReady = employeeId > 0;

  const { data: filterRows = [], isLoading: loadingFilters } = useQuery({
    queryKey: QK.examinationRemuneration.univExamFilters(
      FILTER_ORG_ID,
      employeeId,
    ),
    queryFn: () => listUnivExamFilters(FILTER_ORG_ID, employeeId),
    enabled: filtersReady,
  });

  const orgOptions = useMemo(
    () =>
      dedupeBy(filterRows, (r) => pickText(r, "org_code")).map((r) => {
        const code = pickText(r, "org_code");
        return { value: code, label: code };
      }),
    [filterRows],
  );

  const monthYearOptions = useMemo(() => {
    if (!orgCode) return [];
    const base = filterRows.filter((r) => pickText(r, "org_code") === orgCode);
    return dedupeBy(base, (r) => pickText(r, "exam_month_yr"))
      .sort(
        (a, b) =>
          new Date(pickText(b, "exam_month_yr")).getTime() -
          new Date(pickText(a, "exam_month_yr")).getTime(),
      )
      .map((r) => {
        const value = pickText(r, "exam_month_yr");
        return { value, label: fmtDisplayDate(value) || value };
      });
  }, [filterRows, orgCode]);

  const examOptions = useMemo(() => {
    if (!orgCode || !examMonthYear) return [];
    const base = filterRows.filter(
      (r) =>
        pickText(r, "org_code") === orgCode &&
        pickText(r, "exam_month_yr") === examMonthYear,
    );
    return dedupeBy(base, (r) => pickNum(r, "pk_university_exam_id")).map(
      (r) => {
        const id = pickNum(r, "pk_university_exam_id");
        return { value: String(id), label: examOptionLabel(r) };
      },
    );
  }, [filterRows, orgCode, examMonthYear]);

  function handleOrgChange(value: string | null) {
    setOrgCode(value);
    setExamMonthYear(null);
    setExamId(null);
    setRoleId(null);
    setShowTable(false);
    setRows([]);
  }

  function handleMonthChange(value: string | null) {
    setExamMonthYear(value);
    setExamId(null);
    setRoleId(null);
    setShowTable(false);
    setRows([]);
  }

  function handleExamChange(value: string | null) {
    setExamId(value ? Number(value) : null);
    setRoleId(null);
    setShowTable(false);
    setRows([]);
  }

  const openPayment = useCallback(
    (row: RemunerationPaymentSummary) => {
      if (!orgCode || !examId) {
        toastError("Select Organization and Exam before payment");
        return;
      }
      const orgRow = filterRows.find(
        (r) => pickText(r, "org_code") === orgCode,
      );
      const examRow = filterRows.find(
        (r) => pickNum(r, "pk_university_exam_id") === examId,
      );
      const fkOrgId = pickNum(orgRow, "fk_org_id");
      if (!fkOrgId) {
        toastError("Organization id not found for payment");
        return;
      }
      setPaymentContext({
        orgName: orgCode,
        orgId: fkOrgId,
        examName: pickText(examRow, "exam_name"),
      });
      setPaymentRow(row);
      setPaymentOpen(true);
    },
    [orgCode, examId, filterRows],
  );

  const columnDefs = useMemo<ColDef<RemunerationPaymentSummary>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.role,
      COL_DEFS.profileName,
      COL_DEFS.examDate,
      COL_DEFS.totalPapers,
      COL_DEFS.amount,
      { ...COL_DEFS.receipt, cellRenderer: makeReceiptRenderer(openPayment) },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openPayment) },
    ],
    [openPayment],
  );

  async function loadSummary() {
    if (!orgCode || !examMonthYear || !examId) {
      toastError("Please select Organization, Exam Month Year and Exam");
      return;
    }
    setLoadingSummary(true);
    try {
      const list = await listRemunerationPaymentSummary({
        orgId: FILTER_ORG_ID,
        examMonthYear,
        examId,
        roleId: roleId != null ? Number(roleId) : 0,
      });
      setRows(list);
      setShowTable(true);
      toastSuccess(
        list.length ? `Loaded ${list.length} record(s)` : "No records found",
      );
    } catch (error) {
      toastError(error, "Failed to load payment summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleSubmitPayment(payload: RemunerationPaymentWritePayload) {
    if (!paymentRow?.pk_univ_examinationremuneration_ids) return;
    setSubmitting(true);
    try {
      await submitRemunerationPayment(
        paymentRow.pk_univ_examinationremuneration_ids,
        payload,
      );
      toastSuccess("Remuneration payment submitted");
      setPaymentOpen(false);
      setPaymentRow(null);
      setPaymentContext(null);
      await loadSummary();
      await queryClient.invalidateQueries({
        queryKey: QK.examinationRemuneration.all,
      });
    } catch (error) {
      toastError(error, "Failed to submit remuneration payment");
    } finally {
      setSubmitting(false);
    }
  }

  const filtersLoading = sessionLoading || empResolving || loadingFilters;

  return (
    <FilteredListPage
      title="Remuneration Payment"
      filters={
        <>
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <Select
              label="Organization"
              required
              className="md:col-span-2"
              value={orgCode}
              onChange={handleOrgChange}
              options={orgOptions}
              placeholder="Organization"
              searchable
              isLoading={filtersLoading}
            />
            <Select
              label="Exam Month Year"
              required
              className="md:col-span-3"
              value={examMonthYear}
              onChange={handleMonthChange}
              options={monthYearOptions}
              placeholder="Exam Month Year"
              searchable
              disabled={!orgCode}
            />
            <Select
              label="Exam"
              required
              className="md:col-span-4"
              value={examId ? String(examId) : null}
              onChange={handleExamChange}
              options={examOptions}
              placeholder="Exam"
              searchable
              disabled={!examMonthYear}
            />
            <Select
              label="Role"
              className="md:col-span-3"
              value={roleId}
              onChange={(v) => {
                setRoleId(v);
                setShowTable(false);
                setRows([]);
              }}
              options={ROLE_OPTIONS}
              placeholder="Role"
              searchable
              clearable
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              className={BTN_NAVY}
              onClick={() => void loadSummary()}
              disabled={!examId || !examMonthYear || !orgCode || loadingSummary}
            >
              Get List
            </Button>
          </div>
        </>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingSummary}
      height="480px"
      getRowId={(p) => rowKey(p.data)}
      toolbar={false}
    >
      <PaymentModal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentRow(null);
          setPaymentContext(null);
        }}
        row={paymentRow}
        context={paymentContext}
        employeeId={employeeId}
        onSave={(payload) => void handleSubmitPayment(payload)}
        isSubmitting={submitting}
      />
    </FilteredListPage>
  );
}
