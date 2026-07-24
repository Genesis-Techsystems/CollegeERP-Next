"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StudentSearchSelect } from "@/common/components/student-search";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  BONAFIDE_APPLICATION_STATUS_ID,
  BONAFIDE_COLLEGE_CERTIFICATE_ID,
  generateBonafideCertificate,
  getBonafideCertificateIssue,
  listFeeReceiptsByStudent,
  listAcademicYearsByUniversity,
  listStudentFeeStructuresByStudent,
  searchStudentsForBonafideCertificate,
} from "@/services";
import type { BonafideCertificateIssueRow } from "@/services";
import type {
  StudentFeeSearchRow,
  FeeReceiptRow,
} from "@/types/fees-collection";
import { studentPhotoSrc } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import { BonafideCertificatePrint } from "./_components/BonafideCertificatePrint";

function isEmptyStudent(student: StudentFeeSearchRow | null): boolean {
  return !student || Object.keys(student).length === 0;
}

function uniqFinancialYears(rows: FeeReceiptRow[]): FeeReceiptRow[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const id = Number(row.financialYearId ?? 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function BonafiedCertificatePage() {
  const queryClient = useQueryClient();
  const { user } = useSessionContext();

  const [studentId, setStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [printDate, setPrintDate] = useState(() => new Date());

  const studentNum = Number(studentId ?? 0);
  const collegeNum = Number(selectedStudent?.collegeId ?? 0);
  const universityNum = Number(
    selectedStudent?.universityId ?? user?.universityId ?? 0,
  );
  const orgCode = String(selectedStudent?.universityCode ?? "").trim();

  const { data: feeCertificateData = null, isFetching: loadingCertificate } =
    useQuery({
      queryKey: ["BonafideCertificate", "issue", collegeNum, studentNum],
      queryFn: () =>
        getBonafideCertificateIssue({
          collegeId: collegeNum,
          studentId: studentNum,
        }),
      enabled: studentNum > 0 && collegeNum > 0,
    });

  useQuery({
    queryKey: ["BonafideCertificate", "feeReceipts", studentNum],
    queryFn: async () =>
      uniqFinancialYears(await listFeeReceiptsByStudent(studentNum)),
    enabled: studentNum > 0,
  });

  useQuery({
    queryKey: ["BonafideCertificate", "academicYears", universityNum],
    queryFn: () => listAcademicYearsByUniversity(universityNum),
    enabled: universityNum > 0 && studentNum > 0,
  });

  useQuery({
    queryKey: ["BonafideCertificate", "studentFeeList", studentNum],
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  });

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudents([]);
      return;
    }

    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsForBonafideCertificate(q);
      setStudents(rows);
    } catch (error) {
      toastError(error, "Student search failed");
      setStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  const showActions = useMemo(
    () => !isEmptyStudent(selectedStudent) && studentNum > 0,
    [selectedStudent, studentNum],
  );

  async function handleGenerate() {
    if (!selectedStudent || !studentNum) {
      toastError(new Error("Please select a student"), "Validation");
      return;
    }

    const collegeId = Number(selectedStudent.collegeId ?? 0);
    const courseYearId = Number(selectedStudent.courseYearId ?? 0);
    if (!collegeId || !courseYearId) {
      toastError(new Error("Student details are incomplete"), "Validation");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateBonafideCertificate({
        isActive: true,
        collegeId,
        courseYearId,
        studentId: studentNum,
        collegeCertificateId: BONAFIDE_COLLEGE_CERTIFICATE_ID,
        applicationStatusId: BONAFIDE_APPLICATION_STATUS_ID,
      });
      toastSuccess(result?.message ?? "Certificate generated successfully");
      setPrintDate(new Date());
      await queryClient.invalidateQueries({
        queryKey: ["BonafideCertificate", "issue", collegeId, studentNum],
      });
    } catch (error) {
      toastError(error, "Failed to generate bonafide certificate");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    setPrintDate(new Date());
    window.print();
  }

  function handleStudentChange(
    id: number | null,
    student: Record<string, unknown> | null,
  ) {
    setStudentId(id);
    setSelectedStudent(student as StudentFeeSearchRow | null);
    setPrintDate(new Date());
    if (!id) {
      setStudents([]);
    }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bonafide-print-root,
          .bonafide-print-root * {
            visibility: visible;
          }
          .bonafide-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .bonafide-screen-only {
            display: none !important;
          }
        }

        .bonafide-border {
          padding: 20px;
          height: 700px;
          max-height: 700px;
          width: 1000px;
          max-width: 1000px;
          border: double rgb(0, 0, 0) rgb(0, 0, 0);
          margin: 0 auto 10px;
        }

        .bonafide-border-2 {
          padding: 20px;
          min-height: 850px;
          width: 1000px;
          max-width: 1000px;
          border: 3px solid rgb(0, 0, 0);
          margin: 0 auto;
        }

        .bonafide-p1 {
          font-size: 30px;
          margin-bottom: -7px;
          color: rgb(0, 0, 0);
          text-align: center;
          font-weight: bold;
        }

        .bonafide-p3 {
          display: inline-block;
          font-size: 22px;
          color: rgb(0, 0, 0);
          font-weight: 500;
          margin: 17px 0;
        }

        .bonafide-span {
          border-bottom: 1px dotted #000;
          text-align: center;
          text-transform: capitalize;
          font-weight: bold;
        }

        .bonafide-data {
          text-transform: capitalize;
          font-weight: bold;
        }
      `}</style>

      <FilteredPage
        className="bonafide-screen-only"
        title="Bonafied Certificate"
        filters={
          <GlobalFilterBarRow>
            <div className="md:col-span-5 w-full max-w-md space-y-1">
              <StudentSearchSelect
                label="Student *"
                value={studentId}
                students={students}
                selectedStudent={selectedStudent}
                isLoading={studentSearchLoading}
                minChars={5}
                onSearch={onStudentSearch}
                onChange={handleStudentChange}
              />
            </div>
          </GlobalFilterBarRow>
        }
        body={
          selectedStudent && !isEmptyStudent(selectedStudent) ? (
            <div className="space-y-4">
              <div className="rounded-sm border-4 border-[#c3d9ff] bg-white px-4 py-3">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img
                    src={studentPhotoSrc(
                      String(
                        selectedStudent.studentPhotoPath ??
                          selectedStudent.student_photo_path ??
                          "",
                      ),
                    )}
                    alt=""
                    className="h-28 w-[80%] max-w-[120px] rounded border-4 border-[#c3d9ff] bg-[#c3d9ff] object-cover p-1.5 sm:h-auto"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes("default_Student.png")) {
                        img.src = "/assets/images/avatars/default_Student.png";
                      }
                    }}
                  />
                  <div className="space-y-1 py-2.5 text-sm font-medium">
                    <p>
                      {selectedStudent.firstName ?? "Student"} (
                      <span className="text-blue-600">
                        {selectedStudent.quotaDisplayName ?? ""}
                      </span>
                      )
                    </p>
                    <p className="text-[#8c8c8c]">
                      {selectedStudent.rollNumber ??
                        selectedStudent.hallticketNumber ??
                        "—"}
                    </p>
                    <p className="text-[#8c8c8c]">
                      {selectedStudent.collegeCode ?? "—"} /{" "}
                      {selectedStudent.academicYear ?? "—"} /{" "}
                      {selectedStudent.courseCode ?? "—"} /{" "}
                      {selectedStudent.groupCode ?? "—"} /{" "}
                      {selectedStudent.courseYearName ?? "—"} / Section{" "}
                      {selectedStudent.section ?? "—"}
                    </p>
                    <p className="text-[#8c8c8c]">
                      {selectedStudent.mobile ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              {showActions ? (
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || loadingCertificate}
                  >
                    {generating ? "Generating…" : "Generate"}
                  </Button>
                  <Button type="button" variant="default" onClick={handlePrint}>
                    Print
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />

      {selectedStudent && orgCode ? (
        <BonafideCertificatePrint
          orgCode={orgCode}
          student={selectedStudent}
          feeCertificateData={
            feeCertificateData as BonafideCertificateIssueRow | null
          }
          printDate={printDate}
        />
      ) : null}
    </>
  );
}
