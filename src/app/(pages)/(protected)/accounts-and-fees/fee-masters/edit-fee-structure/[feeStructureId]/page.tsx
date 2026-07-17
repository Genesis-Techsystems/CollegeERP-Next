"use client";

import { useParams } from "next/navigation";
import { CollegeFeeStructureForm } from "../../_components/CollegeFeeStructureForm";

/** Angular `edit-feeStructure/:feeStructureId` route. */
export default function EditFeeStructurePage() {
  const params = useParams();
  const feeStructureId = Number(params.feeStructureId ?? 0);

  return (
    <CollegeFeeStructureForm
      mode="edit"
      title="Edit Fee Structure"
      feeStructureId={feeStructureId > 0 ? feeStructureId : undefined}
    />
  );
}
