"use client";

import { useSearchParams } from "next/navigation";
import { PurchaseOrderForm } from "../_components/PurchaseOrderForm";

export default function EditPurchaseOrderPage() {
  const searchParams = useSearchParams();
  const poId = Number(searchParams.get("id") ?? searchParams.get("poId") ?? 0);
  return <PurchaseOrderForm poId={poId > 0 ? poId : undefined} />;
}
