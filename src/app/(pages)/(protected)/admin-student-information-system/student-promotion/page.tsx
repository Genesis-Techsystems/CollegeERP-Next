"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilteredPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getStudentInfoCollegeFilters,
  listGroupSectionsByFilters,
  promoteStudents,
  listStudentsForPromotionPreview,
  normalizeStudentRow,
} from "@/services";

type AnyRow = Record<string, any>;

const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const SEC = [
  "fk_group_section_id",
  "groupSectionId",
  "group_section_id",
  "fk_section_id",
  "sectionId",
];

function dedupeBy<T>(rows: T[], keyFn: (r: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n) && n > 0) return n;
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

/** When AY lives in `academicData` only, filter rows often have `fk_academic_year_id` 0 — still match. */
function rowDimMatches(
  row: AnyRow | null | undefined,
  keys: string[],
  selectedId: number | null,
): boolean {
  if (!selectedId) return true;
  const rowValue = pickNum(row ?? {}, keys);
  return rowValue === 0 || rowValue === Number(selectedId);
}

function rowAyMatches(
  row: AnyRow | null | undefined,
  ayId: number | null,
): boolean {
  return rowDimMatches(row, AY, ayId);
}

function hasSelected(
  rows: AnyRow[],
  keys: string[],
  value: number | null,
): boolean {
  if (!value) return false;
  return rows.some((row) => pickNum(row, keys) === Number(value));
}

function rawSectionLabel(row: AnyRow): string {
  return pickText(row, [
    "group_section_name",
    "groupSectionName",
    "sectionName",
    "section",
  ]);
}

function sectionLabel(row: AnyRow): string {
  return rawSectionLabel(row) || "Section";
}

function sectionValue(row: AnyRow): string {
  const id = pickNum(row, SEC);
  if (id > 0) return String(id);
  return "";
}

function hasSection(row: AnyRow): boolean {
  return pickNum(row, SEC) > 0;
}

function sectionKey(row: AnyRow): string {
  const id = pickNum(row, SEC);
  if (id > 0) return `id:${id}`;
  return `name:${rawSectionLabel(row).toLowerCase()}`;
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rowStudentId(row: AnyRow, fallback: number): number {
  return (
    pickNum(row, ["studentId", "fk_student_id", "student_id", "id"]) || fallback
  );
}

function toIsoDate(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseResultRows(data: AnyRow | null | undefined): AnyRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.resultList)) return data.resultList;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data?.data?.resultList)) return data.data.resultList;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  return [];
}

function attendanceRowKey(row: AnyRow, index: number): string {
  const studentId = pickNum(row, ["studentId", "fk_student_id", "student_id"]);
  const fromDate = pickText(row, ["fromDate", "from_date"]);
  const toDate = pickText(row, ["toDate", "to_date"]);
  const reason = pickText(row, ["reason"]);
  return `${studentId || "na"}-${fromDate || "na"}-${toDate || "na"}-${reason || index}`;
}

function yearNo(row: AnyRow | null | undefined): number {
  return pickNum(row ?? {}, ["year_no", "yearNo", "year_order", "yearOrder"]);
}

function academicYearEndLabel(label: string): number {
  const match = label.match(/(\d{4})\s*$/);
  return match ? Number(match[1]) : 0;
}

function validatePromotionRules(params: {
  fromAyId: number | null;
  toAyId: number | null;
  fromYearId: number | null;
  toYearId: number | null;
  fromYears: AnyRow[];
}): string | null {
  const { fromAyId, toAyId, fromYearId, toYearId, fromYears } = params;
  if (!fromYearId || !toYearId)
    return "Semester number is empty please check...";

  const fromRow = fromYears.find((r) => pickNum(r, YR) === Number(fromYearId));
  const toRow = fromYears.find((r) => pickNum(r, YR) === Number(toYearId));
  const fromYearNo = yearNo(fromRow);
  const toYearNo = yearNo(toRow);

  if (fromAyId === toAyId && toYearNo >= fromYearNo) {
    if (fromYearId !== toYearId) return null;
    return "Should not promote in same academic year and same course year";
  }
  if (fromAyId !== toAyId && fromYearNo !== toYearNo) {
    if (fromYearNo < toYearNo) return null;
    return "Your are promoting to worng course year please check...";
  }
  return "Your are promoting to worng class please check...";
}

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

function mapCollegeOptsFrom(colleges: AnyRow[]) {
  return colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label:
      pickText(r, [
        "college_code",
        "collegeCode",
        "college_name",
        "collegeName",
      ]) || "College",
  }));
}

function mapAyOptsFrom(rows: AnyRow[]) {
  return rows.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
}

function mapCourseOptsFrom(rows: AnyRow[]) {
  return rows.map((r) => ({
    value: String(pickNum(r, CRS)),
    label:
      pickText(r, ["course_code", "courseCode", "course_name", "courseName"]) ||
      "Course",
  }));
}

function mapGroupOptsFrom(rows: AnyRow[]) {
  return rows.map((r) => ({
    value: String(pickNum(r, GRP)),
    label:
      pickText(r, ["group_code", "groupCode", "group_name", "groupName"]) ||
      "Group",
  }));
}

function mapYearOptsFrom(rows: AnyRow[]) {
  return rows.map((r) => ({
    value: String(pickNum(r, YR)),
    label:
      pickText(r, [
        "course_year_code",
        "courseYearCode",
        "course_year_name",
        "courseYearName",
      ]) || "Year",
  }));
}

function mapSectionOptsFrom(rows: AnyRow[]) {
  return rows.map((r) => ({
    value: sectionValue(r),
    label: sectionLabel(r),
  }));
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Promote From/To filter cascades mirror legacy UI
export default function StudentPromotionPage() {
  const { user } = useSessionContext();

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [allRows, setAllRows] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [fromSectionApiRows, setFromSectionApiRows] = useState<AnyRow[]>([]);
  const [toSectionApiRows, setToSectionApiRows] = useState<AnyRow[]>([]);
  const [resultRows, setResultRows] = useState<AnyRow[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [selectedPromotionIds, setSelectedPromotionIds] = useState<number[]>(
    [],
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const [submittingPromotion, setSubmittingPromotion] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<AnyRow[]>([]);
  const [attendanceMessage, setAttendanceMessage] = useState(
    "No academic batches found for this date.",
  );

  const [fromCollegeId, setFromCollegeId] = useState<number | null>(null);
  const [fromAyId, setFromAyId] = useState<number | null>(null);
  const [fromCourseId, setFromCourseId] = useState<number | null>(null);
  const [fromGroupId, setFromGroupId] = useState<number | null>(null);
  const [fromYearId, setFromYearId] = useState<number | null>(null);
  const [fromSectionId, setFromSectionId] = useState<number | null>(null);

  const [toCollegeId, setToCollegeId] = useState<number | null>(null);
  const [toAyId, setToAyId] = useState<number | null>(null);
  const [toCourseId, setToCourseId] = useState<number | null>(null);
  const [toGroupId, setToGroupId] = useState<number | null>(null);
  const [toYearId, setToYearId] = useState<number | null>(null);
  const [toSectionId, setToSectionId] = useState<number | null>(null);
  const [changeFrom, setChangeFrom] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setChangeFrom(d);
  }, []);

  const loadFilters = useCallback(async () => {
    const employeeId = Number(user?.employeeId ?? 0);
    const organizationId = Number(user?.organizationId ?? 0);
    setLoadingFilters(true);
    try {
      const { filtersData, academicData: ayRows } =
        await getStudentInfoCollegeFilters(organizationId, employeeId);
      setAllRows(Array.isArray(filtersData) ? filtersData : []);
      setAcademicData(Array.isArray(ayRows) ? ayRows : []);
    } catch {
      setAllRows([]);
      setAcademicData([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [user?.employeeId, user?.organizationId]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  const colleges = useMemo(
    () =>
      dedupeBy(
        allRows.filter((r) => pickNum(r, COL) > 0),
        (r) => pickNum(r, COL),
      ),
    [allRows],
  );

  const fromAcademicYears = useMemo(() => {
    if (!fromCollegeId) return [];
    const collegeRow = allRows.find(
      (r) => pickNum(r, COL) === Number(fromCollegeId),
    );
    const univId = pickNum(collegeRow ?? {}, [
      "fk_university_id",
      "universityId",
    ]);
    return dedupeBy(
      academicData.filter(
        (r) => pickNum(r, ["fk_university_id", "universityId"]) === univId,
      ),
      (r) => pickNum(r, AY),
    ).filter((r) => pickNum(r, AY) > 0);
  }, [allRows, academicData, fromCollegeId]);

  const fromCourses = useMemo(
    () =>
      dedupeBy(
        allRows.filter((r) => pickNum(r, COL) === Number(fromCollegeId)),
        (r) => pickNum(r, CRS),
      ).filter((r) => pickNum(r, CRS) > 0),
    [allRows, fromCollegeId],
  );
  const fromGroups = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickNum(r, COL) === Number(fromCollegeId) &&
            rowDimMatches(r, CRS, fromCourseId),
        ),
        (r) => pickNum(r, GRP),
      ).filter((r) => pickNum(r, GRP) > 0),
    [allRows, fromCollegeId, fromCourseId],
  );
  const fromYears = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickNum(r, COL) === Number(fromCollegeId) &&
            rowDimMatches(r, CRS, fromCourseId) &&
            rowDimMatches(r, GRP, fromGroupId),
        ),
        (r) => pickNum(r, YR),
      ).filter((r) => pickNum(r, YR) > 0),
    [allRows, fromCollegeId, fromCourseId, fromGroupId],
  );
  const fromSectionsFromFilters = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickNum(r, COL) === Number(fromCollegeId) &&
            rowAyMatches(r, fromAyId) &&
            rowDimMatches(r, CRS, fromCourseId) &&
            rowDimMatches(r, GRP, fromGroupId) &&
            rowDimMatches(r, YR, fromYearId),
        ),
        sectionKey,
      ).filter(hasSection),
    [allRows, fromCollegeId, fromAyId, fromCourseId, fromGroupId, fromYearId],
  );
  const fromSections = useMemo(
    () =>
      fromSectionApiRows.length > 0
        ? fromSectionApiRows
        : fromSectionsFromFilters,
    [fromSectionApiRows, fromSectionsFromFilters],
  );

  const toRowsBase = useMemo(() => {
    if (!toCollegeId) return [];
    const filtered = allRows.filter(
      (r) => pickNum(r, COL) === Number(toCollegeId),
    );
    return filtered.length > 0 ? filtered : allRows;
  }, [allRows, toCollegeId]);

  const toAcademicYears = useMemo(() => {
    if (!toCollegeId) return [];
    const collegeRow = allRows.find(
      (r) => pickNum(r, COL) === Number(toCollegeId),
    );
    const univId = pickNum(collegeRow ?? {}, [
      "fk_university_id",
      "universityId",
    ]);
    return dedupeBy(
      academicData.filter(
        (r) => pickNum(r, ["fk_university_id", "universityId"]) === univId,
      ),
      (r) => pickNum(r, AY),
    ).filter((r) => pickNum(r, AY) > 0);
  }, [allRows, academicData, toCollegeId]);

  const toCourses = fromCourses;
  const toGroups = fromGroups;
  const toYears = fromYears;
  const toSectionsFromFilters = useMemo(
    () =>
      dedupeBy(
        toRowsBase.filter(
          (r) =>
            rowAyMatches(r, toAyId) &&
            rowDimMatches(r, CRS, toCourseId) &&
            rowDimMatches(r, GRP, toGroupId) &&
            rowDimMatches(r, YR, toYearId),
        ),
        sectionKey,
      ).filter(hasSection),
    [toRowsBase, toAyId, toCourseId, toGroupId, toYearId],
  );
  const toSections = useMemo(
    () =>
      toSectionApiRows.length > 0 ? toSectionApiRows : toSectionsFromFilters,
    [toSectionApiRows, toSectionsFromFilters],
  );

  const previewRows = useMemo(
    () =>
      resultRows.filter((row, idx) =>
        selectedPromotionIds.includes(rowStudentId(row, idx + 1)),
      ),
    [resultRows, selectedPromotionIds],
  );

  const previewStudent = previewRows[0] ?? resultRows[0] ?? null;

  const previewCollegeCode = useMemo(
    () =>
      pickText(previewStudent, ["collegeCode", "college_code"]) ||
      pickText(
        allRows.find((r) => pickNum(r, COL) === Number(toCollegeId)),
        ["college_code", "collegeCode"],
      ) ||
      user?.collegeCode ||
      "-",
    [previewStudent, allRows, toCollegeId, user?.collegeCode],
  );
  const previewCourseCode = useMemo(
    () =>
      pickText(previewStudent, ["courseCode", "course_code"]) ||
      pickText(
        allRows.find((r) => pickNum(r, CRS) === Number(fromCourseId)),
        ["course_code", "courseCode"],
      ) ||
      "-",
    [previewStudent, allRows, fromCourseId],
  );
  const previewGroupCode = useMemo(
    () =>
      pickText(previewStudent, ["groupCode", "group_code"]) ||
      pickText(
        allRows.find((r) => pickNum(r, GRP) === Number(toGroupId)),
        ["group_code", "groupCode"],
      ) ||
      "-",
    [previewStudent, allRows, toGroupId],
  );
  const previewFromCourseYear = useMemo(
    () =>
      pickText(previewStudent, ["courseYearName", "course_year_name"]) ||
      pickText(
        fromYears.find((r) => pickNum(r, YR) === Number(fromYearId)),
        ["course_year_code", "courseYearCode"],
      ) ||
      "-",
    [previewStudent, fromYears, fromYearId],
  );
  const previewToCourseYear = useMemo(
    () =>
      pickText(
        fromYears.find((r) => pickNum(r, YR) === Number(toYearId)),
        ["course_year_code", "courseYearCode"],
      ) || "-",
    [fromYears, toYearId],
  );
  const previewFromSection = useMemo(
    () =>
      pickText(previewStudent, ["section", "sectionName"]) ||
      sectionLabel(
        fromSections.find((r) => pickNum(r, SEC) === Number(fromSectionId)) ??
          {},
      ) ||
      "-",
    [previewStudent, fromSections, fromSectionId],
  );
  const previewToSection = useMemo(() => {
    const apiRow = toSectionApiRows.find(
      (r) => pickNum(r, SEC) === Number(toSectionId),
    );
    if (apiRow)
      return (
        pickText(apiRow, ["section", "sectionName"]) || sectionLabel(apiRow)
      );
    const row = toSections.find((r) => pickNum(r, SEC) === Number(toSectionId));
    return sectionLabel(row ?? {}) || "-";
  }, [toSectionApiRows, toSections, toSectionId]);
  const previewFromAy = useMemo(
    () =>
      pickText(previewStudent, ["academicYear", "academic_year"]) ||
      pickText(
        fromAcademicYears.find((r) => pickNum(r, AY) === Number(fromAyId)),
        ["academic_year", "academicYear"],
      ) ||
      "-",
    [previewStudent, fromAcademicYears, fromAyId],
  );
  const previewToAy = useMemo(
    () =>
      pickText(
        toAcademicYears.find((r) => pickNum(r, AY) === Number(toAyId)),
        ["academic_year", "academicYear"],
      ) || "-",
    [toAcademicYears, toAyId],
  );

  const toCollegeLabel = useMemo(() => {
    const row = allRows.find((r) => pickNum(r, COL) === Number(toCollegeId));
    return (
      pickText(row, [
        "college_code",
        "collegeCode",
        "college_name",
        "collegeName",
      ]) ||
      user?.collegeCode ||
      "College"
    );
  }, [allRows, toCollegeId, user?.collegeCode]);

  const previewYearWarning =
    academicYearEndLabel(previewFromAy) > 0 &&
    academicYearEndLabel(previewToAy) > 0 &&
    academicYearEndLabel(previewFromAy) > academicYearEndLabel(previewToAy);

  const filteredResultRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return resultRows;
    return resultRows.filter((row) =>
      [
        pickText(row, ["rollNumber", "hallticketNumber"]),
        pickText(row, ["firstName", "studentName"]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [resultRows, listSearch]);

  const previewFilteredRows = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    if (!q) return previewRows;
    return previewRows.filter((row) =>
      [
        pickText(row, ["hallticketNumber", "rollNumber"]),
        pickText(row, ["studentName", "firstName"]),
        pickText(row, ["mobileNumber", "mobile_number"]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [previewRows, previewSearch]);
  const effectiveToCollegeId = toCollegeId ?? fromCollegeId;
  const effectiveToSectionId = toSectionId;
  const hasRequiredPromotionFilters = useMemo(
    () =>
      Boolean(
        fromCollegeId &&
        fromGroupId &&
        fromYearId &&
        fromSectionId &&
        toGroupId &&
        toYearId &&
        effectiveToSectionId,
      ),
    [
      fromCollegeId,
      fromGroupId,
      fromYearId,
      fromSectionId,
      toGroupId,
      toYearId,
      effectiveToSectionId,
    ],
  );

  useEffect(() => {
    if (loadingFilters || colleges.length === 0) return;
    if (!fromCollegeId) {
      const first = pickNum(colleges[0], COL);
      if (first) setFromCollegeId(first);
    }
  }, [loadingFilters, colleges, fromCollegeId]);

  useEffect(() => {
    if (!fromCollegeId) return;
    setFromCourseId(null);
    setFromGroupId(null);
    setFromYearId(null);
    setFromSectionId(null);
  }, [fromCollegeId]);

  useEffect(() => {
    if (!fromCollegeId) {
      setFromAyId(null);
      return;
    }
    const first = fromAcademicYears[0];
    setFromAyId(first ? pickNum(first, AY) : null);
  }, [fromCollegeId, fromAcademicYears]);

  useEffect(() => {
    if (!fromAyId || !hasSelected(fromAcademicYears, AY, fromAyId)) {
      const first = fromAcademicYears[0];
      setFromAyId(first ? pickNum(first, AY) : null);
      return;
    }
    setFromCourseId(null);
    setFromGroupId(null);
    setFromYearId(null);
    setFromSectionId(null);
    const first = fromCourses[0];
    if (first) setFromCourseId(pickNum(first, CRS));
  }, [fromAyId, fromCourses]);

  useEffect(() => {
    if (!fromCourseId || !hasSelected(fromCourses, CRS, fromCourseId)) {
      const first = fromCourses[0];
      setFromCourseId(first ? pickNum(first, CRS) : null);
      return;
    }
    setFromGroupId(null);
    setFromYearId(null);
    setFromSectionId(null);
    const first = fromGroups[0];
    if (first) setFromGroupId(pickNum(first, GRP));
  }, [fromCourseId, fromGroups]);

  useEffect(() => {
    if (!fromGroupId || !hasSelected(fromGroups, GRP, fromGroupId)) {
      const first = fromGroups[0];
      setFromGroupId(first ? pickNum(first, GRP) : null);
      return;
    }
    setFromYearId(null);
    setFromSectionId(null);
    const first = fromYears[0];
    if (first) setFromYearId(pickNum(first, YR));
  }, [fromGroupId, fromYears]);

  useEffect(() => {
    if (!fromYearId || !hasSelected(fromYears, YR, fromYearId)) {
      const first = fromYears[0];
      setFromYearId(first ? pickNum(first, YR) : null);
      return;
    }
    setFromSectionId(null);
  }, [fromYearId, fromYears]);

  useEffect(() => {
    async function loadFromSections() {
      if (!fromCollegeId || !fromAyId || !fromGroupId || !fromYearId) {
        setFromSectionApiRows([]);
        return;
      }
      const rows = await listGroupSectionsByFilters({
        collegeId: fromCollegeId,
        academicYearId: fromAyId,
        courseGroupId: fromGroupId,
        courseYearId: fromYearId,
      }).catch(() => []);
      setFromSectionApiRows(Array.isArray(rows) ? rows : []);
    }
    void loadFromSections();
  }, [fromCollegeId, fromAyId, fromGroupId, fromYearId]);

  useEffect(() => {
    if (!fromCollegeId) return;
    if (toCollegeId !== fromCollegeId) setToCollegeId(fromCollegeId);
  }, [fromCollegeId, toCollegeId]);

  useEffect(() => {
    if (!toCollegeId) return;
    setToCourseId(null);
    setToGroupId(null);
    setToYearId(null);
    setToSectionId(null);
  }, [toCollegeId]);

  useEffect(() => {
    if (!toCollegeId) {
      setToAyId(null);
      return;
    }
    const first = toAcademicYears[0];
    setToAyId(first ? pickNum(first, AY) : null);
  }, [toCollegeId, toAcademicYears]);

  useEffect(() => {
    if (!toAyId || !hasSelected(toAcademicYears, AY, toAyId)) {
      const first = toAcademicYears[0];
      setToAyId(first ? pickNum(first, AY) : null);
      return;
    }
    setToCourseId(null);
    setToGroupId(null);
    setToYearId(null);
    setToSectionId(null);
    const first = toCourses[0];
    if (first) setToCourseId(pickNum(first, CRS));
  }, [toAyId, toCourses]);

  useEffect(() => {
    if (!toCourseId || !hasSelected(toCourses, CRS, toCourseId)) {
      const first = toCourses[0];
      setToCourseId(first ? pickNum(first, CRS) : null);
      return;
    }
    setToGroupId(null);
    setToYearId(null);
    setToSectionId(null);
    const first = toGroups[0];
    if (first) setToGroupId(pickNum(first, GRP));
  }, [toCourseId, toGroups]);

  useEffect(() => {
    if (!toGroupId || !hasSelected(toGroups, GRP, toGroupId)) {
      const first = toGroups[0];
      setToGroupId(first ? pickNum(first, GRP) : null);
      return;
    }
    setToYearId(null);
    setToSectionId(null);
    const first = toYears[0];
    if (first) setToYearId(pickNum(first, YR));
  }, [toGroupId, toYears]);

  useEffect(() => {
    if (!toYearId || !hasSelected(toYears, YR, toYearId)) {
      const first = toYears[0];
      setToYearId(first ? pickNum(first, YR) : null);
      return;
    }
    setToSectionId(null);
  }, [toYearId, toYears]);

  useEffect(() => {
    if (toSectionId || toSectionApiRows.length === 0) return;
    const first = pickNum(toSectionApiRows[0], SEC);
    if (first) setToSectionId(first);
  }, [toSectionApiRows, toSectionId]);

  useEffect(() => {
    async function loadToSections() {
      if (!toCollegeId || !toAyId || !toGroupId || !toYearId) {
        setToSectionApiRows([]);
        return;
      }
      const rows = await listGroupSectionsByFilters({
        collegeId: toCollegeId,
        academicYearId: toAyId,
        courseGroupId: toGroupId,
        courseYearId: toYearId,
      }).catch(() => []);
      setToSectionApiRows(Array.isArray(rows) ? rows : []);
    }
    void loadToSections();
  }, [toCollegeId, toAyId, toGroupId, toYearId]);

  useEffect(() => {
    if (!fromCourseId) return;
    setToCourseId(fromCourseId);
  }, [fromCourseId]);

  useEffect(() => {
    if (!fromGroupId) return;
    setToGroupId(fromGroupId);
  }, [fromGroupId]);

  const loadStudentList = useCallback(async () => {
    if (!fromCollegeId || !fromGroupId || !fromSectionId) {
      setResultRows([]);
      setSelectedPromotionIds([]);
      return;
    }
    setLoadingList(true);
    try {
      const raw = await listStudentsForPromotionPreview({
        collegeId: fromCollegeId,
        courseGroupId: fromGroupId,
        groupSectionId: fromSectionId,
      });
      const normalized = (Array.isArray(raw) ? raw : []).map((row) =>
        normalizeStudentRow(row),
      );
      setResultRows(normalized);
      setSelectedPromotionIds(
        normalized.map((row, idx) => rowStudentId(row, idx + 1)),
      );
    } catch {
      setResultRows([]);
      setSelectedPromotionIds([]);
    } finally {
      setLoadingList(false);
    }
  }, [fromCollegeId, fromGroupId, fromSectionId]);

  useEffect(() => {
    void loadStudentList();
  }, [loadStudentList]);

  function togglePromote(studentId: number, checked: boolean) {
    setSelectedPromotionIds((prev) => {
      if (checked)
        return prev.includes(studentId) ? prev : [...prev, studentId];
      return prev.filter((id) => id !== studentId);
    });
  }

  function toggleAllPromote(checked: boolean) {
    if (!checked) {
      setSelectedPromotionIds([]);
      return;
    }
    setSelectedPromotionIds(
      resultRows.map((row, idx) => rowStudentId(row, idx + 1)),
    );
  }

  function onOpenPreview() {
    if (!hasRequiredPromotionFilters) {
      const missing: string[] = [];
      if (!fromSectionId) missing.push("Promote From section");
      if (!toAyId) missing.push("Promote To academic year");
      if (!toGroupId) missing.push("Promote To course group");
      if (!toYearId) missing.push("Promote To course year");
      if (!effectiveToSectionId) missing.push("Promote To section");
      if (missing.length > 0) {
        toastError(new Error(`Please select: ${missing.join(", ")}`));
      } else {
        toastError(
          new Error("Please select valid Promote From and Promote To filters."),
        );
      }
      setFromFilterOpen(true);
      setToFilterOpen(true);
      return;
    }
    const validationError = validatePromotionRules({
      fromAyId,
      toAyId,
      fromYearId,
      toYearId,
      fromYears,
    });
    if (validationError) {
      toastError(new Error(validationError));
      return;
    }
    if (selectedPromotionIds.length === 0) {
      toastError(new Error("Please select at least one student to promote."));
      return;
    }
    setPreviewSearch("");
    setPreviewOpen(true);
  }

  async function onSubmitPromotion() {
    if (!hasRequiredPromotionFilters) {
      toastError(new Error("Promotion filters are incomplete."));
      setFromFilterOpen(true);
      setToFilterOpen(true);
      return;
    }
    if (previewYearWarning) {
      toastError(
        new Error(
          `You are try to promoting worng academic year : (${previewFromAy} - ${previewToAy})`,
        ),
      );
      return;
    }
    const validationError = validatePromotionRules({
      fromAyId,
      toAyId,
      fromYearId,
      toYearId,
      fromYears,
    });
    if (validationError) {
      toastError(new Error(validationError));
      return;
    }

    const selectedRows = resultRows.filter((row, idx) =>
      selectedPromotionIds.includes(rowStudentId(row, idx + 1)),
    );
    if (selectedRows.length === 0) {
      toastError(new Error("No students selected for promotion."));
      return;
    }

    const fromYearRow = fromYears.find(
      (r) => pickNum(r, YR) === Number(fromYearId),
    );
    const toYearRow = fromYears.find(
      (r) => pickNum(r, YR) === Number(toYearId),
    );
    const changeDate = toIsoDate(changeFrom);

    const angularPayload: Record<string, unknown> = {
      collegeId: fromCollegeId,
      academicYearId: toAyId,
      courseId: fromCourseId,
      courseGroupId: fromGroupId,
      toCourseYearId: toYearId,
      toGroupSectionId: effectiveToSectionId,
      fromCourseYearId: fromYearId,
      fromYearNo: yearNo(fromYearRow),
      toYearNo: yearNo(toYearRow),
      fromGroupSectionId: fromSectionId,
      fromDate: changeDate,
      toDate: changeDate,
      toCollegeId: fromCollegeId,
      toCourseId: fromCourseId,
      toCourseGroupId: fromGroupId,
      toAcademicYearId: toAyId,
      fromCourseGroupId: fromGroupId,
      studentIdsList: selectedRows,
    };

    setSubmittingPromotion(true);
    try {
      const data = await promoteStudents(angularPayload);
      const rows = parseResultRows(data);
      const success = data?.success !== false;
      setAttendanceRows(rows);
      setAttendanceMessage(
        rows.length > 0
          ? ""
          : success
            ? "Promotion completed."
            : "No academic batches found for this date.",
      );
      setPreviewOpen(false);
      if (success) {
        toastSuccess(
          typeof data?.message === "string"
            ? data.message
            : "Promotion submitted successfully",
        );
        await loadStudentList();
      } else {
        toastError(
          new Error(
            typeof data?.message === "string"
              ? data.message
              : "Promotion completed with warnings",
          ),
        );
        await loadStudentList();
      }
      if (!success || rows.length > 0) setAttendanceOpen(true);
    } catch (e) {
      setAttendanceRows([]);
      setAttendanceMessage(
        "Promotion submit failed. Please verify data and try again.",
      );
      setAttendanceOpen(true);
      toastError(e, "Promotion submit failed");
    } finally {
      setSubmittingPromotion(false);
    }
  }

  return (
    <FilteredPage
      title="Student Promotion"
      filtersCollapsible={false}
      filters={(
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded border border-border p-3">
            <h3 className="text-sm font-semibold text-primary">Promote From</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  label="College"
                  required
                  value={fromCollegeId ? String(fromCollegeId) : null}
                  onChange={(v) => setFromCollegeId(v ? Number(v) : null)}
                  options={mapCollegeOptsFrom(colleges)}
                  placeholder="Select College"
                  disabled={loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Academic Year"
                  required
                  value={fromAyId ? String(fromAyId) : null}
                  onChange={(v) => setFromAyId(v ? Number(v) : null)}
                  options={mapAyOptsFrom(fromAcademicYears)}
                  placeholder="Select Academic Year"
                  disabled={!fromCollegeId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Course"
                  required
                  value={fromCourseId ? String(fromCourseId) : null}
                  onChange={(v) => setFromCourseId(v ? Number(v) : null)}
                  options={mapCourseOptsFrom(fromCourses)}
                  placeholder="Select Course"
                  disabled={!fromAyId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Course Group"
                  required
                  value={fromGroupId ? String(fromGroupId) : null}
                  onChange={(v) => setFromGroupId(v ? Number(v) : null)}
                  options={mapGroupOptsFrom(fromGroups)}
                  placeholder="Select Course Group"
                  disabled={!fromCourseId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Course Year"
                  required
                  value={fromYearId ? String(fromYearId) : null}
                  onChange={(v) => setFromYearId(v ? Number(v) : null)}
                  options={mapYearOptsFrom(fromYears)}
                  placeholder="Select Course Year"
                  disabled={!fromGroupId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Section"
                  required
                  value={fromSectionId ? String(fromSectionId) : null}
                  onChange={(v) => setFromSectionId(parseSelectNumber(v))}
                  options={mapSectionOptsFrom(fromSections)}
                  placeholder="Select Section"
                  disabled={!fromYearId || loadingFilters}
                  searchable
                  className={selectClass()}
                />
              </div>
          </div>

          <div className="space-y-3 rounded border border-border p-3">
            <h3 className="text-sm font-semibold text-primary">Promote To</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  label="College"
                  value={toCollegeId ? String(toCollegeId) : null}
                  onChange={() => {}}
                  options={
                    toCollegeId
                      ? [{ value: String(toCollegeId), label: toCollegeLabel }]
                      : []
                  }
                  placeholder="College"
                  disabled
                  className={selectClass()}
                />
                <Select
                  label="Course"
                  value={toCourseId ? String(toCourseId) : null}
                  onChange={() => {}}
                  options={mapCourseOptsFrom(toCourses)}
                  placeholder="Course"
                  disabled
                  className={selectClass()}
                />
                <Select
                  label="Course Group"
                  value={toGroupId ? String(toGroupId) : null}
                  onChange={() => {}}
                  options={mapGroupOptsFrom(toGroups)}
                  placeholder="Course Group"
                  disabled
                  className={selectClass()}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  label="Academic Year"
                  required
                  value={toAyId ? String(toAyId) : null}
                  onChange={(v) => setToAyId(v ? Number(v) : null)}
                  options={mapAyOptsFrom(toAcademicYears)}
                  placeholder="Select Academic Year"
                  disabled={!toCollegeId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Course Year"
                  required
                  value={toYearId ? String(toYearId) : null}
                  onChange={(v) => setToYearId(v ? Number(v) : null)}
                  options={mapYearOptsFrom(toYears)}
                  placeholder="Select Course Year"
                  disabled={!toGroupId || loadingFilters}
                  className={selectClass()}
                />
                <Select
                  label="Section"
                  required
                  value={toSectionId ? String(toSectionId) : null}
                  onChange={(v) => setToSectionId(parseSelectNumber(v))}
                  options={mapSectionOptsFrom(toSections)}
                  placeholder="Select Section"
                  disabled={!toYearId || loadingFilters}
                  searchable
                  className={selectClass()}
                />
              </div>
            <DatePicker
              label="Change From"
              value={changeFrom}
              onChange={setChangeFrom}
              placeholder="Pick a date"
              className="max-w-xs"
            />
          </div>
        </div>
      )}
    >
      {loadingList && fromSectionId ? (
        <p className="text-xs text-muted-foreground">Loading students…</p>
      ) : null}

      {resultRows.length > 0 && (
        <div className="app-card p-4 space-y-3">
          <Input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search"
            className="max-w-xs h-8 text-xs"
          />
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Roll No.</th>
                  <th className="px-2 py-1 text-left">Student Name</th>
                  <th className="px-2 py-1 text-left">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={
                          selectedPromotionIds.length > 0 &&
                          selectedPromotionIds.length === resultRows.length
                        }
                        onChange={(e) => toggleAllPromote(e.target.checked)}
                      />{" "}
                      {selectedPromotionIds.length === resultRows.length &&
                      resultRows.length > 0
                        ? "UnMark All"
                        : "Mark All"}
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredResultRows.map((row, index) => (
                  <tr
                    key={`r-${rowStudentId(row, index + 1)}-${index}`}
                    className="border-t"
                  >
                    <td className="px-2 py-1">{resultRows.indexOf(row) + 1}</td>
                    <td className="px-2 py-1">
                      {pickText(row, ["rollNumber", "hallticketNumber"])}
                    </td>
                    <td className="px-2 py-1">
                      {pickText(row, ["firstName", "studentName"])}
                    </td>
                    <td className="px-2 py-1">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedPromotionIds.includes(
                            rowStudentId(row, resultRows.indexOf(row) + 1),
                          )}
                          onChange={(e) =>
                            togglePromote(
                              rowStudentId(row, resultRows.indexOf(row) + 1),
                              e.target.checked,
                            )
                          }
                        />{" "}
                        <span
                          className={
                            selectedPromotionIds.includes(
                              rowStudentId(row, resultRows.indexOf(row) + 1),
                            )
                              ? "text-emerald-700"
                              : "text-muted-foreground"
                          }
                        >
                          {selectedPromotionIds.includes(
                            rowStudentId(row, resultRows.indexOf(row) + 1),
                          )
                            ? "Promote"
                            : "Unpromote"}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-8 text-[12px]"
              disabled={selectedPromotionIds.length === 0}
              onClick={onOpenPreview}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {previewYearWarning ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You are try to promoting worng academic year : ({previewFromAy}{" "}
                - {previewToAy})
              </div>
            ) : null}
            <div className="rounded border border-sky-100 bg-sky-50/40 p-3 text-[14px] leading-7">
              <div>
                <span className="font-semibold">College :</span>{" "}
                {previewCollegeCode}
              </div>
              <div>
                <span className="font-semibold">Course :</span>{" "}
                {previewCourseCode} / {previewGroupCode}
              </div>
              <div>
                <span className="font-semibold">Promotion From :</span>{" "}
                {previewFromCourseYear} / Section {previewFromSection} (
                {previewFromAy})
              </div>
              <div>
                <span className="font-semibold">Promotion To :</span>{" "}
                {previewToCourseYear} / Section {previewToSection} (
                {previewToAy})
              </div>
            </div>
            <Input
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              placeholder="Search"
              className="max-w-sm h-8 text-xs"
            />
            <div className="max-h-[45vh] overflow-auto rounded border">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">SI.No</th>
                    <th className="px-2 py-1 text-left">Roll No.</th>
                    <th className="px-2 py-1 text-left">Student</th>
                    <th className="px-2 py-1 text-left">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {previewFilteredRows.map((row, index) => (
                    <tr
                      key={`preview-${rowStudentId(row, index + 1)}-${index}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1">{index + 1}</td>
                      <td className="px-2 py-1">
                        {pickText(row, ["hallticketNumber", "rollNumber"])}
                      </td>
                      <td className="px-2 py-1">
                        {pickText(row, ["studentName", "firstName"])}
                      </td>
                      <td className="px-2 py-1">
                        {pickText(row, ["mobileNumber", "mobile_number"])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="h-8 text-xs"
              disabled={submittingPromotion || previewYearWarning}
              onClick={onSubmitPromotion}
            >
              {submittingPromotion ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Students Attendance Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="inline-flex rounded border bg-amber-100 px-4 py-1.5 text-[13px] font-medium text-slate-800">
              Academic Batches
            </div>
            <div className="max-h-[45vh] overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">Sl.No</th>
                    <th className="px-2 py-1 text-left">Student</th>
                    <th className="px-2 py-1 text-left">Regulation</th>
                    <th className="px-2 py-1 text-left">Course</th>
                    <th className="px-2 py-1 text-left">From Date</th>
                    <th className="px-2 py-1 text-left">To Date</th>
                    <th className="px-2 py-1 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.length === 0 ? (
                    <tr className="border-t">
                      <td className="px-2 py-2 text-rose-600" colSpan={7}>
                        {attendanceMessage}
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((row, index) => (
                      <tr
                        key={attendanceRowKey(row, index)}
                        className="border-t"
                      >
                        <td className="px-2 py-1">{index + 1}</td>
                        <td className="px-2 py-1">
                          {pickText(row, [
                            "studentName",
                            "student_name",
                            "name",
                          ]) || "-"}
                        </td>
                        <td className="px-2 py-1">
                          {pickText(row, ["regulationCode", "regulation"]) ||
                            "-"}
                        </td>
                        <td className="px-2 py-1">
                          {pickText(row, ["courseName", "course"]) || "-"}
                        </td>
                        <td className="px-2 py-1">
                          {pickText(row, ["fromDate", "from_date"]) || "-"}
                        </td>
                        <td className="px-2 py-1">
                          {pickText(row, ["toDate", "to_date"]) || "-"}
                        </td>
                        <td className="px-2 py-1">
                          {pickText(row, ["reason"]) || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttendanceOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
