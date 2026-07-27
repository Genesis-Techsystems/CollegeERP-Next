"use client";

import { Suspense } from "react";
import { ManageCourseContentPage } from "./_components/ManageCourseContentPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ManageCourseContentPage />
    </Suspense>
  );
}
