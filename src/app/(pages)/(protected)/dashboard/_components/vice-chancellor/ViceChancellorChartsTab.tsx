"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QK } from "@/lib/query-keys";
import {
  getExpenseSummaryChart,
  getFeeDiscountSummaryChart,
  getFeeSummaryChart,
  getIncomeExpenseSummaryChart,
  getScholarshipSummaryChart,
  getSchoolWiseEmployeesChart,
  getSchoolWiseSalariesChart,
  getSchoolWiseStudentsChart,
  getVcDashboardAcademicYears,
  getVcDashboardReport,
  persistDashboardReport,
  resolveVcChartCollegeId,
} from "@/services";
import { AdmissionsPieChart } from "./AdmissionsPieChart";
import { ProcDrilldownChart } from "./ProcDrilldownChart";
import {
  InventoryStockSummary,
  LibrarySummaryGrid,
  TransportSummary,
} from "./SummaryWidgets";
import { VC_CHART_COLORS, type DrillSpec } from "./vc-chart-utils";

function WidgetCard({
  title,
  year,
  children,
  className,
}: {
  title: string;
  year?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const showYear = Boolean(year) && year !== "0";
  return (
    <div
      className={`rounded-sm bg-white shadow-[0_2px_4px_rgba(0,0,0,0.12)] ${className ?? ""}`}
    >
      <div className="flex items-center border-b border-[#ffcf46] px-4 py-2">
        <h3 className="text-[15px] font-semibold text-[#042956]">
          {title}
          {showYear ? ` for ${year}` : ""}
        </h3>
      </div>
      <div className="overflow-hidden p-2.5">{children}</div>
    </div>
  );
}

const FEE_SPEC: DrillSpec = {
  category: ["District", "College", "Fees Category"],
  categoryName: ["district_name", "college_shortname", "fee_category_name"],
  categoryId: ["pk_district_id", "pk_college_id", "pk_fee_category_id"],
  columns: ["discount", "balance", "paid"],
  columnsTitle: ["Discount", "Balance", "Paid"],
  colors: [...VC_CHART_COLORS],
  valueMode: "suffix",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "District",
  yAxisTitle: "Fee Amount",
  showLegend: true,
};

const SCHOLARSHIP_SPEC: DrillSpec = {
  category: ["College", "Course"],
  categoryName: ["college_code", "course_code"],
  categoryId: ["college_code", "course_code"],
  columns: ["applied", "received", "balance"],
  columnsTitle: ["Applied", "Received", "Balance"],
  colors: [...VC_CHART_COLORS],
  valueMode: "suffix",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "College",
  yAxisTitle: "Scholarship Amount",
  showLegend: true,
};

const SALARY_SPEC: DrillSpec = {
  category: ["district", "College", "Month"],
  categoryName: ["district_name", "college_shortname", "month"],
  categoryId: ["pk_district_id", "pk_college_id", "month"],
  columns: ["Amount"],
  columnsTitle: ["Employees Salary"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "Salary Amount",
  showLegend: false,
};

const FACULTY_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_shortname"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["emp_count"],
  columnsTitle: ["Employees Count"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "No of employees",
  showLegend: false,
};

const STUDENTS_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_shortname"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["total_students"],
  columnsTitle: ["Students Count"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "No of students",
  showLegend: false,
};

const INCOME_SPEC: DrillSpec = {
  category: ["District", "College"],
  categoryName: ["district_name", "college_shortname"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["TotalIncome", "TotalExpense"],
  columnsTitle: ["Total Income", "Total Expense"],
  colors: [...VC_CHART_COLORS],
  valueMode: "direct",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "District",
  yAxisTitle: "Amount",
  showLegend: true,
};

const DISCOUNT_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_name"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["discount_amount"],
  columnsTitle: ["Discount Amount"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "Discount Amount",
  showLegend: false,
};

const EXPENSE_SPEC: DrillSpec = {
  category: ["district", "college", "Month"],
  categoryName: ["district_name", "college_shortname", "Category"],
  categoryId: ["pk_district_id", "pk_college_id", "Category"],
  columns: ["TotalExpense"],
  columnsTitle: ["Total Expenses"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "Total Expense",
  showLegend: false,
};

type Props = {
  organizationId: number;
  employeeId: number;
};

export function ViceChancellorChartsTab({ organizationId, employeeId }: Props) {
  const collegeId = resolveVcChartCollegeId();
  const principal =
    typeof globalThis.window !== "undefined" &&
    globalThis.localStorage.getItem("isPRINCIPAL") === "true";

  const [year, setYear] = useState("");

  const yearsQ = useQuery({
    queryKey: QK.vcDashboard.academicYears(organizationId, employeeId),
    queryFn: () => getVcDashboardAcademicYears(organizationId, employeeId),
    enabled: organizationId > 0 || employeeId > 0,
  });

  const academicYears = yearsQ.data ?? [];
  const yearOptions = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.academic_year),
        label: String(y.academic_year),
      })),
    [academicYears],
  );

  useEffect(() => {
    if (principal) return;
    if (!academicYears.length) return;
    setYear((prev) => prev || String(academicYears[0].academic_year));
  }, [academicYears, principal]);

  useQuery({
    queryKey: QK.vcDashboard.report(),
    queryFn: async () => {
      const counts = await getVcDashboardReport();
      persistDashboardReport(counts);
      return counts;
    },
  });

  const chartsEnabled = principal || Boolean(year);

  if (yearsQ.isLoading && !principal) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-3 rounded-sm bg-[#f5f5f5] p-2">
      <div className="rounded-sm bg-white p-3 shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
        <div className="w-full max-w-[220px]">
          <Select
            label="Academic Year"
            value={year || null}
            onChange={(v) => setYear(v ?? "")}
            options={yearOptions}
            placeholder="Academic Year"
            searchable={false}
            clearable={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <WidgetCard title="Fee Summary" year={year}>
          <ProcDrilldownChart
            name="fee-summary"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getFeeSummaryChart}
            spec={FEE_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Admissions" year={year}>
          <AdmissionsPieChart
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
          />
        </WidgetCard>
        <WidgetCard title="Scholarship Summary" year={year}>
          <ProcDrilldownChart
            name="scholarship"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getScholarshipSummaryChart}
            spec={SCHOLARSHIP_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Salary Summary" year={year}>
          <ProcDrilldownChart
            name="salaries"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseSalariesChart}
            spec={SALARY_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Faculty Count" year={year}>
          <ProcDrilldownChart
            name="employees"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseEmployeesChart}
            spec={FACULTY_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Students Count" year={year}>
          <ProcDrilldownChart
            name="students"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseStudentsChart}
            spec={STUDENTS_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Income & Expense Summary" year={year}>
          <ProcDrilldownChart
            name="income-expense"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getIncomeExpenseSummaryChart}
            spec={INCOME_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Discount Summary" year={year}>
          <ProcDrilldownChart
            name="discount"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getFeeDiscountSummaryChart}
            spec={DISCOUNT_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Expense Summary" year={year}>
          <ProcDrilldownChart
            name="expense"
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
            fetchRows={getExpenseSummaryChart}
            spec={EXPENSE_SPEC}
          />
        </WidgetCard>
        <WidgetCard title="Inventory Stock Summary" year={year}>
          <InventoryStockSummary
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
          />
        </WidgetCard>
        <WidgetCard
          title="Library Summary"
          year={year}
          className="lg:col-span-1"
        >
          <LibrarySummaryGrid
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
          />
        </WidgetCard>
        <WidgetCard title="Transport Summary" year={year}>
          <TransportSummary
            collegeId={collegeId}
            year={year}
            enabled={chartsEnabled}
          />
        </WidgetCard>
      </div>
    </div>
  );
}
