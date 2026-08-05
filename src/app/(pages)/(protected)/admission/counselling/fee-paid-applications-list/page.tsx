"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { resolveOrganizationId } from "@/lib/user-context";
import { rowIndexGetter } from "@/lib/utils";
import { getAdmissionUnivFilters, listFeePaidApplications } from "@/services";
import type { FeePaidApplicationRow } from "@/types/admission";
import {
  collegeOption,
  courseGroupOption,
  filterCollegesByUniversity,
  filterCourseGroupsByUniversityCollegeAndCourse,
  filterCoursesByUniversityAndCollege,
  filterUniversities,
  pickNum,
  pickText,
  type FilterRow,
} from "../../_lib/admission-filters";

const UNI = ["fk_university_id", "universityId", "Universities.universityId"];
const CRS = ["fk_course_id", "courseId"];
const ALL_APP = "All";

/** Angular filter dropdowns show codes only (e.g. GUG, BCOM) — not names. */
function universityCodeOption(row: FilterRow) {
  const id = pickNum(row, UNI);
  return {
    value: String(id),
    label: pickText(row, ["university_code", "universityCode"]) || String(id),
  };
}

function courseCodeOption(row: FilterRow) {
  const id = pickNum(row, CRS);
  return {
    value: String(id),
    label: pickText(row, ["course_code", "courseCode"]) || String(id),
  };
}

type ListParams = {
  universityId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  applicationNo: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeePaidApplicationRow>,
  university_code: {
    field: "university_code",
    headerName: "University",
    minWidth: 90,
  } as ColDef<FeePaidApplicationRow>,
  college_code: {
    field: "college_code",
    headerName: "College",
    minWidth: 90,
  } as ColDef<FeePaidApplicationRow>,
  course_code: {
    field: "course_code",
    headerName: "Course",
    minWidth: 90,
  } as ColDef<FeePaidApplicationRow>,
  group_code: {
    field: "group_code",
    headerName: "Group",
    minWidth: 80,
  } as ColDef<FeePaidApplicationRow>,
  application_no: {
    field: "application_no",
    headerName: "App No",
    minWidth: 110,
  } as ColDef<FeePaidApplicationRow>,
  first_name: {
    field: "first_name",
    headerName: "Name",
    minWidth: 130,
    flex: 1,
  } as ColDef<FeePaidApplicationRow>,
  mobile: {
    field: "mobile",
    headerName: "Mobile",
    minWidth: 110,
    flex: 0,
  } as ColDef<FeePaidApplicationRow>,
  payment_status: {
    field: "payment_status",
    headerName: "Payment",
    minWidth: 100,
  } as ColDef<FeePaidApplicationRow>,
  amount: {
    field: "amount",
    headerName: "Amount",
    minWidth: 90,
    flex: 0,
  } as ColDef<FeePaidApplicationRow>,
};

export default function FeePaidApplicationsListPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const orgId = resolveOrganizationId(user) || 1;
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [universityId, setUniversityId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [applicationNo, setApplicationNo] = useState(ALL_APP);
  const [applied, setApplied] = useState<ListParams | null>(null);
  const [appNoChoices, setAppNoChoices] = useState<string[]>([]);

  const filtersEnabled =
    !sessionLoading && !empResolving && orgId > 0 && empId > 0;

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: filtersEnabled,
  });

  const filtersData = filterBundle?.filtersData ?? [];

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityCodeOption),
    [filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterCollegesByUniversity(
        filtersData,
        universityId ? Number(universityId) : null,
      ).map(collegeOption),
    [filtersData, universityId],
  );

  const courseOptions = useMemo(
    () =>
      filterCoursesByUniversityAndCollege(
        filtersData,
        universityId ? Number(universityId) : null,
        collegeId ? Number(collegeId) : null,
      ).map(courseCodeOption),
    [filtersData, universityId, collegeId],
  );

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroupsByUniversityCollegeAndCourse(
        filtersData,
        universityId ? Number(universityId) : null,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
      ).map(courseGroupOption),
    [filtersData, universityId, collegeId, courseId],
  );

  const applicationNoOptions = useMemo(
    () => [
      { value: ALL_APP, label: ALL_APP },
      ...appNoChoices.map((no) => ({ value: no, label: no })),
    ],
    [appNoChoices],
  );

  // Angular defaults: select first option in each cascade filter.
  useEffect(() => {
    if (universityId || universityOptions.length === 0) return;
    setUniversityId(universityOptions[0]?.value ?? null);
  }, [universityId, universityOptions]);

  useEffect(() => {
    if (!universityId || collegeOptions.length === 0) return;
    if (collegeId && collegeOptions.some((o) => o.value === collegeId)) return;
    setCollegeId(collegeOptions[0]?.value ?? null);
  }, [universityId, collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId || courseOptions.length === 0) return;
    if (courseId && courseOptions.some((o) => o.value === courseId)) return;
    setCourseId(courseOptions[0]?.value ?? null);
  }, [collegeId, courseId, courseOptions]);

  useEffect(() => {
    if (!courseId || courseGroupOptions.length === 0) return;
    if (
      courseGroupId &&
      courseGroupOptions.some((o) => o.value === courseGroupId)
    )
      return;
    setCourseGroupId(courseGroupOptions[0]?.value ?? null);
  }, [courseId, courseGroupId, courseGroupOptions]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.admission.feePaidApplications(applied ?? {}),
    queryFn: () => listFeePaidApplications(applied!),
    enabled: Boolean(applied),
  });

  // After Get List (All), seed ApplicationNo options from result codes.
  useEffect(() => {
    if (!applied || isLoading || applied.applicationNo) return;
    const unique = Array.from(
      new Set(
        rows.map((r) => String(r.application_no ?? "").trim()).filter(Boolean),
      ),
    ).sort();
    setAppNoChoices(unique);
  }, [applied, isLoading, rows]);

  const columnDefs = useMemo(() => Object.values(COL_DEFS), []);
  const showTable = Boolean(applied);

  function clearAppliedList() {
    setApplied(null);
    setAppNoChoices([]);
    setApplicationNo(ALL_APP);
  }

  function onGetList() {
    if (!universityId || !collegeId || !courseId || !courseGroupId) {
      toastError("Please select University, College, Course and Course Group");
      return;
    }
    setApplied({
      universityId: Number(universityId),
      collegeId: Number(collegeId),
      courseId: Number(courseId),
      courseGroupId: Number(courseGroupId),
      applicationNo: applicationNo === ALL_APP ? "" : applicationNo,
    });
  }

  return (
    <FilteredListPage
      title="Fee Paid Applications List"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="University *">
            <Select
              value={universityId}
              onChange={(v) => {
                setUniversityId(v);
                setCollegeId(null);
                setCourseId(null);
                setCourseGroupId(null);
                clearAppliedList();
              }}
              options={universityOptions}
              isLoading={filtersLoading}
              searchable
              placeholder="Select"
            />
          </GlobalFilterField>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setCourseId(null);
                setCourseGroupId(null);
                clearAppliedList();
              }}
              options={collegeOptions}
              searchable
              placeholder="Select"
              disabled={!universityId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course *">
            <Select
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                setCourseGroupId(null);
                clearAppliedList();
              }}
              options={courseOptions}
              searchable
              placeholder="Select"
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group *">
            <Select
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v);
                clearAppliedList();
              }}
              options={courseGroupOptions}
              searchable
              placeholder="Select"
              disabled={!courseId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Student ApplicationNo">
            <Select
              value={applicationNo}
              onChange={(v) => setApplicationNo(v ?? ALL_APP)}
              options={applicationNoOptions}
              searchable
              placeholder={ALL_APP}
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action">
            <Button
              size="sm"
              onClick={onGetList}
              disabled={filtersLoading || isLoading}
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={showTable ? rows : []}
      columnDefs={showTable ? columnDefs : undefined}
      body={!showTable ? null : undefined}
      loading={showTable && isLoading}
      pagination={showTable}
      toolbar={
        showTable
          ? {
              search: true,
              searchPlaceholder: "Search fee paid applications…",
              pdfDocumentTitle: "Fee Paid Applications List",
            }
          : undefined
      }
    />
  );
}
