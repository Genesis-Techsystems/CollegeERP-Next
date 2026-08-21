"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import {
  listCollegesForLibrary,
  listEmployeesWithoutLibraryMembership,
  listLibrariesByCollege,
  listStudentsWithoutLibraryMembership,
} from "@/services";
import { toastError } from "@/lib/toast";
import type { LibraryMembership } from "@/types/library";
import { LIBRARY_MODAL_TITLE_CLASS } from "../../_lib/modal-styles";
import { useLibraryQueryErrorToast } from "../../_hooks/use-library-query-error-toast";

type MemberKind = "S" | "E";

interface DefaultMembershipListModalProps {
  open: boolean;
  kind: MemberKind;
  libraryId?: number | null;
  onClose: () => void;
}

export function DefaultMembershipListModal({
  open,
  kind,
  libraryId = null,
  onClose,
}: Readonly<DefaultMembershipListModalProps>) {
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null,
  );
  const [requestedCollegeId, setRequestedCollegeId] = useState<string | null>(
    null,
  );
  const [requestedLibraryId, setRequestedLibraryId] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setSelectedLibraryId(libraryId && libraryId > 0 ? String(libraryId) : null);
    setRequestedCollegeId(null);
    setRequestedLibraryId(0);
  }, [open, libraryId]);

  const collegesQuery = useQuery({
    queryKey: ["Library", "membership-default-colleges"],
    queryFn: () => listCollegesForLibrary(),
    enabled: open,
  });

  const collegeNum = Number(collegeId) || 0;
  const librariesQuery = useQuery({
    queryKey: ["Library", "membership-default-libraries", collegeNum],
    queryFn: () => listLibrariesByCollege(collegeNum),
    enabled: open && kind === "S" && collegeNum > 0,
  });

  const rowsQuery = useQuery({
    queryKey: [
      "Library",
      "membership-default-list",
      kind,
      requestedCollegeId,
      requestedLibraryId,
    ],
    queryFn: () =>
      kind === "S"
        ? listStudentsWithoutLibraryMembership(
            Number(requestedCollegeId),
            requestedLibraryId,
          )
        : listEmployeesWithoutLibraryMembership(Number(requestedCollegeId)),
    enabled: open && Number(requestedCollegeId) > 0,
    retry: false,
  });
  useLibraryQueryErrorToast(rowsQuery.isError, rowsQuery.error);

  const collegeOptions = (collegesQuery.data ?? []).map((college) => ({
    value: String(college.collegeId),
    label: String(
      college.collegeCode ?? college.collegeName ?? college.collegeId,
    ),
  }));
  const libraryOptions = (librariesQuery.data ?? []).map((library) => ({
    value: String(library.libraryId),
    label: String(
      library.libraryCode ?? library.libraryName ?? library.libraryId,
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

  function handleGetList() {
    if (!collegeId) return;
    if (kind === "S" && !selectedLibraryId) {
      toastError("Library is required");
      return;
    }
    setRequestedCollegeId(collegeId);
    setRequestedLibraryId(Number(selectedLibraryId) || 0);
  }

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
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <Select
            label="College"
            required
            value={collegeId}
            onChange={(value) => {
              setCollegeId(value);
              setSelectedLibraryId(null);
              setRequestedCollegeId(null);
              setRequestedLibraryId(0);
            }}
            options={collegeOptions}
            placeholder="Select college"
            isLoading={collegesQuery.isFetching}
          />
        </div>
        {kind === "S" ? (
          <div className="min-w-[160px] flex-1">
            <Select
              label="Library"
              required
              value={selectedLibraryId}
              onChange={(value) => {
                setSelectedLibraryId(value);
                setRequestedCollegeId(null);
                setRequestedLibraryId(0);
              }}
              options={libraryOptions}
              placeholder="Select library"
              isLoading={librariesQuery.isFetching}
              disabled={!collegeId}
            />
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!collegeId || (kind === "S" && !selectedLibraryId)}
          onClick={handleGetList}
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
