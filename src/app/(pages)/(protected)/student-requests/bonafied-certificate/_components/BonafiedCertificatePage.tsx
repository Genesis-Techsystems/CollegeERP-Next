"use client";

/**
 * Angular `certificates/bonafied-certificate` (student portal menu entry).
 * Session student → Print bonafide certificate (same APIs/print templates as admin).
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { toastError } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  getBonafideCertificateIssue,
} from "@/services";
import type { BonafideCertificateIssueRow } from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import { StudentProfileHeader } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/StudentProfileHeader";
import { BonafideCertificatePrint } from "@/app/(pages)/(protected)/certificates/bonafied-certificate/_components/BonafideCertificatePrint";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function toStudentFeeRow(detail: AnyRow): StudentFeeSearchRow {
  return {
    studentId: positiveId(detail.studentId, detail.fk_student_id),
    firstName: String(detail.firstName ?? ""),
    fatherName: String(detail.fatherName ?? ""),
    rollNumber: String(detail.rollNumber ?? ""),
    hallticketNumber: String(detail.hallticketNumber ?? ""),
    collegeId: positiveId(detail.collegeId, detail.fk_college_id),
    collegeCode: String(detail.collegeCode ?? ""),
    collegeName: String(detail.collegeName ?? ""),
    collegeAddress: String(detail.collegeAddress ?? ""),
    academicYearId: positiveId(
      detail.academicYearId,
      detail.fk_academic_year_id,
    ),
    academicYear: String(detail.academicYear ?? ""),
    courseCode: String(detail.courseCode ?? detail.courseName ?? ""),
    courseName: String(detail.courseName ?? detail.courseCode ?? ""),
    groupCode: String(detail.groupCode ?? ""),
    courseYearId: positiveId(detail.courseYearId, detail.fk_course_year_id),
    courseYearName: String(detail.courseYearName ?? ""),
    section: String(detail.section ?? ""),
    mobile: String(detail.mobile ?? ""),
    studentPhotoPath: String(detail.studentPhotoPath ?? ""),
    quotaDisplayName: String(detail.quotaDisplayName ?? ""),
    studentStatusCode: String(detail.studentStatusCode ?? ""),
    studentStatusDisplayName: String(detail.studentStatusDisplayName ?? ""),
    universityId: positiveId(detail.universityId, detail.fk_university_id),
    universityCode: String(detail.universityCode ?? ""),
    orgLogo: String(detail.orgLogo ?? ""),
    dateOfBirth: detail.dateOfBirth ?? detail.dob ?? null,
  } as StudentFeeSearchRow;
}

export function BonafiedCertificatePage() {
  const { user, isLoading: sessionLoading } = useSession();

  const [student, setStudent] = useState<AnyRow | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [collegeId, setCollegeId] = useState(0);
  const [studentId, setStudentId] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [printDate, setPrintDate] = useState(() => new Date());

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const sid = sessionStudentId || storageStudentId;

      let detail: AnyRow | null = null;
      if (sid) {
        detail = (await fetchStudentDetail(sid)) as AnyRow | null;
      }
      if (!detail && user?.userId) {
        detail = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null;
      }

      if (!detail) {
        setStudent(null);
        setSelectedStudent(null);
        setStudentId(0);
        setCollegeId(0);
        return;
      }

      const resolvedStudentId = positiveId(
        detail.studentId,
        detail.fk_student_id,
        sid,
      );
      const resolvedCollegeId = positiveId(
        detail.collegeId,
        detail.fk_college_id,
        user?.collegeId,
        readStorage("collegeId"),
      );

      setStudent(detail);
      setSelectedStudent(toStudentFeeRow(detail));
      setStudentId(resolvedStudentId);
      setCollegeId(resolvedCollegeId);
      setPrintDate(new Date());
    } catch (e) {
      toastError(e, "Could not load your student profile");
      setStudent(null);
      setSelectedStudent(null);
      setStudentId(0);
      setCollegeId(0);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadProfile();
  }, [sessionLoading, loadProfile]);

  const { data: feeCertificateData = null } = useQuery({
    queryKey: ["StudentBonafideCertificate", "issue", collegeId, studentId],
    queryFn: () =>
      getBonafideCertificateIssue({
        collegeId,
        studentId,
      }),
    enabled: studentId > 0 && collegeId > 0,
  });

  const orgCode = String(
    selectedStudent?.universityCode ??
      student?.universityCode ??
      readStorage("orgCode") ??
      "",
  ).trim();

  function handlePrint() {
    if (!selectedStudent) {
      toastError(new Error("Student profile not loaded"), "Validation");
      return;
    }
    setPrintDate(new Date());
    window.print();
  }

  const loading = sessionLoading || profileLoading;
  const showPrint = Boolean(selectedStudent && studentId > 0);

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
        notice={
          !loading && !student ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Student profile not found for this session.
            </div>
          ) : null
        }
        filters={
          <div className="space-y-3">
            {student ? (
              <>
                <StudentProfileHeader student={student} />
                {showPrint ? (
                  <div className="flex justify-end">
                    <Button type="button" onClick={handlePrint}>
                      Print
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading…" : "No student profile loaded."}
              </p>
            )}
          </div>
        }
        filtersCollapsible
        filtersDefaultOpen
        body={null}
        tableHeader={null}
      />

      {selectedStudent ? (
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
