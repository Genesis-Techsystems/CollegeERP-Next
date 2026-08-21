"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listMapRegulationSubjects,
  listRegulationsByCourse,
  listSubjectRegulationsByRegulation,
  listGroupSections,
  saveSubjectRegulations,
} from "@/services";

type AnyRow = Record<string, any>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safe(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function normalizeSubjectRow(x: AnyRow): AnyRow {
  return {
    ...x,
    subjectTypeName: x.subjectTypeName ?? x.subjecttypeName,
    subjectCredits:
      x.subjectCredits ??
      x.subjectCourseyears?.[0]?.creditHours ??
      x.subCreditHrs ??
      x.subCredits ??
      "",
    subCreditHrs:
      x.subjectCourseyears?.[0]?.creditHours ?? x.subCreditHrs ?? "",
    noExams: x.subjectCourseyears?.[0]?.noExams ?? x.noExams ?? false,
  };
}

/**
 * Angular `subject-allocation-sem-regulation` layout parity.
 * Title + one mat-card: course strip, Map Regulation accordion, mat-table, Back/Save.
 */
export default function SubjectAllocationSemRegulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => ({
      universityId: num(searchParams.get("universityId")),
      collegeId: num(searchParams.get("collegeId")),
      collegeName: safe(searchParams.get("collegeName")),
      courseId: num(searchParams.get("courseId")),
      courseName: safe(searchParams.get("courseName")),
      courseGroupId: num(searchParams.get("courseGroupId")),
      groupName: safe(searchParams.get("groupName")),
      courseYearId: num(searchParams.get("courseYearId")),
      courseYearName: safe(searchParams.get("courseYearName")),
      academicYearId: num(searchParams.get("academicYearId")),
      academicYear: safe(searchParams.get("academicYear")),
      regulationId: num(searchParams.get("regulationId")),
    }),
    [searchParams],
  );

  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [deletedRows, setDeletedRows] = useState<AnyRow[]>([]);
  const [regulationId, setRegulationId] = useState<number | null>(
    params.regulationId || null,
  );
  const [saving, setSaving] = useState(false);
  /** Expected Angular screenshot shows the panel collapsed. */
  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapRows, setMapRows] = useState<AnyRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const contextLine = [
    params.collegeName,
    params.academicYear,
    params.courseName,
    params.groupName,
    params.courseYearName,
  ]
    .filter(Boolean)
    .join(" / ");

  const courseLine = [params.collegeName, params.courseName, params.groupName]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    if (!params.courseId) return;
    listRegulationsByCourse(params.courseId)
      .then(setRegulations)
      .catch(() => setRegulations([]));
  }, [params.courseId]);

  useEffect(() => {
    if (!params.courseYearId || !params.academicYearId || !params.courseGroupId)
      return;
    listGroupSections(
      params.courseYearId,
      params.academicYearId,
      params.courseGroupId,
    )
      .then(setSections)
      .catch(() => setSections([]));
  }, [params.courseYearId, params.academicYearId, params.courseGroupId]);

  useEffect(() => {
    if (!regulationId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    listSubjectRegulationsByRegulation({
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId,
    })
      .then((list) => {
        setRows(list.map(normalizeSubjectRow));
        setDeletedRows([]);
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  }, [
    regulationId,
    params.collegeId,
    params.academicYearId,
    params.courseGroupId,
    params.courseYearId,
  ]);

  const regulationCode = useMemo(() => {
    const r = regulations.find(
      (x) => num(x.regulationId ?? x.pk_regulation_id) === (regulationId ?? 0),
    );
    return safe(r?.regulationCode ?? r?.regulationName);
  }, [regulations, regulationId]);

  const regulationOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.regulationId ?? r.pk_regulation_id)),
        label: safe(r.regulationCode ?? r.regulationName),
      })),
    [regulations],
  );

  function deleteRow(row: AnyRow) {
    setRows((prev) =>
      prev.filter(
        (x) =>
          !(
            num(x.subjectId) === num(row.subjectId) &&
            num(x.regulationId) === num(row.regulationId)
          ),
      ),
    );
    if (row.subjectRegulationId)
      setDeletedRows((prev) => [...prev, { ...row, isActive: false }]);
  }

  function toggleNoExam(row: AnyRow, checked: boolean) {
    setRows((prev) =>
      prev.map((x) => (x === row ? { ...x, noExams: checked } : x)),
    );
  }

  async function saveAll() {
    if (!regulationId) return;
    setSaving(true);
    try {
      const payloadRows = [...rows, ...deletedRows].map((row) => {
        if (row.subjectRegulationId) {
          const existingCourseYears = Array.isArray(row.subjectCourseyears)
            ? row.subjectCourseyears
            : [];
          return {
            ...row,
            subjectCourseyears: existingCourseYears.map((cy: AnyRow) => ({
              ...cy,
              isActive: row.isActive !== false,
              noExams: Boolean(row.noExams),
            })),
          };
        }
        const subjectCourseyears = sections.map((sec) => ({
          ...sec,
          isActive: row.isActive !== false,
          noExams: Boolean(row.noExams),
          creditHours: row.subCreditHrs ?? row.subjectCredits,
          maxWeeklyClasses: row.subCreditHrs ?? row.subjectCredits,
          preferConsecutive: null,
          subjectId: row.subjectId,
          collegeId: params.collegeId,
        }));
        return {
          ...row,
          academicYearId: params.academicYearId,
          courseYearId: params.courseYearId,
          courseGroupId: params.courseGroupId,
          collegeId: params.collegeId,
          subjectCourseyears,
        };
      });
      await saveSubjectRegulations(payloadRows);
      const refreshed = await listSubjectRegulationsByRegulation({
        collegeId: params.collegeId,
        academicYearId: params.academicYearId,
        courseGroupId: params.courseGroupId,
        courseYearId: params.courseYearId,
        regulationId,
      });
      setRows(refreshed.map(normalizeSubjectRow));
      setDeletedRows([]);
      toastSuccess("Changes saved successfully");
    } catch {
      toastError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function openMapModal() {
    if (!regulationId) return;
    const mapped = await listMapRegulationSubjects({
      universityId: params.universityId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId,
    }).catch(() => []);
    setMapRows(mapped.map((x) => ({ ...x, checked: false })));
    setMapModalOpen(true);
  }

  function addMappedSubjects() {
    const selected = mapRows.filter((x) => Boolean(x.checked));
    if (selected.length === 0) {
      setMapModalOpen(false);
      return;
    }
    setRows((prev) => {
      const next = [...prev];
      for (const item of selected) {
        const sid = num(item.subjectId);
        if (next.some((x) => num(x.subjectId) === sid)) continue;
        next.push({
          subjectId: sid,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          subjectTypeName: item.subjecttypeName ?? item.subjectTypeName,
          subjectCredits: item.subCredits ?? item.subCreditHrs ?? "",
          subCreditHrs: item.subCreditHrs ?? item.subCredits ?? "",
          isIncludeInStdReg: Boolean(item.checked),
          regulationId,
          regulationName: item.regulationName ?? regulationCode,
          noExams: false,
          isActive: true,
        });
      }
      return next;
    });
    setMapModalOpen(false);
  }

  function goBack() {
    const q = new URLSearchParams();
    if (params.universityId) q.set("universityId", String(params.universityId));
    if (params.collegeId) q.set("collegeId", String(params.collegeId));
    if (params.courseId) q.set("courseId", String(params.courseId));
    if (params.courseGroupId)
      q.set("courseGroupId", String(params.courseGroupId));
    if (params.academicYearId)
      q.set("academicYearId", String(params.academicYearId));
    const qs = q.toString();
    router.push(
      `/academics/college-curriculum/subject-allocation${qs ? `?${qs}` : ""}`,
    );
  }

  const hasSubjects = rows.length > 0;

  return (
    <PageContainer className="cy-subject-assoc-page">
      {/*
        Single mat-card. Title is inside the card (Angular visual).
        data-no-page-name blocks AppShell from injecting a second page title.
      */}
      <div
        className="app-card overflow-hidden border border-[#c5d8f0] bg-white shadow-none"
        data-no-page-name=""
      >
        <div className="flex items-center gap-2 border-b-2 border-[#ffcf46] px-4 py-3">
          <span
            className="material-icons text-[22px] text-[#0c51a4]"
            aria-hidden
          >
            book
          </span>
          <strong className="text-[16px] font-semibold leading-snug text-[#0c51a4]">
            Course Year Subject Association
            {contextLine ? (
              <>
                {" "}
                (<span className="font-semibold text-black">{contextLine}</span>
                )
              </>
            ) : null}
          </strong>
        </div>

        {/* Course / Academic Year */}
        <div className="m-4 mb-0 border border-[#c5d8f0] px-3 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <p className="my-[7px] text-[15px] font-medium text-[#616161]">
              Course :{" "}
              <span className="font-normal text-[#909090]">{courseLine}</span>
            </p>
            <p className="my-[7px] text-[15px] font-medium text-[#616161]">
              Academic Year :{" "}
              <span className="font-normal text-[#909090]">
                {params.academicYear || "-"}
              </span>
            </p>
          </div>
        </div>

        {/* Map Regulation Subject accordion — collapsed by default (Angular expected) */}
        <div className="m-4 border border-[#c5d8f0]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
            aria-expanded={mapPanelOpen}
            onClick={() => setMapPanelOpen((s) => !s)}
          >
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#0c51a4]">
              <span
                className="material-icons text-[18px] leading-none"
                aria-hidden
              >
                add
              </span>
              Map Regulation Subject
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-[#616161] transition-transform",
                mapPanelOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {mapPanelOpen ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#c5d8f0] px-3 py-3">
              <div className="w-[220px] max-w-full">
                <Select
                  label="Regulation"
                  required
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => setRegulationId(v ? Number(v) : null)}
                  options={regulationOptions}
                  placeholder="Regulation"
                  searchable
                />
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border-0 bg-[#ffcf46] px-3 text-[13px] font-medium text-black hover:bg-[#f0c040] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void openMapModal()}
                disabled={!regulationId}
              >
                <span
                  className="material-icons text-[18px] text-black"
                  aria-hidden
                >
                  add_circle_outline
                </span>
                Map Regulation Subjects
              </button>
            </div>
          ) : null}
        </div>

        {/* Subjects mat-table — no AG Grid toolbar */}
        {hasSubjects || loadingRows ? (
          <div className="mx-4 mb-2 overflow-x-auto border border-[#c5d8f0]">
            {loadingRows ? (
              <p className="px-3 py-4 text-[13px] text-muted-foreground">
                Loading subjects…
              </p>
            ) : (
              <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-[#e3f0fb]">
                    {[
                      "S.No",
                      "Subject Code",
                      "Subject Name",
                      "Subject Type",
                      "Credits",
                      "No Exam",
                      "Regulation",
                      "Std Reg Subject",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border border-[#c5d8f0] px-2 py-2 text-[12px] font-semibold text-[#042956]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${num(row.subjectId)}-${index}`}
                      className={index % 2 === 1 ? "bg-[#f7fbff]" : "bg-white"}
                    >
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center tabular-nums">
                        {index + 1}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.subjectCode)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.subjectName)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.subjectTypeName)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center">
                        {safe(
                          row.subjectCredits ??
                            row.subCreditHrs ??
                            row.subCredits,
                        )}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0c51a4]"
                          checked={Boolean(row.noExams)}
                          onChange={(e) => toggleNoExam(row, e.target.checked)}
                        />
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.regulationName ?? regulationCode)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center text-black">
                        {row.isIncludeInStdReg ? "Yes" : "No"}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center p-0.5 text-[#d80000] hover:opacity-80"
                          aria-label="Remove subject"
                          onClick={() => deleteRow(row)}
                        >
                          <X className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 px-4 py-3">
          <button
            type="button"
            className="inline-flex h-9 min-w-[80px] items-center justify-center rounded-[2px] border-0 bg-[#ffcf46] px-4 text-[13px] font-medium text-black hover:bg-[#f0c040]"
            onClick={goBack}
          >
            Back
          </button>
          {hasSubjects ? (
            <Button
              type="button"
              onClick={() => void saveAll()}
              disabled={saving || !regulationId}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      </div>

      {mapModalOpen ? (
        <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader className="border-b-2 border-[#ffcf46]">
              <DialogTitle className="text-[15px] font-semibold text-[#0c51a4]">
                Map Regulations
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto border border-[#c5d8f0]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-[#e3f0fb]">
                    {[
                      "SI.No",
                      "Subject Code",
                      "Subject Name",
                      "Add Subject",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border border-[#c5d8f0] px-2 py-2 text-[12px] font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapRows.map((row, index) => (
                    <tr key={`${num(row.subjectId)}-${index}`}>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.subjectCode)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2">
                        {safe(row.subjectName)}
                      </td>
                      <td className="border border-[#c5d8f0] px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0c51a4]"
                          checked={Boolean(row.checked)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const sid = num(row.subjectId);
                            setMapRows((prev) =>
                              prev.map((r) =>
                                num(r.subjectId) === sid
                                  ? { ...r, checked }
                                  : r,
                              ),
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="back" onClick={() => setMapModalOpen(false)}>
                Close
              </Button>
              <Button onClick={addMappedSubjects}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </PageContainer>
  );
}
