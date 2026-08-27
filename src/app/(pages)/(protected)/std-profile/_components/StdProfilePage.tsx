"use client";

/**
 * Angular `std-profile` — student self-service profile (view-focused;
 * Update / photo / change-password UI are disabled in Angular).
 */
import { useEffect, useMemo, useState } from "react";
import { Monitor } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { FormField } from "@/common/components/forms";
import { useSessionContext } from "@/context/SessionContext";
import { toastError } from "@/lib/toast";
import {
  getStudentProfileByUserId,
  type StudentProfileDetails,
} from "@/services";

function displayName(row: StudentProfileDetails | null): string {
  if (!row) return "";
  return [row.firstName, row.middleName, row.lastName]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function text(v: unknown): string {
  return v == null ? "" : String(v);
}

function Field({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <FormField label={label}>
      <Input value={value} readOnly disabled />
    </FormField>
  );
}

export function StdProfilePage() {
  const { user } = useSessionContext();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfileDetails | null>(null);

  const photoSrc = useMemo(() => {
    const p = String(student?.studentPhotoPath ?? "").trim();
    return p || undefined;
  }, [student?.studentPhotoPath]);

  useEffect(() => {
    const userId = Number(user?.userId) || 0;
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await getStudentProfileByUserId(userId);
        if (!cancelled) setStudent(row);
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load student profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Profile" />
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-md border bg-card p-5 shadow-sm lg:max-w-[280px]">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
              alt=""
              className="h-24 w-24 rounded-full object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml," +
                  encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="#e5e7eb" width="100%" height="100%"/><text x="50%" y="54%" text-anchor="middle" fill="#9ca3af" font-size="12">No photo</text></svg>`,
                  );
              }}
            />
            <div>
              <h3 className="text-base font-semibold leading-tight">
                {displayName(student)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {text(student?.rollNumber)}
              </p>
            </div>
            <hr className="w-full border-border" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{text(student?.collegeName)}</p>
              <p>
                {[student?.courseName, student?.groupCode, student?.courseYearName]
                  .map((p) => text(p))
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              <p>{text(student?.mobile)}</p>
              <p>{text(student?.stdEmailId)}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b pb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Profile Details</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="First Name" value={text(student?.firstName)} />
            <Field label="Middle Name" value={text(student?.middleName)} />
            <Field label="Last Name" value={text(student?.lastName)} />
            <Field label="Father Name" value={text(student?.fatherName)} />
            <Field label="Mother Name" value={text(student?.motherName)} />
            <Field label="Date of Birth" value={text(student?.dateOfBirth)} />
            <Field label="Mobile" value={text(student?.mobile)} />
            <Field label="Student Email ID" value={text(student?.stdEmailId)} />
            <Field label="Aadhar Card Number" value={text(student?.aadharCardNo)} />
            <Field label="Blood Group" value={text(student?.bloodGroupName ?? student?.bloodgroupName)} />
            <Field label="Caste" value={text(student?.caste)} />
            <Field label="Sub Caste" value={text(student?.subCaste)} />
            <Field label="Nationality" value={text(student?.nationalityName)} />
            <Field label="Religion" value={text(student?.religionName)} />
            <Field
              label="Present Address"
              value={text(student?.presentAddress ?? student?.address)}
            />
            <Field label="Roll Number" value={text(student?.rollNumber)} />
            <Field
              label="Hall Ticket Number"
              value={text(student?.hallticketNumber)}
            />
            <Field label="Course" value={text(student?.courseName)} />
            <Field label="Group" value={text(student?.groupCode)} />
            <Field label="Course Year" value={text(student?.courseYearName)} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
