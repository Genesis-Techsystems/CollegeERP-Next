"use client";

import { PageContainer } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { LibraryDashboard } from "../../dashboard/_components/LibraryDashboard";

export default function LibraryDashboardPage() {
  const { user, isLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, isLoading);

  if (isLoading || isResolving || !user) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[420px] w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-3 bg-white">
      <LibraryDashboard user={user} employeeId={employeeId} showTabChrome />
    </PageContainer>
  );
}
