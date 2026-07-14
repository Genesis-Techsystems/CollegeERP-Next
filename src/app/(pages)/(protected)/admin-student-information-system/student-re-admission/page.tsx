"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import defaultStudent from "@/assets/images/avatars/default_Student.png";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Badge } from "@/components/ui/badge";
import { toastError } from "@/lib/toast";
import {
  listActiveOrganizations,
  listCollegesByOrganization,
  listDetainedStudentsForReadmission,
} from "@/services";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const value = Number(row[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function studentId(row: AnyRow, fallback: number): number {
  return (
    pickNum(row, ["studentId", "fk_student_id", "student_id", "id"]) || fallback
  );
}

function studentDetailsLine(row: AnyRow): string {
  return [
    pickText(row, ["collegeCode"]),
    pickText(row, ["courseCode"]),
    pickText(row, ["groupCode"]),
    pickText(row, ["courseYearName"]),
    pickText(row, ["section", "sectionName"]),
  ]
    .filter((text) => text.trim().length > 0)
    .join(" | ");
}

function studentSearchText(row: AnyRow): string {
  const admissionNo =
    pickText(row, ["admissionNumber", "hallticketNumber", "rollNumber"]) || "-";
  const studentName = pickText(row, ["firstName", "studentName"]) || "-";
  return [
    admissionNo,
    studentName,
    studentDetailsLine(row),
    pickText(row, ["mobile", "mobileNumber"]),
  ]
    .filter(Boolean)
    .join(" ");
}

function mapOrganizationOptions(rows: AnyRow[]) {
  return rows.map((row) => ({
    value: String(pickNum(row, ["organizationId", "fk_organization_id"])),
    label:
      pickText(row, ["orgCode", "organizationCode", "organizationName"]) ||
      "Organization",
  }));
}

function mapCollegeOptions(rows: AnyRow[]) {
  return rows.map((row) => ({
    value: String(pickNum(row, ["collegeId", "fk_college_id"])),
    label:
      pickText(row, ["collegeCode", "college_code", "collegeName"]) ||
      "College",
  }));
}

function photoRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <img
      src={row.studentPhotoPath || defaultStudent.src}
      alt="Student"
      className="my-1.5 h-10 w-10 rounded-md border object-cover"
      onError={(e) => {
        e.currentTarget.src = defaultStudent.src;
      }}
    />
  );
}

function studentInfoRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const admissionNo =
    pickText(row, ["admissionNumber", "hallticketNumber", "rollNumber"]) || "-";
  const studentName = pickText(row, ["firstName", "studentName"]) || "-";
  return (
    <div className="leading-snug py-2">
      <div className="font-medium text-slate-900">
        {admissionNo}, {studentName}
      </div>
      <div className="text-slate-600">{studentDetailsLine(row) || "-"}</div>
      <div className="text-slate-600">
        {pickText(row, ["mobile", "mobileNumber"]) || "-"}
      </div>
    </div>
  );
}

function makeActionsRenderer(onOpen: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const studentName =
      pickText(row, ["firstName", "studentName"]) || "student";
    return (
      <div className="py-2">
        <button
          type="button"
          onClick={() => onOpen(row)}
          className="inline-flex"
          aria-label={`Open re-admission for ${studentName}`}
        >
          <Badge
            variant="outline"
            className="cursor-pointer border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
          >
            Re-Admission
          </Badge>
        </button>
      </div>
    );
  };
}

export default function StudentReadmissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [organizations, setOrganizations] = useState<AnyRow[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    number | null
  >(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(
    null,
  );
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    async function loadOrganizations() {
      setLoadingOrgs(true);
      try {
        const rows = await listActiveOrganizations();
        setOrganizations(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setOrganizations([]);
        toastError(error, "Failed to load organizations");
      } finally {
        setLoadingOrgs(false);
      }
    }
    void loadOrganizations();
  }, []);

  useEffect(() => {
    if (organizations.length === 0) return;
    const qOrgId = Number(searchParams.get("organizationId") ?? 0);
    const validOrgId =
      qOrgId > 0 &&
      organizations.some((row) => pickNum(row, ["organizationId"]) === qOrgId)
        ? qOrgId
        : pickNum(organizations[0], ["organizationId"]);
    if (validOrgId > 0 && selectedOrganizationId !== validOrgId) {
      setSelectedOrganizationId(validOrgId);
    }
  }, [organizations, searchParams, selectedOrganizationId]);

  useEffect(() => {
    async function loadColleges() {
      if (!selectedOrganizationId) {
        setColleges([]);
        setSelectedCollegeId(null);
        return;
      }
      setLoadingColleges(true);
      try {
        const rows = await listCollegesByOrganization(selectedOrganizationId);
        setColleges(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setColleges([]);
        toastError(error, "Failed to load colleges");
      } finally {
        setLoadingColleges(false);
      }
    }
    void loadColleges();
  }, [selectedOrganizationId]);

  useEffect(() => {
    if (colleges.length === 0) {
      setSelectedCollegeId(null);
      return;
    }
    const qCollegeId = Number(searchParams.get("collegeId") ?? 0);
    const validCollegeId =
      qCollegeId > 0 &&
      colleges.some((row) => pickNum(row, ["collegeId"]) === qCollegeId)
        ? qCollegeId
        : pickNum(colleges[0], ["collegeId"]);
    if (validCollegeId > 0 && selectedCollegeId !== validCollegeId) {
      setSelectedCollegeId(validCollegeId);
    }
  }, [colleges, searchParams, selectedCollegeId]);

  useEffect(() => {
    async function loadStudents() {
      if (!selectedCollegeId) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const rows =
          await listDetainedStudentsForReadmission(selectedCollegeId);
        setStudents(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setStudents([]);
        toastError(error, "Failed to load detained students");
      } finally {
        setLoadingStudents(false);
      }
    }
    void loadStudents();
  }, [selectedCollegeId]);

  function openReadmission(row: AnyRow) {
    const sid = studentId(row, 0);
    if (!sid) return;
    const universityId = pickNum(row, ["universityId", "fk_university_id"]);
    const collegeFromRow = pickNum(row, [
      "collegeId",
      "fk_college_id",
      "college_id",
    ]);
    const params = new URLSearchParams({ studentId: String(sid) });
    if (universityId > 0) params.set("universityId", String(universityId));
    if (selectedOrganizationId && selectedOrganizationId > 0) {
      params.set("organizationId", String(selectedOrganizationId));
    }
    const collegeForUrl = collegeFromRow || (selectedCollegeId ?? 0);
    if (collegeForUrl > 0) params.set("collegeId", String(collegeForUrl));
    router.push(
      `/admin-student-information-system/readmission-application?${params.toString()}`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Photo",
        width: 80,
        flex: 0,
        sortable: false,
        autoHeight: true,
        cellRenderer: photoRenderer,
        cellClass: "flex items-center",
      },
      {
        headerName: "Student",
        minWidth: 280,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => studentSearchText(p.data ?? {}),
        cellRenderer: studentInfoRenderer,
      },
      {
        headerName: "Actions",
        width: 140,
        flex: 0,
        sortable: false,
        autoHeight: true,
        cellRenderer: makeActionsRenderer(openReadmission),
        cellClass: "flex items-center",
      },
    ],
    // openReadmission closes over selectedOrganizationId / selectedCollegeId
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedOrganizationId, selectedCollegeId],
  );

  return (
    <FilteredListPage
      title="Student Re-Admission"
      filters={
        <GlobalFilterBarRow columns={2}>
          <GlobalFilterField label="Organization">
            <Select
              value={
                selectedOrganizationId ? String(selectedOrganizationId) : null
              }
              onChange={(v) => setSelectedOrganizationId(v ? Number(v) : null)}
              options={mapOrganizationOptions(organizations)}
              placeholder="Select Organization"
              isLoading={loadingOrgs}
              className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
            />
          </GlobalFilterField>
          <GlobalFilterField label="College">
            <Select
              value={selectedCollegeId ? String(selectedCollegeId) : null}
              onChange={(v) => setSelectedCollegeId(v ? Number(v) : null)}
              options={mapCollegeOptions(colleges)}
              placeholder="Select College"
              isLoading={loadingColleges}
              disabled={!selectedOrganizationId}
              className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={students}
      columnDefs={columnDefs}
      loading={loadingStudents}
      pagination
      toolbar={SEARCH_ONLY_TOOLBAR}
    />
  );
}
