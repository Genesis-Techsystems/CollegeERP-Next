"use client";

import { Suspense } from "react";
import { GrievanceDetailsPage } from "../_components/GrievanceDetailsPage";

/** Angular `student-grievances/grievance-details` → `GrievanceDetailsComponent`. */
export default function Page() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading…</p>}>
      <GrievanceDetailsPage />
    </Suspense>
  );
}
