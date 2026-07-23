"use client";

import { useSearchParams } from "next/navigation";
import { InternalIssueForm } from "../_components/InternalIssueForm";

export default function EditInternalIssuePage() {
  const searchParams = useSearchParams();
  const interIssueId = Number(
    searchParams.get("id") ?? searchParams.get("interIssueId") ?? 0,
  );
  return (
    <InternalIssueForm
      interIssueId={interIssueId > 0 ? interIssueId : undefined}
    />
  );
}
