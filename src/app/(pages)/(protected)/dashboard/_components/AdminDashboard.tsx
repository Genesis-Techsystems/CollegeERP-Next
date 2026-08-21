"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QK } from "@/lib/query-keys";
import { getVcDashboardReport, persistDashboardReport } from "@/services";

type AdminModule = {
  label: string;
  href: string;
  icon: string;
  materialIcon: string;
};

/**
 * Angular `dashboard.component.html` Modules tab tiles.
 * Labels keep Angular spelling (e.g. Admisssion). Hrefs are live React routes
 * that match the Angular `[routerLink]` destinations as closely as possible.
 */
const ADMIN_MODULES: AdminModule[] = [
  {
    label: "Admisssion",
    href: "/admission/admission-dashboard",
    icon: "Admisssion.png",
    materialIcon: "school",
  },
  {
    label: "Academics",
    href: "/academics/academic-batches",
    icon: "acedamic_.png",
    materialIcon: "menu_book",
  },
  {
    label: "Time Table",
    href: "/time-table-management/timetable-dashboard",
    icon: "timetable.png",
    materialIcon: "schedule",
  },
  {
    label: "Attendance",
    href: "/attendance-management/student-attendance",
    icon: "attendenace.png",
    materialIcon: "how_to_reg",
  },
  {
    label: "Student",
    href: "/admin-student-information-system/students-list",
    icon: "student.png",
    materialIcon: "person",
  },
  {
    label: "Fee",
    href: "/accounts-and-fees/fees-collection/payment/pay-fees",
    icon: "fee.png",
    materialIcon: "payments",
  },
  {
    label: "Scholarship",
    href: "/scholarship-management/scholarship-type",
    icon: "Schlo.png",
    materialIcon: "emoji_events",
  },
  {
    label: "HR & Payroll",
    href: "/hr-payroll/hr-dashboard",
    icon: "hr.png",
    materialIcon: "groups",
  },
  {
    label: "Email & SMS Alerts",
    href: "/email-sms/send-sms-to-students",
    icon: "email.png",
    materialIcon: "email",
  },
  {
    label: "Transport",
    href: "/transport/transport-dashboard",
    icon: "transport.png",
    materialIcon: "directions_bus",
  },
  {
    label: "Hostel",
    href: "/hostel/hostel-dashboard",
    icon: "hostel.png",
    materialIcon: "apartment",
  },
  {
    label: "Library",
    href: "/library/library-dashboard",
    icon: "library.png",
    materialIcon: "local_library",
  },
  {
    label: "Security",
    href: "/user-management/staff-accounts",
    icon: "users.png",
    materialIcon: "security",
  },
  {
    label: "Events",
    href: "/events/events-dashboard",
    icon: "events.png",
    materialIcon: "event",
  },
  {
    label: "Reports",
    href: "/report-catalyst",
    icon: "notes.png",
    materialIcon: "description",
  },
  {
    label: "Certificates",
    href: "/certificates",
    icon: "crtf.png",
    materialIcon: "workspace_premium",
  },
  {
    label: "Counseling",
    href: "/mentorship/counseling-dashboard",
    icon: "placement.png",
    materialIcon: "psychology",
  },
  {
    label: "Alumni",
    href: "/alumni/alumni-committee",
    icon: "alumni.png",
    materialIcon: "diversity_3",
  },
  {
    label: "Exams",
    href: "/admin-examination-management/exam-dashboard",
    icon: "exam.png",
    materialIcon: "quiz",
  },
  {
    label: "Grievance",
    href: "/grievance/complaint",
    icon: "complaints.png",
    materialIcon: "report_problem",
  },
  {
    label: "Placements",
    href: "/placements-achievements/placements/companies",
    icon: "management.png",
    materialIcon: "business_center",
  },
  {
    label: "Inventory",
    href: "/inventory-management/stores-master",
    icon: "finance.png",
    materialIcon: "inventory_2",
  },
  {
    label: "Feedback",
    href: "/feedback/survey-form-list",
    icon: "feedback.png",
    materialIcon: "rate_review",
  },
  {
    label: "Maintenance",
    href: "/campus-maintenance/campus-maintendance-dashboard",
    icon: "campus.png",
    materialIcon: "build",
  },
  {
    label: "Suggestions",
    href: "/staff-grievances-&-suggestions/suggestions-list",
    icon: "sug.png",
    materialIcon: "lightbulb",
  },
  {
    label: "Admin",
    href: "/admin/organizations",
    icon: "admin.png",
    materialIcon: "admin_panel_settings",
  },
];

function setPresentDateIso(): void {
  try {
    globalThis.localStorage?.setItem("presentDate", new Date().toISOString());
  } catch {
    // ignore
  }
}

function ModuleTile({ mod }: { mod: AdminModule }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `/assets/images/module-icons/${mod.icon}`;

  return (
    <Link
      href={mod.href}
      className="group flex min-h-[148px] flex-col items-center justify-center rounded-xl border border-[#e6eaf0] bg-white px-3 py-5 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffcf46] hover:shadow-[0_8px_20px_rgba(4,41,86,0.12)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4fc] transition-colors group-hover:bg-[#fff6d6]">
        {imgFailed ? (
          <span
            className="material-icons text-[28px] text-[#4e93e6] transition-colors group-hover:text-[#042956]"
            aria-hidden="true"
          >
            {mod.materialIcon}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-8 w-8 object-contain"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className="mt-3 text-[13px] font-semibold leading-snug text-[#042956]">
        {mod.label}
      </div>
    </Link>
  );
}

/**
 * Angular `app-dashboard` — Admin Dashboard module launcher.
 * Constructor writes `presentDate`; `getDashboardCounts()` (`dashboardreport`)
 * is wired so a successful response can refresh that date.
 */
export function AdminDashboard() {
  useQuery({
    queryKey: QK.adminDashboard.report(),
    queryFn: async () => {
      setPresentDateIso();
      try {
        const counts = await getVcDashboardReport();
        persistDashboardReport(counts);
        return counts;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  return (
    <Tabs defaultValue="modules" className="w-full">
      <TabsList className="app-dashboard-tabs h-9 w-full flex-wrap justify-start gap-0 rounded-none bg-white p-0">
        <TabsTrigger value="modules" className="app-dashboard-tab gap-1.5">
          <span className="material-icons text-[18px]" aria-hidden="true">
            view_list
          </span>
          Modules
        </TabsTrigger>
        <TabsTrigger value="analysis" className="app-dashboard-tab gap-1.5">
          <span className="material-icons text-[18px]" aria-hidden="true">
            insert_chart
          </span>
          Analysis
        </TabsTrigger>
        <TabsTrigger value="events" className="app-dashboard-tab gap-1.5">
          <span className="material-icons text-[18px]" aria-hidden="true">
            date_range
          </span>
          Events
        </TabsTrigger>
      </TabsList>

      <TabsContent value="modules" className="mt-0 bg-[#f4f6fa] px-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {ADMIN_MODULES.map((mod) => (
            <ModuleTile key={mod.label} mod={mod} />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="analysis" className="mt-4 px-3">
        <p className="text-sm text-muted-foreground">Content 2</p>
      </TabsContent>
      <TabsContent value="events" className="mt-4 px-3">
        <p className="text-sm text-muted-foreground">Content 3</p>
      </TabsContent>
    </Tabs>
  );
}
