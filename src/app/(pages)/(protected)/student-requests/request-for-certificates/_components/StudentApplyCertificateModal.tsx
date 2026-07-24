"use client";

/**
 * Angular `apply-certificate-modal` (student-requests) — session student, selectable certificate.
 * Reuses the same certificate services as staff ApplyCertificateModal; does not alter that UI.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CERTIFICATE_FOR_OPTIONS,
  COURSE_COMPLETION_FOR_OPTIONS,
} from "@/app/(pages)/(protected)/certificates/_lib/certificate-constants";
import { FeeStudentProfileCard } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_components/FeeStudentProfileCard";
import {
  appliedOnNow,
  filterCertificatesForApply,
  listAcademicYearsForCollege,
  listCertificateIssueStatuses,
  listCollegeCertificatesByCollege,
  listFeeReceiptsByStudent,
  listFeeStudentDataParticulars,
  listStudentFeeStructuresByStudent,
} from "@/services";
import type { ApplyCertificateRequestPayload } from "@/types/tc-no-due";
import type { CollegeCertificate } from "@/types/college-certificate";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import { toastError } from "@/lib/toast";

interface StudentApplyCertificateModalProps {
  open: boolean;
  onClose: () => void;
  collegeId: number;
  student: StudentFeeSearchRow;
  academicYearId: number;
  onSubmit: (payload: ApplyCertificateRequestPayload) => void;
}

type ParticularRow = Record<string, unknown> & {
  particularsCode?: string;
  particularsName?: string;
  checked?: boolean;
};

function uniqByFinancialYearId<T extends { financialYearId?: number }>(
  rows: T[],
): T[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const id = Number(row.financialYearId ?? 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function StudentApplyCertificateModal({
  open,
  onClose,
  collegeId,
  student,
  academicYearId,
  onSubmit,
}: Readonly<StudentApplyCertificateModalProps>) {
  const [certificates, setCertificates] = useState<CollegeCertificate[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [check, setCheck] = useState("1");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [forOther, setForOther] = useState("");
  const [isOther, setIsOther] = useState(false);

  const [ssc, setSsc] = useState(true);
  const [inter, setInter] = useState(false);
  const [diploma, setDiploma] = useState(false);
  const [degree, setDegree] = useState(false);
  const [btech, setBtech] = useState(false);
  const [provisional, setProvisional] = useState(false);
  const [consolidated, setConsolidated] = useState(false);

  const [financialYearId, setFinancialYearId] = useState<string | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<
    string | null
  >(null);
  const [financialYears, setFinancialYears] = useState<
    Array<{
      financialYearId?: number;
      financialYear?: string;
      academicYearId?: number;
    }>
  >([]);
  const [academicYears, setAcademicYears] = useState<
    Array<{ academicYearId?: number; academicYear?: string }>
  >([]);
  const [feeStudentData, setFeeStudentData] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [particulars, setParticulars] = useState<ParticularRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedCert = useMemo(
    () =>
      certificates.find(
        (c) => String(c.collegeCertificateId) === selectedCertId,
      ) ?? null,
    [certificates, selectedCertId],
  );
  const certificateCode = String(
    selectedCert?.certifcateCode ?? "",
  ).toUpperCase();

  const resetForm = useCallback(() => {
    setSelectedCertId(null);
    setCheck("1");
    setPurpose(null);
    setForOther("");
    setIsOther(false);
    setSsc(true);
    setInter(false);
    setDiploma(false);
    setDegree(false);
    setBtech(false);
    setProvisional(false);
    setConsolidated(false);
    setFinancialYearId(null);
    setSelectedAcademicYearId(null);
    setFinancialYears([]);
    setAcademicYears([]);
    setFeeStudentData([]);
    setParticulars([]);
  }, []);

  const loadStudentSideData = useCallback(async () => {
    const sid = Number(student.studentId);
    if (!sid) return;
    try {
      const [feeList, receipts, years] = await Promise.all([
        listStudentFeeStructuresByStudent(sid),
        listFeeReceiptsByStudent(sid),
        listAcademicYearsForCollege(Number(student.collegeId ?? collegeId)),
      ]);
      setFeeStudentData(feeList as Array<Record<string, unknown>>);
      setFinancialYears(
        uniqByFinancialYearId(
          receipts as Array<{
            financialYearId?: number;
            financialYear?: string;
            academicYearId?: number;
          }>,
        ),
      );
      setAcademicYears(
        years.map((y) => ({
          academicYearId: Number(y.academicYearId ?? y.id ?? 0),
          academicYear: String(
            y.academicYear ?? y.academicYearName ?? y.academicYearCode ?? "",
          ),
        })),
      );
    } catch (error) {
      toastError(error, "Failed to load student fee details");
    }
  }, [student, collegeId]);

  useEffect(() => {
    if (!open) return;
    resetForm();
    void listCollegeCertificatesByCollege(collegeId)
      .then((rows) => {
        const filtered = filterCertificatesForApply(rows);
        setCertificates(filtered);
        if (filtered[0]) {
          setSelectedCertId(String(filtered[0].collegeCertificateId));
        }
      })
      .catch((e) => toastError(e, "Failed to load certificates"));
    void loadStudentSideData();
  }, [open, collegeId, resetForm, loadStudentSideData]);

  async function loadParticularsForAcademicYear(ayId: number) {
    const match = feeStudentData.find(
      (row) => Number(row.academicYearId) === ayId,
    );
    const feeStructureId = Number(match?.feeStructureId ?? 0);
    if (!feeStructureId) {
      setParticulars([]);
      return;
    }
    try {
      const rows = await listFeeStudentDataParticulars({
        collegeId: Number(student.collegeId ?? collegeId),
        studentId: Number(student.studentId),
        feeStructureId,
      });
      setParticulars(rows.map((r) => ({ ...r, checked: false })));
    } catch (error) {
      toastError(error, "Failed to load fee particulars");
      setParticulars([]);
    }
  }

  function handlePurposeChange(value: string | null) {
    setPurpose(value);
    setIsOther(value === "OTHER");
    if (value !== "OTHER") setForOther("");
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!selectedCert || !student.studentId) {
      toastError(new Error("Please select a certificate"), "Validation");
      return;
    }

    setSubmitting(true);
    try {
      const statuses = await listCertificateIssueStatuses();
      const appliedStatus = statuses.find(
        (s) => s.generalDetailCode === "APPLIED",
      );
      if (!appliedStatus?.generalDetailId) {
        throw new Error("APPLIED status not found");
      }

      const payload: ApplyCertificateRequestPayload = {
        studentId: Number(student.studentId),
        collegeCertificateId: Number(selectedCert.collegeCertificateId),
        collegeId: Number(selectedCert.collegeId ?? collegeId),
        academicYearId: Number(academicYearId || student.academicYearId || 0),
        applicationStatusId: Number(appliedStatus.generalDetailId),
        appliedOn: appliedOnNow(),
        certifcateCode: selectedCert.certifcateCode,
        certificateName: selectedCert.certificateName,
        campusId: selectedCert.campusId,
        certificateTypeId: selectedCert.certificateTypeId,
      };

      if (certificateCode === "CERBC" && check === "1") {
        payload.certificateFor = "FOR COUNDUCT";
        payload.certificateForValue = isOther
          ? forOther
          : (purpose ?? undefined);
      } else if (certificateCode === "CERBC" && check === "2") {
        payload.certificateFor = "FORINCOMETAX";
        payload.certificateForValue = "for Income Tax";
        payload.applicationComments = particulars
          .filter((p) => p.checked)
          .map((p) => String(p.particularsCode ?? ""))
          .filter(Boolean)
          .join(",");
        payload.academicYearId = Number(
          selectedAcademicYearId || academicYearId || 0,
        );
        payload.financialYearId = Number(financialYearId ?? 0);
      } else if (certificateCode === "CERBC" && check === "3") {
        payload.certificateFor = "FORTC";
        payload.certificateForValue = "for TC";
      } else if (certificateCode === "CERBC" && check === "4") {
        payload.certificateFor = "FORBANK";
        payload.certificateForValue = "for Bank Loan";
        payload.applicationComments = particulars
          .filter((p) => p.checked)
          .map((p) => String(p.particularsCode ?? ""))
          .filter(Boolean)
          .join(",");
      } else if (certificateCode === "CERCUST") {
        const certificatesList: string[] = [];
        if (ssc) certificatesList.push("S.S.C");
        if (inter) certificatesList.push("Intermediate");
        if (diploma) certificatesList.push("Diploma");
        if (degree) certificatesList.push("Degree");
        if (btech) certificatesList.push("B.Tech");
        payload.certificateFor = certificatesList.join(",");
        const degreeList: string[] = [];
        if (consolidated) degreeList.push("ConsolidatedMarksMemo");
        if (provisional) degreeList.push("Provisional");
        payload.applicationComments = degreeList.join(",") || null;
        payload.certificateForValue = purpose;
      } else if (certificateCode === "CERMEDINST") {
        payload.certificateFor = "MEDIUMOFINSTRUCTIONS";
        payload.certificateForValue = null;
      } else if (certificateCode === "CERCC") {
        payload.certificateFor = "COURSECOMPLETION";
        payload.certificateForValue = purpose;
      }

      onSubmit(payload);
      onClose();
    } catch (error) {
      toastError(error, "Unable to prepare certificate request");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTfParticular(tfIndex: number, checked: boolean) {
    let seen = -1;
    setParticulars((prev) =>
      prev.map((p) => {
        if (p.particularsCode !== "TF") return p;
        seen += 1;
        if (seen !== tfIndex) return p;
        return { ...p, checked };
      }),
    );
  }

  const tfParticulars = particulars.filter((p) => p.particularsCode === "TF");

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Request Certificates"
      onSubmit={handleSubmit}
      submitLabel="Apply"
      isSubmitting={submitting}
      size="lg"
    >
      <div className="space-y-4">
        <FeeStudentProfileCard student={student} />

        <Select
          label="Certificate *"
          value={selectedCertId}
          onChange={setSelectedCertId}
          options={certificates.map((c) => ({
            value: String(c.collegeCertificateId),
            label: c.certificateName ?? c.certifcateCode,
          }))}
          placeholder="Select certificate"
        />

        {certificateCode === "CERBC" ? (
          <RadioGroup
            value={check}
            onValueChange={setCheck}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="1" id="stu-apply-for" />
              <Label htmlFor="stu-apply-for" className="font-normal">
                Apply For
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="2" id="stu-for-income-tax" />
              <Label htmlFor="stu-for-income-tax" className="font-normal">
                For Income Tax
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="3" id="stu-for-tc" />
              <Label htmlFor="stu-for-tc" className="font-normal">
                For Transfer Certificate
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="4" id="stu-for-bank" />
              <Label htmlFor="stu-for-bank" className="font-normal">
                For Bank
              </Label>
            </div>
          </RadioGroup>
        ) : null}

        {certificateCode === "CERBC" && check === "1" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="For"
              value={purpose}
              onChange={handlePurposeChange}
              options={[...CERTIFICATE_FOR_OPTIONS]}
              placeholder="Select purpose"
            />
            {isOther ? (
              <div className="space-y-1.5">
                <Label>Other</Label>
                <Input
                  value={forOther}
                  onChange={(e) => setForOther(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {certificateCode === "CERBC" && check === "2" ? (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Financial Year"
                value={financialYearId}
                onChange={(v) => {
                  setFinancialYearId(v);
                  const fy = financialYears.find(
                    (f) => String(f.financialYearId) === v,
                  );
                  const ay = Number(fy?.academicYearId ?? 0);
                  if (ay) {
                    setSelectedAcademicYearId(String(ay));
                    void loadParticularsForAcademicYear(ay);
                  }
                }}
                options={financialYears.map((f) => ({
                  value: String(f.financialYearId),
                  label: String(f.financialYear ?? f.financialYearId),
                }))}
                placeholder="Select financial year"
              />
              <Select
                label="Academic Year *"
                value={selectedAcademicYearId}
                onChange={(v) => {
                  setSelectedAcademicYearId(v);
                  if (v) void loadParticularsForAcademicYear(Number(v));
                }}
                options={academicYears.map((y) => ({
                  value: String(y.academicYearId),
                  label: String(y.academicYear ?? y.academicYearId),
                }))}
                placeholder="Select academic year"
              />
            </div>
            {tfParticulars.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-600">
                  Fee Particulars :
                </p>
                {tfParticulars.map((item, index) => (
                  <div
                    key={`${String(item.particularsCode)}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={Boolean(item.checked)}
                      onCheckedChange={(checked) =>
                        toggleTfParticular(index, checked === true)
                      }
                    />
                    <Label className="font-normal">
                      {String(item.particularsName ?? "")}
                    </Label>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {certificateCode === "CERBC" &&
        check === "4" &&
        tfParticulars.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-600">
              Fee Particulars :
            </p>
            {tfParticulars.map((item, index) => (
              <div
                key={`${String(item.particularsCode)}-bank-${index}`}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={Boolean(item.checked)}
                  onCheckedChange={(checked) =>
                    toggleTfParticular(index, checked === true)
                  }
                />
                <Label className="font-normal">
                  {String(item.particularsName ?? "")}
                </Label>
              </div>
            ))}
          </div>
        ) : null}

        {certificateCode === "CERCUST" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["ssc", ssc, setSsc, "S.S.C"],
                  ["inter", inter, setInter, "Intermediate"],
                  ["diploma", diploma, setDiploma, "Diploma"],
                  ["degree", degree, setDegree, "Degree"],
                  ["btech", btech, setBtech, "B.Tech"],
                ] as const
              ).map(([key, value, setter, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={value}
                    onCheckedChange={(c) => setter(c === true)}
                    id={`stu-cust-${key}`}
                  />
                  <Label htmlFor={`stu-cust-${key}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            {btech ? (
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={provisional}
                    onCheckedChange={(c) => setProvisional(c === true)}
                    id="stu-cust-provisional"
                  />
                  <Label
                    htmlFor="stu-cust-provisional"
                    className="font-normal"
                  >
                    Provisional Certificate
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={consolidated}
                    onCheckedChange={(c) => setConsolidated(c === true)}
                    id="stu-cust-consolidated"
                  />
                  <Label
                    htmlFor="stu-cust-consolidated"
                    className="font-normal"
                  >
                    Consolidated Marks Memo
                  </Label>
                </div>
              </div>
            ) : null}
            <Select
              label="For"
              value={purpose}
              onChange={handlePurposeChange}
              options={[...CERTIFICATE_FOR_OPTIONS]}
              placeholder="Select purpose"
            />
          </div>
        ) : null}

        {certificateCode === "CERCC" ? (
          <Select
            label="For"
            value={purpose}
            onChange={setPurpose}
            options={[...COURSE_COMPLETION_FOR_OPTIONS]}
            placeholder="Select purpose"
          />
        ) : null}
      </div>
    </FormModal>
  );
}
