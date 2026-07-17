"use client";

import { useSearchParams } from "next/navigation";
import { CollegeFeeStructureForm } from "../_components/CollegeFeeStructureForm";

/** Angular `add-feeStructure` route. */
export default function AddFeeStructurePage() {
  const searchParams = useSearchParams();

  return (
    <CollegeFeeStructureForm
      mode="add"
      title="Add Fee Structure"
      initialQuery={{
        cId: searchParams.get("cId") ?? undefined,
        aId: searchParams.get("aId") ?? undefined,
        courseId: searchParams.get("courseId") ?? undefined,
        batchId: searchParams.get("batchId") ?? undefined,
        isAcademicFee: searchParams.get("isAcademicFee") ?? undefined,
      }}
    />
  );
}
