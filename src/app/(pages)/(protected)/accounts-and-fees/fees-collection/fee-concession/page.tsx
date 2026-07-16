"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/hooks/useSession";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getFeeStudentData,
  listAcademicYearsForCollege,
  listColleges,
  listFeeConcessions,
  listStudentFeeStructuresByStudent,
  searchStudentsForFeeCollection,
} from "@/services";
import type { College } from "@/types/college";
import type {
  FeeConcessionRow,
  FeeStudentData,
  FeeStudentParticularRow,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import { FeeStudentProfileCard } from "../_components/FeeStudentProfileCard";
import { AddConcessionModal } from "./AddConcessionModal";

type Mode = "list" | "student";

const LIST_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeConcessionRow>,
  rollNo: {
    field: "studentRollNo",
    headerName: "Roll No.",
    minWidth: 120,
  } as ColDef<FeeConcessionRow>,
  student: {
    field: "studentFirstName",
    headerName: "Student",
    minWidth: 150,
  } as ColDef<FeeConcessionRow>,
  quota: {
    field: "quotaName",
    headerName: "Quota",
    minWidth: 100,
  } as ColDef<FeeConcessionRow>,
  course: {
    headerName: "Course",
    minWidth: 180,
    valueGetter: (p) => {
      const course = p.data?.studentCourseName ?? p.data?.course ?? "";
      const ay = p.data?.academicYear;
      return ay ? `${course} (${ay})` : course;
    },
  } as ColDef<FeeConcessionRow>,
  by: {
    headerName: "Institutional Scholarship By",
    minWidth: 160,
    valueGetter: (p) => p.data?.requestedEmployeeFirstName || "—",
  } as ColDef<FeeConcessionRow>,
  particular: {
    headerName: "Particular",
    minWidth: 140,
    valueGetter: (p) => p.data?.particularsName ?? p.data?.categoryName ?? "—",
  } as ColDef<FeeConcessionRow>,
  amount: {
    field: "value",
    headerName: "Amount",
    minWidth: 100,
  } as ColDef<FeeConcessionRow>,
};

export default function FeeConcessionPage() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("list");

  const [colleges, setColleges] = useState<College[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [academicYears, setAcademicYears] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [listRows, setListRows] = useState<FeeConcessionRow[]>([]);
  const [totalConcession, setTotalConcession] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [feeStudentData, setFeeStudentData] = useState<
    StudentFeeStructureRow[]
  >([]);
  const [loadingFeeData, setLoadingFeeData] = useState(false);

  const [concessionOpen, setConcessionOpen] = useState(false);
  const [concessionFeeRow, setConcessionFeeRow] =
    useState<StudentFeeStructureRow | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<FeeStudentData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingColleges(true);
      try {
        const rows = await listColleges();
        if (!cancelled)
          setColleges((rows ?? []).filter((c) => c.isActive !== false));
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load colleges");
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName || String(c.collegeId),
      })),
    [colleges],
  );

  const loadConcessionList = useCallback(
    async (cid: number, ayId: number) => {
      setLoadingList(true);
      try {
        const result = await listFeeConcessions({
          collegeId: cid,
          academicYearId: ayId,
          employeeId: Number(user?.employeeId ?? 0),
          page: 0,
          size: 200,
        });
        setListRows(result.rows);
        setTotalConcession(result.totalValue);
      } catch (err) {
        setListRows([]);
        setTotalConcession(0);
        toastError(err, "Failed to load institutional scholarship list");
      } finally {
        setLoadingList(false);
      }
    },
    [user?.employeeId],
  );

  const loadStudentFeeData = useCallback(async (sid: number) => {
    setLoadingFeeData(true);
    try {
      const rows = await listStudentFeeStructuresByStudent(sid);
      setFeeStudentData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setFeeStudentData([]);
      toastError(err, "Failed to load student fee data");
    } finally {
      setLoadingFeeData(false);
    }
  }, []);

  async function onCollegeChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCollegeId(next);
    setAcademicYearId(null);
    setListRows([]);
    setTotalConcession(0);
    setAcademicYears([]);
    if (!next) return;
    setLoadingYears(true);
    try {
      const years = await listAcademicYearsForCollege(next);
      setAcademicYears(
        (years ?? [])
          .map((y) => ({
            value: String(y.academicYearId ?? y.fk_academic_year_id ?? ""),
            label: String(
              y.academicYear ?? y.academic_year ?? y.academicYearId ?? "",
            ),
          }))
          .filter((o) => o.value && o.value !== "0"),
      );
    } catch (err) {
      toastError(err, "Failed to load academic years");
    } finally {
      setLoadingYears(false);
    }
  }

  function onAcademicYearChange(value: string | null) {
    const next = value ? Number(value) : null;
    setAcademicYearId(next);
    setListRows([]);
    setTotalConcession(0);
    if (next && collegeId) void loadConcessionList(collegeId, next);
  }

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudentRows([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsForFeeCollection(q);
      setStudentRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toastError(err, "Student search failed");
      setStudentRows([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  function onStudentSelect(
    nextId: number | null,
    student: StudentFeeSearchRow | null,
  ) {
    setStudentId(nextId);
    setSelectedStudent(student);
    if (!nextId) {
      setFeeStudentData([]);
      setStudentRows([]);
      return;
    }
    void loadStudentFeeData(nextId);
  }

  function onModeChange(next: Mode) {
    setMode(next);
    if (next === "list" && collegeId && academicYearId) {
      void loadConcessionList(collegeId, academicYearId);
    }
  }

  async function viewFeeDetails(row: StudentFeeStructureRow) {
    if (!selectedStudent) return;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsData(null);
    try {
      const data = await getFeeStudentData({
        collegeId: Number(selectedStudent.collegeId ?? 0),
        academicYearId: Number(row.academicYearId ?? 0),
        studentId: Number(selectedStudent.studentId ?? 0),
        feeStructureId: Number(row.feeStructureId ?? 0),
      });
      setDetailsData(data);
    } catch (err) {
      toastError(err, "Failed to load fee details");
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  }

  function openConcession(row: StudentFeeStructureRow) {
    setConcessionFeeRow(row);
    setConcessionOpen(true);
  }

  const listColumnDefs = useMemo<ColDef<FeeConcessionRow>[]>(
    () => [
      LIST_COL_DEFS.siNo,
      LIST_COL_DEFS.rollNo,
      LIST_COL_DEFS.student,
      LIST_COL_DEFS.quota,
      LIST_COL_DEFS.course,
      LIST_COL_DEFS.by,
      LIST_COL_DEFS.particular,
      LIST_COL_DEFS.amount,
    ],
    [],
  );

  const feeDataColumnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      {
        headerName: "Course Year",
        minWidth: 180,
        valueGetter: (p) => {
          const year =
            p.data?.courseYearNo != null
              ? `${p.data.courseYearNo} year`
              : (p.data?.courseYearName ?? "—");
          const ay = p.data?.academicYear;
          return ay ? `${year} (${ay})` : year;
        },
      },
      { field: "grossAmount", headerName: "Gross Amt", minWidth: 100 },
      { field: "discountAmount", headerName: "Discount Amt", minWidth: 110 },
      { field: "fineAmount", headerName: "LateFee", minWidth: 90 },
      { field: "netAmount", headerName: "Net Amt", minWidth: 100 },
      { field: "paidAmount", headerName: "Paid Amt", minWidth: 100 },
      { field: "balanceAmount", headerName: "Balance Due", minWidth: 110 },
      {
        headerName: "Fee Details",
        minWidth: 100,
        flex: 0,
        width: 110,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            size="sm"
            className="h-7 bg-sky-500 hover:bg-sky-600"
            onClick={() => p.data && void viewFeeDetails(p.data)}
          >
            View
          </Button>
        ),
      },
      {
        headerName: "Institutional Scholarship",
        minWidth: 170,
        flex: 0,
        width: 180,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            size="sm"
            variant="link"
            className="h-7 px-0 text-blue-600"
            onClick={() => p.data && openConcession(p.data)}
          >
            Institutional Scholarship
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers close over latest selectedStudent
    [selectedStudent],
  );

  const detailParticulars: FeeStudentParticularRow[] = Array.isArray(
    detailsData?.feeStudentDataParticulars,
  )
    ? detailsData!.feeStudentDataParticulars!
    : [];

  return (
    <FilteredPage
      title="Institutional Scholarship"
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as Mode)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="list" id="fc-list" />
              <Label htmlFor="fc-list">Institutional Scholarship List</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="student" id="fc-student" />
              <Label htmlFor="fc-student">Institutional Scholarship</Label>
            </div>
          </RadioGroup>

          {mode === "list" ? (
            <GlobalFilterBarRow>
              <GlobalFilterField label="College">
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={onCollegeChange}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  isLoading={loadingColleges}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Academic Year">
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={onAcademicYearChange}
                  options={academicYears}
                  placeholder="Select academic year"
                  searchable
                  disabled={!collegeId}
                  isLoading={loadingYears}
                />
              </GlobalFilterField>
            </GlobalFilterBarRow>
          ) : (
            <StudentSearchSelect
              label="Student"
              placeholder="Search by student name or roll no."
              value={studentId}
              students={studentRows}
              selectedStudent={selectedStudent}
              isLoading={studentSearchLoading}
              onSearch={(t) => void onStudentSearch(t)}
              onChange={(id, row) =>
                onStudentSelect(id, (row as StudentFeeSearchRow | null) ?? null)
              }
              className="max-w-xl"
            />
          )}
        </div>
      }
    >
      {mode === "list" && listRows.length > 0 ? (
        <DataTable
          title="Institutional Scholarship List"
          bordered
          rowData={listRows}
          columnDefs={listColumnDefs}
          loading={loadingList}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Search…",
            pdfDocumentTitle: "Institutional Scholarship",
          }}
          toolbarTrailing={
            <span className="text-sm font-medium text-foreground">
              Total Institutional Scholarship : {totalConcession}
            </span>
          }
        />
      ) : null}

      {mode === "student" && selectedStudent ? (
        <div className="space-y-4">
          <FeeStudentProfileCard student={selectedStudent} />
          {feeStudentData.length > 0 ? (
            <DataTable
              title="Student Fee Data"
              bordered
              rowData={feeStudentData}
              columnDefs={feeDataColumnDefs}
              loading={loadingFeeData}
              pagination={false}
              toolbar={{ search: false }}
            />
          ) : null}
        </div>
      ) : null}

      {selectedStudent && concessionFeeRow ? (
        <AddConcessionModal
          open={concessionOpen}
          onClose={() => {
            setConcessionOpen(false);
            setConcessionFeeRow(null);
          }}
          student={selectedStudent}
          feeRow={concessionFeeRow}
          onSaved={() => {
            if (studentId) void loadStudentFeeData(studentId);
          }}
        />
      ) : null}

      <Dialog
        open={detailsOpen}
        onOpenChange={(v) => {
          if (!v) setDetailsOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fee Details</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            {detailsLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1.5">Category</th>
                    <th className="px-2 py-1.5">Particular</th>
                    <th className="px-2 py-1.5">Gross</th>
                    <th className="px-2 py-1.5">Discount</th>
                    <th className="px-2 py-1.5">Paid</th>
                    <th className="px-2 py-1.5">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {detailParticulars.map((p, i) => (
                    <tr
                      key={`${p.feeParticularsId ?? i}-${p.feeCategoryId ?? i}`}
                      className="border-b border-border/50"
                    >
                      <td className="px-2 py-1.5">{p.categoryName ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {p.particularsName ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">{p.grossAmount ?? 0}</td>
                      <td className="px-2 py-1.5">{p.discountAmount ?? 0}</td>
                      <td className="px-2 py-1.5">{p.paidAmount ?? 0}</td>
                      <td className="px-2 py-1.5">{p.balanceAmount ?? 0}</td>
                    </tr>
                  ))}
                  {detailParticulars.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-2 py-4 text-center text-muted-foreground"
                      >
                        No particulars found
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
