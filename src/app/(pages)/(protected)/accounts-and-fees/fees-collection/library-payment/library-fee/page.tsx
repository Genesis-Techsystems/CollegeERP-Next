"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryFeePayForm } from "../../_components/CategoryFeePayForm";
import { resolveFeePayConfig } from "../../_lib/pay-fees-mode";

/**
 * Angular `library-payment/library-fee` → LibraryFeePaymentComponent.
 * Pay Details from library-fee-payment navigates here with student/structure query params.
 */
function LibraryFeePaymentContent() {
  const searchParams = useSearchParams();
  const config = resolveFeePayConfig("library-fee");

  return (
    <CategoryFeePayForm
      config={config}
      collegeId={Number(searchParams.get("collegeId") ?? 0)}
      academicYearId={Number(searchParams.get("academicYearId") ?? 0)}
      studentId={Number(searchParams.get("studentId") ?? 0)}
      feeStructureId={Number(searchParams.get("feeStructureId") ?? 0)}
      queryParams={new URLSearchParams(searchParams.toString())}
    />
  );
}

export default function LibraryFeePage() {
  return (
    <Suspense fallback={null}>
      <LibraryFeePaymentContent />
    </Suspense>
  );
}
