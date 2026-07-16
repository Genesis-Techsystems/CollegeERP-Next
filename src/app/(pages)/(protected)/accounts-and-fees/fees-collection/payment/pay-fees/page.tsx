"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryFeePayForm } from "../../_components/CategoryFeePayForm";
import { resolveFeePayConfig } from "../../_lib/pay-fees-mode";

function PayFeesContent() {
  const searchParams = useSearchParams();
  const qs = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const config = resolveFeePayConfig(searchParams.get("page"));

  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const academicYearId = Number(searchParams.get("academicYearId") ?? 0);
  const studentId = Number(searchParams.get("studentId") ?? 0);
  const feeStructureId = Number(searchParams.get("feeStructureId") ?? 0);

  return (
    <CategoryFeePayForm
      config={config}
      collegeId={collegeId}
      academicYearId={academicYearId}
      studentId={studentId}
      feeStructureId={feeStructureId}
      queryParams={qs}
    />
  );
}

export default function PayFeesPage() {
  return (
    <Suspense fallback={null}>
      <PayFeesContent />
    </Suspense>
  );
}
