"use client";

import { useState } from "react";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CertificatePrintStyles } from "../_components/CertificatePrintStyles";
import { CertificateStudentProfile } from "../_components/CertificateStudentProfile";
import {
  isEmptyStudent,
  useCertificateStudent,
} from "../_lib/use-certificate-student";
import { MediumOfInstructionCertificatePrint } from "./_components/MediumOfInstructionCertificatePrint";

export default function MediumOfInstructionCertificatePage() {
  const {
    studentId,
    students,
    selectedStudent,
    studentSearchLoading,
    onStudentSearch,
    handleStudentChange,
  } = useCertificateStudent();

  const [resultState, setResultState] = useState("1");
  const [printDate, setPrintDate] = useState(() => new Date());

  const orgCode = String(selectedStudent?.universityCode ?? "").trim();
  const awaitingResults = resultState === "1";

  function handlePrint() {
    setPrintDate(new Date());
    window.print();
  }

  return (
    <>
      <CertificatePrintStyles />
      <FilteredPage
        className="certificate-screen-only"
        title="Medium of Instructions Certificate"
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
                  <RadioGroupItem value="1" id="moi-awaiting-results" />
                  <Label htmlFor="moi-awaiting-results" className="font-normal">
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="moi-results-declared" />
                  <Label htmlFor="moi-results-declared" className="font-normal">
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex justify-end">
                <Button type="button" onClick={handlePrint}>
                  Print
                </Button>
              </div>
            </div>
          ) : null
        }
      />

      {selectedStudent && orgCode ? (
        <MediumOfInstructionCertificatePrint
          orgCode={orgCode}
          student={selectedStudent}
          awaitingResults={awaitingResults}
          printDate={printDate}
        />
      ) : null}
    </>
  );
}
