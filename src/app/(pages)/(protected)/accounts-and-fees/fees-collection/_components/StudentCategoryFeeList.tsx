"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import { listStudentFeeStructuresByStudent } from "@/services";
import type {
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import {
  buildPayFeesSearchParams,
  studentFromPayQueryParams,
} from "../_lib/pay-fees-params";
import { FeeStudentProfileCard } from "./FeeStudentProfileCard";
import { FeeStudentSearchSelect } from "./FeeStudentSearchSelect";

function enrichStudentFromStructure(
  student: StudentFeeSearchRow,
  row?: StudentFeeStructureRow | null,
): StudentFeeSearchRow {
  if (!row) return student;
  return {
    ...student,
    collegeId:
      student.collegeId || Number(row.collegeId ?? 0) || student.collegeId,
    firstName: student.firstName ?? row.firstName,
    academicYear: student.academicYear ?? row.academicYear,
    courseCode:
      student.courseCode ??
      (row.courseName as string | undefined) ??
      (row.courseCode as string | undefined),
    groupCode:
      student.groupCode ??
      row.groupName ??
      (row.groupCode as string | undefined),
    courseYearName: student.courseYearName ?? row.courseYearName,
    section: student.section ?? row.section,
    rollNumber: student.rollNumber ?? (row.rollNumber as string | undefined),
    hallticketNumber:
      student.hallticketNumber ??
      (row.hallticketNumber as string | undefined) ??
      (row.hallTicketNo as string | undefined),
  };
}

function statusRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const bal = Number(p.data?.balanceAmount ?? 0);
  return (
    <span
      className={
        bal > 0 ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"
      }
    >
      {bal > 0 ? "Due" : "Paid"}
    </span>
  );
}

function makePayRenderer(
  onPay: (row: StudentFeeStructureRow) => void,
  label: string,
) {
  return (p: ICellRendererParams<StudentFeeStructureRow>) => (
    <Button
      type="button"
      size="sm"
      variant="default"
      onClick={() => p.data && onPay(p.data)}
    >
      {label}
    </Button>
  );
}

export type StudentCategoryFeeListProps = {
  title: string;
  payPage: string;
  payColumnHeader?: string;
  backHref?: string;
};

/**
 * Reusable fee-collection list via FilteredListPage (filters + table in one card).
 * Used by bus-fee-payment and hostel-fee-payment.
 */
export function StudentCategoryFeeList({
  title,
  payPage,
  payColumnHeader = "Pay Details",
  backHref,
}: StudentCategoryFeeListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const [studentId, setStudentId] = useState<string | null>(
    searchParams.get("studentId"),
  );
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(() => studentFromPayQueryParams(qs));

  const studentNum = Number(studentId ?? 0);

  const { data: feeRows = [], isLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: async () => {
      const rows = await listStudentFeeStructuresByStudent(studentNum);
      return rows.map((r) => ({
        ...r,
        isActive: r.isActive ?? r.feeStudentDataDTO?.isActive ?? true,
      }));
    },
    enabled: studentNum > 0,
  });

  const handleStudentChange = useCallback(
    (id: string | null, student: StudentFeeSearchRow | null) => {
      setStudentId(id);
      setSelectedStudent(student);
    },
    [],
  );

  const enrichedStudent = useMemo(() => {
    if (!selectedStudent || feeRows.length === 0) return selectedStudent;
    return enrichStudentFromStructure(selectedStudent, feeRows[0]);
  }, [selectedStudent, feeRows]);

  const handlePay = useCallback(
    (row: StudentFeeStructureRow) => {
      const student =
        enrichedStudent ??
        selectedStudent ??
        studentFromPayQueryParams(new URLSearchParams(searchParams.toString()));
      if (!student) {
        toastInfo("Select a student before paying.");
        return;
      }
      const enriched = enrichStudentFromStructure(student, row);
      if (!enriched.collegeId) {
        toastInfo(
          "College is missing for this student. Re-search and select the student again.",
        );
        return;
      }
      if (!row.academicYearId || !row.feeStructureId) {
        toastInfo("Fee structure details are incomplete for this row.");
        return;
      }
      const params = buildPayFeesSearchParams(enriched, row, payPage);
      router.push(
        `/accounts-and-fees/fees-collection/payment/pay-fees?${params}`,
      );
    },
    [enrichedStudent, selectedStudent, searchParams, payPage, router],
  );

  const columnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: "structureName",
        headerName: "Structure",
        minWidth: 160,
        valueGetter: (p) =>
          p.data?.structureName ?? p.data?.classGroupName ?? "",
      },
      {
        headerName: "Course",
        minWidth: 180,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) return "";
          const year = row.courseYearName ?? "";
          const ay = row.academicYear ? ` (${row.academicYear})` : "";
          return `${year}${ay}`;
        },
      },
      { headerName: "Status", minWidth: 90, cellRenderer: statusRenderer },
      {
        headerName: payColumnHeader,
        minWidth: 120,
        flex: 0,
        width: 130,
        cellRenderer: makePayRenderer(handlePay, payColumnHeader),
      },
    ],
    [handlePay, payColumnHeader],
  );

  return (
    <FilteredListPage
      title={title}
      filters={
        <div className="space-y-4">
          <div className="grid max-w-xl grid-cols-1 gap-4">
            <FeeStudentSearchSelect
              value={studentId}
              selectedStudent={selectedStudent}
              onChange={handleStudentChange}
              searchParams={qs}
            />
          </div>
          {enrichedStudent && studentNum > 0 ? (
            <FeeStudentProfileCard student={enrichedStudent} />
          ) : null}
        </div>
      }
      rowData={studentNum > 0 ? feeRows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      height="auto"
      pagination
      toolbar={{ search: true, searchPlaceholder: "Search fee structures…" }}
      toolbarTrailing={
        backHref ? (
          <Button
            type="button"
            className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
        ) : undefined
      }
    />
  );
}
