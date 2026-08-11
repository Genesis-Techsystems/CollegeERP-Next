"use client";

/**
 * Course Delivery Plan Report —
 * Angular `reports/student-attendance-reports/course-delivery-plan-report` parity.
 */

import { CourseDeliveryReportPage } from "../_components/CourseDeliveryReportPage";

export default function CourseDeliveryPlanReportPage() {
  return (
    <CourseDeliveryReportPage
      flag="Course_Delivery_Plan"
      title="Course Delivery Plan"
      excelFileName="Course Delivery Plan Report"
    />
  );
}
