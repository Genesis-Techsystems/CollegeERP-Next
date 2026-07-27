"use client";

import { Suspense } from "react";
import { UploadSubjectContentPage } from "./_components/UploadSubjectContentPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UploadSubjectContentPage />
    </Suspense>
  );
}
