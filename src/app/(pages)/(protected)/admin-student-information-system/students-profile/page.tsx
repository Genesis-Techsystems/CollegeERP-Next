"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentProfileFeeLedgerSummary,
} from "@/services";
import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentProfileTabs } from "./StudentProfileTabs";

type AnyRow = Record<string, any>;

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

export default function StudentsProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryStudentId = Number(searchParams.get("studentId") ?? 0);
  const check = Number(searchParams.get("check") ?? 1);
  const userTypeCode = readStorage("userTypeCode");
  const isStudentPortal =
    userTypeCode === "STUDENT" || userTypeCode === "PARENT";
  const studentId = isStudentPortal
    ? Number(readStorage("studentId") || 0)
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
    <PageContainer className="space-y-4">
      {/* <PageHeader title="Student Details" subtitle="Student Information System" /> */}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading student profile…
        </div>
      ) : !student ? (
        <div className="app-card p-8 text-center text-sm text-muted-foreground">
          Student not found. Go back and select a student from the list.
        </div>
      ) : (
        <>
          <StudentProfileHeader student={student} feeLedger={feeLedger} />
          <StudentProfileTabs student={student} />
        </>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
    </PageContainer>
  );
}
