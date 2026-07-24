"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { StudentCategoryFeeList } from "../../_components/StudentCategoryFeeList";

function HostelFeePaymentContent() {
  const searchParams = useSearchParams();

  const backHref = useMemo(() => {
    const backQs = new URLSearchParams();
    const hostelId = searchParams.get("hostelId");
    const hstlRoomId = searchParams.get("hstlRoomId");
    if (hostelId) backQs.set("hostelId", hostelId);
    if (hstlRoomId) backQs.set("hstlRoomId", hstlRoomId);
    const qs = backQs.toString();
    return qs
      ? `/accounts-and-fees/fees-collection/hostel-payment?${qs}`
      : "/accounts-and-fees/fees-collection/hostel-payment";
  }, [searchParams]);

  return (
    <StudentCategoryFeeList
      title="Hostel Fee Payment"
      payPage="hostel-fee"
      payColumnHeader="Pay Details"
      backHref={backHref}
      filteredShell
    />
  );
}

export default function HostelFeePaymentPage() {
  return (
    <Suspense fallback={null}>
      <HostelFeePaymentContent />
    </Suspense>
  );
}
