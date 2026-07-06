"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Table, type TableColumn } from "@/common/components/table";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  loadPrincipalStudentProfile,
  savePrincipalStudentProfileActivity,
  type PrincipalActivityCategory,
  type PrincipalActivitySavePayload,
  type PrincipalStudentProfileData,
} from "@/services";
import {
  formatProfileDate,
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
  studentStatusClass,
} from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import { ActivitySectionTable } from "./ActivitySectionTable";
import { AddPrincipalActivityModal } from "./AddPrincipalActivityModal";
type AnyRow = Record<string, unknown>;

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      {children}
    </section>
  );
}

function cell(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || "—";
}

const EDUCATION_COLS: TableColumn<AnyRow>[] = [
  { id: "board", label: "Class", render: (row) => cell(row, ["board"]) },
  { id: "state", label: "State Board", render: () => "—" },
  {
    id: "year",
    label: "Year Of Study",
    render: (row) => cell(row, ["yearOfCompletion", "year_of_completion"]),
  },
  { id: "pass", label: "Month & Year Of Passing", render: () => "—" },
  {
    id: "pct",
    label: "Percentage or CGPA",
    render: (row) => cell(row, ["precentage", "percentage", "cgpa"]),
  },
  { id: "marks", label: "Total Marks", render: () => "—" },
];

function pickCourseId(student: AnyRow): number {
  return Number(student.courseId ?? student.fk_course_id ?? 0) || 0;
}

function PrincipalStudentHeader({ student }: { student: AnyRow }) {
  const isLateral = student.isLateral === true;
  const statusCode = pickText(student, ["studentStatusCode", "statusCode"]);
  const statusLabel = pickDisplay(student, [
    "studentStatusDisplayName",
    "studentStatusName",
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
    <div className="rounded-md border border-sky-200/80 bg-sky-50/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="shrink-0 space-y-3">
          <img
            src={studentPhotoSrc(
              student.studentPhotoPath as string | undefined,
            )}
            alt=""
            className="h-28 w-28 rounded border-4 border-sky-200 bg-white object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("default_Student.png")) {
                img.src = "/assets/images/avatars/default_Student.png";
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-medium text-foreground">
            {studentFullName(student)}{" "}
            <span className="font-semibold text-primary">
              ({isLateral ? "LATERAL" : "REGULAR"})
            </span>
          </p>
          <p className="text-muted-foreground">
            {pickDisplay(student, ["hallticketNumber", "rollNumber"])}
          </p>
          {pathLine ? (
            <p className="text-muted-foreground">{pathLine}</p>
          ) : null}
          <p className="text-muted-foreground">
            {pickDisplay(student, ["mobile", "mobileNumber"])}
          </p>
        </div>

        <div className="space-y-1 text-sm lg:min-w-[220px]">
          <p>
            <span>Admission Date : </span>
            <span className="font-medium text-primary">
              {formatProfileDate(
                student.adminssionDate ?? student.admissionDate,
              )}
            </span>
          </p>
          <p>
            <span>Student Status : </span>
            <span className={studentStatusClass(statusCode)}>
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
      if (student.collegeId) params.set("collegeId", String(student.collegeId));
      if (student.academicYearId)
        params.set("academicYearId", String(student.academicYearId));
      if (student.rollNumber)
        params.set("rollNumber", String(student.rollNumber));
      if (student.studentId) params.set("studentId", String(student.studentId));
    } else if (check === 2) {
      if (student.collegeId) params.set("collegeId", String(student.collegeId));
      if (student.academicYearId)
        params.set("academicYearId", String(student.academicYearId));
      if (student.courseId) params.set("courseId", String(student.courseId));
      if (student.courseGroupId)
        params.set("courseGroupId", String(student.courseGroupId));
      if (student.courseYearId)
        params.set("courseYearId", String(student.courseYearId));
      if (student.groupSectionId != null)
        params.set("groupSectionId", String(student.groupSectionId));
    }
    router.push(
      `/admin-student-information-system/students-list?${params.toString()}`,
    );
  }

  const examSubjectCols: TableColumn<AnyRow>[] = [
    {
      id: "code",
      label: "Sub Code",
      render: (row) => cell(row, ["subject_code", "subjectCode"]),
    },
    {
      id: "name",
      label: "Subject Name",
      render: (row) => cell(row, ["subject_name", "subjectName"]),
    },
    { id: "grade", label: "Grade", render: (row) => cell(row, ["grade"]) },
    {
      id: "credits",
      label: "Credits",
      render: (row) => cell(row, ["credits", "subjectCredits"]),
    },
    { id: "remarks", label: "Remarks", render: () => "—" },
  ];

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Student Information System" subtitle="Profile" />

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
          className="app-card space-y-4 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-base font-semibold text-primary">
              Student Profile
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" aria-hidden />
              <span className="sr-only">Print report</span>
            </Button>
          </div>

          <PrincipalStudentHeader student={data.student} />

          <ProfileSection title="Academic Details">
            {data.educationDetails.length > 0 ? (
              <Table
                rows={data.educationDetails}
                columns={EDUCATION_COLS}
                pageSize={0}
                density="compact"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No academic details found.
              </p>
            )}
          </ProfileSection>

          <ProfileSection title="Examination">
            {data.examSemesters.length > 0 ? (
              <div className="space-y-4">
                {data.examSemesters.map((sem) => (
                  <div key={sem.courseYearCode} className="space-y-2">
                    <p className="text-sm font-semibold text-primary">
                      SEMISTER {sem.courseYearCode}
                    </p>
                    <Table
                      rows={sem.subjects}
                      columns={examSubjectCols}
                      pageSize={0}
                      density="compact"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
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
              className="min-h-[80px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
              value={pickText(data.student, ["internship", "intership"])}
              placeholder=""
            />
          </ProfileSection>

          <ProfileSection title="Educational Tours">
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
              value={pickText(data.student, [
                "educationTours",
                "educationalTours",
              ])}
              placeholder=""
            />
          </ProfileSection>
        </div>
      )}

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

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
    </PageContainer>
  );
}
