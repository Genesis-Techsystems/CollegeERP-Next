"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Printer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printElementInIframe } from "@/lib/print";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  loadPrincipalStudentProfile,
  savePrincipalStudentProfileActivity,
  type PrincipalActivityCategory,
  type PrincipalActivitySavePayload,
  type PrincipalStudentProfileData,
} from "@/services";
import {
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
} from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import { ActivitySectionTable } from "./ActivitySectionTable";
import { AddPrincipalActivityModal } from "./AddPrincipalActivityModal";
import { ProfileAngularTable } from "./ProfileAngularTable";
import {
  PROFILE_VIEW,
  formatAdmissionDate,
  principalStatusClass,
} from "./profile-view-styles";

type AnyRow = Record<string, unknown>;

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded overflow-hidden border bg-white"
      style={{ borderColor: PROFILE_VIEW.border }}
    >
      <div
        className="border-b px-3 py-1.5"
        style={{
          borderColor: PROFILE_VIEW.border,
          backgroundColor: PROFILE_VIEW.sectionBg,
        }}
      >
        <h3
          className="text-[13px] font-bold leading-snug"
          style={{ color: PROFILE_VIEW.navy }}
        >
          {title}
        </h3>
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

function cell(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || "—";
}

const EDUCATION_COLS = [
  {
    id: "board",
    label: "Class",
    render: (row: AnyRow) => cell(row, ["board"]),
  },
  { id: "state", label: "State Board", render: () => "—" },
  {
    id: "year",
    label: "Year Of Study",
    render: (row: AnyRow) =>
      cell(row, ["yearOfCompletion", "year_of_completion"]),
  },
  { id: "pass", label: "Month & Year Of Passing", render: () => "—" },
  {
    id: "pct",
    label: "Percentage or CGPA",
    render: (row: AnyRow) => cell(row, ["precentage", "percentage", "cgpa"]),
  },
  { id: "marks", label: "Total Marks", render: () => "—" },
];

function pickCourseId(student: AnyRow): number {
  return Number(student.courseId ?? student.fk_course_id ?? 0) || 0;
}

function printValue(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || "null";
}

function PrincipalStudentPrintView({
  data,
}: {
  data: PrincipalStudentProfileData;
}) {
  const { student } = data;
  const activitySections = [
    { title: "Project Executed", rows: data.projects },
    { title: "Co-curricular", rows: data.activities },
    { title: "Extra Curricular", rows: data.extraActivities },
  ];

  return (
    <div
      id="principal-student-profile-print-view"
      className="principal-profile-print print-only"
      data-print-root
      aria-hidden
    >
      <table className="principal-profile-print__identity">
        <tbody>
          <tr>
            <th>Student Roll Number :</th>
            <td>{printValue(student, ["rollNumber", "hallticketNumber"])}</td>
            <th>Full Name :</th>
            <td>{studentFullName(student)}</td>
          </tr>
          <tr>
            <th>Father Name :</th>
            <td>{printValue(student, ["fatherName", "father_name"])}</td>
            <th>Contact Number :</th>
            <td>
              {printValue(student, [
                "fatherMobile",
                "fatherContactNumber",
                "father_mobile",
              ])}
            </td>
          </tr>
          <tr>
            <th>Occupation :</th>
            <td>
              {printValue(student, ["fatherOccupation", "father_occupation"])}
            </td>
            <th />
            <td />
          </tr>
          <tr>
            <th>Mother /Guardian Name :</th>
            <td>
              {printValue(student, [
                "motherName",
                "guardianName",
                "mother_name",
              ])}
            </td>
            <th>Contact Number :</th>
            <td>
              {printValue(student, [
                "motherMobile",
                "guardianMobile",
                "mother_mobile",
              ])}
            </td>
          </tr>
          <tr>
            <th>Address :</th>
            <td colSpan={3}>
              {printValue(student, [
                "permanentAddress",
                "communicationAddress",
                "address",
              ])}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Academic Details</h2>
      <table className="principal-profile-print__grid">
        <thead>
          <tr>
            {EDUCATION_COLS.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.educationDetails.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {EDUCATION_COLS.map((column) => (
                <td key={column.id}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Examination</h2>
      {data.examSemesters.map((semester) => (
        <div key={semester.courseYearCode}>
          <h3>SEMISTER {semester.courseYearCode}</h3>
          <table className="principal-profile-print__grid">
            <thead>
              <tr>
                <th>Sub Code</th>
                <th>Subject Name</th>
                <th>Grade</th>
                <th>Credits</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {semester.subjects.map((subject, rowIndex) => (
                <tr key={rowIndex}>
                  <td>{cell(subject, ["subject_code", "subjectCode"])}</td>
                  <td>{cell(subject, ["subject_name", "subjectName"])}</td>
                  <td>{cell(subject, ["grade"])}</td>
                  <td>{cell(subject, ["credits", "subjectCredits"])}</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {activitySections.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <table className="principal-profile-print__grid">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Title of Project</th>
                <th>Year/Semester</th>
                <th>View Certificate</th>
                <th>Viewing of Videos/Photos</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td>{rowIndex + 1}</td>
                  <td>
                    {printValue(row, ["eventTitle", "projectTitle", "title"])}
                  </td>
                  <td>
                    {printValue(row, [
                      "academicYear",
                      "courseYearName",
                      "yearSemester",
                    ])}
                  </td>
                  <td>{pickText(row, ["certificatePath"]) ? "View" : ""}</td>
                  <td>
                    {pickText(row, ["videoPath", "photoPath"]) ? "View" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2>Internships :</h2>
      <p>{pickText(student, ["internship", "intership"])}</p>
      <h2>Educational Tours :</h2>
      <p>{pickText(student, ["educationTours", "educationalTours"])}</p>
    </div>
  );
}

function PrincipalStudentHeader({
  student,
  feeLedger,
}: {
  student: AnyRow;
  feeLedger: AnyRow | null;
}) {
  const isLateral = student.isLateral === true;
  const statusCode = pickText(student, ["studentStatusCode", "statusCode"]);
  const statusLabel = pickDisplay(student, [
    "studentStatusDisplayName",
    "studentStatusName",
  ]);
  // Scholarship category lives on the fee-ledger proc (s_fee_std_ledger), NOT on the
  // studentdetail object — reading it off `student` left Category always blank.
  const categoryLabel = pickDisplay(feeLedger ?? {}, [
    "scholarship_type_code",
    "scholarshipTypeCode",
  ]);

  const pathLine = [
    pickText(student, ["collegeCode", "college_code"]),
    pickText(student, ["academicYear", "academic_year"]),
    pickText(student, ["courseYearName", "course_year_name"]),
    student.section ? `Section ${student.section}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      className="rounded border bg-white p-3 sm:p-4"
      style={{ borderColor: PROFILE_VIEW.photoBoxBorder }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          className="shrink-0 rounded-sm border p-2"
          style={{
            borderColor: PROFILE_VIEW.photoBoxBorder,
            backgroundColor: PROFILE_VIEW.photoBoxBg,
          }}
        >
          <img
            src={studentPhotoSrc(
              student.studentPhotoPath as string | undefined,
            )}
            alt=""
            className="h-20 w-20 object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("default_Student.png")) {
                img.src = "/assets/images/avatars/default_Student.png";
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5 text-[12px]">
          <p
            className="text-[13px] font-bold uppercase leading-snug"
            style={{ color: PROFILE_VIEW.navy }}
          >
            {studentFullName(student).toUpperCase()}{" "}
            <span style={{ color: PROFILE_VIEW.linkBlue }}>
              ({isLateral ? "LATERAL" : "REGULAR"})
            </span>
          </p>
          <p style={{ color: PROFILE_VIEW.muted }}>
            {pickDisplay(student, ["hallticketNumber", "rollNumber"])}
          </p>
          {pathLine ? (
            <p style={{ color: PROFILE_VIEW.muted }}>{pathLine}</p>
          ) : null}
          <p style={{ color: PROFILE_VIEW.muted }}>
            {pickDisplay(student, ["mobile", "mobileNumber"])}
          </p>
        </div>

        <div className="space-y-0.5 text-[12px] lg:min-w-[240px]">
          <p className="text-[#333333]">
            <span>Admission Date : </span>
            <span
              className="font-medium"
              style={{ color: PROFILE_VIEW.linkBlue }}
            >
              {formatAdmissionDate(
                student.adminssionDate ?? student.admissionDate,
              )}
            </span>
          </p>
          {categoryLabel && categoryLabel !== "—" ? (
            <p className="text-[#333333]">
              <span>Category : </span>
              <span
                className="font-medium"
                style={{ color: PROFILE_VIEW.linkBlue }}
              >
                {categoryLabel}
              </span>
            </p>
          ) : (
            ""
          )}
          <p className="text-[#333333]">
            <span>Student Status : </span>
            <span className={principalStatusClass(statusCode)}>
              {statusLabel}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PrincipalStudentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = Number(searchParams.get("studentId") ?? 0);
  const check = Number(searchParams.get("check") ?? 1);

  const [data, setData] = useState<PrincipalStudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityCategory, setActivityCategory] =
    useState<PrincipalActivityCategory>("PROJECTEXECUTED");
  const [editingActivity, setEditingActivity] = useState<AnyRow | null>(null);
  const [activitySaving, setActivitySaving] = useState(false);

  const reloadProfile = useCallback(async () => {
    if (!studentId) return;
    const payload = await loadPrincipalStudentProfile(studentId);
    setData(payload);
  }, [studentId]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const payload = await loadPrincipalStudentProfile(studentId);
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load student profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  function openAddActivity(category: PrincipalActivityCategory) {
    setActivityCategory(category);
    setEditingActivity(null);
    setActivityModalOpen(true);
  }

  function openEditActivity(category: PrincipalActivityCategory, row: AnyRow) {
    setActivityCategory(category);
    setEditingActivity(row);
    setActivityModalOpen(true);
  }

  async function handleSaveActivity(
    payload: PrincipalActivitySavePayload,
    activityOptions: AnyRow[],
  ) {
    setActivitySaving(true);
    try {
      await savePrincipalStudentProfileActivity(payload, activityOptions);
      toastSuccess(editingActivity ? "Activity updated." : "Activity added.");
      setActivityModalOpen(false);
      setEditingActivity(null);
      await reloadProfile();
    } catch (e) {
      toastError(e, "Failed to save activity");
    } finally {
      setActivitySaving(false);
    }
  }

  function goBack() {
    if (!data?.student) {
      router.push("/admin-student-information-system/students-list");
      return;
    }
    const student = data.student;
    const params = new URLSearchParams();
    params.set("check", String(check));
    if (check === 1) {
      const collegeId = searchParams.get("collegeId") ?? student.collegeId;
      const academicYearId =
        searchParams.get("academicYearId") ?? student.academicYearId;
      const rollNumber = searchParams.get("rollNumber") ?? student.rollNumber;
      if (collegeId) params.set("collegeId", String(collegeId));
      if (academicYearId) params.set("academicYearId", String(academicYearId));
      if (rollNumber) params.set("rollNumber", String(rollNumber));
      if (student.studentId) params.set("studentId", String(student.studentId));
    } else if (check === 2) {
      for (const key of [
        "universityId",
        "collegeId",
        "academicYearId",
        "courseId",
        "courseGroupId",
        "courseYearId",
        "groupSectionId",
      ] as const) {
        const value = searchParams.get(key) ?? student[key];
        if (value != null && String(value) !== "") {
          params.set(key, String(value));
        }
      }
    }
    router.push(
      `/admin-student-information-system/students-list?${params.toString()}`,
    );
  }

  function handlePrint() {
    const printView = document.getElementById(
      "principal-student-profile-print-view",
    );
    if (!printView) return;
    printElementInIframe(printView, "Student Profile", {
      extraCss: `
        .print-only { display: block !important; }
        .principal-profile-print { width: 100% !important; }
      `,
    });
  }

  const examSubjectCols = [
    {
      id: "code",
      label: "Sub Code",
      render: (row: AnyRow) => cell(row, ["subject_code", "subjectCode"]),
    },
    {
      id: "name",
      label: "Subject Name",
      render: (row: AnyRow) => cell(row, ["subject_name", "subjectName"]),
    },
    {
      id: "grade",
      label: "Grade",
      align: "center" as const,
      render: (row: AnyRow) => cell(row, ["grade"]),
    },
    {
      id: "credits",
      label: "Credits",
      align: "center" as const,
      render: (row: AnyRow) => cell(row, ["credits", "subjectCredits"]),
    },
    {
      id: "remarks",
      label: "Remarks",
      align: "center" as const,
      render: () => "—",
    },
  ];

  return (
    <PageContainer className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading student profile…
        </div>
      ) : !data ? (
        <div className="app-card p-8 text-center text-sm text-muted-foreground">
          Student not found. Go back and select a student from the list.
        </div>
      ) : (
        <div
          id="principal-student-profile-print"
          className="screen-only rounded overflow-hidden border bg-white shadow-sm"
          style={{ borderColor: PROFILE_VIEW.border }}
        >
          <div className="flex items-center justify-between gap-2 border-b-2 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText
                className="h-4 w-4 shrink-0"
                style={{ color: PROFILE_VIEW.linkBlue }}
                aria-hidden
              />
              <h1
                className="text-[14px] font-bold leading-none"
                style={{ color: PROFILE_VIEW.navy }}
              >
                Student Profile
              </h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-transparent"
              onClick={handlePrint}
            >
              <Printer
                className="h-4 w-4"
                style={{ color: PROFILE_VIEW.pink }}
                aria-hidden
              />
              <span className="sr-only">Print report</span>
            </Button>
          </div>

          <div className="rounded space-y-4 p-4">
            <PrincipalStudentHeader
              student={data.student}
              feeLedger={data.feeLedger}
            />

            <ProfileSection title="Academic Details">
              <ProfileAngularTable
                columns={EDUCATION_COLS}
                rows={data.educationDetails}
                emptyText="No academic details found."
              />
            </ProfileSection>

            <ProfileSection title="Examination">
              {data.examSemesters.length > 0 ? (
                <div
                  className="divide-y"
                  style={{ borderColor: PROFILE_VIEW.border }}
                >
                  {data.examSemesters.map((sem) => (
                    <div key={sem.courseYearCode} className="space-y-0">
                      <p
                        className="border-b px-3 py-1.5 text-[12px] font-bold uppercase"
                        style={{
                          borderColor: PROFILE_VIEW.border,
                          color: PROFILE_VIEW.navy,
                        }}
                      >
                        SEMISTER {sem.courseYearCode}
                      </p>
                      <ProfileAngularTable
                        columns={examSubjectCols}
                        rows={sem.subjects}
                        emptyText="No subjects found."
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="px-3 py-4 text-[12px]"
                  style={{ color: PROFILE_VIEW.muted }}
                >
                  No examination records found.
                </p>
              )}
            </ProfileSection>

            <ProfileSection title="Project Executed">
              <ActivitySectionTable
                rows={data.projects}
                titleHeader="Title of Project"
                emptyMessage="No projects found."
                onAdd={() => openAddActivity("PROJECTEXECUTED")}
                onEdit={(row) => openEditActivity("PROJECTEXECUTED", row)}
              />
            </ProfileSection>

            <ProfileSection title="Co-curricular">
              <ActivitySectionTable
                rows={data.activities}
                titleHeader="Title of Event"
                emptyMessage="No co-curricular activities found."
                onAdd={() => openAddActivity("COCIRCULAR")}
                onEdit={(row) => openEditActivity("COCIRCULAR", row)}
              />
            </ProfileSection>

            <ProfileSection title="Extra Curricular">
              <ActivitySectionTable
                rows={data.extraActivities}
                titleHeader="Tournaments"
                emptyMessage="No extra curricular activities found."
                onAdd={() => openAddActivity("EXTRACIRCULAR")}
                onEdit={(row) => openEditActivity("EXTRACIRCULAR", row)}
              />
            </ProfileSection>

            <ProfileSection title="Internships">
              <textarea
                className="min-h-[80px] w-full resize-none border-0 bg-white px-3 py-2 text-[12px] text-[#333333] focus:outline-none"
                value={pickText(data.student, ["internship", "intership"])}
                readOnly
                placeholder=""
              />
            </ProfileSection>

            <ProfileSection title="Educational Tours">
              <textarea
                className="min-h-[80px] w-full resize-none border-0 bg-white px-3 py-2 text-[12px] text-[#333333] focus:outline-none"
                value={pickText(data.student, [
                  "educationTours",
                  "educationalTours",
                ])}
                readOnly
                placeholder=""
              />
            </ProfileSection>
          </div>
        </div>
      )}

      {data ? <PrincipalStudentPrintView data={data} /> : null}

      {data ? (
        <AddPrincipalActivityModal
          open={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setEditingActivity(null);
          }}
          categoryCode={activityCategory}
          courseId={pickCourseId(data.student)}
          studentId={studentId}
          editingRow={editingActivity}
          saving={activitySaving}
          onSave={handleSaveActivity}
        />
      ) : null}

      <div className="screen-only flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={goBack}
          className="h-9 min-w-20 gap-1.5 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          .principal-profile-print {
            width: 100% !important;
            color: #000 !important;
            font-family: Arial, sans-serif !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }

          .principal-profile-print h2 {
            margin: 8px 0 4px !important;
            color: #00008b !important;
            font-size: 10px !important;
            font-weight: 700 !important;
          }

          .principal-profile-print h3 {
            margin: 4px 0 2px !important;
            font-size: 9px !important;
            font-weight: 700 !important;
          }

          .principal-profile-print p {
            min-height: 10px;
            margin: 0 !important;
          }

          .principal-profile-print table {
            width: 100%;
            border-collapse: collapse;
          }

          .principal-profile-print__identity {
            margin: 0 0 8px;
          }

          .principal-profile-print__identity th,
          .principal-profile-print__identity td {
            border: 0 !important;
            padding: 2px 5px !important;
            text-align: left;
            vertical-align: top;
          }

          .principal-profile-print__identity th {
            width: 18%;
            font-weight: 700;
            white-space: nowrap;
          }

          .principal-profile-print__identity td {
            width: 32%;
          }

          .principal-profile-print__grid th,
          .principal-profile-print__grid td {
            border: 1px solid #777 !important;
            padding: 3px 4px !important;
            color: #000 !important;
            font-size: 8px !important;
            text-align: center;
          }

          .principal-profile-print__grid th {
            font-weight: 700;
          }
        }
      `}</style>
    </PageContainer>
  );
}
