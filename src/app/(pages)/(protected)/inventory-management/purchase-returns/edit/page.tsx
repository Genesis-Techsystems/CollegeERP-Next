"use client";

import { useSearchParams } from "next/navigation";
import { PurchaseReturnForm } from "../_components/PurchaseReturnForm";

export default function EditPurchaseReturnPage() {
  const searchParams = useSearchParams();
  const id = Number(
    searchParams.get("id") ??
      searchParams.get("purchaseReturnId") ??
      searchParams.get("purchasereturnId") ??
      0,
  );
  return <PurchaseReturnForm purchaseReturnId={id > 0 ? id : undefined} />;
}
