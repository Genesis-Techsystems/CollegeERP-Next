"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

type AnyRow = Record<string, any>;

export default function MarksMemoPrintPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [memoData, setMemoData] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);

  useEffect(() => {
    const rawData = searchParams.get("data");
    if (!rawData) return;
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMemoData(parsed);
        const subList = parsed[0]?.examStudentMemoSubjectDTO ?? [];
        if (Array.isArray(subList)) {
          setSubjects(subList);
          const tot = subList.reduce(
            (acc, item) => acc + (Number(item.credits) || 0),
            0,
          );
          setTotalCredits(tot);
        }
      }
    } catch {
      // ignore parse error
    }
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (memoData.length > 0) {
      const studentId = memoData[0].studentId;
      const examId = memoData[0].examId;
      const courseYearId = memoData[0].courseYearId;
      router.push(
        `/admin-examination-management/post-examination/marks-memo-issue?studentId=${studentId}&examId=${examId}&courseYearId=${courseYearId}`,
      );
    } else {
      router.back();
    }
  };

  const firstSub = subjects[0] ?? {};

  return (
    <PageContainer>
      <div className="bg-white p-6 space-y-4 print:p-0 border border-[#dedede] rounded shadow-sm">
        {/* Actions (hidden in print) */}
        <div className="flex justify-between items-center print:hidden border-b border-[#dedede] pb-3">
          <Button
            variant="outline"
            className="h-8 text-[13px]"
            onClick={handleBack}
          >
            &larr; Back
          </Button>
          <Button
            className="h-8 bg-[#0f2d59] text-white hover:bg-[#0c2340] text-[13px]"
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>

        {/* Printable Document Header */}
        <div className="text-center space-y-1 relative pt-2">
          {firstSub.logoFilename && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/assets/images/${firstSub.logoFilename}`}
              alt="Logo"
              className="absolute left-0 top-0 h-16 w-auto"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          )}
          <h2 className="text-[18px] font-bold text-[#0f2d59] uppercase">
            {memoData[0]?.collegeName ?? "COLLEGE OF ENGINEERING"}
          </h2>
          <p className="text-[13px] font-medium text-gray-600">
            MARKS MEMORANDUM
          </p>
        </div>

        {/* Student Information Block */}
        <div className="border border-[#e9ecef] rounded p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] bg-[#f8f9fa]">
          <div>
            <span className="font-semibold text-gray-700">Roll Number:</span>{" "}
            <span>{firstSub.stdRollNumber ?? memoData[0]?.rollNumber ?? "-"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Student Name:</span>{" "}
            <span>{firstSub.studentName ?? memoData[0]?.firstName ?? "-"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Exam Name:</span>{" "}
            <span>{memoData[0]?.examName ?? "-"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Memo No:</span>{" "}
            <span>{memoData[0]?.memoNo ?? "-"}</span>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse border border-[#000]">
            <thead>
              <tr className="bg-[#f0f0f0]">
                <th className="border border-[#000] px-2 py-1.5 w-[50px] text-center">SI No</th>
                <th className="border border-[#000] px-2 py-1.5 text-left">Subject Code</th>
                <th className="border border-[#000] px-2 py-1.5 text-left">Subject Title</th>
                <th className="border border-[#000] px-2 py-1.5 text-center">Internal</th>
                <th className="border border-[#000] px-2 py-1.5 text-center">External</th>
                <th className="border border-[#000] px-2 py-1.5 text-center">Total</th>
                <th className="border border-[#000] px-2 py-1.5 text-center">Result</th>
                <th className="border border-[#000] px-2 py-1.5 text-center">Credits</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i}>
                  <td className="border border-[#000] px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="border border-[#000] px-2 py-1.5">{s.subjectCode}</td>
                  <td className="border border-[#000] px-2 py-1.5">{s.subjectName}</td>
                  <td className="border border-[#000] px-2 py-1.5 text-center">{s.internalMarks ?? "-"}</td>
                  <td className="border border-[#000] px-2 py-1.5 text-center">{s.externalMarks ?? "-"}</td>
                  <td className="border border-[#000] px-2 py-1.5 text-center">
                    {s.internalMarks != null && s.externalMarks != null
                      ? Number(s.internalMarks) + Number(s.externalMarks)
                      : "-"}
                  </td>
                  <td className="border border-[#000] px-2 py-1.5 text-center font-semibold">
                    {s.examResultCatCode === "PASS"
                      ? "P"
                      : s.examResultCatCode === "ABSENT"
                        ? "AB"
                        : "F"}
                  </td>
                  <td className="border border-[#000] px-2 py-1.5 text-center">{s.credits ?? 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-[#f9f9f9]">
                <td colSpan={7} className="border border-[#000] px-2 py-1.5 text-right">
                  Total Credits:
                </td>
                <td className="border border-[#000] px-2 py-1.5 text-center">{totalCredits}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
