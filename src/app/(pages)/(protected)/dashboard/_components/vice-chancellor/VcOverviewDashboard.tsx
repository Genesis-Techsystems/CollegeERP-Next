"use client";

import { BarChart, PieChart } from "@/common/components/charts";
import { Table, type TableColumn } from "@/common/components/table";
import { readDashStorage } from "@/services";

const FUSION = [
  "#5d62b5",
  "#29c3be",
  "#f2726f",
  "#ffc533",
  "#bc95df",
  "#67cdf2",
];

function ChartCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm bg-white shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
      {title ? (
        <div className="flex items-center border-b border-[#ffcf46] px-4 py-2">
          <h3 className="w-full text-center text-[15px] font-semibold text-[#042956]">
            {title}
          </h3>
        </div>
      ) : null}
      <div className="p-2.5">{children}</div>
    </div>
  );
}

const ADMISSIONS = [
  {
    name: "2020",
    "Total Applications": 10000,
    Enrollments: 2500,
    "Dropout Rate": 10,
    "International Students": 500,
  },
  {
    name: "2021",
    "Total Applications": 12000,
    Enrollments: 3000,
    "Dropout Rate": 8,
    "International Students": 600,
  },
  {
    name: "2022",
    "Total Applications": 11500,
    Enrollments: 2800,
    "Dropout Rate": 9,
    "International Students": 550,
  },
  {
    name: "2023",
    "Total Applications": 13200,
    Enrollments: 3500,
    "Dropout Rate": 7,
    "International Students": 700,
  },
];

const ENROLL_KPI = [
  {
    name: "Total Enrolled Students",
    "Current Value": 2285,
    "Target Value": 3500,
    "Year-to-Date Value": 2100,
  },
  {
    name: "Total Faculty Members",
    "Current Value": 100,
    "Target Value": 120,
    "Year-to-Date Value": 80,
  },
  {
    name: "Number of Courses Offered",
    "Current Value": 25,
    "Target Value": 28,
    "Year-to-Date Value": 25,
  },
  {
    name: "Total Applications Received",
    "Current Value": 5000,
    "Target Value": 6000,
    "Year-to-Date Value": 4500,
  },
  {
    name: "Number of Graduates",
    "Current Value": 2000,
    "Target Value": 2100,
    "Year-to-Date Value": 1900,
  },
];

const BUDGET = [
  { name: "Personnel Costs", value: 20000000 },
  { name: "Infrastructure Development", value: 8000000 },
  { name: "Research Funding", value: 6000000 },
  { name: "Student Support", value: 4000000 },
  { name: "Academic Programs", value: 5000000 },
  { name: "Administrative Units", value: 3000000 },
  { name: "Marketing and Outreach", value: 2000000 },
  { name: "Contingency and Miscellaneous Exp", value: 2000000 },
];

const FINANCIAL = [
  { name: "Budget Amount", amount: 50000000 },
  { name: "Expenditure", amount: 45000000 },
  { name: "Research Grants and Funding", amount: 6500000 },
  { name: "Scholarships and Financial Aid", amount: 2500000 },
  { name: "Revenue from Tuition Fees", amount: 35000000 },
  { name: "Donations and other Grants", amount: 10000000 },
  { name: "Other Income", amount: 5000000 },
];

const DEPT_FUNDING = [
  { name: "Computer Science", value: 10000000 },
  { name: "Electrical Engineering", value: 8500000 },
  { name: "Business Administration", value: 6200000 },
  { name: "Mathematics", value: 5000000 },
  { name: "English", value: 4800000 },
];

const RESEARCH_GRANTS = [
  { name: "Advancements in Renewable Energy", amount: 5000000 },
  { name: "Cancer Research", amount: 3500000 },
  { name: "Artificial Intelligence in Education", amount: 2000000 },
];

const ACADEMIC = [
  {
    name: "Course Completion Rate",
    "2022-2023": 0.93,
    "2021-2022": 0.91,
    "2020-2021": 0.92,
  },
  {
    name: "Faculty Evaluation Score",
    "2022-2023": 4.3,
    "2021-2022": 4.1,
    "2020-2021": 4.2,
  },
  {
    name: "Student Average GPA",
    "2022-2023": 3.7,
    "2021-2022": 3.6,
    "2020-2021": 3.2,
  },
];

const RESEARCH_METRICS = [
  {
    name: "Number of Published Papers",
    "2020-2021": 150,
    "2021-2022": 170,
    "2022-2023": 180,
  },
  {
    name: "Researh Citations",
    "2020-2021": 250,
    "2021-2022": 300,
    "2022-2023": 350,
  },
  {
    name: "Research Awards",
    "2020-2021": 60,
    "2021-2022": 75,
    "2022-2023": 120,
  },
  {
    name: "Patents Filed",
    "2020-2021": 50,
    "2021-2022": 68,
    "2022-2023": 92,
  },
];

const STAFF = [
  { name: "Engineering", "Total Faculty": 40, "Total Staff": 20, Vacancies: 2 },
  { name: "Business", "Total Faculty": 30, "Total Staff": 15, Vacancies: 1 },
  { name: "Sciences", "Total Faculty": 50, "Total Staff": 25, Vacancies: 3 },
  { name: "Arts", "Total Faculty": 25, "Total Staff": 10, Vacancies: 0 },
  {
    name: "Social Sciences",
    "Total Faculty": 35,
    "Total Staff": 18,
    Vacancies: 1,
  },
];

type RankRow = {
  Rankingtype: string;
  RankingPosition: string;
  year: string;
};
const RANK_COLS: TableColumn<RankRow>[] = [
  { id: "Rankingtype", label: "Ranking type", width: 40 },
  { id: "RankingPosition", label: "Ranking Position", width: 35 },
  { id: "year", label: "Year", width: 25 },
];
const RANK_ROWS: RankRow[] = [
  { Rankingtype: "National University", RankingPosition: "5th", year: "2022" },
  { Rankingtype: "Global University", RankingPosition: "50th", year: "2023" },
  {
    Rankingtype: "Subject Ranking(STEM)",
    RankingPosition: "8th",
    year: "2022",
  },
  {
    Rankingtype: "Accrediation",
    RankingPosition: "AACSB Accredited",
    year: "-",
  },
  {
    Rankingtype: "Accrediation",
    RankingPosition: "ABET Accredited",
    year: "-",
  },
  { Rankingtype: "Accrediation", RankingPosition: "NAAC A+ Grade", year: "-" },
];

type PlanRow = {
  StrategicInitiative: string;
  ProgressReport: string;
  NextSteps: string;
};
const PLAN_COLS: TableColumn<PlanRow>[] = [
  { id: "StrategicInitiative", label: "Strategic Initiative", width: 28 },
  { id: "ProgressReport", label: "Progress Report", width: 36 },
  { id: "NextSteps", label: "Next Steps", width: 36 },
];
const PLAN_ROWS: PlanRow[] = [
  {
    StrategicInitiative: "Enhancing Research",
    ProgressReport: "Established new research centers and increased funding",
    NextSteps: "Foster interdisciplinary collaborations and expand grants",
  },
  {
    StrategicInitiative: "Strengthening Education",
    ProgressReport:
      "Revised curriculum to align with industry needs and trends",
    NextSteps: "Implement innovative teaching methods and technologies",
  },
  {
    StrategicInitiative: "Improving Campus Facilities",
    ProgressReport: "Renovated science labs and upgraded campus infrastructure",
    NextSteps: "Enhance student facilities and create sustainable spaces",
  },
  {
    StrategicInitiative: "Diversity and Inclusion",
    ProgressReport:
      "Launched diversity training programs and formed inclusivity committees",
    NextSteps: "Develop equity-focused policies and initiatives",
  },
  {
    StrategicInitiative: "Alumni Engagement",
    ProgressReport:
      "Organized networking events and launched alumni mentorship program",
    NextSteps: "Expand alumni outreach and establish alumni chapters",
  },
];

function ViceChancellorOverview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard>
          <BarChart
            data={ADMISSIONS}
            keys={[
              "Total Applications",
              "Enrollments",
              "Dropout Rate",
              "International Students",
            ]}
            colors={FUSION}
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={ENROLL_KPI}
            keys={["Current Value", "Target Value", "Year-to-Date Value"]}
            colors={FUSION}
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <PieChart data={BUDGET} donut height={280} />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={FINANCIAL}
            keys={["amount"]}
            colors={[
              "#29c3be",
              "#ffc533",
              "#bc95df",
              "#5d62b5",
              "#f2726f",
              "#67cdf2",
              "#29c3be",
            ]}
            type="column"
            showLegend={false}
            yAxisLabel="Amount"
            xAxisLabel="Particular"
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <PieChart data={DEPT_FUNDING} donut height={280} />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={RESEARCH_GRANTS}
            keys={["amount"]}
            showLegend={false}
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={ACADEMIC}
            keys={["2022-2023", "2021-2022", "2020-2021"]}
            type="column"
            colors={FUSION}
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={RESEARCH_METRICS}
            keys={["2020-2021", "2021-2022", "2022-2023"]}
            colors={FUSION}
            height={280}
          />
        </ChartCard>
        <ChartCard>
          <BarChart
            data={STAFF}
            keys={["Total Faculty", "Total Staff", "Vacancies"]}
            colors={FUSION}
            height={280}
          />
        </ChartCard>
        <ChartCard title="Accredation And Ranking">
          <Table
            rows={RANK_ROWS}
            columns={RANK_COLS}
            pageSize={0}
            density="compact"
          />
        </ChartCard>
      </div>
      <ChartCard title="Strategic Planning">
        <Table
          rows={PLAN_ROWS}
          columns={PLAN_COLS}
          pageSize={0}
          density="compact"
        />
      </ChartCard>
    </div>
  );
}

function CenterInchargeOverview() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard>
        <BarChart
          data={ADMISSIONS}
          keys={["Total Applications", "Enrollments"]}
          colors={FUSION}
          height={280}
        />
      </ChartCard>
      <ChartCard>
        <BarChart
          data={ENROLL_KPI}
          keys={["Current Value", "Target Value"]}
          colors={FUSION}
          height={280}
        />
      </ChartCard>
      <ChartCard>
        <BarChart
          data={ACADEMIC}
          keys={["2022-2023", "2021-2022", "2020-2021"]}
          type="column"
          colors={FUSION}
          height={280}
        />
      </ChartCard>
      <ChartCard>
        <BarChart
          data={RESEARCH_METRICS}
          keys={["2020-2021", "2021-2022", "2022-2023"]}
          colors={FUSION}
          height={280}
        />
      </ChartCard>
    </div>
  );
}

export function VcOverviewDashboard() {
  const role = (
    readDashStorage("userRole") ??
    readDashStorage("roleName") ??
    ""
  ).toUpperCase();
  return (
    <div className="rounded-sm bg-[#f5f5f5] p-2">
      {role === "CENTER INCHARGE" ? (
        <CenterInchargeOverview />
      ) : (
        <ViceChancellorOverview />
      )}
    </div>
  );
}
