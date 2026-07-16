"use client";

import { Suspense } from "react";
import { StudentCategoryFeeList } from "../../_components/StudentCategoryFeeList";

/**
 * Angular: fees-collection/library-payment/library-fee-payment → LibraryPayListComponent
 * Student search + fee structures; Pay Details → payment/pay-fees?page=library-fee
 */
function LibraryFeePaymentContent() {
  return (
    <StudentCategoryFeeList
      title="Library Fee Payment"
      payPage="library-fee"
      payColumnHeader="Pay Details"
    />
  );
}

export default function LibraryFeePaymentPage() {
  return (
    <Suspense fallback={null}>
      <LibraryFeePaymentContent />
    </Suspense>
  );
}
