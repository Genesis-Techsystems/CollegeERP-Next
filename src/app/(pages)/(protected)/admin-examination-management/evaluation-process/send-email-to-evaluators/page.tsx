"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getAssignSubjectsEvaluatorRoles,
  getEvaluatorsByExam,
  getRegSupBaseFilters,
  sendEvaluatorCredentials,
} from "@/services";

type AnyRow = Record<string, any>;

type EvaluatorRow = AnyRow & {
  checked?: boolean;
  isSelected?: boolean;
};

const toastInfo = (msg: string) => toast.info(msg);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<number | string>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fmtExamDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function examOptionMeta(row: AnyRow): { label: string; title: string } {
  const name = txt(row.exam_name) || `Exam ${num(row.fk_exam_id)}`;
  const from = fmtExamDate(row.from_date);
  const to = fmtExamDate(row.to_date);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    row.is_internal_exam ? "(Internal)" : "",
    row.is_regular_exam ? "(Regular)" : "",
    row.is_supply_exam ? "(Supple)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = `${name}${range}${tags ? ` ${tags}` : ""}`;
  const title = from && to ? `${name} (${from} - ${to})` : name;
  return { label, title };
}

function profileIdOf(row: AnyRow | null | undefined): number {
  return num(row?.pk_exam_evaluator_profile_id ?? row?.examEvaluatorProfileId);
}

function profileLabel(row: AnyRow): string {
  return `${txt(row.evaluator_name)}(${txt(row.email)})`;
}

export default function SendEmailToEvaluatorsPage() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [roleRows, setRoleRows] = useState<AnyRow[]>([]);
  const [allEvaluators, setAllEvaluators] = useState<EvaluatorRow[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [isReEvaluation, setIsReEvaluation] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ).sort(
        (a, b) =>
          Number.parseInt(txt(b.academic_year) || "0", 10) -
          Number.parseInt(txt(a.academic_year) || "0", 10),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code),
      })),
    [courses],
  );
  const yearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );
  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => {
        const meta = examOptionMeta(r);
        return {
          value: String(num(r.fk_exam_id)),
          label: meta.label,
          title: meta.title,
        };
      }),
    [exams],
  );
  const roleOptions = useMemo<SelectOption[]>(
    () =>
      roleRows.map((r) => ({
        value: String(num(r.pk_role_id ?? r.roleId)),
        label: txt(r.role_name ?? r.roleName),
      })),
    [roleRows],
  );

  const visibleEvaluators = useMemo(() => {
    const term = profileSearch.trim().toLowerCase();
    if (!term) return allEvaluators;
    return allEvaluators.filter((r) =>
      txt(r.evaluator_name).toLowerCase().includes(term),
    );
  }, [allEvaluators, profileSearch]);

  const selectedEvaluators = useMemo(
    () => allEvaluators.filter((r) => r.isSelected === true),
    [allEvaluators],
  );

  const listSubtitle = useMemo(() => {
    const course = txt(
      courses.find((r) => num(r.fk_course_id) === num(courseId))?.course_code,
    );
    const ay = txt(
      academicYears.find(
        (r) => num(r.fk_academic_year_id) === num(academicYearId),
      )?.academic_year,
    );
    const exam = txt(
      exams.find((r) => num(r.fk_exam_id) === num(examId))?.exam_name,
    );
    return [course, ay, exam].filter(Boolean).join(" / ");
  }, [courses, academicYears, exams, courseId, academicYearId, examId]);

  function clearResults() {
    setAllEvaluators([]);
    setHasFetched(false);
    setSelectAll(false);
    setProfileSearch("");
  }

  function applyCourse(
    nextCourseId: number | null,
    fromBase: AnyRow[] = baseRows,
  ) {
    setCourseId(nextCourseId);
    setAcademicYearId(null);
    setExamId(null);
    setRoleId(null);
    clearResults();
    if (!nextCourseId) return;
    const ayRows = dedupeBy(
      fromBase.filter((r) => num(r.fk_course_id) === nextCourseId),
      (r) => num(r.fk_academic_year_id),
    ).sort(
      (a, b) =>
        Number.parseInt(txt(b.academic_year) || "0", 10) -
        Number.parseInt(txt(a.academic_year) || "0", 10),
    );
    const firstAy = num(ayRows[0]?.fk_academic_year_id) || null;
    if (firstAy) applyAcademicYear(firstAy, nextCourseId, fromBase);
  }

  function applyAcademicYear(
    nextAyId: number | null,
    forCourseId = courseId,
    fromBase: AnyRow[] = baseRows,
  ) {
    setAcademicYearId(nextAyId);
    setExamId(null);
    setRoleId(null);
    clearResults();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      fromBase.filter(
        (r) =>
          num(r.fk_course_id) === num(forCourseId) &&
          num(r.fk_academic_year_id) === nextAyId,
      ),
      (r) => num(r.fk_exam_id),
    );
    const firstExam = num(examRows[0]?.fk_exam_id) || null;
    if (firstExam) applyExam(firstExam);
  }

  function applyExam(nextExamId: number | null) {
    setExamId(nextExamId);
    setRoleId(null);
    clearResults();
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [rows, roles] = await Promise.all([
          getRegSupBaseFilters(employeeId).catch(() => []),
          getAssignSubjectsEvaluatorRoles().catch(() => []),
        ]);
        const list = Array.isArray(rows) ? rows : [];
        setBaseRows(list);
        setRoleRows(Array.isArray(roles) ? roles : []);
        const firstCourse = num(list[0]?.fk_course_id) || null;
        if (firstCourse) applyCourse(firstCourse, list);
      } catch (err) {
        toastError(err, "Failed to load filters");
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular ngOnInit once
  }, [employeeId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !roleId) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const rows = await getEvaluatorsByExam({ examId });
      setAllEvaluators(
        (Array.isArray(rows) ? rows : []).map((r) => ({
          ...r,
          checked: false,
          isSelected: false,
        })),
      );
      setHasFetched(true);
    } catch (err) {
      toastError(err, "Failed to load evaluators");
    } finally {
      setLoading(false);
    }
  }

  function toggleOne(profileId: number, checked: boolean) {
    setAllEvaluators((prev) => {
      const next = prev.map((r) =>
        profileIdOf(r) === profileId
          ? { ...r, checked, isSelected: checked }
          : r,
      );
      setSelectAll(next.length > 0 && next.every((r) => r.isSelected === true));
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectAll(checked);
    setAllEvaluators((prev) =>
      prev.map((r) => ({ ...r, checked, isSelected: checked })),
    );
  }

  async function onSendCredentials() {
    if (selectedEvaluators.length === 0) {
      toastInfo("Please Select Profiles...!");
      return;
    }
    if (!examId || !roleId) return;
    setSending(true);
    try {
      // Angular Assign(): examEvaluatorProfileDetailsDTOS with role + isReEvaluation
      const payload = selectedEvaluators.map((r) => ({
        examEvaluatorProfileId: profileIdOf(r),
        examId,
        examEvaluatorProfileDetailsDTOS: [
          {
            evaluatorRoleId: roleId,
            isReEvaluation,
          },
        ],
      }));
      const result = await sendEvaluatorCredentials(payload);
      const message =
        txt((result as AnyRow)?.message) ||
        "Evaluator credentials sent successfully.";
      toastSuccess(message);
    } catch (err) {
      toastError(err, "Failed to send evaluator credentials");
    } finally {
      setSending(false);
    }
  }

  const resultsHeader =
    hasFetched && allEvaluators.length > 0 ? (
      <div className="table-context-header">
        <span className="material-icons table-context-header__icon" aria-hidden>
          ballot
        </span>
        <strong className="table-context-header__title">
          Send Mails to Evaluators
          {listSubtitle ? <span>&nbsp;-&nbsp;{listSubtitle}</span> : null}
        </strong>
      </div>
    ) : null;

  return (
    <FilteredPage
      title="Send Mails to Evaluators"
      tableHeader={resultsHeader}
      filters={
        <GlobalFilterBarRow className="global-filter-bar__row--send-mail-eval">
          <GlobalFilterField
            label="Course"
            className="global-filter-field--fx15"
          >
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => applyCourse(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
              searchable
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Academic Year"
            className="global-filter-field--fx15"
          >
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => applyAcademicYear(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Academic Year"
              disabled={!courseId || loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam" className="global-filter-field--fx40">
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => applyExam(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
              searchable
              disabled={!academicYearId || loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Select Role"
            className="global-filter-field--fx18"
          >
            <Select
              value={roleId ? String(roleId) : null}
              onChange={(v) => {
                clearResults();
                setRoleId(v ? Number(v) : null);
              }}
              options={roleOptions}
              placeholder="Select Role"
              disabled={!examId || loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--fx12">
            <label className="flex h-10 items-center gap-2 text-[13px] font-medium text-foreground">
              <Checkbox
                checked={isReEvaluation}
                onCheckedChange={(v) => {
                  clearResults();
                  setIsReEvaluation(v === true);
                }}
              />
              Is Re-Evaluation
            </label>
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--action global-filter-field--fx10"
          >
            <Button
              size="sm"
              className="h-10 w-full shrink-0"
              onClick={() => void onGetList()}
              disabled={
                loading || !courseId || !academicYearId || !examId || !roleId
              }
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        hasFetched ? (
          <div className="space-y-4">
            {allEvaluators.length > 0 ? (
              <>
                <div className="send-mail-eval-panel">
                  <div className="send-mail-eval-panel__row">
                    <div className="send-mail-eval-panel__col send-mail-eval-panel__col--left">
                      <div className="send-mail-eval-panel__toolbar">
                        <div className="min-w-0 max-w-[220px] flex-1">
                          <SearchInput
                            value={profileSearch}
                            onChange={setProfileSearch}
                            placeholder="Search..."
                            className="w-full"
                          />
                        </div>
                        <span className="send-mail-eval-panel__total">
                          Total Profiles : {allEvaluators.length}
                        </span>
                      </div>
                      <div className="send-mail-eval-table-wrap">
                        <table className="send-mail-eval-table">
                          <thead>
                            <tr>
                              <th style={{ width: "15%" }}>
                                <span className="inline-flex items-center gap-2">
                                  <Checkbox
                                    checked={selectAll}
                                    onCheckedChange={(v) =>
                                      toggleAll(v === true)
                                    }
                                    aria-label="Select all profiles"
                                  />
                                  All
                                </span>
                              </th>
                              <th>Profile Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleEvaluators.map((row) => {
                              const id = profileIdOf(row);
                              return (
                                <tr
                                  key={`ev-${id || txt(row.email)}-${txt(row.evaluator_name)}`}
                                >
                                  <td style={{ width: "15%" }}>
                                    <Checkbox
                                      checked={row.checked === true}
                                      onCheckedChange={(v) =>
                                        toggleOne(id, v === true)
                                      }
                                      aria-label={profileLabel(row)}
                                    />
                                  </td>
                                  <td>{profileLabel(row)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="send-mail-eval-panel__col send-mail-eval-panel__col--right">
                      <div className="send-mail-eval-table-wrap">
                        <table className="send-mail-eval-table">
                          <thead>
                            <tr>
                              <th className="send-mail-eval-table__selected-head">
                                Selected Profile&apos;s:{" "}
                                {selectedEvaluators.length}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEvaluators.map((row) => {
                              const id = profileIdOf(row);
                              return (
                                <tr
                                  key={`sel-${id || txt(row.email)}-${txt(row.evaluator_name)}`}
                                >
                                  <td className="send-mail-eval-table__selected-name">
                                    {profileLabel(row)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start pt-1">
                  <Button
                    className="min-w-[12rem]"
                    onClick={() => void onSendCredentials()}
                    disabled={sending || selectedEvaluators.length === 0}
                  >
                    {sending ? "Sending..." : "Send Evaluator Credentials"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No evaluator profiles found for the selected filters.
              </div>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
