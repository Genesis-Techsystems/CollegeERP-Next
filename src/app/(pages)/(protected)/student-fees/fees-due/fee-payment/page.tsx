"use client";

import { Suspense } from "react";
import { PayFeesPage } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_components/PayFeesPage";

/**
 * Angular `student-fees/fees-due/fee-payment` → `FeeDuePaymentComponent`.
 * Reuses the shared PayFeesPage (same query-param contract).
 */
export default function StudentFeesDuePaymentPage() {
  return (
    <Suspense fallback={null}>
      <PayFeesPage />
    </Suspense>
  );
}
