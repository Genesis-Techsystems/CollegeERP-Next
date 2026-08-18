"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { toPrintLogoUrl } from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  CONSOLIDATED_MEMO_LIST_HREF,
  loadConsolidatedMemoPrint,
  minioSrc,
  printConsolidatedMemo,
  txt,
  type ConsolidatedMemoPayload,
} from "./consolidated-marks-memo";

export function PrintConsolidatedMemoPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ConsolidatedMemoPayload | null>(null);

  useEffect(() => {
    setPayload(loadConsolidatedMemoPrint());
  }, []);

  if (!payload || !payload.examdata.length) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No consolidated marks data found. Go back and click Print Report.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(CONSOLIDATED_MEMO_LIST_HREF)}
        >
          Back
        </Button>
      </PageContainer>
    );
  }

  const head = payload.data[0] ?? {};
  const logo = toPrintLogoUrl(minioSrc(head.logo_path) || DEFAULT_COLLEGE_LOGO);
  const photo = minioSrc(head.student_photo_path);
  const photoAbs = photo ? toPrintLogoUrl(photo) : "";
  const courseLine = [txt(head.course_name), txt(head.group_name)]
    .filter(Boolean)
    .join("-");

  return (
    <PageContainer className="space-y-3">
      <div
        data-print-root
        className="mx-auto w-full max-w-[990px] bg-white p-4 text-[#111]"
      >
        <div className="mb-2.5 flex items-start gap-3 border-b-2 border-[#ccc] pb-2.5">
          <img
            src={logo}
            alt="College Logo"
            className="h-[100px] w-[100px] object-contain"
          />
          <div className="min-w-0 flex-1 text-center">
            <p className="mt-5 mb-1 text-[30px] font-bold text-[rgb(36,99,154)]">
              {txt(head.org_name)}
            </p>
            <p className="mb-1 font-bold">
              {txt(head.org_Address ?? head.org_address)}
            </p>
            <p className="mb-1 font-bold">
              CONSOLIDATED MARKS MEMO / CREDIT SHEET
            </p>
            <p className="font-bold">{courseLine}</p>
          </div>
          {photoAbs ? (
            <img
              src={photoAbs}
              alt="Student"
              className="h-[100px] w-[100px] object-contain"
            />
          ) : (
            <div className="h-[100px] w-[100px]" />
          )}
        </div>

        <table className="mb-2 w-full border-collapse text-[14px]">
          <tbody>
            <tr>
              <td className="w-1/2 py-1.5 text-left">
                Year Of Admission : {txt(head.yearOfAdmission)}
              </td>
              <td className="py-1.5 text-left">
                Month &amp; Year of Examination : {txt(head.exam_month_yr)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-left">
                Hall Ticket Number : {txt(head.roll_number)}
              </td>
              <td className="py-1.5 text-left">
                Name : {txt(head.student_name)}
              </td>
            </tr>
          </tbody>
        </table>

        {payload.examdata.map((ex, gi) => (
          <table
            key={`${ex.exam_name}-${ex.course_year_code}-${gi}`}
            className="mt-2 w-full border-collapse text-[15px]"
          >
            <thead>
              <tr>
                <td colSpan={6} className="py-1 text-left font-bold capitalize">
                  {[
                    ex.exam_name,
                    ex.examtype,
                    ex.course_year_code,
                    ex.regulation_code,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </td>
              </tr>
              <tr>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  S.No
                </th>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  Subject
                </th>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  InternalMarks
                </th>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  External Marks
                </th>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  Result
                </th>
                <th className="border-2 border-[#c5bec0] p-2.5 text-center">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody>
              {ex.subjects.map((s, i) => (
                <tr key={`${s.subject_code}-${i}`}>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-center">
                    {i + 1}
                  </td>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-left">
                    {s.subject_name} - {s.subject_code}
                  </td>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-center">
                    {s.internal_marks}
                  </td>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-center">
                    {s.external_marks}
                  </td>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-center">
                    {s.result}
                  </td>
                  <td className="border-2 border-[#c5bec0] p-2.5 text-center">
                    {s.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <div
        id="printPageButton"
        className="print-hide mx-auto flex w-full max-w-[990px] justify-end gap-3"
      >
        <Button
          type="button"
          className="bg-amber-400 text-black hover:bg-amber-500"
          onClick={() => router.push(CONSOLIDATED_MEMO_LIST_HREF)}
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 text-[12px]"
          onClick={() => printConsolidatedMemo(payload)}
        >
          {/* <Printer className="mr-1.5 h-3.5 w-3.5" /> */}
          Print
        </Button>
      </div>
    </PageContainer>
  );
}
