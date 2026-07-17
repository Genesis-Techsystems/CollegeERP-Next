"use client";

import { Suspense } from "react";
import { StudentCategoryFeeList } from "../../_components/StudentCategoryFeeList";

/**
 * Angular: fees-collection/bus-payment/bus-fee-payment → BusPayListComponent
 * Student search + fee structures; Pay Details → payment/pay-fees?page=bus-fee
 */
function BusFeePaymentContent() {
  return (
    <StudentCategoryFeeList
      title="Bus Fee Payment"
      payPage="bus-fee"
      payColumnHeader="Pay Details"
      filteredShell
    />
  );
}

export default function BusFeePaymentPage() {
  return (
    <Suspense fallback={null}>
      <BusFeePaymentContent />
    </Suspense>
  );
}
