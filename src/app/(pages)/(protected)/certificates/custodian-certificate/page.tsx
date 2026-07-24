"use client";

import { useMemo, useState } from "react";
import { Select } from "@/common/components/select";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toastError } from "@/lib/toast";
import { CertificatePrintStyles } from "../_components/CertificatePrintStyles";
import { CertificateStudentProfile } from "../_components/CertificateStudentProfile";
import {
  CERTIFICATE_FOR_OPTIONS,
  CUSTODIAN_COLLEGE_OPTIONS,
} from "../_lib/certificate-constants";
import {
  isEmptyStudent,
  useCertificateStudent,
} from "../_lib/use-certificate-student";
import { CustodianCertificatePrint } from "./_components/CustodianCertificatePrint";

export default function CustodianCertificatePage() {
  const {
    studentId,
    students,
    selectedStudent,
    studentSearchLoading,
    onStudentSearch,
    handleStudentChange,
  } = useCertificateStudent();

  const [resultState, setResultState] = useState("1");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [ssc, setSsc] = useState(true);
  const [inter, setInter] = useState(false);
  const [diploma, setDiploma] = useState(false);
  const [degreeType, setDegreeType] = useState<string | null>(null);
  const [provisional, setProvisional] = useState(false);
  const [consolidatedMarksMemo, setConsolidatedMarksMemo] = useState(false);
  const [printDate, setPrintDate] = useState(() => new Date());

  const orgCode = String(selectedStudent?.universityCode ?? "").trim();
  const awaitingResults = resultState === "1";
  const showDegreeCerts = degreeType === "1" || degreeType === "2";

  const purposeLabel = useMemo(
    () =>
      CERTIFICATE_FOR_OPTIONS.find((opt) => opt.value === purpose)?.label ??
      purpose ??
      "",
    [purpose],
  );

  function handlePrint() {
    if (!selectedStudent || isEmptyStudent(selectedStudent)) {
      toastError(new Error("Please select a student"), "Validation");
      return;
    }
    if (!purpose) {
      toastError(new Error("Please select For"), "Validation");
      return;
    }
    setPrintDate(new Date());
    window.print();
  }

  return (
    <>
      <CertificatePrintStyles />
      <FilteredPage
        className="certificate-screen-only"
        title="Custodian Certificate"
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
                  <RadioGroupItem value="1" id="cust-awaiting-results" />
                  <Label
                    htmlFor="cust-awaiting-results"
                    className="font-normal"
                  >
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="cust-results-declared" />
                  <Label
                    htmlFor="cust-results-declared"
                    className="font-normal"
                  >
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cust-ssc"
                    checked={ssc}
                    onCheckedChange={(checked) => setSsc(checked === true)}
                  />
                  <Label htmlFor="cust-ssc" className="font-normal">
                    S.S.C
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cust-inter"
                    checked={inter}
                    onCheckedChange={(checked) => setInter(checked === true)}
                  />
                  <Label htmlFor="cust-inter" className="font-normal">
                    Intermediate
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cust-diploma"
                    checked={diploma}
                    onCheckedChange={(checked) => setDiploma(checked === true)}
                  />
                  <Label htmlFor="cust-diploma" className="font-normal">
                    Diploma
                  </Label>
                </div>
              </div>

              <RadioGroup
                value={degreeType ?? ""}
                onValueChange={(value) => setDegreeType(value || null)}
                className="flex flex-wrap items-center gap-8"
              >
                {CUSTODIAN_COLLEGE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`cust-degree-${option.value}`}
                    />
                    <Label
                      htmlFor={`cust-degree-${option.value}`}
                      className="font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {showDegreeCerts ? (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cust-provisional"
                      checked={provisional}
                      onCheckedChange={(checked) =>
                        setProvisional(checked === true)
                      }
                    />
                    <Label htmlFor="cust-provisional" className="font-normal">
                      Provisional Certificate
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cust-consolidated"
                      checked={consolidatedMarksMemo}
                      onCheckedChange={(checked) =>
                        setConsolidatedMarksMemo(checked === true)
                      }
                    />
                    <Label htmlFor="cust-consolidated" className="font-normal">
                      Consolidated Marks Memo
                    </Label>
                  </div>
                </div>
              ) : null}

              <div className="max-w-md">
                <Select
                  label="For *"
                  value={purpose}
                  onChange={setPurpose}
                  options={[...CERTIFICATE_FOR_OPTIONS]}
                  placeholder="Select purpose"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handlePrint}>
                  Print
                </Button>
              </div>
            </div>
          ) : null
        }
      />

      {selectedStudent && orgCode && purpose ? (
        <CustodianCertificatePrint
          orgCode={orgCode}
          student={selectedStudent}
          awaitingResults={awaitingResults}
          purposeLabel={purposeLabel}
          ssc={ssc}
          inter={inter}
          diploma={diploma}
          degreeType={
            degreeType === "1" || degreeType === "2" ? degreeType : null
          }
          provisional={provisional}
          consolidatedMarksMemo={consolidatedMarksMemo}
          printDate={printDate}
        />
      ) : null}
    </>
  );
}
