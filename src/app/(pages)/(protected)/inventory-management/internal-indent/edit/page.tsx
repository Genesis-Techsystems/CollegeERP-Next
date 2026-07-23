"use client";

import { useSearchParams } from "next/navigation";
import { InternalIndentForm } from "../_components/InternalIndentForm";

export default function EditInternalIndentPage() {
  const searchParams = useSearchParams();
  const indentId = Number(
    searchParams.get("id") ?? searchParams.get("indentId") ?? 0,
  );
  return <InternalIndentForm indentId={indentId > 0 ? indentId : undefined} />;
}
