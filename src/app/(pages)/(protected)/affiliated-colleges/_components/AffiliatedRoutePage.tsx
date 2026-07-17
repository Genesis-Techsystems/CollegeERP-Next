"use client";

import { approvalDetailKindFromSlug } from "../_lib/approval-upload-config";
import { AffiliatedBulkUploadPage } from "./AffiliatedBulkUploadPage";
import { CollegeStudentBulkUploadPage } from "./CollegeStudentBulkUploadPage";
import { CollegeStudentDostUploadPage } from "./CollegeStudentDostUploadPage";
import { AffiliatedSummaryPage } from "./AffiliatedSummaryPage";
import { StudentDostUploadSummaryPage } from "./StudentDostUploadSummaryPage";
import { AffiliatedUniversityReportPage } from "./AffiliatedUniversityReportPage";
import { AffiliatedViewStubPage } from "./AffiliatedViewStubPage";
import { CollegeUploadApprovalDetailPage } from "./CollegeUploadApprovalDetailPage";
import { CollegeUploadsApprovalPage } from "./CollegeUploadsApprovalPage";
import { getAffiliatedConfig } from "../_lib/route-config";

type AffiliatedRoutePageProps = { slug: string };

export function AffiliatedRoutePage({ slug }: AffiliatedRoutePageProps) {
  const config = getAffiliatedConfig(slug);

  if (slug === "student-dost-upload-summary") {
    return <StudentDostUploadSummaryPage />;
  }
  if (config.kind === "summary" && config.uploadPath) {
    return <AffiliatedSummaryPage slug={slug} />;
  }
  if (config.kind === "bulk-upload") {
    if (slug === "college-student-bulk-upload") {
      return <CollegeStudentBulkUploadPage />;
    }
    if (slug === "college-student-dost-upload") {
      return <CollegeStudentDostUploadPage />;
    }
    return <AffiliatedBulkUploadPage slug={slug} />;
  }
  if (config.kind === "report" && config.summaryProcFlag) {
    return <AffiliatedUniversityReportPage slug={slug} />;
  }
  if (config.kind === "approval") {
    return <CollegeUploadsApprovalPage />;
  }
  const approvalDetailKind = approvalDetailKindFromSlug(slug);
  if (approvalDetailKind) {
    return <CollegeUploadApprovalDetailPage kind={approvalDetailKind} />;
  }
  if (config.kind === "view" || config.kind === "assign") {
    return <AffiliatedViewStubPage slug={slug} />;
  }

  return <AffiliatedViewStubPage slug={slug} />;
}
