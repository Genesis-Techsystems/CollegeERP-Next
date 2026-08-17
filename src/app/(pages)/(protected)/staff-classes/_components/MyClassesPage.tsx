"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlarmClock,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Keyboard,
  Loader2,
  Users,
  Video,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  buildZoomJoinLiveHref,
  classTitle,
  loadMyClassesPage,
  type MyClassRow,
  type ProxySubjectRow,
} from "@/services";
import { BookIssueCollapsible } from "@/app/(pages)/(protected)/library/bookIssue/_components/BookIssueCollapsible";

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function classQuery(row: MyClassRow, employeeId: number): URLSearchParams {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v != null && String(v) !== "") params.set(k, String(v));
  };
  set("collegeId", row.collegeId);
  set("collegeCode", row.collegeCode);
  set("courseGroupId", row.courseGroupId);
  set("groupCode", row.groupCode);
  set("groupName", row.groupName);
  set("groupSectionId", row.groupSectionId);
  set("academicYearId", row.academicYearId);
  set("academicYear", row.academicYear);
  set("courseYearId", row.courseYearId);
  set("courseYearName", row.courseYearName);
  set("courseId", row.courseId);
  set("empName", row.firstName);
  set("employeeId", employeeId);
  set("section", row.section);
  set("regulationId", row.regulationId);
  set("regulationCode", row.regulationCode);
  set("regulationName", row.regulationName);
  set("subjectId", row.subjectId);
  set("subjectName", row.subjectName);
  set("batchName", row.batchName);
  set("studentbatchId", row.studentbatchId);
  set("subjectCode", row.subjectCode);
  set("subjectType", row.subjectType);
  set("subjectCourseyearId", row.subjectCourseyearId);
  set("day", format(new Date(), "yyyy-MM-dd"));
  return params;
}

type ActionItemProps = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
};

/** Angular `.p-8` + icon + `.icon-text` row action. */
function ActionItem({ label, icon, onClick, href }: Readonly<ActionItemProps>) {
  const cls = cn(
    "relative flex items-center gap-3 rounded-[5px] p-[15px] text-left",
    "hover:bg-[#dedede] hover:shadow-[0_2px_6px_0_rgba(218,218,253,0.65)] cursor-pointer",
  );
  const content = (
    <>
      <span className="inline-flex shrink-0 [&_svg]:h-6 [&_svg]:w-6">
        {icon}
      </span>
      <span className="text-[15px] font-medium text-foreground">{label}</span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cls}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  );
}

function ClassActions({
  row,
  employeeId,
  isZoom,
  isProxy,
  onHostZoom,
}: Readonly<{
  row: MyClassRow;
  employeeId: number;
  isZoom: boolean;
  isProxy?: boolean;
  onHostZoom: (row: MyClassRow) => void;
}>) {
  const router = useRouter();
  const qs = classQuery(row, employeeId).toString();
  const go = (path: string) =>
    router.push(`/staff-classes/my-classes/${path}?${qs}`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0 px-2 pb-2 max-w-2xl">
      <ActionItem
        label="View Attedance"
        icon={<ClipboardList className="text-[brown]" />}
        onClick={() => go("View-attendance")}
      />
      <ActionItem
        label="Mark Attedance"
        icon={<ClipboardCheck className="text-[green]" />}
        onClick={() => go("mark-attendance")}
      />
      <ActionItem
        label="Course Year Timetable"
        icon={<AlarmClock className="text-[#673AB7]" />}
        onClick={() => go("course-year-timetable")}
      />
      <ActionItem
        label="Course Year Subjects"
        icon={<BookOpen className="text-[#E91E63]" />}
        onClick={() => go("course-year-subjects")}
      />
      <ActionItem
        label="Students"
        icon={<Users className="text-[#FF5722]" />}
        onClick={() => go("students-list")}
      />
      {!isProxy ? (
        <ActionItem
          label="Exam Online Papers"
          icon={<BookOpen className="text-[#E91E63]" />}
          onClick={() => {
            if (row.subjectCourseyearId != null) {
              router.push(
                `/staff-examinations/exam-online-paper?subjectCourseyearId=${row.subjectCourseyearId}`,
              );
            } else {
              toastError("Subject course year not available");
            }
          }}
        />
      ) : (
        <ActionItem
          label="Host Live Class"
          icon={<Video className="text-blue-600" />}
        />
      )}
      {!isProxy && row.meetingId != null && row.isValid ? (
        isZoom ? (
          <ActionItem
            label="Host Live Class"
            icon={<Video className="text-blue-600" />}
            onClick={() => onHostZoom(row)}
          />
        ) : (
          <ActionItem
            label="Host Live Class"
            icon={<Video className="text-blue-600" />}
            href={String(row.joinUrl ?? "#")}
          />
        )
      ) : null}
    </div>
  );
}

/** Angular `staff-classes/my-classes` — expandable class list + actions. */
export function MyClassesPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState<MyClassRow[]>([]);
  const [labProxies, setLabProxies] = useState<ProxySubjectRow[]>([]);
  const [isZoom, setIsZoom] = useState(false);
  /** Exclusive accordion — only one panel open (Angular mat-accordion). */
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const empId = employeeId || Number(readStorage("employeeId") || 0);
    if (!empId) {
      setMyClasses([]);
      setLabProxies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userName =
        String(
          user?.userName ??
            readStorage("uName") ??
            readStorage("userName") ??
            "",
        ) || "Host";
      const result = await loadMyClassesPage({ employeeId: empId, userName });
      setMyClasses(result.myClasses);
      setLabProxies(result.labProxies);
      setIsZoom(result.isZoom);
      setOpenKey(null);
      if (result.emptyMessage && result.myClasses.length === 0) {
        toastSuccess(result.emptyMessage);
      }
    } catch (e) {
      toastError(getErrorMessage(e));
      setMyClasses([]);
      setLabProxies([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, user?.userName]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void load();
  }, [sessionLoading, isResolving, load]);

  async function onHostZoom(row: MyClassRow) {
    if (row.meetingId == null) return;
    try {
      const href = await buildZoomJoinLiveHref(row.meetingId);
      if (!href) {
        toastError("Unable to start live class");
        return;
      }
      window.open(href, "_blank");
    } catch (e) {
      toastError(getErrorMessage(e));
    }
  }

  const empId = employeeId || Number(readStorage("employeeId") || 0);

  const panelProps = (key: string) => ({
    open: openKey === key,
    onOpenChange: (next: boolean) => setOpenKey(next ? key : null),
    headerClassName: "bg-[#f5f5f5] hover:bg-[#eeeeee]",
    titleClassName: "text-[#039be5] font-bold",
    contentClassName: "border-t border-border",
  });

  return (
    <PageContainer className="space-y-3">
      <PageHeader title="My Classes" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading classes…
        </div>
      ) : null}

      {!loading && myClasses.length === 0 && labProxies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No classes found.
        </p>
      ) : null}

      <div className="space-y-2.5">
        {myClasses.map((row, idx) => {
          const key = `class-${row.groupSectionId}-${row.subjectId}-${row.studentbatchId ?? idx}`;
          return (
            <BookIssueCollapsible
              key={key}
              icon={<Keyboard className="h-4 w-4 text-[#039be5]" />}
              title={classTitle(row)}
              {...panelProps(key)}
            >
              <ClassActions
                row={row}
                employeeId={empId}
                isZoom={isZoom}
                onHostZoom={(r) => void onHostZoom(r)}
              />
            </BookIssueCollapsible>
          );
        })}

        {labProxies.map((row, idx) => {
          const key = `proxy-${row.subjectId}-${row.studentbatchId ?? idx}`;
          return (
            <BookIssueCollapsible
              key={key}
              icon={<Keyboard className="h-4 w-4 text-[#039be5]" />}
              title={classTitle(row, { includeRegulation: false })}
              {...panelProps(key)}
            >
              <ClassActions
                row={row}
                employeeId={empId}
                isZoom={isZoom}
                isProxy
                onHostZoom={(r) => void onHostZoom(r)}
              />
            </BookIssueCollapsible>
          );
        })}
      </div>
    </PageContainer>
  );
}
