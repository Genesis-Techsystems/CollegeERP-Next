"use client";

import { useMemo, useState } from "react";
import { Select } from "@/common/components/select";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toastError } from "@/lib/toast";
import { CertificatePrintStyles } from "../_components/CertificatePrintStyles";
import { CertificateStudentProfile } from "../_components/CertificateStudentProfile";
import {
  buildPassoutYearOptions,
  COURSE_COMPLETION_FOR_OPTIONS,
  PASSOUT_MONTH_OPTIONS,
} from "../_lib/certificate-constants";
import {
  isEmptyStudent,
  useCertificateStudent,
} from "../_lib/use-certificate-student";
import { CourseCompletionCertificatePrint } from "./_components/CourseCompletionCertificatePrint";

export default function CourseCompletionCertificatePage() {
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
  const [passoutMonth, setPassoutMonth] = useState<string | null>(null);
  const [passoutYear, setPassoutYear] = useState<string | null>(null);
  const [printDate, setPrintDate] = useState(() => new Date());

  const passoutYearOptions = useMemo(() => buildPassoutYearOptions(), []);
  const orgCode = String(selectedStudent?.universityCode ?? "").trim();
  const awaitingResults = resultState === "1";

  function handlePrint() {
    if (!selectedStudent || isEmptyStudent(selectedStudent)) {
      toastError(new Error("Please select a student"), "Validation");
      return;
    }
    if (!purpose || !passoutMonth || !passoutYear) {
      toastError(new Error("Please fill all required fields"), "Validation");
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
        title="Course Complete Certificate"
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
                  <RadioGroupItem value="1" id="course-awaiting-results" />
                  <Label
                    htmlFor="course-awaiting-results"
                    className="font-normal"
                  >
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="course-results-declared" />
                  <Label
                    htmlFor="course-results-declared"
                    className="font-normal"
                  >
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="For *"
                  value={purpose}
                  onChange={setPurpose}
                  options={[...COURSE_COMPLETION_FOR_OPTIONS]}
                  placeholder="Select purpose"
                />
                <Select
                  label="Passout Month *"
                  value={passoutMonth}
                  onChange={setPassoutMonth}
                  options={PASSOUT_MONTH_OPTIONS}
                  placeholder="Select month"
                />
                <Select
                  label="Passout Year *"
                  value={passoutYear}
                  onChange={setPassoutYear}
                  options={passoutYearOptions}
                  placeholder="Select year"
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

      {selectedStudent && orgCode && purpose && passoutMonth && passoutYear ? (
        <CourseCompletionCertificatePrint
          orgCode={orgCode}
          student={selectedStudent}
          awaitingResults={awaitingResults}
          passoutMonth={passoutMonth}
          passoutYear={passoutYear}
          printDate={printDate}
        />
      ) : null}
    </>
  );
}
