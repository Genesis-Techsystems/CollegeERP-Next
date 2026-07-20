"use client";

import { approvalDetailKindFromSlug } from "../_lib/approval-upload-config";
import { AffiliatedBulkUploadPage } from "./AffiliatedBulkUploadPage";
import { CollegeStudentBulkUploadPage } from "./CollegeStudentBulkUploadPage";
import { CollegeStudentDostUploadPage } from "./CollegeStudentDostUploadPage";
import { CollegeStudentSubjectsUploadPage } from "./CollegeStudentSubjectsUploadPage";
import { CollegeStudentAttendanceUploadPage } from "./CollegeStudentAttendanceUploadPage";
import { CollegeStudentExamFeeRegistrationPage } from "./CollegeStudentExamFeeRegistrationPage";
import { CollegeStudentExamMarksUploadPage } from "./CollegeStudentExamMarksUploadPage";
import { AffiliatedSummaryPage } from "./AffiliatedSummaryPage";
import { StudentAttendanceSummaryPage } from "./StudentAttendanceSummaryPage";
import { StudentExamRegistrationSummaryPage } from "./StudentExamRegistrationSummaryPage";
import { StudentExamMarksSummaryPage } from "./StudentExamMarksSummaryPage";
import { StudentMediaSummaryPage } from "./StudentMediaSummaryPage";
import { SignatureBulkUploadPage } from "./SignatureBulkUploadPage";
import { PhotosSignatureBulkUploadPage } from "./PhotosSignatureBulkUploadPage";
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
  if (slug === "student-attendance-summary") {
    return <StudentAttendanceSummaryPage />;
  }
  if (slug === "student-exam-registration-summary") {
    return <StudentExamRegistrationSummaryPage />;
  }
  if (slug === "student-internal-maks-summary") {
    return <StudentExamMarksSummaryPage kind="internal" />;
  }
  if (slug === "student-external-marks-summary") {
    return <StudentExamMarksSummaryPage kind="external" />;
  }
  if (slug === "student-signature-summary") {
    return <StudentMediaSummaryPage kind="signature" />;
  }
  if (slug === "student-photo-summary") {
    return <StudentMediaSummaryPage kind="photo" />;
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
    if (slug === "college-student-subjects") {
      return <CollegeStudentSubjectsUploadPage />;
    }
    if (slug === "college-student-attendance-upload") {
      return <CollegeStudentAttendanceUploadPage />;
    }
    if (slug === "college-student-exam-fee-registration") {
      return <CollegeStudentExamFeeRegistrationPage />;
    }
    if (slug === "college-student-internalexam-data-upload") {
      return <CollegeStudentExamMarksUploadPage kind="internal" />;
    }
    if (slug === "college-student-externalexam-data-upload") {
      return <CollegeStudentExamMarksUploadPage kind="external" />;
    }
    if (slug === "signature-bulk-upload") {
      return <SignatureBulkUploadPage />;
    }
    if (slug === "photos-signature-bulk-upload") {
      return <PhotosSignatureBulkUploadPage />;
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
