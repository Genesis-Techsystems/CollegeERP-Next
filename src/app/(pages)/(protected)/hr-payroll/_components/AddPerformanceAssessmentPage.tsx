"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { useSessionContext } from "@/context/SessionContext";
import {
  getPerformanceAssessmentFeedback,
  getPerformanceAssessmentQuestions,
  listCounselorStudentsInDateRange,
  listEmployeeEnrollmentGeneralDetails,
  listPerformanceAssessmentStaffSubjects,
  savePerformanceAssessmentFeedback,
} from "@/services";

type AnyRow = Record<string, any>;

interface AssessmentTableProps {
  label: string;
  subjectLabel: string;
  rows: AnyRow[];
  subjects: AnyRow[];
  readOnly: boolean;
  onChange: (index: number, field: string, value: unknown) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

interface LevelWorkTableProps {
  label: string;
  ratingLabel: string;
  remarksLabel: string;
  rows: AnyRow[];
  ratings: AnyRow[];
  readOnly: boolean;
  onChange: (index: number, field: string, value: unknown) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function rowsFrom(value: unknown): AnyRow[] {
  if (Array.isArray(value)) return value as AnyRow[];
  return [];
}

function isNoRecordsError(error: unknown): boolean {
  return /no\s*record/i.test(getErrorMessage(error));
}

function emptySubjectRow(empId: number): AnyRow {
  return {
    subjectTypeCatdetId: "",
    subjectId: "",
    empId,
    studentId: null,
    studentAppeared: "",
    studentPassed: "",
    passPercentage: "",
    division1: "",
    division2: "",
    division3: "",
  };
}

function emptyLevelRow(empId: number): AnyRow {
  return {
    natureOfWork: "",
    authorityEmpId: null,
    authorityCatdetId: null,
    levelworksCatdetId: null,
    empId,
    ratingByAuthorityCatdetId: null,
    remarks: "",
  };
}

function gainfulOptions(items: AnyRow[]): AnyRow[] {
  return items.map((item) => ({
    generalDetailCode: item.generalDetailCode,
    generalDetailId: item.generalDetailId,
    generalDetailDisplayName: item.generalDetailDisplayName,
    checked: false,
  }));
}

function emptyMentorRow(empId: number, engagements: AnyRow[]): AnyRow {
  return {
    empId,
    studentId: "",
    gainfulEngagementList: gainfulOptions(engagements),
  };
}

function subjectOptionLabel(row: AnyRow): string {
  const name = String(row.subjectName ?? "");
  const code = row.subjectCode ? ` - ${String(row.subjectCode)}` : "";
  const type = row.subjectType ? ` (${String(row.subjectType)})` : "";
  return `${name}${code}${type}`.trim() || String(row.subjectId ?? "");
}

function studentOptionLabel(row: AnyRow): string {
  const roll = row.rollNumber ? `(${String(row.rollNumber)}) ` : "";
  return `${roll}${String(row.studentName ?? row.firstName ?? "")}`.trim();
}

function detailQuestionId(detail: AnyRow): number {
  return Number(
    detail.empPerfAssessmentQuestionsDTO?.assessmentQuestionId ??
      detail.empPerfAssessmentQutnOptsDTO?.assessmentQuestionId ??
      detail.assessmentQuestionId ??
      0,
  );
}

function AssessmentSubjectTable({
  label,
  subjectLabel,
  rows,
  subjects,
  readOnly,
  onChange,
  onAdd,
  onRemove,
}: Readonly<AssessmentTableProps>) {
  const options: SelectOption[] = subjects.map((subject) => ({
    value: String(subject.subjectId),
    label: subjectOptionLabel(subject),
  }));

  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[880px] text-[12px]">
        <thead className="bg-muted/55">
          <tr className="border-b border-border">
            <th className="w-14 px-2 py-2 text-center font-medium">S.No</th>
            <th className="min-w-[240px] px-2 py-2 text-left font-medium">
              {subjectLabel}
            </th>
            <th className="px-2 py-2 text-center font-medium">Appeared</th>
            <th className="px-2 py-2 text-center font-medium">Passed</th>
            <th className="px-2 py-2 text-center font-medium">Pass %</th>
            <th className="px-2 py-2 text-center font-medium">1st Division</th>
            <th className="px-2 py-2 text-center font-medium">2nd Division</th>
            <th className="px-2 py-2 text-center font-medium">3rd Division</th>
            {!readOnly ? (
              <th className="w-12 px-2 py-2" aria-label="Actions" />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${label}-${index}`}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-2 py-2 text-center">{index + 1}</td>
              <td className="px-2 py-2">
                <Select
                  value={row.subjectId ? String(row.subjectId) : null}
                  onChange={(value) =>
                    onChange(index, "subjectId", value ? Number(value) : "")
                  }
                  options={options}
                  placeholder="Subject"
                  searchable
                  disabled={readOnly}
                />
              </td>
              {[
                "studentAppeared",
                "studentPassed",
                "passPercentage",
                "division1",
                "division2",
                "division3",
              ].map((field) => (
                <td key={field} className="px-2 py-2">
                  <Input
                    type="number"
                    value={String(row[field] ?? "")}
                    disabled={readOnly}
                    onChange={(event) =>
                      onChange(index, field, event.target.value)
                    }
                    className="h-8 min-w-20"
                  />
                </td>
              ))}
              {!readOnly ? (
                <td className="px-2 py-2 text-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    aria-label={`Remove ${label} row`}
                    onClick={() => onRemove(index)}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly ? (
        <div className="border-t border-border p-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-[12px]"
            onClick={onAdd}
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add {label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LevelWorkTable({
  label,
  ratingLabel,
  remarksLabel,
  rows,
  ratings,
  readOnly,
  onChange,
  onAdd,
  onRemove,
}: Readonly<LevelWorkTableProps>) {
  const ratingOptions: SelectOption[] = ratings.map((rating) => ({
    value: String(rating.generalDetailId),
    label: String(rating.generalDetailDisplayName ?? rating.generalDetailId),
  }));

  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[760px] text-[12px]">
        <thead className="bg-muted/55">
          <tr className="border-b border-border">
            <th className="w-14 px-2 py-2 text-center font-medium">S.No</th>
            <th className="w-[40%] px-2 py-2 text-left font-medium">
              Nature of work
            </th>
            <th className="w-[25%] px-2 py-2 text-left font-medium">
              {ratingLabel}
            </th>
            <th className="px-2 py-2 text-left font-medium">{remarksLabel}</th>
            {!readOnly ? (
              <th className="w-12 px-2 py-2" aria-label="Actions" />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${label}-${index}`}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-2 py-2 text-center">{index + 1}</td>
              <td className="px-2 py-2">
                <Input
                  value={String(row.natureOfWork ?? "")}
                  disabled={readOnly}
                  onChange={(event) =>
                    onChange(index, "natureOfWork", event.target.value)
                  }
                  className="h-8"
                />
              </td>
              <td className="px-2 py-2">
                <Select
                  value={
                    row.ratingByAuthorityCatdetId
                      ? String(row.ratingByAuthorityCatdetId)
                      : null
                  }
                  onChange={(value) =>
                    onChange(
                      index,
                      "ratingByAuthorityCatdetId",
                      value ? Number(value) : null,
                    )
                  }
                  options={ratingOptions}
                  placeholder="Select rating"
                  disabled={readOnly}
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  value={String(row.remarks ?? "")}
                  disabled={readOnly}
                  onChange={(event) =>
                    onChange(index, "remarks", event.target.value)
                  }
                  className="h-8"
                />
              </td>
              {!readOnly ? (
                <td className="px-2 py-2 text-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    aria-label={`Remove ${label} row`}
                    onClick={() => onRemove(index)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly ? (
        <div className="border-t border-border p-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-[12px]"
            onClick={onAdd}
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add {label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AddPerformanceAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useSessionContext();

  const empId = Number(searchParams.get("empId") ?? 0);
  const empFirstName = searchParams.get("empFirstName") ?? "";
  const designation = searchParams.get("designation") ?? "";
  const empDeptName = searchParams.get("empDeptName") ?? "";
  const assessmentFeedbackId = Number(
    searchParams.get("assessmentFeedbackId") ?? 0,
  );
  const loggedInEmployeeId = Number(readStorage("employeeId") || 0);
  const collegeId = Number(readStorage("collegeId") || 0);
  const academicYearId = Number(readStorage("academicYearId") || 0);
  const academicYear = user?.academicYear || readStorage("academicYear");
  const readOnly = loggedInEmployeeId > 0 && loggedInEmployeeId !== empId;

  const [feedbackDate, setFeedbackDate] = useState(new Date());
  const [questionRows, setQuestionRows] = useState<AnyRow[]>([]);
  const [theoryRows, setTheoryRows] = useState<AnyRow[]>([
    emptySubjectRow(empId),
  ]);
  const [labRows, setLabRows] = useState<AnyRow[]>([emptySubjectRow(empId)]);
  const [mentorRows, setMentorRows] = useState<AnyRow[]>([]);
  const [departmentRows, setDepartmentRows] = useState<AnyRow[]>([
    emptyLevelRow(empId),
  ]);
  const [institutionRows, setInstitutionRows] = useState<AnyRow[]>([
    emptyLevelRow(empId),
  ]);
  const [deletedSubjects, setDeletedSubjects] = useState<AnyRow[]>([]);
  const [deletedLevels, setDeletedLevels] = useState<AnyRow[]>([]);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef("");

  const questionsQuery = useQuery({
    queryKey: [...QK.hrPayroll.all, "perfQuestions"],
    queryFn: getPerformanceAssessmentQuestions,
  });

  const generalDetailsQuery = useQuery({
    queryKey: [...QK.hrPayroll.all, "perfGeneralDetails"],
    queryFn: async () => {
      const [engagements, ratings, workLevels] = await Promise.all([
        listEmployeeEnrollmentGeneralDetails(GM_CODES.GAINFUL_ENGAGEMENT),
        listEmployeeEnrollmentGeneralDetails(GM_CODES.EMP_RATINGS),
        listEmployeeEnrollmentGeneralDetails(GM_CODES.WORK_LEVEL),
      ]);
      return { engagements, ratings, workLevels };
    },
  });

  const feedbackQuery = useQuery({
    queryKey: [...QK.hrPayroll.all, "perfFeedback", assessmentFeedbackId],
    queryFn: () => getPerformanceAssessmentFeedback(assessmentFeedbackId),
    enabled: assessmentFeedbackId > 0,
  });

  const effectiveDate = feedbackQuery.data?.feedbackDate
    ? new Date(String(feedbackQuery.data.feedbackDate))
    : feedbackDate;
  const classDate = format(
    Number.isNaN(effectiveDate.getTime()) ? new Date() : effectiveDate,
    "yyyy/MM/dd",
  );

  const subjectsQuery = useQuery({
    queryKey: [...QK.hrPayroll.all, "perfSubjects", empId, classDate],
    queryFn: () => listPerformanceAssessmentStaffSubjects(empId, classDate),
    enabled: empId > 0,
  });

  const today = format(new Date(), "yyyy/MM/dd");
  const studentsQuery = useQuery({
    queryKey: [...QK.hrPayroll.all, "perfMentees", collegeId, empId, today],
    queryFn: () =>
      listCounselorStudentsInDateRange({
        collegeId,
        employeeId: empId,
        fromDate: today,
        toDate: today,
      }),
    enabled: collegeId > 0 && empId > 0,
  });

  const generalDetails = generalDetailsQuery.data ?? {
    engagements: [],
    ratings: [],
    workLevels: [],
  };
  const subjects = subjectsQuery.data ?? [];
  const theorySubjects = useMemo(
    () =>
      subjects.filter((row) =>
        ["THEORY", "ELECTIVE"].includes(String(row.subjectType)),
      ),
    [subjects],
  );
  const labSubjects = useMemo(
    () => subjects.filter((row) => String(row.subjectType) === "LAB"),
    [subjects],
  );

  useEffect(() => {
    if (!questionsQuery.data?.length || !generalDetailsQuery.isSuccess) return;
    if (assessmentFeedbackId > 0 && feedbackQuery.isPending) return;

    const feedback = feedbackQuery.data;
    const initKey = feedback
      ? `edit-${String(feedback.assessmentFeedbackId)}-${generalDetails.engagements.length}`
      : `create-${empId}-${generalDetails.engagements.length}`;
    if (initializedRef.current === initKey) return;
    initializedRef.current = initKey;

    const details = rowsFrom(feedback?.empPerfAssessmentFbDetailsDTOs);
    setQuestionRows(
      questionsQuery.data.map((question) => {
        const detail = details.find(
          (item) =>
            detailQuestionId(item) === Number(question.assessmentQuestionId),
        );
        return {
          ...question,
          assessmentOptionId:
            detail?.assessmentOptionId ??
            detail?.empPerfAssessmentQutnOptsDTO?.assessmentOptionId ??
            "",
          description: detail?.description ?? "",
        };
      }),
    );

    if (!feedback) {
      setMentorRows([emptyMentorRow(empId, generalDetails.engagements)]);
      return;
    }

    const parsedDate = new Date(String(feedback.feedbackDate ?? ""));
    if (!Number.isNaN(parsedDate.getTime())) setFeedbackDate(parsedDate);

    const savedSubjects = rowsFrom(feedback.empPerfSubjPasspercentageDTOs);
    const savedTheory = savedSubjects.filter(
      (row) => Number(row.subjectTypeCatdetId) !== 5,
    );
    const savedLabs = savedSubjects.filter(
      (row) => Number(row.subjectTypeCatdetId) === 5,
    );
    setTheoryRows(savedTheory.length ? savedTheory : [emptySubjectRow(empId)]);
    setLabRows(savedLabs.length ? savedLabs : [emptySubjectRow(empId)]);

    const institutionCategoryId = Number(
      generalDetails.workLevels.find(
        (row) => String(row.generalDetailCode).toUpperCase() === "INSTITUTION",
      )?.generalDetailId ?? 508,
    );
    const levels = rowsFrom(feedback.empPerfLevelWorksDTOs);
    const savedInstitution = levels.filter(
      (row) => Number(row.authorityCatdetId) === institutionCategoryId,
    );
    const savedDepartment = levels.filter(
      (row) => Number(row.authorityCatdetId) !== institutionCategoryId,
    );
    setDepartmentRows(
      savedDepartment.length ? savedDepartment : [emptyLevelRow(empId)],
    );
    setInstitutionRows(
      savedInstitution.length ? savedInstitution : [emptyLevelRow(empId)],
    );

    const mentorMap = new Map<number, AnyRow>();
    for (const item of rowsFrom(feedback.empPerfMentorAchievementDTOs)) {
      const studentId = Number(item.studentId);
      if (!studentId) continue;
      if (!mentorMap.has(studentId)) {
        mentorMap.set(studentId, {
          ...item,
          studentId,
          gainfulEngagementList: gainfulOptions(generalDetails.engagements),
        });
      }
      const grouped = mentorMap.get(studentId);
      const engagement = grouped?.gainfulEngagementList.find(
        (option: AnyRow) =>
          Number(option.generalDetailId) === Number(item.gainfulEngagementId),
      );
      if (engagement) engagement.checked = true;
    }
    const savedMentors = [...mentorMap.values()];
    setMentorRows(
      savedMentors.length
        ? savedMentors
        : [emptyMentorRow(empId, generalDetails.engagements)],
    );
  }, [
    assessmentFeedbackId,
    empId,
    feedbackQuery.data,
    feedbackQuery.isPending,
    generalDetails.engagements,
    generalDetails.workLevels,
    generalDetailsQuery.isSuccess,
    questionsQuery.data,
  ]);

  function updateQuestion(index: number, patch: AnyRow) {
    setQuestionRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function changeRow(
    setter: React.Dispatch<React.SetStateAction<AnyRow[]>>,
    index: number,
    field: string,
    value: unknown,
  ) {
    setter((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeSubjectRow(
    rows: AnyRow[],
    setter: React.Dispatch<React.SetStateAction<AnyRow[]>>,
    index: number,
  ) {
    const removed = rows[index];
    setter((current) => current.filter((_, rowIndex) => rowIndex !== index));
    if (removed?.empPerfSubjPasspercentId) {
      setDeletedSubjects((current) => [
        ...current,
        { ...removed, active: false },
      ]);
    }
  }

  function removeLevelRow(
    rows: AnyRow[],
    setter: React.Dispatch<React.SetStateAction<AnyRow[]>>,
    index: number,
  ) {
    const removed = rows[index];
    setter((current) => current.filter((_, rowIndex) => rowIndex !== index));
    if (removed?.empPerfLevelWorksId || removed?.empPerfLevelWorkId) {
      setDeletedLevels((current) => [
        ...current,
        { ...removed, active: false },
      ]);
    }
  }

  async function handleSave() {
    if (!empId) {
      toastError(new Error("Employee is required"));
      return;
    }

    const feedback = feedbackQuery.data;
    const existingDetails = rowsFrom(feedback?.empPerfAssessmentFbDetailsDTOs);
    const detailPayload: AnyRow[] = [];

    for (const question of questionRows) {
      const existing = existingDetails.find(
        (detail) =>
          detailQuestionId(detail) === Number(question.assessmentQuestionId),
      );
      const base = {
        assessmentQuestionId: question.assessmentQuestionId,
        assessmentFbDetailsId: existing?.assessmentFbDetailsId ?? null,
        createdDt: existing?.createdDt ?? null,
        createdUser: existing?.createdUser ?? null,
        optionValue: 0,
        rating: 0,
        authRating: 0,
        active: true,
      };

      if (
        question.questionCode === "radio-button" &&
        question.assessmentOptionId
      ) {
        detailPayload.push({
          ...base,
          assessmentOptionId: Number(question.assessmentOptionId),
          description: "",
        });
      }
      if (
        ["TEXT", "TEXTAREAF"].includes(String(question.questionCode)) &&
        String(question.description ?? "") !== ""
      ) {
        detailPayload.push({
          ...base,
          assessmentOptionId:
            question.empPerfAssessmentQutnOptsDTOS?.[0]?.assessmentOptionId ??
            null,
          description: String(question.description),
        });
      }
    }

    const prepareSubjects = (items: AnyRow[], availableSubjects: AnyRow[]) =>
      items
        .filter((row) => row.subjectId !== "" && row.subjectId != null)
        .map((row) => {
          const subject = availableSubjects.find(
            (item) => Number(item.subjectId) === Number(row.subjectId),
          );
          return {
            ...row,
            empId: row.empId || empId,
            subjectTypeCatdetId:
              subject?.subjectTypeId ?? row.subjectTypeCatdetId,
          };
        });

    const departmentCategory = generalDetails.workLevels.find(
      (row) => String(row.generalDetailCode).toUpperCase() === "DEPARTMENT",
    );
    const institutionCategory = generalDetails.workLevels.find(
      (row) => String(row.generalDetailCode).toUpperCase() === "INSTITUTION",
    );
    const prepareLevels = (items: AnyRow[], category: AnyRow | undefined) =>
      items
        .filter((row) => String(row.natureOfWork ?? "") !== "")
        .map((row) => ({
          ...row,
          authorityCatdetId: category?.generalDetailId ?? row.authorityCatdetId,
          levelworksCatdetId:
            category?.generalDetailId ?? row.levelworksCatdetId,
          authorityEmpId: empId,
          empId,
        }));

    const mentorPayload = mentorRows.flatMap((row) => {
      if (!row.studentId) return [];
      return rowsFrom(row.gainfulEngagementList)
        .filter((engagement) => engagement.checked)
        .map((engagement) => ({
          empId,
          studentId: row.studentId,
          gainfulEngagementId: engagement.generalDetailId,
          active: true,
        }));
    });

    const payload: AnyRow = {
      academicYearId,
      empId,
      feedbackDate: format(feedbackDate, "yyyy-MM-dd"),
      overallRating: 1,
      empPerfAssessmentFbDetailsDTOs: detailPayload,
      empPerfSubjPasspercentageDTOs: [
        ...prepareSubjects(theoryRows, theorySubjects),
        ...prepareSubjects(labRows, labSubjects),
        ...deletedSubjects,
      ],
      empPerfLevelWorksDTOs: [
        ...prepareLevels(departmentRows, departmentCategory),
        ...prepareLevels(institutionRows, institutionCategory),
        ...deletedLevels,
      ],
      empPerfMentorAchievementDTOs: mentorPayload,
    };
    if (feedback) {
      payload.assessmentFeedbackId = feedback.assessmentFeedbackId;
      payload.createdDt = feedback.createdDt;
      payload.createdUser = feedback.createdUser;
      payload.active = true;
    }

    setSaving(true);
    try {
      await savePerformanceAssessmentFeedback(payload);
      await queryClient.invalidateQueries({
        queryKey: QK.hrPayroll.performanceAssessment(empId),
      });
      toastSuccess(
        feedback
          ? "Performance assessment updated."
          : "Performance assessment saved.",
      );
      router.push("/hr-payroll/employee/performance-assessment");
    } catch (error) {
      toastError(error, "Failed to save performance assessment");
    } finally {
      setSaving(false);
    }
  }

  const loading =
    questionsQuery.isFetching ||
    generalDetailsQuery.isFetching ||
    feedbackQuery.isFetching ||
    subjectsQuery.isFetching ||
    studentsQuery.isFetching;
  const loadError =
    questionsQuery.error ??
    generalDetailsQuery.error ??
    feedbackQuery.error ??
    subjectsQuery.error ??
    studentsQuery.error;

  return (
    <PageContainer className="space-y-5 pb-10">
      <div className="app-card space-y-5 p-4">
        <div className="border-b border-border pb-2 text-center">
          <h1 className="text-[15px] font-semibold text-foreground">
            For faculty members Performance Based Assessment Scheme (PBAS) -
            360°
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          <p className="lg:col-start-1 lg:row-start-1">
            <span className="text-muted-foreground">Academic Year: </span>
            <span className="font-medium text-primary">
              {academicYear || "—"}
            </span>
          </p>
          <p className="lg:col-start-2 lg:row-start-1">
            <span className="text-muted-foreground">Designation: </span>
            <span className="font-medium text-primary">
              {designation || "—"}
            </span>
          </p>
          <p className="lg:col-start-1 lg:row-start-2">
            <span className="text-muted-foreground">Employee: </span>
            <span className="font-medium text-primary">
              {empFirstName || empId || "—"}
            </span>
          </p>
          <p className="lg:col-start-2 lg:row-start-2">
            <span className="text-muted-foreground">Department: </span>
            <span className="font-medium text-primary">
              {empDeptName || "—"}
            </span>
          </p>
          <p className="lg:col-start-3 lg:row-start-2 lg:text-right">
            <span className="text-muted-foreground">Date: </span>
            <span className="font-medium text-primary">
              {format(feedbackDate, "dd MMM, yyyy")}
            </span>
          </p>
        </div>

        {loading && questionRows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment…
          </div>
        ) : null}
        {loadError && !isNoRecordsError(loadError) ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(loadError)}
          </p>
        ) : null}

        {questionRows.length > 0 ? (
          <div className="space-y-6">
            {questionRows.map((question, index) => {
              const code = String(question.questionCode ?? "");
              return (
                <section
                  key={String(question.assessmentQuestionId ?? index)}
                  className="space-y-2"
                >
                  <p className="text-[13px] font-medium text-foreground">
                    {index + 1}. {String(question.questionName ?? "")}
                  </p>

                  {code === "radio-button" ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pl-4">
                      {rowsFrom(question.empPerfAssessmentQutnOptsDTOS).map(
                        (option) => (
                          <label
                            key={String(option.assessmentOptionId)}
                            className="flex items-center gap-2 text-[13px]"
                          >
                            <input
                              type="radio"
                              name={`assessment-option-${index}`}
                              value={String(option.assessmentOptionId)}
                              checked={
                                Number(question.assessmentOptionId) ===
                                Number(option.assessmentOptionId)
                              }
                              disabled={readOnly}
                              onChange={() =>
                                updateQuestion(index, {
                                  assessmentOptionId: Number(
                                    option.assessmentOptionId,
                                  ),
                                })
                              }
                            />
                            {String(option.optionName ?? "")}
                          </label>
                        ),
                      )}
                    </div>
                  ) : null}

                  {code === "SUBPERTHEORY" ? (
                    <AssessmentSubjectTable
                      label="Theory"
                      subjectLabel="Theory"
                      rows={theoryRows}
                      subjects={theorySubjects}
                      readOnly={readOnly}
                      onChange={(rowIndex, field, value) =>
                        changeRow(setTheoryRows, rowIndex, field, value)
                      }
                      onAdd={() =>
                        setTheoryRows((current) => [
                          ...current,
                          emptySubjectRow(empId),
                        ])
                      }
                      onRemove={(rowIndex) =>
                        removeSubjectRow(theoryRows, setTheoryRows, rowIndex)
                      }
                    />
                  ) : null}

                  {code === "SUBPERLAB" ? (
                    <AssessmentSubjectTable
                      label="Laboratory"
                      subjectLabel="Laboratory"
                      rows={labRows}
                      subjects={labSubjects}
                      readOnly={readOnly}
                      onChange={(rowIndex, field, value) =>
                        changeRow(setLabRows, rowIndex, field, value)
                      }
                      onAdd={() =>
                        setLabRows((current) => [
                          ...current,
                          emptySubjectRow(empId),
                        ])
                      }
                      onRemove={(rowIndex) =>
                        removeSubjectRow(labRows, setLabRows, rowIndex)
                      }
                    />
                  ) : null}

                  {code === "ACHMNTMENT" ? (
                    <div className="mt-3 overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[720px] text-[12px]">
                        <thead className="bg-muted/55">
                          <tr className="border-b border-border">
                            <th className="w-14 px-2 py-2 text-center font-medium">
                              S.No
                            </th>
                            <th className="min-w-[240px] px-2 py-2 text-left font-medium">
                              Mentee’s Name
                            </th>
                            {generalDetails.engagements.map((engagement) => (
                              <th
                                key={String(engagement.generalDetailId)}
                                className="px-2 py-2 text-center font-medium"
                              >
                                {String(
                                  engagement.generalDetailDisplayName ?? "",
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mentorRows.map((row, rowIndex) => (
                            <tr
                              key={`mentor-${rowIndex}`}
                              className="border-b border-border last:border-b-0"
                            >
                              <td className="px-2 py-2 text-center">
                                {rowIndex + 1}
                              </td>
                              <td className="px-2 py-2">
                                <Select
                                  value={
                                    row.studentId ? String(row.studentId) : null
                                  }
                                  onChange={(value) =>
                                    changeRow(
                                      setMentorRows,
                                      rowIndex,
                                      "studentId",
                                      value ? Number(value) : "",
                                    )
                                  }
                                  options={(studentsQuery.data ?? []).map(
                                    (student) => ({
                                      value: String(student.studentId),
                                      label: studentOptionLabel(student),
                                    }),
                                  )}
                                  placeholder="Student"
                                  searchable
                                  disabled={readOnly}
                                />
                              </td>
                              {rowsFrom(row.gainfulEngagementList).map(
                                (engagement, engagementIndex) => (
                                  <td
                                    key={String(engagement.generalDetailId)}
                                    className="px-2 py-2 text-center"
                                  >
                                    <Checkbox
                                      checked={engagement.checked === true}
                                      disabled={readOnly}
                                      onCheckedChange={(checked) => {
                                        setMentorRows((current) =>
                                          current.map(
                                            (mentor, currentIndex) => {
                                              if (currentIndex !== rowIndex)
                                                return mentor;
                                              return {
                                                ...mentor,
                                                gainfulEngagementList: rowsFrom(
                                                  mentor.gainfulEngagementList,
                                                ).map((item, itemIndex) =>
                                                  itemIndex === engagementIndex
                                                    ? {
                                                        ...item,
                                                        checked:
                                                          checked === true,
                                                      }
                                                    : item,
                                                ),
                                              };
                                            },
                                          ),
                                        );
                                      }}
                                    />
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!readOnly ? (
                        <div className="border-t border-border p-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-[12px]"
                            onClick={() =>
                              setMentorRows((current) => [
                                ...current,
                                emptyMentorRow(
                                  empId,
                                  generalDetails.engagements,
                                ),
                              ])
                            }
                          >
                            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                            Add Mentee
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {code === "DEPTLVLWRKPER" ? (
                    <LevelWorkTable
                      label="Department Work"
                      ratingLabel="Rating by HoD"
                      remarksLabel="Remarks by HoD"
                      rows={departmentRows}
                      ratings={generalDetails.ratings}
                      readOnly={readOnly}
                      onChange={(rowIndex, field, value) =>
                        changeRow(setDepartmentRows, rowIndex, field, value)
                      }
                      onAdd={() =>
                        setDepartmentRows((current) => [
                          ...current,
                          emptyLevelRow(empId),
                        ])
                      }
                      onRemove={(rowIndex) =>
                        removeLevelRow(
                          departmentRows,
                          setDepartmentRows,
                          rowIndex,
                        )
                      }
                    />
                  ) : null}

                  {code === "INSTLEVWORKS" ? (
                    <LevelWorkTable
                      label="Institution Work"
                      ratingLabel="Rating by Concerned Authority"
                      remarksLabel="Remarks by Concerned Authority"
                      rows={institutionRows}
                      ratings={generalDetails.ratings}
                      readOnly={readOnly}
                      onChange={(rowIndex, field, value) =>
                        changeRow(setInstitutionRows, rowIndex, field, value)
                      }
                      onAdd={() =>
                        setInstitutionRows((current) => [
                          ...current,
                          emptyLevelRow(empId),
                        ])
                      }
                      onRemove={(rowIndex) =>
                        removeLevelRow(
                          institutionRows,
                          setInstitutionRows,
                          rowIndex,
                        )
                      }
                    />
                  ) : null}

                  {code === "TEXT" ? (
                    <Input
                      value={String(question.description ?? "")}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateQuestion(index, {
                          description: event.target.value,
                        })
                      }
                    />
                  ) : null}

                  {code === "TEXTAREAF" ? (
                    <Textarea
                      value={String(question.description ?? "")}
                      disabled={readOnly}
                      rows={4}
                      onChange={(event) =>
                        updateQuestion(index, {
                          description: event.target.value,
                        })
                      }
                    />
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : null}

        {!readOnly && questionRows.length > 0 ? (
          <div className="flex justify-center border-t border-border pt-4">
            <Button
              type="button"
              size="sm"
              className="w-full max-w-md bg-amber-400 text-amber-950 hover:bg-amber-500"
              disabled={saving || loading}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push("/hr-payroll/employee/performance-assessment")
          }
        >
          Back
        </Button>
      </div>
    </PageContainer>
  );
}
