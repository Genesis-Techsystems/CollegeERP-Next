"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getFeePaylinkCollegeFilters,
  listBatchesByCourse,
  listFeeDueNotifications,
  sendFeeDueNotifications,
} from "@/services";
import type { FeeDueNotificationRow } from "@/types/fees-collection";
import {
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "../../fee-masters/_lib/fee-master-filters";

const ALL = { value: "0", label: "All" };

function gmOptions(rows: FilterRow[], gmId: number) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === gmId)
    .map((r) => ({
      value: String(r.pk_gd_id ?? r.generalDetailId ?? ""),
      label: String(r.gd_name ?? r.generalDetailDisplayName ?? r.gd_code ?? ""),
    }))
    .filter((o) => o.value && o.value !== "0");
}

export default function GeneratePaylinkPage() {
  const router = useRouter();
  const { user } = useSession();

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [quotaId, setQuotaId] = useState<number>(0);
  const [batchId, setBatchId] = useState<number>(0);
  const [studentStatusId, setStudentStatusId] = useState<number>(0);

  const [batches, setBatches] = useState<{ value: string; label: string }[]>([
    ALL,
  ]);
  const [rows, setRows] = useState<FeeDueNotificationRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const empId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);
    if (!orgId) return;

    let cancelled = false;
    async function load() {
      setLoadingFilters(true);
      try {
        const { filtersData: fd, generalDetails } =
          await getFeePaylinkCollegeFilters(orgId, empId);
        if (cancelled) return;
        setFiltersData(fd);
        setGmRows(generalDetails as FilterRow[]);

        const colleges = filterColleges(fd);
        const firstCollege = pickNum(colleges[0], [
          "fk_college_id",
          "collegeId",
        ]);
        if (firstCollege) {
          applyCollege(firstCollege, fd);
        }
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load filters");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, user?.employeeId]);

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );
  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );
  const groupOptions = useMemo(
    () => [
      ALL,
      ...filterCourseGroups(filtersData, collegeId, courseId).map(
        courseGroupOption,
      ),
    ],
    [filtersData, collegeId, courseId],
  );
  const yearOptions = useMemo(
    () => [
      ALL,
      ...filterCourseYears(
        filtersData,
        collegeId,
        courseId,
        courseGroupId || null,
      ).map(courseYearOption),
    ],
    [filtersData, collegeId, courseId, courseGroupId],
  );
  const quotaOptions = useMemo(() => [ALL, ...gmOptions(gmRows, 8)], [gmRows]);
  const statusOptions = useMemo(
    () => [ALL, ...gmOptions(gmRows, 51)],
    [gmRows],
  );

  const applyCollege = useCallback(
    (nextCollegeId: number, source: FilterRow[]) => {
      setCollegeId(nextCollegeId);
      setCourseId(null);
      setCourseGroupId(0);
      setCourseYearId(0);
      setQuotaId(0);
      setBatchId(0);
      setStudentStatusId(0);
      setRows([]);
      setBatches([ALL]);

      const courses = filterCourses(source, nextCollegeId);
      const firstCourse = pickNum(courses[0], ["fk_course_id", "courseId"]);
      if (!firstCourse) return;
      setCourseId(firstCourse);

      const groups = filterCourseGroups(source, nextCollegeId, firstCourse);
      const firstGroup = pickNum(groups[0], [
        "fk_course_group_id",
        "courseGroupId",
      ]);
      setCourseGroupId(firstGroup || 0);

      const years = filterCourseYears(
        source,
        nextCollegeId,
        firstCourse,
        firstGroup || null,
      );
      const firstYear = pickNum(years[0], [
        "fk_course_year_id",
        "courseYearId",
      ]);
      setCourseYearId(firstYear || 0);

      void loadBatches(firstCourse);
    },
    [],
  );

  async function loadBatches(crsId: number) {
    if (!crsId) {
      setBatches([ALL]);
      return;
    }
    try {
      const list = await listBatchesByCourse(crsId);
      setBatches([
        ALL,
        ...(list ?? []).map((b) => ({
          value: String(b.batchId),
          label: String(b.batchName ?? b.batchId),
        })),
      ]);
    } catch {
      setBatches([ALL]);
    }
  }

  function onCollegeChange(value: string | null) {
    const next = value ? Number(value) : null;
    if (!next) {
      setCollegeId(null);
      setCourseId(null);
      setCourseGroupId(0);
      setCourseYearId(0);
      setRows([]);
      return;
    }
    applyCollege(next, filtersData);
  }

  function onCourseChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCourseId(next);
    setCourseGroupId(0);
    setCourseYearId(0);
    setBatchId(0);
    setRows([]);
    if (!next || !collegeId) return;
    const groups = filterCourseGroups(filtersData, collegeId, next);
    const firstGroup = pickNum(groups[0], [
      "fk_course_group_id",
      "courseGroupId",
    ]);
    setCourseGroupId(firstGroup || 0);
    const years = filterCourseYears(
      filtersData,
      collegeId,
      next,
      firstGroup || null,
    );
    setCourseYearId(
      pickNum(years[0], ["fk_course_year_id", "courseYearId"]) || 0,
    );
    void loadBatches(next);
  }

  function onGroupChange(value: string | null) {
    const next = value ? Number(value) : 0;
    setCourseGroupId(next);
    setCourseYearId(0);
    setRows([]);
    if (!collegeId || !courseId) return;
    const years = filterCourseYears(
      filtersData,
      collegeId,
      courseId,
      next || null,
    );
    setCourseYearId(
      pickNum(years[0], ["fk_course_year_id", "courseYearId"]) || 0,
    );
  }

  async function getDueList() {
    if (!collegeId || !courseId) {
      toastError("Select Faculty and Course");
      return;
    }
    setLoadingList(true);
    try {
      const data = await listFeeDueNotifications({
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        quotaId: quotaId || 0,
        batchId: batchId || 0,
        studentStatusId: studentStatusId || 0,
      });
      setRows(Array.isArray(data) ? data : []);
      if (!data?.length) toastSuccess("No due records found");
    } catch (err) {
      setRows([]);
      toastError(err, "Failed to load due list");
    } finally {
      setLoadingList(false);
    }
  }

  async function sendOne(row: FeeDueNotificationRow) {
    const id = Number(row.pk_fee_stdduepayment_id ?? 0);
    if (!id) return;
    setSendingId(id);
    try {
      await sendFeeDueNotifications([id]);
      toastSuccess("Notification sent");
      await getDueList();
    } catch (err) {
      toastError(err, "Failed to send notification");
    } finally {
      setSendingId(null);
    }
  }

  async function sendAll() {
    const ids = rows
      .filter((r) => !r.is_sms_sent)
      .map((r) => Number(r.pk_fee_stdduepayment_id ?? 0))
      .filter((id) => id > 0);
    if (ids.length === 0) {
      toastError("No pending notifications to send");
      return;
    }
    setSendingAll(true);
    try {
      await sendFeeDueNotifications(ids);
      toastSuccess("Notifications sent");
      await getDueList();
    } catch (err) {
      toastError(err, "Failed to send notifications");
    } finally {
      setSendingAll(false);
    }
  }

  const columnDefs = useMemo<ColDef<FeeDueNotificationRow>[]>(
    () => [
      { headerName: "S.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Student",
        minWidth: 220,
        valueGetter: (p) => {
          const name = pickText(p.data ?? {}, ["first_name", "firstName"]);
          const ht = pickText(p.data ?? {}, [
            "hallticket_number",
            "hallticketNumber",
          ]);
          return ht ? `${name} (${ht})` : name || "—";
        },
      },
      {
        headerName: "Academic Details",
        minWidth: 220,
        valueGetter: (p) =>
          [
            pickText(p.data ?? {}, ["structure_name", "structureName"]),
            pickText(p.data ?? {}, ["group_code", "groupCode"]),
            pickText(p.data ?? {}, ["fee_due_year", "feeDueYear"]),
          ]
            .filter(Boolean)
            .join(" / ") || "—",
      },
      {
        headerName: "Balance Due",
        minWidth: 110,
        valueGetter: (p) => {
          const n = Number(p.data?.due_amount ?? p.data?.dueAmount ?? 0);
          return Number.isFinite(n) ? n.toFixed(2) : "—";
        },
      },
      {
        headerName: "Actions",
        minWidth: 160,
        width: 160,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<FeeDueNotificationRow>) => {
          const row = p.data;
          if (!row) return null;
          if (row.is_sms_sent) {
            return (
              <span className="text-xs text-muted-foreground">Email Sent</span>
            );
          }
          const id = Number(row.pk_fee_stdduepayment_id ?? 0);
          return (
            <Button
              size="sm"
              className="h-7"
              disabled={sendingId === id || sendingAll}
              onClick={() => void sendOne(row)}
            >
              Send Notification
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendingId, sendingAll],
  );

  return (
    <FilteredListPage
      title="Generate Pay Link"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField label="Faculty">
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="Select faculty"
                searchable
                isLoading={loadingFilters}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course">
              <Select
                value={courseId ? String(courseId) : null}
                onChange={onCourseChange}
                options={courseOptions}
                placeholder="Select course"
                searchable
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Branch">
              <Select
                value={String(courseGroupId)}
                onChange={onGroupChange}
                options={groupOptions}
                placeholder="All"
                searchable
                disabled={!courseId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Semester">
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  setCourseYearId(v ? Number(v) : 0);
                  setRows([]);
                }}
                options={yearOptions}
                placeholder="All"
                searchable
                disabled={!courseId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Quota">
              <Select
                value={String(quotaId)}
                onChange={(v) => {
                  setQuotaId(v ? Number(v) : 0);
                  setRows([]);
                }}
                options={quotaOptions}
                placeholder="All"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Batch">
              <Select
                value={String(batchId)}
                onChange={(v) => {
                  setBatchId(v ? Number(v) : 0);
                  setRows([]);
                }}
                options={batches}
                placeholder="All"
                searchable
                disabled={!courseId}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Student Status">
              <Select
                value={String(studentStatusId)}
                onChange={(v) => {
                  setStudentStatusId(v ? Number(v) : 0);
                  setRows([]);
                }}
                options={statusOptions}
                placeholder="All"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=" "
              className="global-filter-field--action"
            >
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void getDueList()}
                  disabled={loadingList}
                >
                  Get Due List
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => router.back()}
                >
                  Back
                </Button>
              </div>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Generate Pay Link",
      }}
      toolbarTrailing={
        rows.length > 0 ? (
          <Button
            size="sm"
            disabled={sendingAll}
            onClick={() => void sendAll()}
          >
            Send Notification
          </Button>
        ) : undefined
      }
    />
  );
}
