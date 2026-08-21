"use client";

import { ClipboardCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";

/**
 * Bare `/attendance-management` — do not auto-open the hub.
 * Parent sidebar click should only expand children; open a child page explicitly.
 */
export default function AttendanceManagementIndexPage() {
  return (
    <PageContainer>
      <div className="app-card px-6 py-16 text-center">
        <ClipboardCheck
          className="mx-auto h-10 w-10 text-[hsl(var(--primary))] opacity-80"
          aria-hidden
        />
        <h1 className="mt-4 text-lg font-semibold text-[hsl(var(--card-title))]">
          Attendance Management
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Select a page from the sidebar (for example Attendance not taken list
          Staff) to continue.
        </p>
      </div>
    </PageContainer>
  );
}
