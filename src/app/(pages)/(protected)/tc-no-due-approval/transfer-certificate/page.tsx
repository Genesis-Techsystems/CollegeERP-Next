"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Info } from "lucide-react";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MINIO_URL } from "@/config/constants/api";
import { QK } from "@/lib/query-keys";
import { format } from "date-fns";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  appliedOnNow,
  applyTcCertificateWorkflow,
  generateTcCertificatePdf,
  generateTransferCertificate,
  getNoDueCertificateIssue,
  getStudentDetailForTc,
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByStudentAndCertificate,
  listCertificateIssueStatuses,
  listStudentStatuses,
  pickCollegeCertificateByCode,
  searchStudentsForTc,
  tcTransferDateValue,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";
import type { GeneralDetail } from "@/types/exam-master";
import { ConfirmTcDialog } from "../_components/ConfirmTcDialog";
import { StudentProfileHeader } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/StudentProfileHeader";
import { useTcCollegeCascade } from "../_lib/use-tc-college-cascade";
import {
  TC_GENERAL_PROGRESS_OPTIONS,
  TC_QUALIFIED_OPTIONS,
} from "../_lib/tc-constants";

function formatDisplayDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function statusBadgeClass(code: string): string {
  const c = code.toUpperCase();
  if (c === "CLEARED" || c === "TCISSUED")
    return "text-emerald-700 font-medium";
  if (c === "APPLIED") return "text-amber-700 font-medium";
  if (c === "REJECTED") return "text-red-700 font-medium";
  return "text-slate-700 font-medium";
}

function isEmptyObject(
  obj: Record<string, unknown> | null | undefined,
): boolean {
  return !obj || Object.keys(obj).length === 0;
}

function openStoredFile(path: string) {
  if (!path) return;
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${MINIO_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function TransferCertificatePage() {
  const queryClient = useQueryClient();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [feeStudentData, setFeeStudentData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  const [nodueDetails, setNodueDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [noDueMessage, setNoDueMessage] = useState<string | null>(null);

  const [transferDate, setTransferDate] = useState<Date | null>(
    () => new Date(),
  );
  const [studentStatusId, setStudentStatusId] = useState<string>("");
  const [qualified, setQualified] = useState("");
  const [generalProgress, setGeneralProgress] = useState("");
  const [reason, setReason] = useState("");

  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [generating, setGenerating] = useState(false);

  const collegeNum = Number(collegeId ?? 0);
  const studentNum = Number(studentId ?? 0);
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum);

  const { data: collegeCertificates = [] } = useQuery({
    queryKey: QK.tcNoDue.collegeCerts(collegeNum, "all"),
    queryFn: () => listCollegeCertificatesByCollege(collegeNum),
    enabled: collegeNum > 0,
  });

  const tcCert = useMemo(
    () => pickCollegeCertificateByCode(collegeCertificates, "TC"),
    [collegeCertificates],
  );
  const nodueCert = useMemo(
    () => pickCollegeCertificateByCode(collegeCertificates, "NODUE"),
    [collegeCertificates],
  );
  const tcCertId = Number(tcCert?.collegeCertificateId ?? 0);
  const nodueCertId = Number(nodueCert?.collegeCertificateId ?? 0);

  const { data: certStatuses = [] } = useQuery({
    queryKey: ["TcNoDue", "certStatuses"],
    queryFn: listCertificateIssueStatuses,
  });

  const { data: studentStatuses = [] } = useQuery({
    queryKey: ["TcNoDue", "studentStatuses"],
    queryFn: listStudentStatuses,
  });

  const { data: feeCertificateIssues = [], isLoading: loadingIssues } =
    useQuery({
      queryKey: QK.tcNoDue.studentIssue(studentNum, tcCertId),
      queryFn: () =>
        listFeeCertificateIssuesByStudentAndCertificate(studentNum, tcCertId),
      enabled: studentNum > 0 && tcCertId > 0,
    });

  const noDueFlag = useMemo(() => {
    if (feeCertificateIssues.length === 0) return true;
    return feeCertificateIssues[0]?.applicationStatusCode === "REJECTED";
  }, [feeCertificateIssues]);

  const isApply = useMemo(() => {
    const code = String(
      nodueDetails?.applicationStatusCode ?? "",
    ).toUpperCase();
    return code === "CLEARED" || code === "TCISSUED";
  }, [nodueDetails]);

  const showGenerateForm =
    studentNum > 0 &&
    Boolean(feeStudentData) &&
    feeCertificateIssues.length === 0;
  const showHistory =
    studentNum > 0 &&
    Boolean(feeStudentData) &&
    feeCertificateIssues.length > 0;

  const studentStatusOptions = useMemo(
    () =>
      studentStatuses.map((s: GeneralDetail) => ({
        value: String(s.generalDetailId),
        label: String(
          s.generalDetailDisplayName ??
            s.generalDetailCode ??
            s.generalDetailId ??
            "",
        ),
      })),
    [studentStatuses],
  );

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < 5 || !collegeNum) {
        setStudentRows([]);
        return;
      }
      setStudentSearchLoading(true);
      try {
        const rows = await searchStudentsForTc({ collegeId: collegeNum, q });
        setStudentRows(rows);
      } catch (e) {
        toastError(e, "Student search failed");
        setStudentRows([]);
      } finally {
        setStudentSearchLoading(false);
      }
    },
    [collegeNum],
  );

  const profileStudent = useMemo(() => {
    if (!feeStudentData && !selectedStudent) return null;
    const detail: Record<string, unknown> = feeStudentData ?? {};
    const pick: StudentFeeSearchRow =
      selectedStudent ?? ({} as StudentFeeSearchRow);
    return {
      ...pick,
      ...detail,
      courseName: detail.courseName ?? detail.courseCode,
      groupCode: detail.courseGroupName ?? detail.groupCode,
      hallticketNumber: detail.rollNumber ?? detail.hallticketNumber,
      rollNumber: detail.rollNumber ?? pick.rollNumber ?? pick.hallticketNumber,
      studentStatusCode: detail.studentStatusCode ?? pick.studentStatusCode,
      studentStatusDisplayName:
        detail.studentStatusDisplayName ?? pick.studentStatusDisplayName,
      quotaDisplayName: detail.quotaDisplayName ?? pick.quotaDisplayName,
      studentPhotoPath: detail.studentPhotoPath ?? pick.studentPhotoPath,
      isLateral: detail.isLateral ?? pick.isLateral,
      adminssionDate:
        detail.adminssionDate ?? detail.admissionDate ?? pick.adminssionDate,
    };
  }, [feeStudentData, selectedStudent]);

  async function loadStudentContext(
    sid: number,
    pick: StudentFeeSearchRow | null,
  ) {
    setLoadingStudentDetail(true);
    setNodueDetails(null);
    setNoDueMessage(null);
    setQualified("");
    setGeneralProgress("");
    setReason("");
    setTransferDate(new Date());
    try {
      const detail = await getStudentDetailForTc(sid);
      setFeeStudentData(detail);

      if (nodueCertId > 0) {
        const nodue = await getNoDueCertificateIssue({
          studentId: sid,
          collegeCertificateId: nodueCertId,
        });
        setNodueDetails(nodue.details);
        setNoDueMessage(nodue.message);
      }

      if (!tcCertId && collegeNum > 0) {
        toastInfo("TC is not mentioned in College Certificates.");
      }

      if (pick && !detail) {
        setFeeStudentData({
          firstName: pick.firstName,
          rollNumber: pick.rollNumber ?? pick.hallticketNumber,
          hallticketNumber: pick.hallticketNumber ?? pick.rollNumber,
          collegeCode: pick.collegeCode,
          academicYear: pick.academicYear,
          courseName: pick.courseCode,
          courseGroupName: pick.groupCode,
          groupCode: pick.groupCode,
          courseYearName: pick.courseYearName,
          section: pick.section,
          mobile: pick.mobile,
          quotaDisplayName: pick.quotaDisplayName,
          studentPhotoPath: pick.studentPhotoPath,
          studentStatusCode: pick.studentStatusCode,
          studentStatusDisplayName: pick.studentStatusDisplayName,
          isLateral: pick.isLateral,
        });
      }
    } catch (e) {
      toastError(e, "Failed to load student details");
      setFeeStudentData(null);
    } finally {
      setLoadingStudentDetail(false);
    }
  }

  useEffect(() => {
    if (!studentNum) {
      setFeeStudentData(null);
      setNodueDetails(null);
      setNoDueMessage(null);
      return;
    }
    void loadStudentContext(studentNum, selectedStudent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentNum, tcCertId, nodueCertId]);

  async function invalidateStudentData() {
    await queryClient.invalidateQueries({
      queryKey: QK.tcNoDue.studentIssue(studentNum, tcCertId),
    });
    if (studentNum) {
      await loadStudentContext(studentNum, selectedStudent);
    }
  }

  async function handleApplyCertificate() {
    if (!tcCert || !selectedStudent) return;
    const appliedStatus = certStatuses.find(
      (s) => s.generalDetailCode === "APPLIED",
    );
    if (!appliedStatus?.generalDetailId) {
      toastError(new Error("APPLIED status not configured"), "Cannot apply TC");
      return;
    }
    setApplying(true);
    try {
      const detail = await getStudentDetailForTc(studentNum);
      await applyTcCertificateWorkflow([
        {
          collegeCertificateId: tcCert.collegeCertificateId,
          applicationStatusId: appliedStatus.generalDetailId,
          collegeId: Number(selectedStudent.collegeId ?? collegeNum),
          academicYearId: Number(
            detail?.academicYearId ?? selectedStudent.academicYearId ?? 0,
          ),
          studentId: studentNum,
          appliedOn: appliedOnNow(),
          isWorkFlowFlag: false,
        },
      ]);
      toastSuccess("TC application submitted");
      await invalidateStudentData();
    } catch (e) {
      toastError(e, "Failed to apply for TC");
    } finally {
      setApplying(false);
      setConfirmApplyOpen(false);
    }
  }

  async function handleGenerate() {
    if (
      !studentNum ||
      !transferDate ||
      !studentStatusId ||
      !qualified ||
      !generalProgress ||
      !reason.trim()
    ) {
      toastError(new Error("Please fill all required fields"), "Validation");
      return;
    }

    const academicEndDate = tcTransferDateValue(transferDate);
    const detail = feeStudentData ?? {};
    const payload: Record<string, unknown> = {
      academicEndDate,
      studentStatusId: Number(studentStatusId),
      remarks: generalProgress,
      conduct: qualified,
      reason: reason.trim(),
      isActive: true,
      collegeId: Number(
        selectedStudent?.collegeId ?? detail.collegeId ?? collegeNum ?? 0,
      ),
      academicYearId: Number(
        selectedStudent?.academicYearId ?? detail.academicYearId ?? 0,
      ),
      studentId: studentNum,
      collegeCertificateId:
        tcCertId || Number(tcCert?.collegeCertificateId ?? 0),
      issuedOn: academicEndDate,
    };

    setGenerating(true);
    try {
      await generateTransferCertificate(payload);
      toastSuccess("Transfer certificate generated");
      await invalidateStudentData();
    } catch (e) {
      toastError(e, "Failed to generate transfer certificate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGeneratePdfFromHistory(row?: FeeCertificateIssueRow) {
    if (!studentNum) return;
    const activeTcCertId =
      tcCertId ||
      Number(
        pickCollegeCertificateByCode(collegeCertificates, "TC")
          ?.collegeCertificateId ?? 0,
      );
    if (!activeTcCertId) {
      toastInfo("TC is not mentioned in College Certificates.");
      return;
    }
    setGenerating(true);
    try {
      await generateTcCertificatePdf({
        flag: "tc_certificate",
        collegeId: Number(selectedStudent?.collegeId ?? collegeNum),
        studentId: studentNum,
        collegeCertificateId: activeTcCertId,
        feeCertificateIssueId: Number(
          row?.feeCertificateIssueId ??
            feeCertificateIssues[0]?.feeCertificateIssueId ??
            0,
        ),
      });
      toastSuccess("TC certificate PDF generated");
      await invalidateStudentData();
    } catch (e) {
      toastError(e, "Failed to generate TC certificate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <FilteredPage
      title="Transfer Certificate"
      filters={
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="College *"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setStudentId(null);
              setSelectedStudent(null);
              setStudentRows([]);
              setFeeStudentData(null);
            }}
            options={colleges}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <div
            className={
              !collegeNum ? "pointer-events-none opacity-50" : undefined
            }
          >
            <StudentSearchSelect
              label="Student *"
              value={studentNum || null}
              students={studentRows}
              selectedStudent={selectedStudent}
              isLoading={studentSearchLoading}
              placeholder="Search by student name or rollno."
              onSearch={(term) => void onStudentSearch(term)}
              onChange={(sid, row) => {
                setStudentId(sid ? String(sid) : null);
                setSelectedStudent((row as StudentFeeSearchRow | null) ?? null);
              }}
            />
          </div>
        </div>
      }
    >
      {studentNum > 0 && (feeStudentData || loadingStudentDetail) && (
        <div className="space-y-4">
          {loadingStudentDetail && !feeStudentData && (
            <p className="text-sm text-muted-foreground">
              Loading student details…
            </p>
          )}
          {profileStudent && (
            <>
              <StudentProfileHeader student={profileStudent} />

              {(noDueMessage || !isEmptyObject(nodueDetails)) && (
                <div className="flex items-start gap-2 text-sm text-[#005aff]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {noDueMessage ? (
                      "To apply for T.C, please clear your No Due Certificate."
                    ) : String(
                        nodueDetails?.applicationStatusCode ?? "",
                      ).toUpperCase() === "CLEARED" ? (
                      <>
                        {String(
                          nodueDetails?.certificateName ?? "No Due Certificate",
                        )}{" "}
                        applied on {formatDisplayDate(nodueDetails?.createdDt)}{" "}
                        is in{" "}
                        {String(
                          nodueDetails?.applicationStatusDisplayName ??
                            "Cleared",
                        )}{" "}
                        status
                      </>
                    ) : (
                      <>
                        Unable to apply T.C as{" "}
                        {String(
                          nodueDetails?.certificateName ?? "No Due Certificate",
                        )}{" "}
                        applied on {formatDisplayDate(nodueDetails?.createdDt)}{" "}
                        is in{" "}
                        {String(
                          nodueDetails?.applicationStatusDisplayName ?? "—",
                        )}{" "}
                        status
                      </>
                    )}
                  </p>
                </div>
              )}

              {tcCertId > 0 && isApply && noDueFlag && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setConfirmApplyOpen(true)}
                    disabled={applying}
                  >
                    Apply Certificate
                  </Button>
                </div>
              )}

              {showGenerateForm && (
                <div className="app-card space-y-4 rounded-md border p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label>Transfer Date *</Label>
                      <DatePicker
                        value={transferDate}
                        onChange={setTransferDate}
                        displayFormat="dd/MM/yyyy"
                        clearable={false}
                        placeholder="Transfer Date"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status *</Label>
                      <Select
                        value={studentStatusId || null}
                        onChange={(v) => setStudentStatusId(v ?? "")}
                        options={studentStatusOptions}
                        placeholder="Status"
                        searchable
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Wheather Qualified *</Label>
                      <Select
                        value={qualified || null}
                        onChange={(v) => setQualified(v ?? "")}
                        options={[...TC_QUALIFIED_OPTIONS]}
                        placeholder="Wheather Qualified"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>General Progress *</Label>
                      <Select
                        value={generalProgress || null}
                        onChange={(v) => setGeneralProgress(v ?? "")}
                        options={[...TC_GENERAL_PROGRESS_OPTIONS]}
                        placeholder="General Progress"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
                    <div className="space-y-1.5">
                      <Label>Reason for leaveing *</Label>
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={generating || loadingStudentDetail}
                      onClick={() => void handleGenerate()}
                    >
                      {generating ? "Generating…" : "Generate"}
                    </Button>
                  </div>
                </div>
              )}

              {showHistory && (
                <div className="app-card space-y-3 rounded-md border p-4">
                  <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">
                    Transfer Certificate History
                  </h2>
                  <div className="overflow-auto rounded border">
                    <table className="w-full min-w-[720px] text-[12px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-2 py-2 text-left">SI No.</th>
                          <th className="px-2 py-2 text-left">Academic Year</th>
                          <th className="px-2 py-2 text-left">Status</th>
                          <th className="px-2 py-2 text-left">
                            Certficate No.
                          </th>
                          <th className="px-2 py-2 text-left">
                            Wheather Qualified
                          </th>
                          <th className="px-2 py-2 text-left">
                            General Progress
                          </th>
                          <th className="px-2 py-2 text-left">Document</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeCertificateIssues.map((row, i) => (
                          <tr
                            key={row.feeCertificateIssueId ?? i}
                            className="border-t"
                          >
                            <td className="px-2 py-2">{i + 1}</td>
                            <td className="px-2 py-2">
                              {row.academicYear ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className={statusBadgeClass(
                                  row.applicationStatusCode ?? "",
                                )}
                              >
                                {row.applicationStatusDisplayName ??
                                  row.applicationStatusName ??
                                  row.applicationStatusCode ??
                                  "—"}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {row.certificateNumber ?? "—"}
                            </td>
                            <td className="px-2 py-2">{row.conduct ?? "—"}</td>
                            <td className="px-2 py-2">{row.remarks ?? "—"}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                {row.refDocumentPath ? (
                                  <button
                                    type="button"
                                    className="text-[#0e62c7] hover:underline"
                                    title="View Certificate"
                                    onClick={() =>
                                      openStoredFile(
                                        String(row.refDocumentPath),
                                      )
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span>—</span>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={generating}
                                  onClick={() =>
                                    void handleGeneratePdfFromHistory(row)
                                  }
                                >
                                  Generate
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {feeCertificateIssues.length === 0 &&
                          !loadingIssues && (
                            <tr className="border-t">
                              <td
                                colSpan={7}
                                className="px-2 py-6 text-center text-muted-foreground"
                              >
                                No transfer certificate history
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!tcCertId && collegeNum > 0 && studentNum > 0 && (
        <p className="text-sm text-amber-700">
          TC is not configured in College Certificates for this college.
        </p>
      )}

      <ConfirmTcDialog
        open={confirmApplyOpen}
        onOpenChange={setConfirmApplyOpen}
        title="Confirmation"
        description="Are you sure, you want to apply for T.C ?"
        onConfirm={() => void handleApplyCertificate()}
        loading={applying}
      />
    </FilteredPage>
  );
}
