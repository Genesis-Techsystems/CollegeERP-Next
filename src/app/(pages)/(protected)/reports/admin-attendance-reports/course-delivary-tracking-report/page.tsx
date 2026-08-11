"use client";

/**
 * Course Delivery Tracking Report —
 * Angular `reports/student-attendance-reports/course-delivary-tracking-report`
 * parity (Angular folder name keeps this typo — route matches for nav parity).
 */

import { CourseDeliveryReportPage } from "../_components/CourseDeliveryReportPage";

export default function CourseDeliveryTrackingReportPage() {
  return (
    <CourseDeliveryReportPage
      flag="Course_delivery_Tracking"
      title="Course Delivery Tracking Report"
      excelFileName="Course Delivery Tracking Report"
    />
  );
}
