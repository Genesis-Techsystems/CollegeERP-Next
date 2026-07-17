"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Angular route `bus-payment/bus-fee` → BusFeePaymentComponent.
 * React collects payment under the shared pay-fees screen (same as hostel-fee).
 */
function BusFeeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("page")) params.set("page", "bus-fee");
    router.replace(
      `/accounts-and-fees/fees-collection/payment/pay-fees?${params.toString()}`,
    );
  }, [router, searchParams]);

  return null;
}

export default function BusFeeRedirectPage() {
  return (
    <Suspense fallback={null}>
      <BusFeeRedirect />
    </Suspense>
  );
}
