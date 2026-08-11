"use client";

/**
 * Angular `feedback/feedback-suggestion-repot` —
 * Survey Feedback Suggestion Report.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import {
  getFeedbackSuggestionReportRows,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listSurveyFeedbackEmployees,
  listSurveyFormsByCollegeActive,
  type FeedbackSuggestionReportRow,
} from "@/services";

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown) => String(v ?? "").trim();

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<FeedbackSuggestionReportRow>,
  question: {
    field: "FB_Question",
    headerName: "Feedback Questions",
    minWidth: 220,
  } as ColDef<FeedbackSuggestionReportRow>,
  course: {
    field: "Academic_Details",
    headerName: "Course",
    minWidth: 160,
  } as ColDef<FeedbackSuggestionReportRow>,
  participants: {
    field: "Participants",
    headerName: "Participants",
    minWidth: 120,
    cellClass: "text-center",
  } as ColDef<FeedbackSuggestionReportRow>,
  suggestion: {
    field: "Suggestion",
    headerName: "Suggestion",
    minWidth: 180,
    cellClass: "text-center",
  } as ColDef<FeedbackSuggestionReportRow>,
  rating: {
    field: "Rating",
    headerName: "Rating",
    minWidth: 100,
    cellClass: "text-center",
  } as ColDef<FeedbackSuggestionReportRow>,
};

export default function FeedbackSuggestionReportPage() {
  const { user } = useSession();
  const isPrincipal =
    Boolean(user?.isPrincipal) ||
    (typeof window !== "undefined" &&
      (window.localStorage?.getItem("isPRINCIPAL") === "true" ||
        window.localStorage?.getItem("isPrincipal") === "true"));

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [surveyFormId, setSurveyFormId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [percentageValue, setPercentageValue] = useState("0");

  const [rows, setRows] = useState<FeedbackSuggestionReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const collegesQuery = useQuery({
    queryKey: QK.feedbackSuggestionReport.colleges(),
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const colleges = collegesQuery.data ?? [];

  // Angular: principal / session college auto-select
  useEffect(() => {
    if (collegeId || colleges.length === 0) return;
    const sessionCollegeId = Number(user?.collegeId ?? 0);
    const match = sessionCollegeId
      ? colleges.find((c) => Number(c.collegeId) === sessionCollegeId)
      : null;
    setCollegeId(String((match ?? colleges[0]).collegeId));
  }, [colleges, collegeId, user?.collegeId]);

  const departmentsQuery = useQuery({
    queryKey: QK.feedbackSuggestionReport.departments(n(collegeId)),
    queryFn: () => listDepartmentsByCollege(n(collegeId)),
    enabled: n(collegeId) > 0,
  });

  const surveysQuery = useQuery({
    queryKey: QK.feedbackSuggestionReport.surveys(n(collegeId)),
    queryFn: () => listSurveyFormsByCollegeActive(n(collegeId)),
    enabled: n(collegeId) > 0 && Boolean(departmentId),
  });

  const employeesQuery = useQuery({
    queryKey: QK.feedbackSuggestionReport.employees(n(surveyFormId)),
    queryFn: () => listSurveyFeedbackEmployees(n(surveyFormId)),
    enabled: n(surveyFormId) > 0,
  });

  const clearResults = () => {
    setRows([]);
    setHasFetched(false);
  };

  useEffect(() => {
    if (!collegeId) return;
    setDepartmentId(null);
    setSurveyFormId(null);
    setEmployeeId(null);
    setPercentageValue("0");
    clearResults();
  }, [collegeId]);

  useEffect(() => {
    if (!departmentId) return;
    setSurveyFormId(null);
    setEmployeeId(null);
    setPercentageValue("0");
    clearResults();
  }, [departmentId]);

  useEffect(() => {
    if (!surveyFormId) return;
    setEmployeeId(null);
    setPercentageValue("0");
    clearResults();
  }, [surveyFormId]);

  useEffect(() => {
    if (!employeeId) return;
    setPercentageValue("0");
    clearResults();
  }, [employeeId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        value: String(d.departmentId),
        label: String(d.deptCode ?? d.deptName ?? d.departmentId),
      })),
    [departmentsQuery.data],
  );

  const surveyOptions = useMemo(
    () =>
      (surveysQuery.data ?? []).map((sv) => ({
        value: String(sv.surveyFormId),
        label: String(sv.surveyName ?? sv.surveyFormId),
      })),
    [surveysQuery.data],
  );

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? [])
        .filter((e) => n(e.employeeId) > 0)
        .map((e) => {
          const name = s(e.empName ?? e.firstName);
          const empNo = s(e.empNumber);
          return {
            value: String(n(e.employeeId)),
            label: empNo
              ? `${name} (${empNo})`
              : name || String(n(e.employeeId)),
          };
        }),
    [employeesQuery.data],
  );

  const columnDefs = useMemo<ColDef<FeedbackSuggestionReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.question,
      COL_DEFS.course,
      COL_DEFS.participants,
      COL_DEFS.suggestion,
      COL_DEFS.rating,
    ],
    [],
  );

  const canGetList =
    Boolean(collegeId) &&
    Boolean(departmentId) &&
    Boolean(surveyFormId) &&
    Boolean(employeeId) &&
    percentageValue !== "";

  async function handleGetList() {
    if (!canGetList) {
      toastError("Please fill all required filters.");
      return;
    }
    setLoadingList(true);
    setHasFetched(true);
    try {
      const list = await getFeedbackSuggestionReportRows({
        surveyFormId: n(surveyFormId),
        employeeId: n(employeeId),
        percentageValue: Number(percentageValue) || 0,
      });
      setRows(list);
      if (list.length === 0) toastSuccess("No records found.");
    } catch (e) {
      setRows([]);
      toastError(getErrorMessage(e) || "Failed to load suggestion report");
    } finally {
      setLoadingList(false);
    }
  }

  const showTable = hasFetched && rows.length > 0;

  return (
    <FilteredListPage
      title="Survey Feedback Suggestion Report"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={setCollegeId}
                options={collegeOptions}
                placeholder="College"
                isLoading={collegesQuery.isLoading}
                disabled={isPrincipal}
              />
            </div>
            <div className="lg:col-span-2">
              <Select
                label="Department"
                required
                value={departmentId}
                onChange={setDepartmentId}
                options={departmentOptions}
                placeholder="Department"
                isLoading={departmentsQuery.isLoading}
                disabled={!collegeId}
              />
            </div>
            <div className="lg:col-span-5">
              <Select
                label="Survey"
                required
                value={surveyFormId}
                onChange={setSurveyFormId}
                options={surveyOptions}
                placeholder="Survey"
                isLoading={surveysQuery.isLoading}
                disabled={!departmentId}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Select
                label="Employee"
                required
                value={employeeId}
                onChange={setEmployeeId}
                options={employeeOptions}
                placeholder="Employee"
                isLoading={employeesQuery.isLoading}
                disabled={!surveyFormId}
              />
            </div>
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs font-medium">
                Attedance Percentage <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                value={percentageValue}
                onChange={(e) => {
                  setPercentageValue(e.target.value);
                  clearResults();
                }}
                className="h-9"
              />
            </div>
            <div className="lg:col-span-2">
              <Button
                type="button"
                className="h-9 w-full"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                Get List
              </Button>
            </div>
          </div>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || collegesQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Survey Feedback Suggestion Report",
      }}
    />
  );
}
