"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/common/components/date-picker";
import { toastError, toastSuccess, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { MINIO_URL } from "@/config/constants/api";
import {
  domainList,
  buildQuery,
  listStudents,
  getCollegeCertificatesForMemo,
  getFeeCertificateIssues,
  saveExamMemoMaster,
  issueMarksMemoCertificate,
} from "@/services";

type AnyRow = Record<string, any>;

const STATUS_CLASS: Record<string, string> = {
  DTND: "text-red-600 font-bold",
  INCOLLEGE: "text-green-700 font-bold",
  PASSEDOUT: "text-[#461eb6] font-bold",
  DETAINRECOMMENDED: "text-orange-600 font-bold",
  DISCONTINUED: "text-red-600 font-bold",
};

const DEFAULT_STUDENT_AVATAR = "/assets/images/avatars/default_Student.png";

export default function MarksMemoIssuePage() {
  const router = useRouter();

  // Search state
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [student, setStudent] = useState<AnyRow | null>(null);
  const [photoError, setPhotoError] = useState(false);

  // Selections
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [examId, setExamId] = useState<string | null>(null);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);

  // Data state
  const [collegeCertificates, setCollegeCertificates] = useState<AnyRow[]>([]);
  const [memo, setMemo] = useState<AnyRow | null>(null);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<AnyRow[]>([]);
  const [flag, setFlag] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [memoNo, setMemoNo] = useState("");
  const [memoSerialNo, setMemoSerialNo] = useState("");
  const [memoDate, setMemoDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [dateOfIssue, setDateOfIssue] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // Student Search
  const handleStudentSearch = async (term: string) => {
    const q = (term ?? "").trim();
    if (!q || q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const list = await listStudents(q).catch(() => []);
      setStudents(Array.isArray(list) ? list : []);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  const handleStudentSelect = async (sid: number | null, row: AnyRow | null) => {
    setStudentId(sid);
    setStudent(row);
    setPhotoError(false);
    setExamsList([]);
    setExamId(null);
    setCourseYears([]);
    setCourseYearId(null);
    setMemo(null);
    setSubjects([]);
    setIssuedCertificates([]);
    setFlag(false);

    if (!sid || !row) return;

    try {
      // Fetch student's exams
      const examStudents = await domainList<AnyRow>(
        "ExamStudent",
        buildQuery({ "studentDetail.studentId": sid, isActive: true }, undefined, {
          createdDt: "DESC",
        }),
      ).catch(() => []);

      const extExams = (Array.isArray(examStudents) ? examStudents : []).filter(
        (e) => !e.isInternalExam,
      );
      setExamsList(extExams);

      // Fetch college certificate config for MARKSMEMO
      if (row.collegeId) {
        const certs = await getCollegeCertificatesForMemo(Number(row.collegeId));
        setCollegeCertificates(certs);
      }
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to load student exams.");
    }
  };

  const handleExamSelect = (eid: string | null) => {
    setExamId(eid);
    setCourseYearId(null);
    setCourseYears([]);
    setMemo(null);
    setSubjects([]);
    setIssuedCertificates([]);

    if (!eid) return;
    const foundExam = examsList.find((x) => String(x.examId) === eid);
    if (foundExam) {
      setCourseYears([foundExam]);
    }
  };

  const handleCourseYearSelect = async (cyId: string | null) => {
    setCourseYearId(cyId);
    setMemo(null);
    setSubjects([]);
    setIssuedCertificates([]);
    setFlag(true);

    if (!cyId || !studentId || !examId) return;

    try {
      const memoList = await domainList<AnyRow>(
        "ExamMemoMaster",
        buildQuery({
          "studentDetail.studentId": studentId,
          "examMaster.examId": Number(examId),
          "courseYear.courseYearId": Number(cyId),
        }),
      ).catch(() => []);

      if (Array.isArray(memoList) && memoList.length > 0) {
        const m = memoList[0];
        setMemo(m);
        setMemoNo(m.memoNo ?? "");
        setMemoSerialNo(m.memoSerialNo ?? "");
        if (m.memoDate) setMemoDate(String(m.memoDate).slice(0, 10));
        if (m.dateOfIssue) setDateOfIssue(String(m.dateOfIssue).slice(0, 10));

        const rawSubjs = m.examStudentMemoSubjectDTO ?? [];
        const processed = (Array.isArray(rawSubjs) ? rawSubjs : []).map(
          (sub: AnyRow) => {
            const intM = sub.internalMarks;
            const extM = sub.externalMarks;
            const total =
              intM == null || extM == null
                ? "-"
                : Number(intM) + Number(extM);
            return { ...sub, totalMarks: total };
          },
        );
        setSubjects(processed);

        if (m.memoSerialNo && collegeCertificates.length > 0) {
          const certIssues = await getFeeCertificateIssues({
            studentId,
            collegeCertificateId: Number(
              collegeCertificates[0].collegeCertificateId,
            ),
            certificateNumber: String(m.memoSerialNo),
          }).catch(() => []);
          setIssuedCertificates(Array.isArray(certIssues) ? certIssues : []);
        }
      }
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to load memo details.");
    }
  };

  const handleSaveMemo = async () => {
    if (!memo) return;
    if (!memoNo || !memoSerialNo) {
      toastError("Please provide Memo No. and Memo Serial No.");
      return;
    }
    setSaving(true);
    try {
      const updatedMemo = {
        ...memo,
        memoNo,
        memoSerialNo,
        memoDate,
        dateOfIssue,
      };
      await saveExamMemoMaster(updatedMemo);
      toastSuccess("Memo details saved successfully.");
      if (courseYearId) await handleCourseYearSelect(courseYearId);
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to save memo.");
    } finally {
      setSaving(false);
    }
  };

  const handleIssueMemo = async () => {
    if (!student || !memoSerialNo) {
      toastError("Memo Serial No. is required to issue.");
      return;
    }
    if (collegeCertificates.length === 0) {
      toastError(
        "Marks Memo certificate is not in college certificate list, please contact system admin.",
      );
      return;
    }

    setSaving(true);
    try {
      const issuePayload = {
        studentId: student.studentId,
        collegeId: student.collegeId,
        academicYearId: student.academicYearId,
        collegeCertificateId: collegeCertificates[0].collegeCertificateId,
        certificateNumber: memoSerialNo,
        certificateFor: "Marks Memo",
        issuedOn: new Date().toISOString(),
        appliedOn: new Date().toISOString(),
        isActive: true,
        isApproved: true,
      };

      await issueMarksMemoCertificate(issuePayload);
      toastSuccess("Marks Memo issued successfully.");
      if (courseYearId) await handleCourseYearSelect(courseYearId);
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to issue marks memo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPdf = () => {
    if (!examId || !studentId || !courseYearId) return;
    const url = `${MINIO_URL}exammarksmemodownload?examId=${examId}&studentId=${studentId}&courseYearId=${courseYearId}`;
    window.open(url, "_blank");
  };

  const handlePrintMemoView = () => {
    if (!memo) return;
    router.push(
      `/admin-examination-management/post-examination/marks-memo-issue/memo-print?data=${encodeURIComponent(
        JSON.stringify([memo]),
      )}`,
    );
  };

  return (
    <PageContainer>
      <div className="app-card overflow-hidden p-3 space-y-4">
        {/* Sub Header */}
        <div className="flex items-center gap-2 border-b border-[#dedede] pb-2 mb-3">
          <span className="material-icons text-[#0f2d59]" style={{ fontSize: 20 }}>
            money
          </span>
          <h1 className="text-[16px] font-bold text-[#0f2d59]">
            Exam Marks Memo Issue
          </h1>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#f8f9fa] p-3 rounded border border-[#e9ecef]">
          <div className="md:col-span-4 space-y-1">
            <StudentSearchSelect
              label="Student"
              value={studentId}
              students={students}
              selectedStudent={student}
              isLoading={studentSearchLoading}
              onSearch={(t) => void handleStudentSearch(t)}
              onChange={(id, row) => void handleStudentSelect(id, row)}
            />
          </div>
          <div className="md:col-span-5 space-y-1">
            <Select
              label="Exam"
              value={examId}
              onChange={(v) => handleExamSelect(v)}
              options={examsList.map((e) => ({
                value: String(e.examId),
                label: `${e.examName ?? ""} (${e.examFromDate ?? ""} - ${e.examToDate ?? ""})`,
              }))}
              placeholder="Select Exam"
              searchable
              disabled={!studentId}
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={(v) => void handleCourseYearSelect(v)}
              options={courseYears.map((cy) => ({
                value: String(cy.courseYearId),
                label: cy.courseYearName ?? String(cy.courseYearId),
              }))}
              placeholder="Select Course Year"
              disabled={!examId}
            />
          </div>
        </div>

        {/* Student Banner */}
        {student && flag && (
          <div className="rounded border border-[#c3d9ff] p-3 bg-white">
            <div className="flex gap-4">
              <div className="w-[120px] shrink-0">
                {student.studentPhotoPath && !photoError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={student.studentPhotoPath}
                    alt="student"
                    className="w-full bg-[#c3d9ff] p-1.5"
                    style={{ maxHeight: 110 }}
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={DEFAULT_STUDENT_AVATAR}
                    alt="student"
                    className="w-full bg-[#c3d9ff] p-1.5"
                    style={{ maxHeight: 110 }}
                  />
                )}
              </div>
              <div className="flex-1 text-[13px] leading-5">
                <p className="font-medium">
                  {student.firstName} (
                  <span className="text-blue-600">
                    {student.isLateral ? "LATERAL" : "REGULAR"}
                  </span>
                  )
                </p>
                <p className="text-[#8c8c8c]">{student.rollNumber ?? student.hallticketNumber}</p>
                <p className="text-[#8c8c8c]">
                  {student.collegeCode} / {student.academicYear} /{" "}
                  {student.courseCode} / {student.groupCode} /{" "}
                  {student.courseYearName} / Section {student.section}
                </p>
                <p className="text-[#8c8c8c]">{student.mobile}</p>
              </div>
              <div className="text-[14px]">
                <div className="py-1">
                  Quota :{" "}
                  <span className="text-blue-600">
                    {student.quotaDisplayName}
                  </span>
                </div>
                <div className="py-1">
                  Student Status :{" "}
                  <span
                    className={
                      STATUS_CLASS[String(student.studentStatusCode)] ??
                      "text-green-700 font-medium"
                    }
                  >
                    {student.studentStatusDisplayName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notice when Memo not generated */}
        {flag && !memo && (
          <p className="font-medium text-red-600 px-2">
            Memo is not generated for this exam.
          </p>
        )}

        {/* Student Exam Subjects Table */}
        {memo && subjects.length > 0 && (
          <div className="border border-[#dedede] rounded p-3 bg-white space-y-2">
            <h2 className="text-[15px] font-medium text-[#0f2d59]">
              Student Exam Subjects
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#C3D9FF] text-left">
                    <th className="px-2 py-1.5 w-[60px] text-center">SI No.</th>
                    <th className="px-2 py-1.5">Subject Code</th>
                    <th className="px-2 py-1.5">Subject Title</th>
                    <th className="px-2 py-1.5 text-center">Internal Marks</th>
                    <th className="px-2 py-1.5 text-center">External Marks</th>
                    <th className="px-2 py-1.5 text-center">Total Marks</th>
                    <th className="px-2 py-1.5 text-center">Result</th>
                    <th className="px-2 py-1.5 text-center">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub, i) => (
                    <tr key={i} className="border-t hover:bg-[#f9fafb]">
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{sub.subjectCode}</td>
                      <td className="px-2 py-1.5">{sub.subjectName}</td>
                      <td className="px-2 py-1.5 text-center">{sub.internalMarks}</td>
                      <td className="px-2 py-1.5 text-center">{sub.externalMarks}</td>
                      <td className="px-2 py-1.5 text-center">{sub.totalMarks}</td>
                      <td className="px-2 py-1.5 text-center">
                        {sub.examResultCatCode === "ABSENT" && (
                          <span className="font-bold text-red-600">AB</span>
                        )}
                        {sub.examResultCatCode === "PASS" && (
                          <span className="font-bold text-green-700">P</span>
                        )}
                        {sub.examResultCatCode === "FAIL" && (
                          <span className="font-bold text-red-600">F</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">{sub.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Memo Form & Issue controls */}
        {student && flag && memo && (
          <div className="border border-[#dedede] rounded p-4 bg-white space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[12px] font-medium text-gray-700">
                  Memo No. <span className="text-red-500">*</span>
                </label>
                <Input
                  className="h-8 text-[12px]"
                  placeholder="Memo No."
                  value={memoNo}
                  onChange={(e) => setMemoNo(e.target.value)}
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-[12px] font-medium text-gray-700">
                  Memo Serial No. <span className="text-red-500">*</span>
                </label>
                <Input
                  className="h-8 text-[12px]"
                  placeholder="Memo Serial No."
                  value={memoSerialNo}
                  onChange={(e) => setMemoSerialNo(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[12px] font-medium text-gray-700">
                  Memo Date
                </label>
                <DatePicker
                  value={memoDate}
                  onChange={(d) => setMemoDate(d)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[12px] font-medium text-gray-700">
                  Date Of Issue
                </label>
                <DatePicker
                  value={dateOfIssue}
                  onChange={(d) => setDateOfIssue(d)}
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  className="h-8 w-full bg-[#0f2d59] text-white hover:bg-[#0c2340] text-[12px]"
                  onClick={() => void handleSaveMemo()}
                  disabled={saving}
                >
                  Save
                </Button>
              </div>
              <div className="md:col-span-1">
                <Button
                  className="h-8 w-full bg-[#0f2d59] text-white hover:bg-[#0c2340] text-[12px]"
                  onClick={() => void handleIssueMemo()}
                  disabled={saving}
                >
                  Issue
                </Button>
              </div>
            </div>

            {collegeCertificates.length === 0 && (
              <p className="text-[12px] font-medium text-red-600">
                Marks Memo certificate is not in college certificate list, please
                contact system admin.
              </p>
            )}
          </div>
        )}

        {/* Issued Marks Memo Table */}
        {issuedCertificates.length > 0 && (
          <div className="border border-[#dedede] rounded p-3 bg-white space-y-2">
            <h2 className="text-[15px] font-medium text-[#0f2d59]">
              Issued Marks Memo
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#C3D9FF] text-left">
                    <th className="px-2 py-1.5 w-[60px] text-center">SI No.</th>
                    <th className="px-2 py-1.5">Certificate</th>
                    <th className="px-2 py-1.5">Academic Year</th>
                    <th className="px-2 py-1.5">Certificate Number</th>
                    <th className="px-2 py-1.5">Issued On</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5 text-center">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {issuedCertificates.map((feeCer, i) => (
                    <tr key={i} className="border-t hover:bg-[#f9fafb]">
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{feeCer.certificateFor}</td>
                      <td className="px-2 py-1.5">{feeCer.academicYear}</td>
                      <td className="px-2 py-1.5">{feeCer.certificateNumber}</td>
                      <td className="px-2 py-1.5">
                        {feeCer.issuedOn ? String(feeCer.issuedOn).slice(0, 10) : ""}
                      </td>
                      <td className="px-2 py-1.5">
                        {feeCer.applicationStatusDisplayName}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            className="h-7 text-[12px] bg-[#0f2d59] text-white hover:bg-[#0c2340]"
                            onClick={handlePrintPdf}
                          >
                            Print
                          </Button>
                          <Button
                            className="h-7 text-[12px] bg-[#f0c243] text-black hover:bg-[#d8ae3c] border-none"
                            onClick={handlePrintMemoView}
                          >
                            View Memo
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
