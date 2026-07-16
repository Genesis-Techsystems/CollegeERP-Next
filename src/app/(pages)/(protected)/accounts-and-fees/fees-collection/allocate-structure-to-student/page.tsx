"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { BookOpen, Eye, Plus, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { ConfirmDialog, FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsByUniversity,
  listCourseGroupsByCourse,
  listCourseYearsForFeeCollection,
  listCoursesByUniversity,
  listFeeStructureParticularsForPayment,
  listFeeStructuresForStudentCourseYear,
  listStudentFeeStructuresByStudent,
  mapFeeStructureToStudents,
  updateFeeStudentDataStatus,
} from "@/services";
import type { College } from "@/types/college";
import type {
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import { FeeDetailsModal } from "../_components/FeeDetailsModal";
import { FeeStudentProfileCard } from "../_components/FeeStudentProfileCard";
import { FeeStudentSearchSelect } from "../_components/FeeStudentSearchSelect";
import { DataTable } from "@/common/components/table";

type PendingStructure = {
  collegeId: number;
  courseYearName: string;
  academicYear: string;
  feeStructureName: string;
  studentId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  isManual: boolean;
  feeStructureId: number;
  yearNo: number;
};

const PENDING_COLS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PendingStructure>,
  courseYear: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 140,
  } as ColDef<PendingStructure>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<PendingStructure>,
  feeStructure: {
    field: "feeStructureName",
    headerName: "Fee Structure",
    minWidth: 160,
  } as ColDef<PendingStructure>,
  actions: {
    headerName: "Actions",
    minWidth: 120,
    flex: 0,
    width: 120,
  } as ColDef<PendingStructure>,
};

const EXISTING_COLS = {
  structure: {
    field: "structureName",
    headerName: "Structure",
    minWidth: 140,
  } as ColDef<StudentFeeStructureRow>,
  course: {
    headerName: "Course",
    minWidth: 180,
  } as ColDef<StudentFeeStructureRow>,
  yearNo: {
    field: "courseYearNo",
    headerName: "Course Year No.",
    minWidth: 120,
  } as ColDef<StudentFeeStructureRow>,
  gross: {
    field: "grossAmount",
    headerName: "Gross Amt",
    minWidth: 100,
  } as ColDef<StudentFeeStructureRow>,
  discount: {
    field: "discountAmount",
    headerName: "Discount Amt",
    minWidth: 110,
  } as ColDef<StudentFeeStructureRow>,
  lateFee: {
    field: "fineAmount",
    headerName: "LateFee",
    minWidth: 90,
  } as ColDef<StudentFeeStructureRow>,
  net: {
    field: "netAmount",
    headerName: "Net Amt",
    minWidth: 90,
  } as ColDef<StudentFeeStructureRow>,
  paid: {
    field: "paidAmount",
    headerName: "Paid Amt",
    minWidth: 90,
  } as ColDef<StudentFeeStructureRow>,
  balance: {
    field: "balanceAmount",
    headerName: "Balance Due",
    minWidth: 110,
  } as ColDef<StudentFeeStructureRow>,
  feeDetails: {
    headerName: "Fee Details",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<StudentFeeStructureRow>,
  status: {
    headerName: "Status",
    minWidth: 100,
    flex: 0,
    width: 110,
  } as ColDef<StudentFeeStructureRow>,
};

function toOptions(
  rows: Array<Record<string, unknown>>,
  valueKey: string,
  labelKeys: string[],
) {
  return rows
    .map((r) => {
      const value = Number(r[valueKey] ?? 0);
      if (!value) return null;
      let label = "";
      for (const k of labelKeys) {
        if (r[k] != null && String(r[k]).trim() !== "") {
          label = String(r[k]);
          break;
        }
      }
      return { value: String(value), label: label || String(value) };
    })
    .filter((o): o is { value: string; label: string } => o != null);
}

function yearNoOf(
  rows: Array<Record<string, unknown>>,
  courseYearId: number,
): number {
  const row = rows.find((r) => Number(r.courseYearId ?? 0) === courseYearId);
  return Number(row?.yearNo ?? row?.courseYearNo ?? 0);
}

function existingIsActive(row: StudentFeeStructureRow): boolean {
  return Boolean(row.isActive ?? row.feeStudentDataDTO?.isActive ?? true);
}

function courseCellRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.courseYearName ?? "")}
      {row.academicYear ? (
        <>
          {" "}
          (
          <span className="font-medium text-blue-600">
            {String(row.academicYear)}
          </span>
          )
        </>
      ) : null}
    </span>
  );
}

export default function AllocateStructureToStudentPage() {
  const queryClient = useQueryClient();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);

  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [feeStructureId, setFeeStructureId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStructure[]>([]);
  const [saving, setSaving] = useState(false);

  const [ayConfirmOpen, setAyConfirmOpen] = useState(false);
  const [pendingAddDraft, setPendingAddDraft] =
    useState<PendingStructure | null>(null);

  const [particularsOpen, setParticularsOpen] = useState(false);
  const [particularsRows, setParticularsRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [particularsLoading, setParticularsLoading] = useState(false);

  const [feeDetailsRow, setFeeDetailsRow] =
    useState<StudentFeeStructureRow | null>(null);

  const [statusRow, setStatusRow] = useState<StudentFeeStructureRow | null>(
    null,
  );
  const [statusActive, setStatusActive] = useState(true);
  const [statusReason, setStatusReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["AllocateStructure", "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const selectedCollege = useMemo(
    () => colleges.find((c) => String(c.collegeId) === collegeId) ?? null,
    [colleges, collegeId],
  );
  const universityId = Number(selectedCollege?.universityId ?? 0);
  const collegeNum = Number(collegeId ?? 0);
  const courseNum = Number(courseId ?? 0);
  const courseGroupNum = Number(courseGroupId ?? 0);
  const studentNum = Number(studentId ?? 0);
  const studentCourseId = Number(selectedStudent?.courseId ?? courseNum ?? 0);
  const studentCourseGroupId = Number(
    selectedStudent?.courseGroupId ?? courseGroupNum ?? 0,
  );
  const studentQuotaId = Number(selectedStudent?.quotaId ?? 0);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["AllocateStructure", "courses", universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  });

  const { data: courseGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["AllocateStructure", "courseGroups", courseNum],
    queryFn: () => listCourseGroupsByCourse(courseNum),
    enabled: courseNum > 0,
  });

  const { data: academicYears = [], isLoading: loadingAy } = useQuery({
    queryKey: ["AllocateStructure", "academicYears", universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  });

  const { data: courseYears = [], isLoading: loadingCourseYears } = useQuery({
    queryKey: ["AllocateStructure", "courseYears", studentCourseId],
    queryFn: () => listCourseYearsForFeeCollection(studentCourseId),
    enabled: studentCourseId > 0 && studentNum > 0,
  });

  const ayNum = Number(academicYearId ?? 0);
  const cyNum = Number(courseYearId ?? 0);

  const { data: feeStructures = [], isLoading: loadingStructures } = useQuery({
    queryKey: QK.feesCollection.allocateStructures({
      courseGroupId: studentCourseGroupId,
      courseYearId: cyNum,
      quotaId: studentQuotaId,
      academicYearId: ayNum,
    }),
    queryFn: () =>
      listFeeStructuresForStudentCourseYear({
        courseGroupId: studentCourseGroupId,
        courseYearId: cyNum,
        quotaId: studentQuotaId,
        academicYearId: ayNum,
      }),
    enabled:
      studentCourseGroupId > 0 && cyNum > 0 && studentQuotaId > 0 && ayNum > 0,
  });

  const existingQuery = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () =>
      listStudentFeeStructuresByStudent(studentNum, { status: null }),
    enabled: studentNum > 0,
  });

  const existingRows = useMemo((): StudentFeeStructureRow[] => {
    const rows = existingQuery.data ?? [];
    return rows.map((r) => ({
      ...r,
      isActive: existingIsActive(r),
      structureName: r.structureName ?? r.classGroupName,
    }));
  }, [existingQuery.data]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c: College) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName || String(c.collegeId),
      })),
    [colleges],
  );
  const courseOptions = useMemo(
    () =>
      toOptions(courses as Array<Record<string, unknown>>, "courseId", [
        "courseCode",
        "courseName",
      ]),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      toOptions(
        courseGroups as Array<Record<string, unknown>>,
        "courseGroupId",
        ["groupCode", "courseGroupName", "courseGroupCode"],
      ),
    [courseGroups],
  );
  const ayOptions = useMemo(
    () =>
      toOptions(
        academicYears as Array<Record<string, unknown>>,
        "academicYearId",
        ["academicYear"],
      ),
    [academicYears],
  );
  const courseYearOptions = useMemo(
    () =>
      toOptions(courseYears as Array<Record<string, unknown>>, "courseYearId", [
        "courseYearName",
        "yearName",
      ]),
    [courseYears],
  );
  const feeStructureOptions = useMemo(
    () =>
      toOptions(
        feeStructures as Array<Record<string, unknown>>,
        "feeStructureId",
        ["classGroupName", "structureName"],
      ),
    [feeStructures],
  );

  const handleStudentChange = useCallback(
    (id: string | null, student: StudentFeeSearchRow | null) => {
      setStudentId(id);
      setSelectedStudent(student);
      setCourseYearId(null);
      setAcademicYearId(null);
      setFeeStructureId(null);
      setPending([]);
    },
    [],
  );

  function buildDraft(): PendingStructure | null {
    if (
      !collegeNum ||
      !studentNum ||
      !courseYearId ||
      !academicYearId ||
      !feeStructureId
    ) {
      toastInfo("Please fill Course Year, Academic Year and Fee Structure.");
      return null;
    }
    if (!studentCourseGroupId) {
      toastInfo("Selected student has no course group.");
      return null;
    }
    const cyRows = courseYears as Array<Record<string, unknown>>;
    const cy = cyRows.find((r) => String(r.courseYearId) === courseYearId);
    const ay = (academicYears as Array<Record<string, unknown>>).find(
      (r) => String(r.academicYearId) === academicYearId,
    );
    const fs = (feeStructures as Array<Record<string, unknown>>).find(
      (r) => String(r.feeStructureId) === feeStructureId,
    );
    const yearNo = yearNoOf(cyRows, Number(courseYearId));
    return {
      collegeId: collegeNum,
      courseYearName: String(cy?.courseYearName ?? cy?.yearName ?? ""),
      academicYear: String(ay?.academicYear ?? ""),
      feeStructureName: String(fs?.classGroupName ?? fs?.structureName ?? ""),
      studentId: studentNum,
      courseGroupId: studentCourseGroupId,
      courseYearId: Number(courseYearId),
      academicYearId: Number(academicYearId),
      isManual: true,
      feeStructureId: Number(feeStructureId),
      yearNo,
    };
  }

  function clearStructureForm() {
    setCourseYearId(null);
    setAcademicYearId(null);
    setFeeStructureId(null);
  }

  function pushPending(draft: PendingStructure) {
    setPending((prev) => [...prev, draft]);
    clearStructureForm();
  }

  function onAdd() {
    const draft = buildDraft();
    if (!draft) return;

    // Angular: getYearNo(x.courseYearId) === yearNo && x.isActive
    const activeSameCourseYear = existingRows.some((r) => {
      if (!existingIsActive(r)) return false;
      const existingYearNo = Number(r.courseYearNo ?? 0);
      if (existingYearNo > 0) return existingYearNo === draft.yearNo;
      return Number(r.courseYearId ?? 0) === draft.courseYearId;
    });
    if (activeSameCourseYear) {
      toastInfo("Fee structure is already exists for this course year.");
      return;
    }

    const sameAy = existingRows.some(
      (r) => Number(r.academicYearId ?? 0) === draft.academicYearId,
    );
    if (sameAy) {
      setPendingAddDraft(draft);
      setAyConfirmOpen(true);
      return;
    }
    pushPending(draft);
  }

  async function onSave() {
    if (pending.length === 0) {
      toastInfo("No records added in the list.");
      return;
    }
    setSaving(true);
    try {
      await mapFeeStructureToStudents(pending);
      toastSuccess("Fee structure allocated successfully.");
      setPending([]);
      await queryClient.invalidateQueries({
        queryKey: QK.feesCollection.studentStructures(studentNum),
      });
    } catch (e) {
      toastError(e, "Failed to allocate fee structure");
    } finally {
      setSaving(false);
    }
  }

  async function viewParticulars(row: PendingStructure) {
    setParticularsOpen(true);
    setParticularsLoading(true);
    setParticularsRows([]);
    try {
      const rows = await listFeeStructureParticularsForPayment(
        row.feeStructureId,
      );
      setParticularsRows(rows);
    } catch (e) {
      toastError(e, "Failed to load particulars");
    } finally {
      setParticularsLoading(false);
    }
  }

  function openStatus(row: StudentFeeStructureRow) {
    if (Number(row.paidAmount ?? 0) > 0) {
      toastInfo("Status cannot be changed, as already fees has been paid.");
      return;
    }
    const dto = (row.feeStudentDataDTO ?? {}) as {
      isActive?: boolean;
      reason?: string;
    };
    setStatusRow(row);
    setStatusActive(Boolean(dto.isActive ?? row.isActive ?? true));
    setStatusReason(String(dto.reason ?? ""));
  }

  async function saveStatus() {
    const dto = (statusRow?.feeStudentDataDTO ?? {}) as Record<string, unknown>;
    const feeStdDataId = Number(
      dto.feeStdDataId ?? statusRow?.feeStdDataId ?? 0,
    );
    if (!feeStdDataId) {
      toastInfo("Unable to update status — missing fee student data id.");
      return;
    }
    setStatusSaving(true);
    try {
      await updateFeeStudentDataStatus(feeStdDataId, {
        ...dto,
        isActive: statusActive,
        reason: statusReason,
      });
      toastSuccess("Status updated successfully.");
      setStatusRow(null);
      await queryClient.invalidateQueries({
        queryKey: QK.feesCollection.studentStructures(studentNum),
      });
    } catch (e) {
      toastError(e, "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  const pendingColumnDefs = useMemo<ColDef<PendingStructure>[]>(
    () => [
      PENDING_COLS.siNo,
      PENDING_COLS.courseYear,
      PENDING_COLS.academicYear,
      PENDING_COLS.feeStructure,
      {
        ...PENDING_COLS.actions,
        cellRenderer: (p: ICellRendererParams<PendingStructure>) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="View Particulars"
              onClick={() => p.data && void viewParticulars(p.data)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600"
              title="Delete Particular"
              onClick={() => {
                const idx = p.node?.rowIndex;
                if (idx == null || idx < 0) return;
                setPending((prev) => prev.filter((_, i) => i !== idx));
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const existingColumnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      EXISTING_COLS.structure,
      { ...EXISTING_COLS.course, cellRenderer: courseCellRenderer },
      EXISTING_COLS.yearNo,
      EXISTING_COLS.gross,
      EXISTING_COLS.discount,
      EXISTING_COLS.lateFee,
      EXISTING_COLS.net,
      EXISTING_COLS.paid,
      EXISTING_COLS.balance,
      {
        ...EXISTING_COLS.feeDetails,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            type="button"
            size="sm"
            className="h-7 bg-[#00b8ff] px-2 text-[11px] text-white hover:bg-[#00a6e6]"
            onClick={() => p.data && setFeeDetailsRow(p.data)}
          >
            View
          </Button>
        ),
      },
      {
        ...EXISTING_COLS.status,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => {
          const active = existingIsActive(p.data ?? {});
          return (
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => p.data && openStatus(p.data)}
            >
              <StatusBadge status={active} />
            </button>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <FilteredPage
        title="Allocate Structure To Student"
        filters={
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => {
                  setCollegeId(v);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setStudentId(null);
                  setSelectedStudent(null);
                  setPending([]);
                  clearStructureForm();
                }}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                isLoading={loadingColleges}
              />
              <Select
                label="Course"
                value={courseId}
                onChange={(v) => {
                  setCourseId(v);
                  setCourseGroupId(null);
                  setStudentId(null);
                  setSelectedStudent(null);
                  setPending([]);
                  clearStructureForm();
                }}
                options={courseOptions}
                placeholder="Select"
                searchable
                clearable
                disabled={!collegeId}
                isLoading={loadingCourses}
              />
              <Select
                label="Course Group"
                value={courseGroupId}
                onChange={(v) => {
                  setCourseGroupId(v);
                  setStudentId(null);
                  setSelectedStudent(null);
                  setPending([]);
                  clearStructureForm();
                }}
                options={groupOptions}
                placeholder="Select"
                searchable
                clearable
                disabled={!courseId}
                isLoading={loadingGroups}
              />
              <FeeStudentSearchSelect
                value={studentId}
                selectedStudent={selectedStudent}
                onChange={handleStudentChange}
                collegeId={collegeNum > 0 ? collegeNum : null}
                courseId={courseNum > 0 ? courseNum : null}
                courseGroupId={courseGroupNum > 0 ? courseGroupNum : null}
                disabled={!collegeId}
              />
            </div>
            {selectedStudent ? (
              <FeeStudentProfileCard student={selectedStudent} />
            ) : null}
          </div>
        }
        body={
          selectedStudent ? (
            <div className="space-y-6 px-1 pb-2">
              <div className="space-y-3 rounded-md border border-sky-200 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" />
                  Add Fee Structure
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5 lg:items-end">
                  <Select
                    label="Course Year"
                    required
                    value={courseYearId}
                    onChange={(v) => {
                      setCourseYearId(v);
                      setAcademicYearId(null);
                      setFeeStructureId(null);
                    }}
                    options={courseYearOptions}
                    placeholder="Select course year"
                    searchable
                    isLoading={loadingCourseYears}
                  />
                  <Select
                    label="Academic Year"
                    required
                    value={academicYearId}
                    onChange={(v) => {
                      setAcademicYearId(v);
                      setFeeStructureId(null);
                    }}
                    options={ayOptions}
                    placeholder="Select academic year"
                    searchable
                    disabled={!courseYearId}
                    isLoading={loadingAy}
                  />
                  <Select
                    label="Fee Structure"
                    required
                    value={feeStructureId}
                    onChange={setFeeStructureId}
                    options={feeStructureOptions}
                    placeholder="Select fee structure"
                    searchable
                    disabled={!academicYearId}
                    isLoading={loadingStructures}
                  />
                  <Button
                    type="button"
                    className="h-9 bg-[#f0c040] text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
                    onClick={onAdd}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    className="h-9 bg-[#f0c040] text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
                    disabled={saving || pending.length === 0}
                    onClick={() => void onSave()}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {pending.length > 0 ? (
                  <DataTable
                    title=""
                    rowData={pending}
                    columnDefs={pendingColumnDefs}
                    height="auto"
                    pagination={false}
                    toolbar={{ search: false }}
                    getRowId={(p) =>
                      `${p.data?.feeStructureId}-${p.data?.courseYearId}-${p.data?.academicYearId}-${p.data?.studentId}`
                    }
                  />
                ) : null}
              </div>

              {existingRows.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">
                    Existing Fee Structures
                  </h3>
                  <DataTable
                    title=""
                    rowData={existingRows}
                    columnDefs={existingColumnDefs}
                    loading={existingQuery.isLoading}
                    height="auto"
                    pagination
                    toolbar={{ search: true, searchPlaceholder: "Search" }}
                    getRowId={(p) =>
                      String(
                        (
                          p.data?.feeStudentDataDTO as
                            | { feeStdDataId?: number }
                            | undefined
                        )?.feeStdDataId ??
                          [
                            p.data?.feeStructureId,
                            p.data?.academicYearId,
                            p.data?.courseYearNo,
                            p.data?.studentId,
                          ].join("-"),
                      )
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={ayConfirmOpen}
        title="Confirmation"
        headerIcon={<BookOpen className="h-4 w-4" />}
        description="Already fee structure is allocated with same academic year, still want to continue ?"
        confirmLabel="Ok"
        cancelLabel="Close"
        confirmFirst
        confirmVariant="default"
        onCancel={() => {
          setAyConfirmOpen(false);
          setPendingAddDraft(null);
        }}
        onConfirm={() => {
          if (pendingAddDraft) pushPending(pendingAddDraft);
          setAyConfirmOpen(false);
          setPendingAddDraft(null);
        }}
      />

      <FormModal
        open={particularsOpen}
        onClose={() => setParticularsOpen(false)}
        title="Fee Structure Particulars"
        onSubmit={(e) => {
          e.preventDefault();
          setParticularsOpen(false);
        }}
        submitLabel="Ok"
        cancelLabel="Close"
        size="lg"
        isSubmitting={particularsLoading}
      >
        {particularsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : particularsRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No particulars found.</p>
        ) : (
          <div className="max-h-[50vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-2">SI.No</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Particular</th>
                  <th className="py-2 pr-2">Fee Amount</th>
                  <th className="py-2">Lateral Fee</th>
                </tr>
              </thead>
              <tbody>
                {particularsRows.map((r, i) => (
                  <tr
                    key={String(r.feeStructureParticularId ?? i)}
                    className="border-b border-muted/40"
                  >
                    <td className="py-1.5 pr-2">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      {String(r.categoryName ?? "—")}
                    </td>
                    <td className="py-1.5 pr-2">
                      {String(r.particularsName ?? "—")}
                    </td>
                    <td className="py-1.5 pr-2">
                      {String(r.feeAmount ?? r.amount ?? "—")}
                    </td>
                    <td className="py-1.5">
                      {String(r.lateralFeeAmount ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormModal>

      <FeeDetailsModal
        open={Boolean(feeDetailsRow)}
        onClose={() => setFeeDetailsRow(null)}
        row={feeDetailsRow}
        student={selectedStudent}
        collegeCode={selectedCollege?.collegeCode}
        collegeId={collegeNum}
      />

      <FormModal
        open={statusRow != null}
        onClose={() => {
          if (statusSaving) return;
          setStatusRow(null);
        }}
        title="Change Status"
        onSubmit={(e) => {
          e.preventDefault();
          void saveStatus();
        }}
        submitLabel="Save"
        cancelLabel="Close"
        size="lg"
        isSubmitting={statusSaving}
      >
        {statusRow ? (
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5 rounded-md border p-3">
              <p>
                <span className="text-muted-foreground">Student</span>
                {" : "}
                <span className="font-medium">
                  {String(
                    statusRow.firstName ?? selectedStudent?.firstName ?? "—",
                  )}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  (
                  {String(
                    statusRow.rollNumber ?? selectedStudent?.rollNumber ?? "—",
                  )}
                  )
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Fee Structure</span>
                {" : "}
                <span className="font-medium">
                  {String(
                    statusRow.structureName ?? statusRow.classGroupName ?? "—",
                  )}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Course</span>
                {" : "}
                <span className="font-medium">
                  {[
                    statusRow.courseName ?? selectedStudent?.courseCode,
                    statusRow.groupName ?? selectedStudent?.groupCode,
                    statusRow.courseYearName,
                    statusRow.section ? `section - ${statusRow.section}` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
                {statusRow.academicYear ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({String(statusRow.academicYear)})
                  </span>
                ) : null}
              </p>
              <p>
                <span className="text-muted-foreground">Course Year No</span>
                {" : "}
                <span className="font-medium">
                  {String(statusRow.courseYearNo ?? "—")}
                </span>
              </p>
              <div className="overflow-auto pt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 pr-2">Gross Amt</th>
                      <th className="py-1 pr-2">Discount Amt</th>
                      <th className="py-1 pr-2">LateFee</th>
                      <th className="py-1 pr-2">Net Amt</th>
                      <th className="py-1 pr-2">Paid Amt</th>
                      <th className="py-1">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 pr-2">
                        {String(statusRow.grossAmount ?? "—")}
                      </td>
                      <td className="py-1 pr-2">
                        {String(statusRow.discountAmount ?? "—")}
                      </td>
                      <td className="py-1 pr-2">
                        {String(statusRow.fineAmount ?? "—")}
                      </td>
                      <td className="py-1 pr-2">
                        {String(statusRow.netAmount ?? "—")}
                      </td>
                      <td className="py-1 pr-2">
                        {String(statusRow.paidAmount ?? "—")}
                      </td>
                      <td className="py-1">
                        {String(statusRow.balanceAmount ?? "—")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={statusActive}
                onCheckedChange={(v) => setStatusActive(v === true)}
              />
              <span>Active</span>
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="structure-status-reason">Reason</Label>
              <Input
                id="structure-status-reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Reason"
              />
            </div>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
