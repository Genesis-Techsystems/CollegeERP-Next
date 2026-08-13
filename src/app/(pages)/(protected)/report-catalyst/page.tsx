"use client";

/**
 * Report Catalog — Angular `report-catalyst` / OverallReports landing parity.
 * Matches Angular Fuse Widget layout, floating top-left icon badges, border colors,
 * aligned box heights, and report link styles.
 */

import Link from "next/link";
import {
  Users,
  Calendar,
  BarChart3,
  BookOpen,
  DollarSign,
  FileText,
} from "lucide-react";
import { PageContainer } from "@/components/layout";

type ReportItem = {
  label: string;
  href: string;
};

type ReportSection = {
  title: string;
  icon: typeof Users;
  borderColor: string;
  gradient: string;
  items: ReportItem[];
};

const REPORT_SECTIONS: ReportSection[] = [
  {
    title: "ADMISSION REPORTS",
    icon: Users,
    borderColor: "border-[#24d5dc]",
    gradient: "from-[#17ead9] to-[#6078ea]",
    items: [
      {
        label: "Day Wise Application",
        href: "/reports/admin-student-reports/day-wise-admission-report?path=report-catalyst",
      },
      {
        label: "Admission",
        href: "/reports/admin-student-reports/student-application-report?path=report-catalyst",
      },
      {
        label: "Student Count",
        href: "/reports/admin-student-reports/branch-academicyear-wise-student-count?path=report-catalyst",
      },
      {
        label: "Student Count By Quota",
        href: "/reports/admin-student-reports/admission-quota-wise-student-count-report?path=report-catalyst",
      },
      {
        label: "Student Count By Gender",
        href: "/reports/admin-student-reports/students-gender-count?path=report-catalyst",
      },
      {
        label: "Student Count By Caste",
        href: "/reports/admin-student-reports/branch-and-academicyear-wise-caste-count?path=report-catalyst",
      },
      {
        label: "Student Caste Wise Gender Count",
        href: "/reports/admin-student-reports/student-caste-wise-gender-count-report?path=report-catalyst",
      },
      {
        label: "Student List",
        href: "/reports/admin-student-reports/students-list-report?path=report-catalyst",
      },
      {
        label: "Semester List",
        href: "/reports/admin-student-reports/sem-list-report?path=report-catalyst",
      },
      {
        label: "Lateral Students",
        href: "/reports/admin-student-reports/lateral-students-report?path=report-catalyst",
      },
      {
        label: "Student Contact",
        href: "/reports/admin-student-reports/student-contact-report?path=report-catalyst",
      },
      {
        label: "Student Detained List",
        href: "/reports/admin-student-reports/student-detained-list?path=report-catalyst",
      },
      {
        label: "Student Rejoin List",
        href: "/reports/admin-student-reports/students-rejoined-list?path=report-catalyst",
      },
    ],
  },
  {
    title: "TIMETABLE REPORTS",
    icon: Calendar,
    borderColor: "border-[#f7559a]",
    gradient: "from-[#f54ea2] to-[#ff7676]",
    items: [
      {
        label: "Daily Time Table",
        href: "/reports/admin-timetable-reports/daily-timetable-report?path=report-catalyst",
      },
      {
        label: "Weekly Time Table",
        href: "/reports/admin-timetable-reports/weekly-timetable-report?path=report-catalyst",
      },
      {
        label: "Staff Time Table",
        href: "/reports/admin-timetable-reports/staff-timetable-report?path=report-catalyst",
      },
      {
        label: "Semester Wise Time Table",
        href: "/reports/admin-timetable-reports/semester-wise-timetable-report?path=report-catalyst",
      },
      {
        label: "Department Wise Time Table",
        href: "/reports/admin-timetable-reports/department-wise-timetable-report?path=report-catalyst",
      },
      {
        label: "Master Time Table",
        href: "/reports/admin-timetable-reports/master-timetable-report?path=report-catalyst",
      },
      {
        label: "Daily Satistical Time Table",
        href: "/reports/admin-timetable-reports/daily-statistical-report?path=report-catalyst",
      },
      {
        label: "Staff Workload Time Table",
        href: "/reports/admin-timetable-reports/staff-workload-report?path=report-catalyst",
      },
      {
        label: "Staff Proxy Time Table",
        href: "/reports/admin-timetable-reports/staff-proxy-report?path=report-catalyst",
      },
    ],
  },
  {
    title: "ATTENDANCE REPORTS",
    icon: BarChart3,
    borderColor: "border-[#41dc9c]",
    gradient: "from-[#42e695] to-[#3bb2b8]",
    items: [
      {
        label: "Daily Attendance",
        href: "/reports/admin-attendance-reports/daily-attendance-report?path=report-catalyst",
      },
      {
        label: "Student Attendance Percentage",
        href: "/reports/admin-attendance-reports/student-attendance-percentage-report?path=report-catalyst",
      },
      {
        label: "Subject Wise Student Attendance",
        href: "/reports/admin-attendance-reports/subject-wise-attendance-report?path=report-catalyst",
      },
      {
        label: "Student Attendance",
        href: "/reports/admin-attendance-reports/student-attendance-report?path=report-catalyst",
      },
      {
        label: "Counselor Attendance",
        href: "/reports/admin-attendance-reports/counselor-attendance-report?path=report-catalyst",
      },
      {
        label: "Counselor Activity",
        href: "/reports/admin-attendance-reports/counselor-activity-report?path=report-catalyst",
      },
      {
        label: "Mentor Fornight",
        href: "/reports/admin-attendance-reports/mentor-fortnight-report?path=report-catalyst",
      },
      {
        label: "Employee Attendance",
        href: "/reports/admin-attendance-reports/employee-attendance-report?path=report-catalyst",
      },
      {
        label: "Employee Attendance Summary",
        href: "/reports/admin-attendance-reports/employee-attendance-summary-report?path=report-catalyst",
      },
      {
        label: "Subject Wise Faculty Attendance",
        href: "/reports/admin-attendance-reports/subject-wise-faculty-attendance-report?path=report-catalyst",
      },
      {
        label: "Faculty Subjects Attendance",
        href: "/reports/admin-attendance-reports/faculty-subjects-attendance-report?path=report-catalyst",
      },
    ],
  },
  {
    title: "LIBRARY REPORTS",
    icon: BookOpen,
    borderColor: "border-[#ffce44]",
    gradient: "from-[#ffdf40] to-[#ff8359]",
    items: [
      {
        label: "Titles",
        href: "/reports/admin-library-reports/total-titles-report?path=report-catalyst",
      },
      {
        label: "Book Count",
        href: "/reports/admin-library-reports/book-wise-report?path=report-catalyst",
      },
      {
        label: "Total Books",
        href: "/reports/admin-library-reports/total-books-report?path=report-catalyst",
      },
      {
        label: "Books Consolidated",
        href: "/reports/admin-library-reports/library-consolidated-report?path=report-catalyst",
      },
      {
        label: "Book Search",
        href: "/reports/admin-library-reports/book-search-report?path=report-catalyst",
      },
      {
        label: "Periodicals",
        href: "/reports/admin-library-reports/periodical-reports?path=report-catalyst",
      },
      {
        label: "Day Wise Book Issues",
        href: "/reports/admin-library-reports/book-issue-report?path=report-catalyst",
      },
      {
        label: "Day Wise Book Returns",
        href: "/reports/admin-library-reports/book-return-report?path=report-catalyst",
      },
      {
        label: "Day Wise Library Fine Collection",
        href: "/reports/admin-library-reports/library-fine-collection-report?path=report-catalyst",
      },
    ],
  },
  {
    title: "FEE REPORTS",
    icon: DollarSign,
    borderColor: "border-[#e862d9]",
    gradient: "from-[#ffdf40] to-[#e243ff]",
    items: [
      {
        label: "Day Wise Receipts",
        href: "/accounts-and-fees/fee-reports/daywise-fee-report?path=report-catalyst",
      },
      {
        label: "Fee Ledger",
        href: "/reports/admin-fee-reports/fee-ledger?path=report-catalyst",
      },
      {
        label: "Due List",
        href: "/accounts-and-fees/fee-reports/due-list?path=report-catalyst",
      },
      {
        label: "Bus Fee Collection",
        href: "/accounts-and-fees/fee-reports/bus-fee-collections?path=report-catalyst",
      },
      {
        label: "Management Student Fee Collection",
        href: "/accounts-and-fees/fee-reports/mgt-fee-collections?path=report-catalyst",
      },
      {
        label: "Library Student Fee Collection",
        href: "/accounts-and-fees/fee-reports/library-fee-collections?path=report-catalyst",
      },
      {
        label: "Scholarship Due List",
        href: "/reports/admin-fee-reports/scholarship-due-list?path=report-catalyst",
      },
      {
        label: "Scholarship Proceedings Amount",
        href: "/reports/admin-fee-reports/scholarship-preceedings?path=report-catalyst",
      },
      {
        label: "Concessions List",
        href: "/reports/admin-fee-reports/concession-list?path=report-catalyst",
      },
    ],
  },
  {
    title: "EXAM REPORTS",
    icon: FileText,
    borderColor: "border-[#e14f4a]",
    gradient: "from-[#ff2e2e] to-[#43ffdc]",
    items: [
      {
        label: "Exam Timetable",
        href: "/admin-examination-management/admin-exam-reports/exam-timetable-report?path=report-catalyst",
      },
      {
        label: "Exam Student Registration",
        href: "/admin-examination-management/admin-exam-reports/exam-student-registration-report?path=report-catalyst",
      },
      {
        label: "Exam Invigilator Allotment",
        href: "/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report?path=report-catalyst",
      },
      {
        label: "Student Yearly Result",
        href: "/admin-examination-management/admin-exam-reports/exam-result-report?path=report-catalyst",
      },
      {
        label: "Student Summary Result",
        href: "/admin-examination-management/admin-exam-reports/student-summary-result-report?path=report-catalyst",
      },
      {
        label: "Student Result Details",
        href: "/admin-examination-management/admin-exam-reports/student-result-details-report?path=report-catalyst",
      },
      {
        label: "Student Backlog",
        href: "/admin-examination-management/admin-exam-reports/student-backlog-report?path=report-catalyst",
      },
      {
        label: "Student Credits",
        href: "/admin-examination-management/admin-exam-reports/student-credits-report?path=report-catalyst",
      },
    ],
  },
];

export default function ReportCatalogPage() {
  return (
    <PageContainer>
      <div className="pt-4 pb-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2">
          {REPORT_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className={`relative flex h-full flex-col rounded-md border bg-white shadow-sm transition-shadow hover:shadow-md ${section.borderColor}`}
              >
                {/* Floating Top-Left Icon Badge (matching Angular .rounded-circle) */}
                <div
                  className={`absolute -top-4 left-3 flex h-12 w-12 items-center justify-center rounded bg-gradient-to-r shadow-md ${section.gradient}`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Card Header Title */}
                <div className="pt-3.5 pb-1 text-center">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-800">
                    {section.title}
                  </h3>
                </div>

                {/* Report Links List */}
                <div className="flex-1 px-5 pt-2 pb-4">
                  <div className="flex flex-col space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="text-[13px] font-semibold text-[#4e93e6] transition-colors hover:text-[#1d69cc]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
