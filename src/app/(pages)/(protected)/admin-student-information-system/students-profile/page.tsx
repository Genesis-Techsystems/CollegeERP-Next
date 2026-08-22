"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentProfileFeeLedgerSummary,
} from "@/services";
import { useSessionContext } from "@/context/SessionContext";
import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentProfileTabs } from "./StudentProfileTabs";

type AnyRow = Record<string, any>;

export default function StudentsProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const queryStudentId = Number(searchParams.get("studentId") ?? 0);
  const check = Number(searchParams.get("check") ?? 1);
  const isStudentPortal =
    user?.userTypeCode === "STUDENT" || user?.userTypeCode === "PARENT";
  const studentId = isStudentPortal
    ? Number(user?.studentId ?? 0)
    : queryStudentId;

  const [student, setStudent] = useState<AnyRow | null>(null);
  const [feeLedger, setFeeLedger] = useState<AnyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [detail, ledger] = await Promise.all([
          fetchStudentDetail(studentId),
          fetchStudentProfileFeeLedgerSummary(studentId),
        ]);
        if (cancelled) return;
        setStudent(detail);
        setFeeLedger(ledger);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load student profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  function goBack() {
    if (isStudentPortal) {
      router.back();
      return;
    }
    if (!student) {
      router.push("/admin-student-information-system/students-list");
      return;
    }
    const params = new URLSearchParams();
    params.set("check", String(check));
    if (check === 1) {
      if (student.collegeId) params.set("collegeId", String(student.collegeId));
      if (student.academicYearId)
        params.set("academicYearId", String(student.academicYearId));
      if (student.rollNumber)
        params.set("rollNumber", String(student.rollNumber));
      if (student.studentId) params.set("studentId", String(student.studentId));
    } else if (check === 2) {
      if (student.collegeId) params.set("collegeId", String(student.collegeId));
      if (student.academicYearId)
        params.set("academicYearId", String(student.academicYearId));
      if (student.courseId) params.set("courseId", String(student.courseId));
      if (student.courseGroupId)
        params.set("courseGroupId", String(student.courseGroupId));
      if (student.courseYearId)
        params.set("courseYearId", String(student.courseYearId));
      if (student.groupSectionId != null)
        params.set("groupSectionId", String(student.groupSectionId));
    }
    router.push(
      `/admin-student-information-system/students-list?${params.toString()}`,
    );
  }

  return (
    <PageContainer className="space-y-3 px-1 sm:px-2">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading student profile…
        </div>
      ) : !student ? (
        <div className="rounded-md border bg-white p-8 text-center text-sm text-muted-foreground shadow">
          Student not found. Go back and select a student from the list.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md bg-white shadow-md">
          {/* Angular `.sub-header` — computer icon + Student Details */}
          <div className="flex items-center gap-2 border-b-2 border-[#ffcf46] px-4 py-3">
            <span
              className="material-icons text-[22px] text-[#042956]"
              aria-hidden
            >
              computer
            </span>
            <span className="text-[18px] font-medium text-[#042956]">
              Student Details
            </span>
          </div>

          <div className="pt-2.5">
            <StudentProfileHeader student={student} feeLedger={feeLedger} />
            <StudentProfileTabs student={student} />
          </div>
        </div>
      )}

      <div className="flex justify-end pr-3">
        <Button
          type="button"
          size="sm"
          onClick={goBack}
          className="h-[30px] min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
        >
          Back
        </Button>
      </div>
    </PageContainer>
  );
}
