"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Angular route `library-payment/library-fee` → LibraryFeePaymentComponent.
 * React collects payment under the shared pay-fees screen.
 */
function LibraryFeeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("page")) params.set("page", "library-fee");
    router.replace(
      `/accounts-and-fees/fees-collection/payment/pay-fees?${params.toString()}`,
    );
  }, [router, searchParams]);

  return null;
}

export default function LibraryFeeRedirectPage() {
  return (
    <Suspense fallback={null}>
      <LibraryFeeRedirect />
    </Suspense>
  );
}
