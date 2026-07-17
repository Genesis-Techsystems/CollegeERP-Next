"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryFeePayForm } from "../../_components/CategoryFeePayForm";
import { PayFeesPage } from "../../_components/PayFeesPage";
import { resolveFeePayConfig } from "../../_lib/pay-fees-mode";

/**
 * Angular `payment/pay-fees` → `FeePaymentComponent`.
 * Bus / library fee use CategoryFeePayForm (Angular category payment screens).
 */
function PayFeesRouteContent() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page");

  if (page === "bus-fee" || page === "library-fee") {
    const config = resolveFeePayConfig(page);
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

  return <PayFeesPage />;
}

export default function PayFeesRoutePage() {
  return (
    <Suspense fallback={null}>
      <PayFeesRouteContent />
    </Suspense>
  );
}
