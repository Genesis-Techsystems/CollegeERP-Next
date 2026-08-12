import { Suspense } from "react";
import { ReviewAppraisalPage } from "../../_components/ReviewAppraisalPage";

/** Angular `staff-faculty-details/appraisal-report/review-appraisal`. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReviewAppraisalPage />
    </Suspense>
  );
}
