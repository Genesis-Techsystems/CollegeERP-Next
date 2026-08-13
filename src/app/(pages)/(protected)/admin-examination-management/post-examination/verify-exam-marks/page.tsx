"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy post-examination URL → Angular admin-result-processing path. */
export default function VerifyExamMarksPostExamRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(
      "/admin-examination-management/result-processing/verify-exam-marks",
    );
  }, [router]);
  return null;
}
