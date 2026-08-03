"use client";

/**
 * Angular `feedback-details/employee-feedback` (`my-feedback/suvey-form`)
 * → `EmployeeFeedbackComponent`.
 *
 * Reuses existing survey / HR / attendance services — no new APIs.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilteredPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { utcMidnightIso } from "@/common/generic-functions";
import { useSession } from "@/hooks/useSession";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getSurveyFormById,
  listDepartmentHeadsByDepartment,
  listEmployeeReportingByEmployee,
  listStudentSurveyForms,
  searchEmployeesForHr,
  submitSurveyFeedback,
} from "@/services";

type AnyRow = Record<string, unknown>;

type QuestionRow = AnyRow & {
  surveyDetailsId?: number;
  fbQuestion?: string;
  fbOptionchoiceId?: number | null;
  feedbackQuestionDTO?: AnyRow | null;
};

/** Angular `flag`: 2=Lecturer/Reporties search, 3=HOD, 5=ReportingManager. */
type EmpFlag = 0 | 1 | 2 | 3 | 5;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function flagForFbforCode(code: string): EmpFlag {
  switch (code) {
    case "Students":
      return 1;
    case "Lecturer":
    case "Reporties":
      return 2;
    case "HOD":
      return 3;
    case "ReportingManager":
      return 5;
    default:
      return 0;
  }
}

function rowCollegeId(row: AnyRow): number {
  return positiveId(
    row.collegeId,
    row["College.collegeId"],
    (row.college as AnyRow | undefined)?.collegeId,
  );
}

export function EmployeeFeedbackPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const {
    employeeId: fromEmployeeId,
    deptId: empDeptId,
    isResolving: staffCtxLoading,
  } = useStaffLoginContext(user, sessionLoading);

  const collegeId = positiveId(user?.collegeId);

  const [surveyFormId, setSurveyFormId] = useState<string | null>(null);
  const [fbForCode, setFbForCode] = useState("");
  const [flag, setFlag] = useState<EmpFlag>(0);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] =
    useState<AnyRow>({});
  const [formDetails, setFormDetails] = useState<AnyRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeRows, setEmployeeRows] = useState<AnyRow[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const formsQuery = useQuery({
    queryKey: QK.employeeSurveyFeedback.forms(collegeId),
    // Angular getData: listByThreeIds(surveyformdetailsbyenddate, 'Students', collegeId, 'true', …)
    queryFn: () => listStudentSurveyForms(collegeId),
    enabled: collegeId > 0,
  });

  const formOptions = useMemo(
    () =>
      (formsQuery.data ?? []).map((f) => ({
        value: String(f.surveyFormId),
        label: String(f.surveyName || f.surveyFormId),
      })),
    [formsQuery.data],
  );

  const hodsQuery = useQuery({
    queryKey: QK.employeeSurveyFeedback.hods(collegeId, empDeptId),
    queryFn: async () => {
      const rows = await listDepartmentHeadsByDepartment(empDeptId);
      if (!collegeId) return rows;
      return rows.filter((r) => {
        const cid = rowCollegeId(r);
        return !cid || cid === collegeId;
      });
    },
    enabled: flag === 3 && empDeptId > 0,
  });

  const reportingQuery = useQuery({
    queryKey: QK.employeeSurveyFeedback.reportingManagers(fromEmployeeId),
    queryFn: () => listEmployeeReportingByEmployee(fromEmployeeId),
    enabled: flag === 5 && fromEmployeeId > 0,
  });

  const hodOptions = useMemo(
    () =>
      (hodsQuery.data ?? []).map((h) => {
        const name = txt(h, ["employeeName", "firstName"]);
        const empNo = txt(h, ["empNumber"]);
        return {
          value: String(h.employeeId ?? ""),
          label: empNo ? `${name} (${empNo})` : name || String(h.employeeId),
        };
      }),
    [hodsQuery.data],
  );

  const reportingOptions = useMemo(
    () =>
      (reportingQuery.data ?? []).map((r) => {
        const name = txt(r, ["managerEmpName"]);
        const empNo = txt(r, ["managerEmpNumber"]);
        return {
          value: String(r.managerEmpId ?? ""),
          label: empNo ? `${name} (${empNo})` : name || String(r.managerEmpId),
        };
      }),
    [reportingQuery.data],
  );

  const clearEmployeeSelection = useCallback(() => {
    setEmployeeId(null);
    setSelectedEmployeeDetails({});
    setFormDetails(null);
    setQuestions([]);
  }, []);

  const loadSurveyForm = useCallback(async (formId: number) => {
    if (!formId) {
      setFormDetails(null);
      setQuestions([]);
      return;
    }
    try {
      const form = await getSurveyFormById(formId);
      if (!form) {
        setFormDetails(null);
        setQuestions([]);
        return;
      }
      setFormDetails(form);
      const details = Array.isArray(form.surveyDetailDTOs)
        ? ([...form.surveyDetailDTOs] as QuestionRow[])
        : [];
      setQuestions(details.map((q) => ({ ...q, fbOptionchoiceId: null })));
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Failed to load survey form",
      );
      setFormDetails(null);
      setQuestions([]);
    }
  }, []);

  const onSurveyChange = useCallback(
    (value: string | null) => {
      setSurveyFormId(value);
      clearEmployeeSelection();
      setEmployeeOptions([]);
      setEmployeeRows([]);

      const form = (formsQuery.data ?? []).find(
        (f) => String(f.surveyFormId) === String(value),
      );
      const code = String(form?.fbforCode ?? "");
      setFbForCode(code);
      setFlag(flagForFbforCode(code));
    },
    [formsQuery.data, clearEmployeeSelection],
  );

  const onEmployeeSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      if (q.length < 4 || !collegeId) {
        if (!q) {
          setEmployeeOptions([]);
          setEmployeeRows([]);
        }
        return;
      }
      setEmployeeSearchLoading(true);
      void searchEmployeesForHr(q, collegeId)
        .then((rows) => {
          setEmployeeRows(rows);
          setEmployeeOptions(
            rows.map((e) => {
              const empNo = txt(e, ["empNumber"]);
              const name = txt(e, ["firstName", "employeeName"]);
              return {
                value: String(e.employeeId ?? ""),
                label: name
                  ? `${empNo} (${name})`
                  : empNo || String(e.employeeId),
              };
            }),
          );
        })
        .catch((err) => {
          toastError(
            err instanceof Error ? err.message : "Failed to search employees",
          );
        })
        .finally(() => setEmployeeSearchLoading(false));
    },
    [collegeId],
  );

  const onEmployeeChange = useCallback(
    (value: string | null) => {
      setEmployeeId(value);
      const id = positiveId(value);
      if (!id) {
        setSelectedEmployeeDetails({});
        setFormDetails(null);
        setQuestions([]);
        return;
      }

      if (flag === 3) {
        const row =
          (hodsQuery.data ?? []).find((h) => Number(h.employeeId) === id) ?? {};
        setSelectedEmployeeDetails(row);
      } else if (flag === 5) {
        const row =
          (reportingQuery.data ?? []).find(
            (r) => Number(r.managerEmpId) === id,
          ) ?? {};
        setSelectedEmployeeDetails(row);
      } else if (flag === 2) {
        const row = employeeRows.find((e) => Number(e.employeeId) === id) ?? {};
        setSelectedEmployeeDetails(row);
      }

      void loadSurveyForm(Number(surveyFormId || 0));
    },
    [
      flag,
      hodsQuery.data,
      reportingQuery.data,
      employeeRows,
      surveyFormId,
      loadSurveyForm,
    ],
  );

  useEffect(() => {
    if (formsQuery.isError) {
      toastError(
        formsQuery.error instanceof Error
          ? formsQuery.error.message
          : "Failed to load survey forms",
      );
    }
  }, [formsQuery.isError, formsQuery.error]);

  useEffect(() => {
    if (hodsQuery.isError) {
      toastError(
        hodsQuery.error instanceof Error
          ? hodsQuery.error.message
          : "Failed to load department heads",
      );
    }
  }, [hodsQuery.isError, hodsQuery.error]);

  useEffect(() => {
    if (reportingQuery.isError) {
      toastError(
        reportingQuery.error instanceof Error
          ? reportingQuery.error.message
          : "Failed to load reporting managers",
      );
    }
  }, [reportingQuery.isError, reportingQuery.error]);

  const showForm =
    formDetails != null &&
    employeeId != null &&
    employeeId !== "" &&
    employeeId !== "null";

  async function handleSubmit() {
    if (!formDetails || !employeeId) return;
    setSaving(true);
    try {
      const formCollegeId = positiveId(formDetails.collegeId, collegeId);
      const detailDTOs: AnyRow[] = [];
      for (const item of questions) {
        const choiceId = positiveId(item.fbOptionchoiceId);
        if (!choiceId) continue;
        const fq = item.feedbackQuestionDTO as AnyRow | null | undefined;
        const group = fq?.fbOptionGroupDTO as AnyRow | null | undefined;
        const choices = Array.isArray(group?.fbOptionchoiceDTOs)
          ? (group!.fbOptionchoiceDTOs as AnyRow[])
          : [];
        const choice = choices.find(
          (c) => Number(c.fbOptionchoiceId) === choiceId,
        );
        detailDTOs.push({
          collegeId: formCollegeId,
          surveyDetailsId: item.surveyDetailsId,
          fbOptionchoiceId: choiceId,
          fbAnswer: choice?.optionchoice ?? null,
          fbAnswerRating: choice?.optionchoiceRating ?? null,
          isActive: true,
          iscompleted: true,
        });
      }

      const message = await submitSurveyFeedback({
        collegeId: formCollegeId,
        surveyFormId: positiveId(formDetails.surveyFormId, surveyFormId),
        fromEmployeeId: fromEmployeeId || undefined,
        forEmployeeId: positiveId(employeeId),
        feedbackDate: utcMidnightIso(),
        isActive: true,
        surveyFeedbackDetailDTOs: detailDTOs,
      });
      toastSuccess(message || "Feedback saved");
      setFormDetails(null);
      setQuestions([]);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
    } finally {
      setSaving(false);
    }
  }

  const employeeHeader = (() => {
    const code = String(formDetails?.fbforCode ?? fbForCode);
    if (code === "HOD") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 pb-2 text-sm">
          <span>
            Employee:{" "}
            <span className="font-medium">
              {txt(selectedEmployeeDetails, ["employeeName"])}
            </span>
          </span>
          <span>
            HOD :{" "}
            <span className="font-medium">
              {txt(selectedEmployeeDetails, ["groupCode"])}
            </span>
          </span>
        </div>
      );
    }
    if (code === "ReportingManager") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 pb-2 text-sm">
          <span>
            Employee :{" "}
            <span className="font-medium">
              {txt(selectedEmployeeDetails, ["managerEmpName"])}
              {txt(selectedEmployeeDetails, ["managerEmpNumber"])
                ? ` ${txt(selectedEmployeeDetails, ["managerEmpNumber"])}`
                : ""}
            </span>
          </span>
          <span>
            Manager To Date :{" "}
            <span className="font-medium">
              {formatDisplayDate(selectedEmployeeDetails.toDate)}
            </span>
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 pb-2 text-sm">
        <span>
          Employee :{" "}
          <span className="font-medium">
            {txt(selectedEmployeeDetails, ["firstName", "employeeName"])}
          </span>
        </span>
        <span>
          Department :{" "}
          <span className="font-medium">
            {txt(selectedEmployeeDetails, ["empDeptName", "departmentName"])}
          </span>
        </span>
      </div>
    );
  })();

  return (
    <FilteredPage
      title="Employee Feedback"
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Survey"
            value={surveyFormId}
            onChange={onSurveyChange}
            options={formOptions}
            placeholder="Select survey"
            isLoading={
              formsQuery.isLoading || sessionLoading || staffCtxLoading
            }
            required
          />
          {flag === 3 && surveyFormId ? (
            <Select
              label="Employee"
              value={employeeId}
              onChange={onEmployeeChange}
              options={hodOptions}
              placeholder="Select employee"
              isLoading={hodsQuery.isLoading}
              required
            />
          ) : null}
          {flag === 5 && surveyFormId ? (
            <Select
              label="Employee"
              value={employeeId}
              onChange={onEmployeeChange}
              options={reportingOptions}
              placeholder="Select employee"
              isLoading={reportingQuery.isLoading}
              required
            />
          ) : null}
          {flag === 2 && surveyFormId ? (
            <Select
              label="Employee"
              value={employeeId}
              onChange={onEmployeeChange}
              options={employeeOptions}
              placeholder="Search by Employee name or Id"
              searchable
              onSearch={onEmployeeSearch}
              isLoading={employeeSearchLoading}
              emptyMessage="no matching data found"
              required
            />
          ) : null}
        </div>
      }
      body={
        showForm ? (
          <div className="space-y-4">
            {txt(formDetails, ["headerinfo", "headerInfo"]) ? (
              <h2 className="text-lg font-semibold">
                {txt(formDetails, ["headerinfo", "headerInfo"])}
              </h2>
            ) : null}
            {txt(formDetails, ["headerinfo1", "headerInfo1"]) ? (
              <h3 className="text-sm text-muted-foreground">
                {txt(formDetails, ["headerinfo1", "headerInfo1"])}
              </h3>
            ) : null}

            {employeeHeader}

            <div className="space-y-4">
              {questions.map((item, i) => {
                const fq = item.feedbackQuestionDTO as
                  | AnyRow
                  | null
                  | undefined;
                const group = fq?.fbOptionGroupDTO as AnyRow | null | undefined;
                const choices = Array.isArray(group?.fbOptionchoiceDTOs)
                  ? (group!.fbOptionchoiceDTOs as AnyRow[])
                  : [];
                return (
                  <div
                    key={String(item.surveyDetailsId ?? i)}
                    className="space-y-2"
                  >
                    <p className="text-sm font-medium">
                      {i + 1}. {txt(item, ["fbQuestion"])}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {choices.map((obj) => {
                        const id = positiveId(obj.fbOptionchoiceId);
                        return (
                          <label
                            key={id}
                            className="inline-flex items-center gap-1.5 text-sm"
                          >
                            <input
                              type="radio"
                              name={`emp-fb-q-${item.surveyDetailsId ?? i}`}
                              checked={Number(item.fbOptionchoiceId) === id}
                              onChange={() =>
                                setQuestions((prev) =>
                                  prev.map((q, idx) =>
                                    idx === i
                                      ? { ...q, fbOptionchoiceId: id }
                                      : q,
                                  ),
                                )
                              }
                            />
                            {txt(obj, ["optionchoice"])}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {txt(formDetails, ["footerinfo", "footerInfo"]) ? (
              <h2 className="border-t border-amber-300 pt-3 text-lg font-semibold">
                {txt(formDetails, ["footerinfo", "footerInfo"])}
              </h2>
            ) : null}
            {txt(formDetails, ["footerinfo1", "footerInfo1"]) ? (
              <h3 className="text-sm text-muted-foreground">
                {txt(formDetails, ["footerinfo1", "footerInfo1"])}
              </h3>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit()}
              >
                {saving ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
