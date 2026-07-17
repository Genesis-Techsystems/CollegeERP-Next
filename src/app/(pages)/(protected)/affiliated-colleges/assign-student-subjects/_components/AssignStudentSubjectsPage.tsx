"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { DataTable, TableCard } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MINIO_URL } from "@/config/constants/api";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  assignAffiliatedStudentSubjects,
  listAffiliatedSubjectCourseYears,
  listAffiliatedStudentSubjects,
  searchAffiliatedStudents,
  updateAffiliatedStudentSubject,
} from "@/services";
import type { AffiliatedStudentSubjectPayload } from "@/services/affiliated-colleges";
import { UpdateStudentSubjectModal } from "./UpdateStudentSubjectModal";

type AnyRow = Record<string, unknown>;

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** Flat fields first, then nested Angular shapes (`groupSection`, `subject`, …). */
function pickNumDeep(
  row: AnyRow | null | undefined,
  keys: string[],
  nestedKeys: string[] = [
    "groupSection",
    "GroupSection",
    "section",
    "subject",
    "Subject",
  ],
): number {
  const direct = pickNum(row, keys);
  if (direct > 0) return direct;
  if (!row) return 0;
  for (const nk of nestedKeys) {
    const nested = row[nk];
    if (nested && typeof nested === "object") {
      const n = pickNum(nested as AnyRow, keys);
      if (n > 0) return n;
    }
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function subjectId(row: AnyRow): number {
  // Prefer flat subjectId (Angular / subjectcourseyrs), then nested.
  const flat = Number(
    row.subjectId ?? row.fk_subject_id ?? row.subject_id ?? 0,
  );
  if (Number.isFinite(flat) && flat > 0) return flat;
  return pickNumDeep(row, ["subjectId", "fk_subject_id", "subject_id"]);
}

function subjectLabel(row: AnyRow): string {
  const name = pickText(row, ["subjectName", "subject_name", "shortName"]);
  const code = pickText(row, ["subjectCode", "subject_code"]);
  return code ? `${name} - ${code}` : name;
}

function photoSrc(path: string | undefined): string {
  if (!path) return DEFAULT_STUDENT_PHOTO;
  if (path.startsWith("http")) return path;
  return `${MINIO_URL}${path}`;
}

const EXISTING_COL_DEFS = {
  siNo: {
    headerName: "Sl No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectType: {
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) =>
      pickText(p.data, ["subjectTypeCode", "subjecttypeCode", "subjectType"]),
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 280,
    flex: 1,
    valueGetter: (p) => {
      const name = pickText(p.data, ["subjectName", "subject_name"]);
      const code = pickText(p.data, ["subjectCode", "subject_code"]);
      return code ? `${name} (${code})` : name;
    },
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Action",
    minWidth: 110,
    flex: 0,
    width: 110,
  } as ColDef<AnyRow>,
};

const PENDING_COL_DEFS = {
  siNo: {
    headerName: "SI No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectType: {
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) =>
      pickText(p.data, ["subjecttypeCode", "subjectType", "subjectTypeCode"]),
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 280,
    flex: 1,
    valueGetter: (p) => subjectLabel(p.data ?? {}),
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Action",
    minWidth: 110,
    flex: 0,
    width: 110,
  } as ColDef<AnyRow>,
};

function makeEditRenderer(
  onEdit: (row: AnyRow) => void,
): (p: ICellRendererParams<AnyRow>) => ReactNode {
  return (p) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit"
      onClick={() => {
        if (p.data) onEdit(p.data);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

function makeRemoveRenderer(
  onRemove: (index: number) => void,
): (p: ICellRendererParams<AnyRow>) => ReactNode {
  return (p) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => onRemove(p.node?.rowIndex ?? -1)}
    >
      Remove
    </Button>
  );
}

export function AssignStudentSubjectsPage() {
  const qc = useQueryClient();
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<AnyRow[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [pendingSubjects, setPendingSubjects] = useState<AnyRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [editRow, setEditRow] = useState<AnyRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const selectedStudent = useMemo(
    () =>
      studentOptions.find(
        (s) => String(pickNum(s, ["studentId", "id"])) === studentId,
      ) ?? null,
    [studentOptions, studentId],
  );

  const collegeId = pickNumDeep(selectedStudent, [
    "collegeId",
    "fk_college_id",
  ]);
  const academicYearId = pickNumDeep(selectedStudent, [
    "academicYearId",
    "fk_academic_year_id",
  ]);
  const courseYearId = pickNumDeep(selectedStudent, [
    "courseYearId",
    "fk_course_year_id",
  ]);
  const detailStudentId = pickNumDeep(selectedStudent, [
    "studentId",
    "id",
    "studentDetailId",
  ]);

  const { data: existingSubjects = [], refetch: refetchExisting } = useQuery({
    queryKey: QK.affiliatedColleges.assignSubjects(
      collegeId,
      academicYearId,
      detailStudentId,
      courseYearId,
    ),
    queryFn: () =>
      listAffiliatedStudentSubjects({
        collegeId,
        academicYearId,
        studentId: detailStudentId,
        courseYearId,
      }),
    enabled:
      collegeId > 0 &&
      academicYearId > 0 &&
      detailStudentId > 0 &&
      courseYearId > 0,
  });

  const filteredAvailable = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return availableSubjects;
    return availableSubjects.filter((s) =>
      subjectLabel(s).toLowerCase().includes(q),
    );
  }, [availableSubjects, subjectSearch]);

  const selectedRows = useMemo(
    () => availableSubjects.filter((s) => checkedIds.has(subjectId(s))),
    [availableSubjects, checkedIds],
  );

  const allFilteredChecked =
    filteredAvailable.length > 0 &&
    filteredAvailable.every((s) => checkedIds.has(subjectId(s)));

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length < 5) {
      setStudentOptions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const rows = await searchAffiliatedStudents(q);
      setStudentOptions(rows);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadSubjectOptions(student: AnyRow) {
    const cId = pickNumDeep(student, ["collegeId", "fk_college_id"]);
    const ayId = pickNumDeep(student, [
      "academicYearId",
      "fk_academic_year_id",
    ]);
    const secId = pickNumDeep(student, [
      "groupSectionId",
      "fk_group_section_id",
      "group_section_id",
      "sectionId",
    ]);
    const cyId = pickNumDeep(student, ["courseYearId", "fk_course_year_id"]);
    const stId = pickNumDeep(student, ["studentId", "id", "studentDetailId"]);

    // Angular getSubjectCourseYears needs college + AY + groupSection only.
    if (!cId || !ayId || !secId || !stId) {
      toastError(
        "Student record is missing college, academic year, or section.",
      );
      return;
    }

    setLoadingSubjects(true);
    setAvailableSubjects([]);
    setCheckedIds(new Set());
    setPendingSubjects([]);

    try {
      // Angular: StudentSubject (isActive) + subjectcourseyrs in parallel, then
      // filter `!studentSubjects.some(s => s.subjectId === subject.subjectId)`.
      const [courseYearSubjects, assigned] = await Promise.all([
        listAffiliatedSubjectCourseYears({
          collegeId: cId,
          academicYearId: ayId,
          groupSectionId: secId,
        }),
        cyId > 0
          ? listAffiliatedStudentSubjects({
              collegeId: cId,
              academicYearId: ayId,
              studentId: stId,
              courseYearId: cyId,
            })
          : Promise.resolve([] as AnyRow[]),
      ]);

      // Angular compares flat `subjectId` only (not nested / not subjectCode).
      const assignedIds = new Set(
        assigned
          .map((r) => Number(r.subjectId ?? r.fk_subject_id ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      );

      const available = courseYearSubjects.filter((s) => {
        const id = Number(s.subjectId ?? 0);
        return id > 0 && !assignedIds.has(id);
      });

      setAvailableSubjects(available);
      // Angular checksubject = true → markAll selects all available.
      const initialChecked = new Set(
        available
          .map((s) => Number(s.subjectId ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      setCheckedIds(initialChecked);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setLoadingSubjects(false);
    }
  }

  function onStudentChange(v: string | null) {
    setStudentId(v);
    setPendingSubjects([]);
    setAvailableSubjects([]);
    setCheckedIds(new Set());
    if (!v) return;
    const student = studentOptions.find(
      (s) => String(pickNum(s, ["studentId", "id"])) === v,
    );
    if (student) void loadSubjectOptions(student);
  }

  function toggleSubject(id: number, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredAvailable) {
        const id = subjectId(s);
        if (id <= 0) continue;
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function addExamSubjects() {
    if (selectedRows.length === 0) {
      toastError("Select at least one subject.");
      return;
    }
    setPendingSubjects(selectedRows);
  }

  const updateMutation = useMutation({
    mutationFn: updateAffiliatedStudentSubject,
    onSuccess: async () => {
      toastSuccess("Subject updated successfully.");
      setEditOpen(false);
      setEditRow(null);
      await qc.invalidateQueries({ queryKey: QK.affiliatedColleges.all });
      await refetchExisting();
      if (selectedStudent) await loadSubjectOptions(selectedStudent);
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || pendingSubjects.length === 0) {
        throw new Error("Add subjects before saving.");
      }
      const payload: AffiliatedStudentSubjectPayload[] = pendingSubjects.map(
        (row) => ({
          isActive: true,
          collegeId: pickNumDeep(selectedStudent, [
            "collegeId",
            "fk_college_id",
          ]),
          studentId: pickNumDeep(selectedStudent, ["studentId", "id"]),
          studentbatchId: pickNumDeep(selectedStudent, [
            "batchId",
            "studentbatchId",
            "fk_batch_id",
          ]),
          regulationId: pickNumDeep(selectedStudent, [
            "regulationId",
            "fk_regulation_id",
          ]),
          courseId: pickNumDeep(selectedStudent, ["courseId", "fk_course_id"]),
          courseYearId: pickNumDeep(selectedStudent, [
            "courseYearId",
            "fk_course_year_id",
          ]),
          sectionId: pickNumDeep(selectedStudent, [
            "groupSectionId",
            "fk_group_section_id",
            "group_section_id",
            "sectionId",
          ]),
          academicYearId: pickNumDeep(selectedStudent, [
            "academicYearId",
            "fk_academic_year_id",
          ]),
          subjectTypeId: pickNumDeep(row, [
            "subjecttypeId",
            "subjectTypeId",
            "fk_subject_type_id",
          ]),
          subjectId: subjectId(row),
          subCredits: Number(row.credits ?? row.subCredits ?? 0) || 0,
          cbcsSubjectRegulationFacultyId: null,
        }),
      );
      return assignAffiliatedStudentSubjects(payload);
    },
    onSuccess: async () => {
      toastSuccess("Subjects saved successfully.");
      setPendingSubjects([]);
      await qc.invalidateQueries({ queryKey: QK.affiliatedColleges.all });
      await refetchExisting();
      if (selectedStudent) await loadSubjectOptions(selectedStudent);
    },
    onError: (e) => toastError(getErrorMessage(e)),
  });

  const selectOptions = useMemo(
    () =>
      studentOptions.map((s) => {
        const id = pickNum(s, ["studentId", "id"]);
        const hall = pickText(s, [
          "hallticketNumber",
          "rollNumber",
          "hallticket_number",
        ]);
        const name = pickText(s, ["firstName", "studentName", "name"]);
        return { value: String(id), label: hall ? `${name} (${hall})` : name };
      }),
    [studentOptions],
  );

  const existingColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      EXISTING_COL_DEFS.siNo,
      EXISTING_COL_DEFS.subjectType,
      EXISTING_COL_DEFS.subjectName,
      {
        ...EXISTING_COL_DEFS.actions,
        cellRenderer: makeEditRenderer((row) => {
          setEditRow({
            ...row,
            studentId: detailStudentId,
            stdFirstName: pickText(selectedStudent, [
              "firstName",
              "studentName",
            ]),
          });
          setEditOpen(true);
        }),
      },
    ],
    [detailStudentId, selectedStudent],
  );

  const pendingColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      PENDING_COL_DEFS.siNo,
      PENDING_COL_DEFS.subjectType,
      PENDING_COL_DEFS.subjectName,
      {
        ...PENDING_COL_DEFS.actions,
        cellRenderer: makeRemoveRenderer((index) => {
          if (index < 0) return;
          setPendingSubjects((prev) => prev.filter((_, idx) => idx !== index));
        }),
      },
    ],
    [],
  );

  const showExistingTable = Boolean(
    selectedStudent && existingSubjects.length > 0,
  );

  return (
    <FilteredPage
      title="College Student Subjects"
      filtersCollapsible={false}
      filters={
        <div className="space-y-4">
          <div className="max-w-xl">
            <Select
              label="Student"
              placeholder="Search by student name or roll no."
              value={studentId}
              onChange={onStudentChange}
              options={selectOptions}
              searchable
              clearable
              isLoading={searchLoading}
              onSearch={(term) => void onSearchStudents(term)}
            />
          </div>

          {selectedStudent ? (
            <div className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoSrc(
                      pickText(selectedStudent, [
                        "studentPhotoPath",
                        "photoPath",
                      ]),
                    )}
                    alt=""
                    className="h-20 w-20 rounded object-cover border bg-white"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.endsWith("default_Student.png")) {
                        img.src = DEFAULT_STUDENT_PHOTO;
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-7 text-sm leading-tight space-y-0">
                  <p className="font-semibold text-primary">
                    {pickText(selectedStudent, ["firstName", "studentName"])}{" "}
                    <span className="font-medium">
                      (
                      {Boolean(selectedStudent.isLateral)
                        ? "LATERAL"
                        : "REGULAR"}
                      )
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {pickText(selectedStudent, [
                      "hallticketNumber",
                      "rollNumber",
                    ])}
                  </p>
                  <p className="text-muted-foreground">
                    {[
                      pickText(selectedStudent, ["collegeCode"]),
                      pickText(selectedStudent, [
                        "academicYear",
                        "academic_year",
                      ]),
                      pickText(selectedStudent, ["courseCode", "course_code"]),
                      pickText(selectedStudent, ["groupCode", "group_code"]),
                      pickText(selectedStudent, [
                        "courseYearName",
                        "course_year_name",
                      ]),
                      selectedStudent.section
                        ? `Section ${pickText(selectedStudent, ["section", "sectionName"])}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  <p className="text-muted-foreground">
                    {pickText(selectedStudent, ["mobile", "mobileNumber"])}
                  </p>
                </div>
                <div className="md:col-span-3 text-sm leading-tight space-y-0.5">
                  <p>
                    Quota :{" "}
                    <span className="text-blue-700 font-medium">
                      {pickText(selectedStudent, ["quotaDisplayName", "quota"])}
                    </span>
                  </p>
                  <p>
                    Student Status :{" "}
                    <span className="text-green-700 font-medium">
                      {pickText(selectedStudent, [
                        "studentStatusDisplayName",
                        "studentStatusCode",
                      ])}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {selectedStudent ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h3 className="font-semibold text-sm">Select Exam Subjects</h3>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 border rounded-md overflow-hidden bg-white">
                  <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
                    <SearchInput
                      placeholder="Search..."
                      value={subjectSearch}
                      onChange={setSubjectSearch}
                      className="max-w-xs"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Subjects: <strong>{checkedIds.size}</strong>
                    </span>
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          <th className="w-14 px-2 py-2 text-left">
                            <Checkbox
                              checked={allFilteredChecked}
                              onCheckedChange={(v) => toggleAllFiltered(!!v)}
                              disabled={filteredAvailable.length === 0}
                            />
                            <span className="ml-1 text-xs">All</span>
                          </th>
                          <th className="px-2 py-2 text-left">Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingSubjects ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-3 py-6 text-center text-muted-foreground"
                            >
                              Loading subjects…
                            </td>
                          </tr>
                        ) : filteredAvailable.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-3 py-6 text-center text-muted-foreground"
                            >
                              No unassigned subjects available for this student.
                            </td>
                          </tr>
                        ) : (
                          filteredAvailable.map((s, i) => {
                            const id = subjectId(s);
                            return (
                              <tr key={id || i} className="border-t">
                                <td className="px-2 py-2">
                                  <Checkbox
                                    checked={checkedIds.has(id)}
                                    onCheckedChange={(v) =>
                                      toggleSubject(id, !!v)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-2">{subjectLabel(s)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-5 border rounded-md overflow-hidden bg-white">
                  <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">
                    Selected Subjects : {selectedRows.length}
                  </div>
                  <div className="max-h-[360px] overflow-auto divide-y">
                    {selectedRows.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                        No subjects selected
                      </div>
                    ) : (
                      selectedRows.map((s, i) => (
                        <div
                          key={subjectId(s) || i}
                          className="px-3 py-2 text-sm"
                        >
                          {subjectLabel(s)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-end">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={addExamSubjects}
                    disabled={selectedRows.length === 0 || loadingSubjects}
                  >
                    Add Subjects
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      {showExistingTable ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            title="Student Subjects"
            rowData={existingSubjects}
            columnDefs={existingColumnDefs}
            subtitle=""
            toolbar={{
              search: true,
              searchPlaceholder: "Search subjects…",
              columnPicker: false,
              exportPdf: false,
              exportExcel: false,
            }}
          />
        </TableCard>
      ) : null}

      {pendingSubjects.length > 0 ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title="Exam Subjects"
              rowData={pendingSubjects}
              columnDefs={pendingColumnDefs}
              subtitle=""
              toolbar={{
                search: true,
                columnPicker: false,
                exportPdf: false,
                exportExcel: false,
              }}
            />
          </TableCard>
          <div className="flex justify-end px-1">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}

      <UpdateStudentSubjectModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        row={editRow}
        studentName={pickText(selectedStudent, ["firstName", "studentName"])}
        onSave={(payload) => updateMutation.mutate(payload)}
        isSubmitting={updateMutation.isPending}
      />
    </FilteredPage>
  );
}
