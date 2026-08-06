"use client";

import { useSearchParams } from "next/navigation";
import { ScholarshipValueForm } from "../_components/ScholarshipValueForm";

/** Angular `scholarship-value/edit-scholarship-value`. */
export default function EditScholarshipValuePage() {
  const searchParams = useSearchParams();

  return (
    <ScholarshipValueForm
      mode="edit"
      title="Edit ScholarShip Structure"
      initialQuery={{
        universityId: searchParams.get("universityId") ?? undefined,
        collegeId: searchParams.get("collegeId") ?? undefined,
        courseId: searchParams.get("courseId") ?? undefined,
        batchId: searchParams.get("batchId") ?? undefined,
        academicYearId: searchParams.get("academicYearId") ?? undefined,
        feeSchStructureId: searchParams.get("feeSchStructureId") ?? undefined,
        isAcademicScholarship:
          searchParams.get("isAcademicScholarship") ?? undefined,
      }}
    />
  );
}
