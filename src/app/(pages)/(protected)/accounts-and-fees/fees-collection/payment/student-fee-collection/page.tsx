"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsForCollege,
  listCourseGroupsByCourse,
  listCoursesByUniversity,
  listCourseYearsForFeeCollection,
  listFeeCollectionQuotaOptions,
  listStudentFeeDue,
} from "@/services";
import type { StudentFeeDueRow } from "@/types/fees-collection";

function amt(v: unknown): string {
  if (v == null || v === "") return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

function makePayRenderer(onPay: (row: StudentFeeDueRow) => void) {
  return (p: ICellRendererParams<StudentFeeDueRow>) => (
    <Button
      type="button"
      size="sm"
      className="h-[30px] bg-[#f44336] px-4 text-[12px] font-medium text-white hover:bg-[#d32f2f]"
      onClick={() => p.data && onPay(p.data)}
    >
      Pay
    </Button>
  );
}

/**
 * Angular `payment/student-fee-collection` → `StudentFeeCollectionComponent`.
 * Filter by college/year/quota/course → due list → Pay → pay-fees.
 */
function StudentFeeCollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collegeId, setCollegeId] = useState<string | null>(
    searchParams.get("collegeId"),
  );
  const [academicYearId, setAcademicYearId] = useState<string | null>(
    searchParams.get("academicYearId") || null,
  );
  const [quotaId, setQuotaId] = useState<string | null>(
    searchParams.get("quotaId") || null,
  );
  const [courseId, setCourseId] = useState<string | null>(
    searchParams.get("courseId") || null,
  );
  const [courseGroupId, setCourseGroupId] = useState<string | null>(
    searchParams.get("courseGroupId") || null,
  );
  const [courseYearId, setCourseYearId] = useState<string | null>(
    searchParams.get("courseYearId") || null,
  );

  const [page, setPage] = useState(0);
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const pageSize = 50;

  const collegeNum = Number(collegeId ?? 0);
  const yearNum = Number(academicYearId ?? 0) || null;
  const quotaNum = Number(quotaId ?? 0) || null;
  const courseNum = Number(courseId ?? 0) || null;
  const groupNum = Number(courseGroupId ?? 0) || null;
  const courseYearNum = Number(courseYearId ?? 0) || null;

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["FeesCollection", "studentFeeCollection", "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const { data: quotas = [], isLoading: loadingQuotas } = useQuery({
    queryKey: ["FeesCollection", "studentFeeCollection", "quotas"],
    queryFn: listFeeCollectionQuotaOptions,
  });

  const selectedCollege = useMemo(
    () => colleges.find((c) => String(c.collegeId) === collegeId) ?? null,
    [colleges, collegeId],
  );
  const universityId = Number(selectedCollege?.universityId ?? 0);

  const { data: academicYears = [], isLoading: loadingYears } = useQuery({
    queryKey: QK.feesCollection.studentDue({
      collegeId: collegeNum,
      kind: "years",
    }),
    queryFn: () => listAcademicYearsForCollege(collegeNum),
    enabled: collegeNum > 0,
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: QK.feesCollection.studentDue({ universityId, kind: "courses" }),
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  });

  const { data: courseGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: QK.feesCollection.studentDue({
      courseId: courseNum,
      kind: "groups",
    }),
    queryFn: () => listCourseGroupsByCourse(courseNum ?? 0),
    enabled: Boolean(courseNum),
  });

  const { data: courseYears = [], isLoading: loadingCourseYears } = useQuery({
    queryKey: QK.feesCollection.studentDue({
      courseId: courseNum,
      kind: "yearsByCourse",
    }),
    queryFn: () => listCourseYearsForFeeCollection(courseNum ?? 0),
    enabled: Boolean(courseNum) && Boolean(groupNum),
  });

  const dueFilters = useMemo(
    () => ({
      collegeId: collegeNum,
      academicYearId: yearNum,
      courseId: courseNum,
      courseGroupId: groupNum,
      courseYearId: courseYearNum,
      quotaId: quotaNum,
      page,
      size: pageSize,
    }),
    [collegeNum, yearNum, courseNum, groupNum, courseYearNum, quotaNum, page],
  );

  const {
    data: dueResult,
    isLoading: loadingDue,
    isFetching: fetchingDue,
    refetch,
  } = useQuery({
    queryKey: QK.feesCollection.studentDue(dueFilters),
    queryFn: () => listStudentFeeDue(dueFilters),
    enabled: fetchEnabled && collegeNum > 0,
  });

  const rows = dueResult?.rows ?? [];
  const totalCount = dueResult?.totalCount ?? 0;

  // Restore filters from query params (return from pay-fees) and auto-load.
  useEffect(() => {
    if (!searchParams.get("collegeId")) return;
    if (collegeNum > 0) setFetchEnabled(true);
  }, [searchParams, collegeNum]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  );

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...academicYears.map((y) => ({
        value: String(y.academicYearId),
        label: String(y.academicYear ?? y.academicYearId),
      })),
    ],
    [academicYears],
  );

  const quotaOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...quotas.map((q) => ({
        value: String(q.generalDetailId),
        label: String(
          q.generalDetailDisplayName ??
            q.generalDetailName ??
            q.generalDetailCode ??
            q.generalDetailId,
        ),
      })),
    ],
    [quotas],
  );

  const courseOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...courses.map((c) => ({
        value: String(c.courseId),
        label: String(c.courseCode ?? c.courseName ?? c.courseId),
      })),
    ],
    [courses],
  );

  const groupOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...courseGroups.map((g) => ({
        value: String(g.courseGroupId),
        label: String(g.groupCode ?? g.groupName ?? g.courseGroupId),
      })),
    ],
    [courseGroups],
  );

  const courseYearOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...courseYears.map((y) => ({
        value: String(y.courseYearId),
        label: String(y.courseYearName ?? y.courseYearId),
      })),
    ],
    [courseYears],
  );

  function clearDue() {
    setFetchEnabled(false);
    setPage(0);
  }

  function handleCollegeChange(v: string | null) {
    setCollegeId(v);
    setAcademicYearId(null);
    setQuotaId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    clearDue();
  }

  function handleCourseChange(v: string | null) {
    setCourseId(v || null);
    setCourseGroupId(null);
    setCourseYearId(null);
    clearDue();
  }

  function handleGroupChange(v: string | null) {
    setCourseGroupId(v || null);
    setCourseYearId(null);
    clearDue();
  }

  async function getDueList() {
    if (!collegeNum) {
      toastError(new Error("College is required"), "Select college");
      return;
    }
    setPage(0);
    setFetchEnabled(true);
    try {
      await refetch();
    } catch (e) {
      toastError(e, "Failed to load due list");
    }
  }

  const onPay = useCallback(
    (row: StudentFeeDueRow) => {
      const params = new URLSearchParams({
        collegeId: String(collegeNum),
        studentId: String(row.studentId ?? ""),
        page: "student-fee-collection",
      });
      if (yearNum) params.set("academicYearId", String(yearNum));
      if (row.academicYear)
        params.set("academicYear", String(row.academicYear));
      if (quotaNum) params.set("quotaId", String(quotaNum));
      if (courseNum) params.set("courseId", String(courseNum));
      if (groupNum) params.set("courseGroupId", String(groupNum));
      if (courseYearNum) params.set("courseYearId", String(courseYearNum));
      if (row.feeStructureId)
        params.set("feeStructureId", String(row.feeStructureId));
      if (row.quotaName) params.set("quotaDisplayName", String(row.quotaName));
      if (selectedCollege?.collegeCode) {
        params.set("collegeCode", String(selectedCollege.collegeCode));
      }
      if (row.isLateral != null) params.set("isLateral", String(row.isLateral));
      if (row.rollNumber) params.set("rollNumber", String(row.rollNumber));
      if (row.hallticketNumber)
        params.set("hallTicketNo", String(row.hallticketNumber));
      if (row.courseName) params.set("courseCode", String(row.courseName));
      if (row.groupName ?? row.groupCode) {
        params.set("groupCode", String(row.groupName ?? row.groupCode));
      }
      if (row.courseYearName)
        params.set("courseYearName", String(row.courseYearName));
      if (row.section) params.set("section", String(row.section));
      if (row.firstName) params.set("firstName", String(row.firstName));
      if (row.structureName)
        params.set("structureName", String(row.structureName));

      router.push(
        `/accounts-and-fees/fees-collection/payment/pay-fees?${params.toString()}`,
      );
    },
    [
      collegeNum,
      yearNum,
      quotaNum,
      courseNum,
      groupNum,
      courseYearNum,
      selectedCollege,
      router,
    ],
  );

  const columnDefs = useMemo<ColDef<StudentFeeDueRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => page * pageSize + (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      {
        headerName: "HT No.",
        minWidth: 120,
        valueGetter: (p) =>
          p.data?.hallticketNumber ?? p.data?.rollNumber ?? "—",
      },
      {
        headerName: "Student",
        minWidth: 160,
        valueGetter: (p) => p.data?.firstName ?? "—",
      },
      {
        headerName: "Course",
        minWidth: 280,
        valueGetter: (p) => {
          const r = p.data;
          if (!r) return "—";
          const path = [
            r.courseName,
            r.groupCode ?? r.groupName,
            r.courseYearName,
            r.section != null && r.section !== "" ? `section ${r.section}` : "",
          ]
            .filter(Boolean)
            .join(" / ");
          return r.academicYear ? `${path} (${r.academicYear})` : path || "—";
        },
        cellRenderer: (p: ICellRendererParams<StudentFeeDueRow>) => {
          const r = p.data;
          if (!r) return null;
          const path = [
            r.courseName,
            r.groupCode ?? r.groupName,
            r.courseYearName,
            r.section != null && r.section !== "" ? `section ${r.section}` : "",
          ]
            .filter(Boolean)
            .join(" / ");
          return (
            <span>
              {path}
              {r.academicYear ? (
                <>
                  {" "}
                  (
                  <span className="font-medium text-blue-600">
                    {r.academicYear}
                  </span>
                  )
                </>
              ) : null}
            </span>
          );
        },
      },
      {
        headerName: "Gross Amt",
        minWidth: 100,
        valueGetter: (p) => amt(p.data?.grossAmount),
      },
      {
        headerName: "Dis Amt",
        minWidth: 90,
        valueGetter: (p) => amt(p.data?.discountAmount),
      },
      {
        headerName: "LateFee",
        minWidth: 90,
        valueGetter: (p) => amt(p.data?.fineAmount),
      },
      {
        headerName: "Net Amt",
        minWidth: 90,
        valueGetter: (p) => amt(p.data?.netAmount),
      },
      {
        headerName: "Paid Amt",
        minWidth: 90,
        valueGetter: (p) => amt(p.data?.paidAmount),
      },
      {
        headerName: "Bal Amt",
        minWidth: 90,
        valueGetter: (p) => amt(p.data?.balanceAmount),
      },
      {
        headerName: "Actions",
        width: 100,
        flex: 0,
        cellRenderer: makePayRenderer(onPay),
      },
    ],
    [onPay, page],
  );

  return (
    <FilteredListPage
      title="Student Fee Collection"
      filters={
        <div className="space-y-3">
          <div className="grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={handleCollegeChange}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingColleges}
            />
            <Select
              label="Academic Year"
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v || null);
                clearDue();
              }}
              options={yearOptions}
              placeholder="Select"
              searchable
              disabled={!collegeId}
              isLoading={loadingYears}
              clearable
            />
            <Select
              label="Quota"
              value={quotaId}
              onChange={(v) => {
                setQuotaId(v || null);
                clearDue();
              }}
              options={quotaOptions}
              placeholder="Select"
              searchable
              isLoading={loadingQuotas}
              clearable
            />
            <Select
              label="Course"
              value={courseId}
              onChange={handleCourseChange}
              options={courseOptions}
              placeholder="Select"
              searchable
              disabled={!collegeId}
              isLoading={loadingCourses}
              clearable
            />
            <Select
              label="Course Group"
              value={courseGroupId}
              onChange={handleGroupChange}
              options={groupOptions}
              placeholder="Select"
              searchable
              disabled={!courseId}
              isLoading={loadingGroups}
              clearable
            />
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v || null);
                clearDue();
              }}
              options={courseYearOptions}
              placeholder="Select"
              searchable
              disabled={!courseGroupId}
              isLoading={loadingCourseYears}
              clearable
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="h-9 w-full"
                disabled={!collegeId}
                onClick={() => void getDueList()}
              >
                Get Due List
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={fetchEnabled ? rows : []}
      columnDefs={columnDefs}
      loading={fetchEnabled && (loadingDue || fetchingDue)}
      height="auto"
      pagination
      serverSide
      totalCount={totalCount}
      currentPage={page}
      paginationPageSize={pageSize}
      onPageChange={(nextPage) => {
        setPage(nextPage);
        setFetchEnabled(true);
      }}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
      }}
    />
  );
}

export default function StudentFeeCollectionPage() {
  return (
    <Suspense fallback={null}>
      <StudentFeeCollectionContent />
    </Suspense>
  );
}
