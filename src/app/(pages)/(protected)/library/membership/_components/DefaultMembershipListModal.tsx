"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import {
  listCollegesForLibrary,
  listEmployeesWithoutLibraryMembership,
  listStudentsWithoutLibraryMembership,
} from "@/services";
import type { LibraryMembership } from "@/types/library";
import { LIBRARY_MODAL_TITLE_CLASS } from "../../_lib/modal-styles";

type MemberKind = "S" | "E";

interface DefaultMembershipListModalProps {
  open: boolean;
  kind: MemberKind;
  onClose: () => void;
}

export function DefaultMembershipListModal({
  open,
  kind,
  onClose,
}: Readonly<DefaultMembershipListModalProps>) {
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [requestedCollegeId, setRequestedCollegeId] = useState<string | null>(
    null,
  );

  const collegesQuery = useQuery({
    queryKey: ["Library", "membership-default-colleges"],
    queryFn: () => listCollegesForLibrary(),
    enabled: open,
  });
  const rowsQuery = useQuery({
    queryKey: ["Library", "membership-default-list", kind, requestedCollegeId],
    queryFn: () =>
      kind === "S"
        ? listStudentsWithoutLibraryMembership(Number(requestedCollegeId))
        : listEmployeesWithoutLibraryMembership(Number(requestedCollegeId)),
    enabled: open && Number(requestedCollegeId) > 0,
  });

  const collegeOptions = (collegesQuery.data ?? []).map((college) => ({
    value: String(college.collegeId),
    label: String(
      college.collegeCode ?? college.collegeName ?? college.collegeId,
    ),
  }));
  const rows = rowsQuery.data ?? [];

  const columnDefs = useMemo<ColDef<LibraryMembership>[]>(
    () => [
      {
        field: "memberName",
        headerName: kind === "S" ? "Student Name" : "Employee Name",
        minWidth: 180,
        valueGetter: (params) =>
          String(params.data?.memberName ?? params.data?.firstName ?? ""),
      },
      {
        headerName: kind === "S" ? "Course" : "Department",
        minWidth: 180,
        valueGetter: (params) =>
          kind === "S"
            ? [
                params.data?.courseCode,
                params.data?.groupCode,
                params.data?.courseYearName,
              ]
                .filter(Boolean)
                .join(" / ")
            : String(params.data?.empDeptName ?? ""),
      },
    ],
    [kind],
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={kind === "S" ? "Students List" : "Employee List"}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      size="lg"
      submitLabel="Close"
      showCancelButton={false}
      showCloseButton
      onSubmit={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select
            label="College"
            required
            value={collegeId}
            onChange={(value) => {
              setCollegeId(value);
              setRequestedCollegeId(null);
            }}
            options={collegeOptions}
            placeholder="Select college"
            isLoading={collegesQuery.isFetching}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!collegeId}
          onClick={() => setRequestedCollegeId(collegeId)}
        >
          Get List
        </Button>
      </div>
      {rows.length > 0 ? (
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={rowsQuery.isFetching}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Student Name / RollNumber",
            exportExcel: false,
            exportPdf: false,
            columnPicker: false,
          }}
        />
      ) : null}
    </FormModal>
  );
}
