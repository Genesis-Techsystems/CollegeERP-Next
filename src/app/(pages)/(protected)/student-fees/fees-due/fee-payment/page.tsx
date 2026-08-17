"use client";

import { Suspense } from "react";
import { StudentFeeDuePaymentPage } from "../_components/StudentFeeDuePaymentPage";

/**
 * Angular `student-fees/fees-due/fee-payment` → `FeeDuePaymentComponent`.
 */
export default function StudentFeesDuePaymentRoute() {
  return (
    <Suspense fallback={null}>
      <StudentFeeDuePaymentPage />
    </Suspense>
  );
}
