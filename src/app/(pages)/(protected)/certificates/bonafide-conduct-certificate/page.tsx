"use client";

/**
 * Angular parity: certificates/bonafide-conduct-certificate
 * Search: studentsearch?q= (min 5)
 * Side data: studentfeelist, feereceipts (FY), AcademicYear by university
 * Particulars: FeeStudentDataParticular (Income Tax / Bank)
 * Print: window.print() org templates (AMS / MVSR / MECS) — Angular printCert()
 */

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentSearchSelect } from "@/common/components/student-search";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSessionContext } from "@/context/SessionContext";
import { toastError } from "@/lib/toast";
import {
  getBonafideCertificateIssue,
  listAcademicYearsByUniversity,
  listFeeReceiptsByStudent,
  listFeeStudentDataParticulars,
  listStudentFeeStructuresByStudent,
  searchStudentsForCertificate,
} from "@/services";
import type {
  StudentFeeSearchRow,
  FeeReceiptRow,
} from "@/types/fees-collection";
import { CertificatePrintStyles } from "../_components/CertificatePrintStyles";
import { CertificateStudentProfile } from "../_components/CertificateStudentProfile";
import { CERTIFICATE_FOR_OPTIONS } from "../_lib/certificate-constants";
import { isEmptyStudent } from "../_lib/use-certificate-student";
import { BonafideConductCertificatePrint } from "./_components/BonafideConductCertificatePrint";

type FeeParticularRow = Record<string, unknown> & {
  particularsCode?: string;
  particularsName?: string;
  checked?: boolean;
};

function uniqFinancialYears(rows: FeeReceiptRow[]): FeeReceiptRow[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const id = Number(row.financialYearId ?? 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function BonafideConductCertificatePage() {
  const { user } = useSessionContext();

  const [studentId, setStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  /** Angular checkCat: 1 = Awaiting Results, 2 = Results Declared */
  const [resultState, setResultState] = useState("1");
  /** Angular check: 1 Apply For, 2 Income Tax, 3 Transfer Certificate, 4 Bank */
  const [applyMode, setApplyMode] = useState("1");

  const [purpose, setPurpose] = useState<string | null>(null);
  const [forOther, setForOther] = useState("");
  const [financialYearId, setFinancialYearId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [particulars, setParticulars] = useState<FeeParticularRow[]>([]);
  const [printDate, setPrintDate] = useState(() => new Date());

  const studentNum = Number(studentId ?? 0);
  const collegeNum = Number(selectedStudent?.collegeId ?? 0);
  const universityNum = Number(
    selectedStudent?.universityId ?? user?.universityId ?? 0,
  );
  const orgCode = String(selectedStudent?.universityCode ?? "").trim();
  const isOther = purpose === "OTHER";

  const { data: feeStudentData = [] } = useQuery({
    queryKey: ["BonafideConduct", "studentFeeList", studentNum],
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  });

  const { data: financialYears = [] } = useQuery({
    queryKey: ["BonafideConduct", "feeReceipts", studentNum],
    queryFn: async () =>
      uniqFinancialYears(await listFeeReceiptsByStudent(studentNum)),
    enabled: studentNum > 0,
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ["BonafideConduct", "academicYears", universityNum],
    queryFn: () => listAcademicYearsByUniversity(universityNum),
    enabled: universityNum > 0 && studentNum > 0,
  });

  const { data: feeCertificateData = null } = useQuery({
    queryKey: ["BonafideConduct", "issue", collegeNum, studentNum],
    queryFn: () =>
      getBonafideCertificateIssue({
        collegeId: collegeNum,
        studentId: studentNum,
      }),
    enabled: studentNum > 0 && collegeNum > 0,
  });

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudents([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      setStudents(await searchStudentsForCertificate(q));
    } catch (error) {
      toastError(error, "Student search failed");
      setStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  function resetSideState() {
    setPurpose(null);
    setForOther("");
    setFinancialYearId(null);
    setAcademicYearId(null);
    setParticulars([]);
    setApplyMode("1");
    setResultState("1");
  }

  function handleStudentChange(
    id: number | null,
    student: Record<string, unknown> | null,
  ) {
    setStudentId(id);
    setSelectedStudent(student as StudentFeeSearchRow | null);
    setPrintDate(new Date());
    resetSideState();
    if (!id) setStudents([]);
  }

  async function loadParticularsForAcademicYear(ayId: number) {
    if (!selectedStudent || !studentNum) return;
    const match = (feeStudentData as Array<Record<string, unknown>>).find(
      (row) => Number(row.academicYearId) === ayId,
    );
    const feeStructureId = Number(match?.feeStructureId ?? 0);
    if (!feeStructureId) {
      setParticulars([]);
      return;
    }
    try {
      const rows = await listFeeStudentDataParticulars({
        collegeId: Number(selectedStudent.collegeId ?? 0),
        studentId: studentNum,
        feeStructureId,
      });
      setParticulars(rows.map((r) => ({ ...r, checked: false })));
    } catch (error) {
      toastError(error, "Failed to load fee particulars");
      setParticulars([]);
    }
  }

  function handleFinancialYearChange(value: string | null) {
    setFinancialYearId(value);
    const fy = financialYears.find((r) => String(r.financialYearId) === value);
    const ayId = Number(fy?.academicYearId ?? 0);
    if (ayId > 0) {
      // Angular selectedFinancialYear → getFeeParticulars(academicYearId)
      void loadParticularsForAcademicYear(ayId);
    } else {
      setParticulars([]);
    }
  }

  const resolvedPurpose = useMemo(() => {
    if (applyMode !== "1") {
      if (applyMode === "2") return "Income Tax";
      if (applyMode === "3") return "Transfer Certificate";
      if (applyMode === "4") return "Bank";
      return null;
    }
    if (isOther) return forOther.trim() || null;
    return purpose;
  }, [applyMode, isOther, forOther, purpose]);

  const showPrint =
    !isEmptyStudent(selectedStudent) &&
    (purpose != null ||
      applyMode === "2" ||
      applyMode === "3" ||
      applyMode === "4");

  function handlePrint() {
    if (!selectedStudent || isEmptyStudent(selectedStudent)) {
      toastError(new Error("Please select a student"), "Validation");
      return;
    }
    if (applyMode === "1") {
      if (!purpose) {
        toastError(new Error("Please select For"), "Validation");
        return;
      }
      if (isOther && !forOther.trim()) {
        toastError(new Error("Please enter Other purpose"), "Validation");
        return;
      }
    }
    setPrintDate(new Date());
    // Angular printCert() — window.print() of org templates
    window.print();
  }

  const incomeTaxParticulars = particulars.filter(
    (p) => String(p.particularsCode ?? "").toUpperCase() === "TF",
  );

  return (
    <>
      <CertificatePrintStyles />
      <FilteredPage
        className="certificate-screen-only"
        title="Bonafied And Conduct Certificate"
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
              <CertificateStudentProfile student={selectedStudent} />

              <RadioGroup
                value={resultState}
                onValueChange={setResultState}
                className="flex flex-wrap items-center gap-8"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="bc-awaiting" />
                  <Label htmlFor="bc-awaiting" className="font-normal">
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="bc-declared" />
                  <Label htmlFor="bc-declared" className="font-normal">
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <RadioGroup
                value={applyMode}
                onValueChange={(v) => {
                  setApplyMode(v);
                  if (v !== "1") {
                    setPurpose(null);
                    setForOther("");
                  }
                  if (v !== "2" && v !== "4") {
                    setFinancialYearId(null);
                    setAcademicYearId(null);
                    setParticulars([]);
                  }
                }}
                className="flex flex-wrap items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="bc-apply-for" />
                  <Label htmlFor="bc-apply-for" className="font-normal">
                    Apply For
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="bc-income-tax" />
                  <Label htmlFor="bc-income-tax" className="font-normal">
                    For Income Tax
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="3" id="bc-tc" />
                  <Label htmlFor="bc-tc" className="font-normal">
                    For Transfer Certificate
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="4" id="bc-bank" />
                  <Label htmlFor="bc-bank" className="font-normal">
                    For Bank
                  </Label>
                </div>
              </RadioGroup>

              {applyMode === "1" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Select
                    label="For *"
                    value={purpose}
                    onChange={(v) => {
                      setPurpose(v);
                      if (v !== "OTHER") setForOther("");
                    }}
                    options={[...CERTIFICATE_FOR_OPTIONS]}
                    placeholder="Select purpose"
                  />
                  {isOther ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="bc-for-other">Other *</Label>
                      <Input
                        id="bc-for-other"
                        value={forOther}
                        onChange={(e) => setForOther(e.target.value)}
                        placeholder="Enter purpose"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {applyMode === "2" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Select
                      label="Financial Year"
                      value={financialYearId}
                      onChange={handleFinancialYearChange}
                      options={financialYears.map((y) => ({
                        value: String(y.financialYearId),
                        label: String(y.financialYear ?? y.financialYearId),
                      }))}
                      placeholder="Select financial year"
                    />
                    <Select
                      label="Academic Year *"
                      value={academicYearId}
                      onChange={setAcademicYearId}
                      options={academicYears.map((y) => {
                        const row = y as Record<string, unknown>;
                        return {
                          value: String(row.academicYearId ?? row.id ?? ""),
                          label: String(
                            row.academicYear ??
                              row.academicYearName ??
                              row.academicYearCode ??
                              "",
                          ),
                        };
                      })}
                      placeholder="Select academic year"
                    />
                  </div>
                  {incomeTaxParticulars.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-blue-600">
                        Fee Particulars :
                      </h3>
                      {incomeTaxParticulars.map((item, i) => {
                        const key = `tf-${String(item.particularsCode)}-${i}`;
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={Boolean(item.checked)}
                              onCheckedChange={(checked) => {
                                setParticulars((prev) =>
                                  prev.map((row) =>
                                    row === item
                                      ? { ...row, checked: Boolean(checked) }
                                      : row,
                                  ),
                                );
                              }}
                            />
                            {String(
                              item.particularsName ??
                                item.particularsCode ??
                                "",
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {applyMode === "4" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Select
                      label="Financial Year"
                      value={financialYearId}
                      onChange={handleFinancialYearChange}
                      options={financialYears.map((y) => ({
                        value: String(y.financialYearId),
                        label: String(y.financialYear ?? y.financialYearId),
                      }))}
                      placeholder="Select financial year"
                    />
                  </div>
                  {particulars.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-blue-600">
                        Fee Particulars :
                      </h3>
                      {particulars.map((item, i) => (
                        <label
                          key={`${String(item.particularsCode)}-${i}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={Boolean(item.checked)}
                            onCheckedChange={(checked) => {
                              setParticulars((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, checked: Boolean(checked) }
                                    : row,
                                ),
                              );
                            }}
                          />
                          {String(
                            item.particularsName ?? item.particularsCode ?? "",
                          )}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showPrint ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={handlePrint}>
                    Print
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />

      {selectedStudent && orgCode ? (
        <BonafideConductCertificatePrint
          orgCode={orgCode}
          student={selectedStudent}
          purpose={resolvedPurpose}
          printDate={printDate}
          feeCertificateData={
            feeCertificateData as Record<string, unknown> | null
          }
        />
      ) : null}
    </>
  );
}
