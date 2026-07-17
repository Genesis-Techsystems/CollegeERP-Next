"use client";

import { Suspense } from "react";
import { StudentCategoryFeeList } from "../../_components/StudentCategoryFeeList";

/**
 * Angular `payment/fee-payment` → `StudentDataListComponent`.
 * Student search + fee structure list; Payment navigates to `pay-fees`.
 */
function FeePaymentContent() {
  return (
    <StudentCategoryFeeList
      title="Fee Payment"
      payPage="fee-payment"
      payColumnHeader="Payment"
      layout="fee-payment"
    />
  );
}

export default function FeePaymentPage() {
  return (
    <Suspense fallback={null}>
      <FeePaymentContent />
    </Suspense>
  );
}
