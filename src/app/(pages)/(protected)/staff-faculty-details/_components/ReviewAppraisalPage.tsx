"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, PencilIcon, PlusIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSessionContext } from "@/context/SessionContext";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getSelfAppraisalEmployeeDetails,
  getStaffSelfAppraisal,
  listPerformanceAssessmentStaffSubjects,
  listSelfAppraisalContributions,
  listSelfAppraisalFormsByCollege,
  saveStaffSelfAppraisal,
} from "@/services";
import { AppraisalContributionModal } from "./AppraisalContributionModal";

type AnyRow = Record<string, any>;

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function rows(value: unknown): AnyRow[] {
  return Array.isArray(value) ? (value as AnyRow[]) : [];
}

function presentDate(): Date {
  const value = readStorage("presentDate");
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  return match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date();
}

function presentDateIso(): string {
  return `${format(presentDate(), "yyyy-MM-dd")}T00:00:00Z`;
}

function displayDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : format(date, "dd MMM, yyyy");
}

const cell = "border border-border px-3 py-2 align-top";
const headerCell = `${cell} bg-muted/40 font-semibold`;

function SimpleTable({
  children,
  minWidth = "640px",
}: Readonly<{ children: React.ReactNode; minWidth?: string }>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" style={{ minWidth }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ContributionsTable({
  contributions,
  readOnly,
  onAdd,
  onEdit,
}: Readonly<{
  contributions: AnyRow[];
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (row: AnyRow) => void;
}>) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-[12px]">
          <thead>
            <tr>
              {[
                "SI.No",
                "Title with Page No’s",
                "Journal and year of Publication",
                "ISSN/ISBN No./SCOPUS No.",
                "Peer reviewed / impact factor",
                "No. of Co-Authors",
                "Main author",
                "Other information",
                "Action",
              ].map((label) => (
                <th key={label} className={headerCell}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contributions.map((item, index) => (
              <tr key={String(item.empContributionId ?? index)}>
                <td className={cell}>{index + 1}</td>
                <td className={cell}>{item.title}</td>
                <td className={cell}>{displayDate(item.publishedDate)}</td>
                <td className={cell}>{item.issnIsbnScopusNo}</td>
                <td className={cell}>{item.pagenos}</td>
                <td className={cell}>{item.noofCoAuthors}</td>
                <td className={cell}>{item.isMainAuthor ? "Yes" : "No"}</td>
                <td className={cell}>{item.otherInfo}</td>
                <td className={cell}>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(item)}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" size="sm" className="mt-3" onClick={onAdd}>
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Add Contribution
        </Button>
      )}
    </>
  );
}

export function ReviewAppraisalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useSessionContext();
  const employeeId = Number(searchParams.get("employeeId") || 0);
  const collegeId = Number(searchParams.get("collegeId") || user?.collegeId || 0);
  const appraisalId = Number(searchParams.get("empSelfappraisalId") || 0);
  const isPrincipal =
    Boolean(user?.isPrincipal) || readStorage("isPRINCIPAL") === "true";
  const academicYear =
    user?.academicYear ?? readStorage("academicYear");
  const academicYearId =
    user?.academicYearId ?? Number(readStorage("academicYearId") || 0);
  const [rating, setRating] = useState("");
  const [reason, setReason] = useState("");
  const [initializedId, setInitializedId] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionRow, setContributionRow] = useState<AnyRow | null>(null);

  const query = useQuery({
    queryKey: QK.hrPayroll.staffSelfAppraisalReview(
      employeeId,
      collegeId,
      appraisalId,
    ),
    queryFn: async () => {
      const classDate = format(presentDate(), "yyyy/MM/dd");
      const [employee, forms, subjects, contributions, appraisal] =
        await Promise.all([
          getSelfAppraisalEmployeeDetails(employeeId),
          listSelfAppraisalFormsByCollege(collegeId),
          listPerformanceAssessmentStaffSubjects(employeeId, classDate),
          listSelfAppraisalContributions(employeeId),
          appraisalId ? getStaffSelfAppraisal(appraisalId) : null,
        ]);
      return { employee, forms, subjects, contributions, appraisal };
    },
    enabled: employeeId > 0 && collegeId > 0,
  });

  useEffect(() => {
    if (!query.data || initializedId === appraisalId) return;
    setInitializedId(appraisalId);
    setRating(String(query.data.appraisal?.empRating ?? ""));
    setReason(String(query.data.appraisal?.reason ?? ""));
  }, [appraisalId, initializedId, query.data]);

  const employee: AnyRow = query.data?.employee ?? {};
  const form: AnyRow | undefined = query.data?.forms[0];
  const contributions = rows(query.data?.contributions);
  const formDetails = rows(form?.empSelfappraisalFormDetailDTOS);
  const appraisal: AnyRow | undefined = query.data?.appraisal ?? undefined;

  const contributionSections = useMemo(
    () =>
      new Set([
        "Research, Publications and Academic Contributions",
        "Articles / Chapters published in Books: ( Attach a separate Sheet if required)",
        "Full Papers in Conference Proceedings: ( Attach a separate Sheet if required).",
        "Books Published as Single author or as editor ( Attach a separate Sheet if required)",
      ]),
    [],
  );

  async function submit() {
    if (!form) return;
    const previousDetails = rows(appraisal?.empSelfappraisalDetailDTOS);
    const details = formDetails.map((detail) => {
      const previous = previousDetails.find(
        (item) =>
          Number(item.selfappraisalFormDetId) ===
          Number(detail.selfappraisalFormDetId),
      );
      return {
        collegeId: form.collegeId,
        selfappraisalFormDetId: detail.selfappraisalFormDetId,
        isActive: true,
        empSelfappraisalDetId: previous?.empSelfappraisalDetId ?? null,
        createdDt: previous?.createdDt ?? null,
        updatedDt: previous?.updatedDt ?? null,
        createdUser: previous?.createdUser ?? null,
        updatedUser: previous?.updatedUser ?? null,
      };
    });
    const payload: AnyRow = {
      collegeId: form.collegeId,
      startDate: form.startDate,
      endDate: form.endDate,
      createdDt: appraisal?.createdDt ?? null,
      updatedDt: appraisal?.updatedDt ?? null,
      createdUser: appraisal?.createdUser ?? null,
      updatedUser: appraisal?.updatedUser ?? null,
      empSelfappraisalId: appraisal?.empSelfappraisalId ?? null,
      appraisalSubmissionDate: presentDateIso(),
      statusUpdatedOn: presentDateIso(),
      employeeId,
      empRating: rating ? Number(rating) : null,
      managementEmployeeId: isPrincipal
        ? Number(user?.employeeId ?? readStorage("employeeId") ?? 0)
        : null,
      managementReviewDate: isPrincipal ? presentDateIso() : null,
      reason,
      academicYearId,
      selfappraisalFormId: form.selfAppraisalFormId,
      isActive: true,
      empSelfappraisalDetailDTOS: details,
    };
    setSaving(true);
    try {
      await saveStaffSelfAppraisal([payload]);
      await queryClient.invalidateQueries({
        queryKey: QK.hrPayroll.all,
      });
      toastSuccess("Self appraisal saved.");
      router.push("/staff-faculty-details/appraisal-report");
    } catch (error) {
      toastError(error, "Failed to save self appraisal");
    } finally {
      setSaving(false);
    }
  }

  if (!employeeId || !collegeId) {
    return (
      <PageContainer>
        <p className="text-sm text-destructive">
          Employee and college details are required.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4 pb-10">
      {query.error && (
        <p className="text-sm text-destructive">{getErrorMessage(query.error)}</p>
      )}
      <div className="app-card space-y-5 p-4">
        {query.isFetching ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="border-b border-border pb-3 text-center">
              <h1 className="text-lg font-semibold">
                {employee.collegeName || user?.collegeName}
              </h1>
              {form?.title && (
                <p className="mt-1 text-sm font-medium underline">{form.title}</p>
              )}
            </div>

            <SimpleTable>
              <tr>
                <td className={headerCell}>Name of the College</td>
                <td className={cell}>{employee.collegeName}</td>
              </tr>
              <tr>
                <td className={headerCell}>Department</td>
                <td className={cell}>{employee.deptName}</td>
              </tr>
            </SimpleTable>

            <SimpleTable>
              <tr>
                <td className={headerCell}>
                  At what level you rate your performance (on a scale of 1 to 5)
                </td>
                <td className={cell}>
                  {isPrincipal ? (
                    appraisal?.empRating ?? "—"
                  ) : (
                    <Input
                      className="max-w-40"
                      inputMode="numeric"
                      maxLength={1}
                      value={rating}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "" || /^[1-5]$/.test(value)) setRating(value);
                      }}
                      placeholder="Enter only 1 to 5"
                    />
                  )}
                </td>
              </tr>
            </SimpleTable>

            <div>
              <p className="mb-1 text-[12px] font-semibold">
                Observation of the Director/Principal
              </p>
              {isPrincipal ? (
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Review"
                />
              ) : (
                <p className="text-sm">{appraisal?.reason || "—"}</p>
              )}
            </div>

            {formDetails.map((detail, index) => {
              const title = String(detail.title ?? "");
              return (
                <section
                  key={String(detail.selfappraisalFormDetId ?? index)}
                  className="space-y-2"
                >
                  <h2 className="text-[13px] font-semibold">
                    {index + 1}. {title}
                    {title.includes("Subjects taught") ? ` ${academicYear}` : ""}
                  </h2>
                  {title === "Personal Details" && (
                    <SimpleTable>
                      <tr><td className={headerCell}>Name of the faculty</td><td className={cell}>{employee.firstName}</td></tr>
                      <tr><td className={headerCell}>Gender</td><td className={cell}>{employee.gender}</td></tr>
                      <tr><td className={headerCell}>Position / Designation</td><td className={cell}>{employee.designationName}</td></tr>
                      <tr><td className={headerCell}>Address for correspondence</td><td className={cell}>{employee.address}</td></tr>
                    </SimpleTable>
                  )}
                  {title === "Qualification" && (
                    <SimpleTable>
                      <tr><th className={headerCell}>Board</th><th className={headerCell}>Institute</th><th className={headerCell}>Year Of Passing</th><th className={headerCell}>Percentage (%)</th></tr>
                      {rows(employee.employeeEducations).map((item, itemIndex) => (
                        <tr key={String(item.employeeEducationId ?? itemIndex)}>
                          <td className={cell}>{item.board}</td><td className={cell}>{item.nameOfInstitution}</td><td className={cell}>{item.yearOfCompletion}</td><td className={cell}>{item.precentage}</td>
                        </tr>
                      ))}
                    </SimpleTable>
                  )}
                  {title === "Teaching/Professional Experience" && (
                    <SimpleTable>
                      <tr><th className={headerCell}>Institute</th><th className={headerCell}>Date Of Joining</th><th className={headerCell}>Experience</th></tr>
                      {rows(employee.empExperienceDetails).map((item, itemIndex) => (
                        <tr key={String(item.empExperienceId ?? itemIndex)}>
                          <td className={cell}>{item.prevoiusInstitutions}</td><td className={cell}>{item.fromYrMonth}</td><td className={cell}>{item.experienceYear}.{item.experienceMonth}</td>
                        </tr>
                      ))}
                    </SimpleTable>
                  )}
                  {title === "Subjects taught and Results Analysis for the academic year" && (
                    <SimpleTable>
                      <tr><th className={headerCell}>Subject Type</th><th className={headerCell}>Sem</th><th className={headerCell}>Subjects Taught</th></tr>
                      {rows(query.data?.subjects).map((item, itemIndex) => (
                        <tr key={String(item.staffSubjectId ?? itemIndex)}>
                          <td className={cell}>{item.subjectType}</td><td className={cell}>{item.courseYearName}</td><td className={cell}>{item.subjectName}</td>
                        </tr>
                      ))}
                    </SimpleTable>
                  )}
                  {contributionSections.has(title) && (
                    <ContributionsTable
                      contributions={contributions}
                      readOnly={isPrincipal}
                      onAdd={() => {
                        setContributionRow(null);
                        setContributionOpen(true);
                      }}
                      onEdit={(item) => {
                        setContributionRow(item);
                        setContributionOpen(true);
                      }}
                    />
                  )}
                </section>
              );
            })}

            <div className="flex justify-center gap-3 border-t border-border pt-4">
              <Button type="button" onClick={() => void submit()} disabled={saving || !form}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </>
        )}
      </div>
      <AppraisalContributionModal
        open={contributionOpen}
        row={contributionRow}
        employeeId={employeeId}
        onClose={() => setContributionOpen(false)}
        onSaved={() => void query.refetch()}
      />
    </PageContainer>
  );
}
