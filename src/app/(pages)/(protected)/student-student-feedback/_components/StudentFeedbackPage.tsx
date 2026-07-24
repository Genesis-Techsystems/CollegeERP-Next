"use client";

/**
 * Angular `student-student-feedback` → `StudentFeedbackComponent`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listStudentSurveyForms,
  listSurveyStatusEmployees,
  submitSurveyFeedback,
} from "@/services";
import { StudentFeedbackModal } from "./StudentFeedbackModal";

type AnyRow = Record<string, unknown>;

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

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  employee: {
    headerName: "Employee",
    minWidth: 180,
    valueGetter: (p) => {
      const name = txt(p.data, ["Faculty", "firstName"]);
      const empNo = txt(p.data, ["Faculty_emp_number", "empNumber"]);
      if (!name) return "—";
      return empNo ? `${name} (${empNo})` : name;
    },
  } as ColDef<AnyRow>,
  department: {
    headerName: "Department",
    minWidth: 140,
    valueGetter: (p) => txt(p.data, ["emp_department"]) || "—",
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Subject",
    minWidth: 180,
    valueGetter: (p) => {
      const name = txt(p.data, ["subject_name", "subjectName"]);
      const code = txt(p.data, ["subject_code", "subjectCode"]);
      if (!name) return "—";
      return code ? `${name} (${code})` : name;
    },
  } as ColDef<AnyRow>,
  subjectType: {
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) => {
      const type = txt(p.data, ["Subject_Type", "subjectType"]);
      const batch = txt(p.data, ["batch_name", "batchName"]);
      if (!type) return "—";
      return type === "LAB" && batch ? `${type} (${batch})` : type;
    },
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 120,
    flex: 0,
    width: 120,
  } as ColDef<AnyRow>,
};

function makeActionsRenderer(onOpen: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const completed = Boolean(row.iscompleted);
    if (completed) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onOpen(row)}
          title="View"
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <Button size="sm" variant="ghost" onClick={() => onOpen(row)}>
        Feedback
      </Button>
    );
  };
}

export function StudentFeedbackPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [studentCtx, setStudentCtx] = useState({
    studentId: 0,
    collegeId: 0,
    academicYearId: 0,
    groupSectionId: 0,
  });
  const [surveyFormId, setSurveyFormId] = useState<string | null>(null);
  const [fbForCode, setFbForCode] = useState("");
  const [modalRow, setModalRow] = useState<AnyRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveCtx() {
      let studentId = positiveId(user?.studentId);
      let detail: AnyRow | null = null;
      if (studentId) {
        detail = await fetchStudentDetail(studentId);
      } else if (positiveId(user?.userId)) {
        detail = await fetchStudentDetailByUserId(user!.userId);
        studentId = positiveId(detail?.studentId, detail?.studentDetailId);
      }
      if (cancelled) return;
      setStudentCtx({
        studentId,
        collegeId: positiveId(
          detail?.collegeId,
          user?.collegeId,
          detail?.["College.collegeId"],
        ),
        academicYearId: positiveId(
          detail?.academicYearId,
          user?.academicYearId,
        ),
        groupSectionId: positiveId(
          detail?.groupSectionId,
          detail?.["GroupSection.groupSectionId"],
          detail?.["groupSection.groupSectionId"],
          detail?.fk_groupSectionId,
        ),
      });
    }
    void resolveCtx();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const formsQuery = useQuery({
    queryKey: QK.studentSurveyFeedback.forms(studentCtx.collegeId),
    queryFn: () => listStudentSurveyForms(studentCtx.collegeId),
    enabled: studentCtx.collegeId > 0,
  });

  const formOptions = useMemo(
    () =>
      (formsQuery.data ?? []).map((f) => ({
        value: String(f.surveyFormId),
        label: String(f.surveyName || f.surveyFormId),
      })),
    [formsQuery.data],
  );

  const employeesQuery = useQuery({
    queryKey: QK.studentSurveyFeedback.employees(
      Number(surveyFormId || 0),
      studentCtx.studentId,
    ),
    queryFn: () =>
      listSurveyStatusEmployees({
        surveyFormId: Number(surveyFormId),
        studentId: studentCtx.studentId,
        academicYearId: studentCtx.academicYearId,
        groupSectionId: studentCtx.groupSectionId,
      }),
    enabled:
      !!surveyFormId &&
      fbForCode === "Lecturer" &&
      studentCtx.studentId > 0 &&
      studentCtx.groupSectionId > 0,
  });

  const onSurveyChange = useCallback(
    (value: string | null) => {
      setSurveyFormId(value);
      const form = (formsQuery.data ?? []).find(
        (f) => String(f.surveyFormId) === String(value),
      );
      setFbForCode(String(form?.fbforCode ?? ""));
    },
    [formsQuery.data],
  );

  const rows = employeesQuery.data ?? [];

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.employee,
      COL_DEFS.department,
      COL_DEFS.subject,
      COL_DEFS.subjectType,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setModalRow),
      },
    ],
    [],
  );

  const handleSubmit = useCallback(
    async (payload: AnyRow) => {
      setSaving(true);
      try {
        const message = await submitSurveyFeedback(payload);
        toastSuccess(message || "Feedback saved");
        setModalRow(null);
        await queryClient.invalidateQueries({
          queryKey: QK.studentSurveyFeedback.employees(
            Number(surveyFormId || 0),
            studentCtx.studentId,
          ),
        });
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Failed to save feedback");
      } finally {
        setSaving(false);
      }
    },
    [queryClient, surveyFormId, studentCtx.studentId],
  );

  useEffect(() => {
    if (employeesQuery.isError) {
      toastError(
        employeesQuery.error instanceof Error
          ? employeesQuery.error.message
          : "Failed to load employees",
      );
    }
  }, [employeesQuery.isError, employeesQuery.error]);

  useEffect(() => {
    if (
      employeesQuery.isSuccess &&
      rows.length === 0 &&
      fbForCode === "Lecturer" &&
      surveyFormId
    ) {
      toastInfo("No pending feedback records");
    }
  }, [employeesQuery.isSuccess, rows.length, fbForCode, surveyFormId]);

  return (
    <FilteredListPage
      title="Student Feedback"
      filters={
        <div className="max-w-md">
          <Select
            label="Survey"
            value={surveyFormId}
            onChange={onSurveyChange}
            options={formOptions}
            placeholder="Select survey"
            isLoading={formsQuery.isLoading}
          />
        </div>
      }
      rowData={fbForCode === "Lecturer" ? rows : []}
      columnDefs={columnDefs}
      loading={employeesQuery.isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
    >
      <StudentFeedbackModal
        open={modalRow !== null}
        row={modalRow}
        surveyFormId={Number(surveyFormId || 0)}
        collegeId={studentCtx.collegeId}
        academicYearId={studentCtx.academicYearId}
        groupSectionId={studentCtx.groupSectionId}
        studentId={studentCtx.studentId}
        isSubmitting={saving}
        onClose={() => setModalRow(null)}
        onSubmit={handleSubmit}
      />
    </FilteredListPage>
  );
}
