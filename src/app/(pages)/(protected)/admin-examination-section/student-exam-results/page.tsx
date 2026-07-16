"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { toastError } from "@/lib/toast";
import { fetchStudentDetail, fetchStudentDetailByUserId } from "@/services";
import { StudentExamResultsHeader } from "./StudentExamResultsHeader";
import { StudentExamResultsTable } from "./StudentExamResultsTable";

type AnyRow = Record<string, unknown>;

function isStudentPortalUser(
  userTypeCode?: string,
  userRole?: string,
): boolean {
  const type = (userTypeCode ?? "").toUpperCase();
  const role = (userRole ?? "").toUpperCase();
  return (
    type === "STUDENT" ||
    type === "PARENT" ||
    role === "STUDENT" ||
    role === "MSTUDENT" ||
    role === "PARENT"
  );
}

export default function StudentExamResultsPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const isStudentPortal = isStudentPortalUser(
    user?.userTypeCode,
    user?.userRole,
  );
  const sessionStudentId = Number(user?.studentId ?? 0);
  const userId = Number(user?.userId ?? 0);

  const [student, setStudent] = useState<AnyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isStudentPortal) {
      setLoading(false);
      setStudent(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        // Angular login stores studentId via GET studentdetail?userId= when the
        // authorization DTO omits studentId — resolve the same way here.
        let detail: AnyRow | null = null;
        if (sessionStudentId > 0) {
          detail = await fetchStudentDetail(sessionStudentId);
        }
        if (!detail && userId > 0) {
          detail = await fetchStudentDetailByUserId(userId);
        }
        if (!cancelled) setStudent(detail);
      } catch (error) {
        if (!cancelled) toastError(error, "Failed to load student details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isStudentPortal, sessionStudentId, userId]);

  if (sessionLoading || loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading exam results…
        </div>
      </PageContainer>
    );
  }

  if (!isStudentPortal) {
    return (
      <PageContainer>
        <div className="app-card space-y-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Exam Results is available only for student login.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!student) {
    return (
      <PageContainer>
        <div className="app-card space-y-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Student profile could not be loaded. Please sign in again or contact
            support.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <StudentExamResultsHeader student={student} />
      <div className="app-card p-3 sm:p-4">
        <StudentExamResultsTable student={student} />
      </div>
    </PageContainer>
  );
}
