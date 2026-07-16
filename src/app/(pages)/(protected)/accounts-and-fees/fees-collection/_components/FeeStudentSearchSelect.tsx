"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/common/components/select";
import { toastError } from "@/lib/toast";
import {
  searchStudentsForFeeCollection,
  searchStudentsInCollege,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import { studentFromPayQueryParams } from "../_lib/pay-fees-params";

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? "Student";
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId;
  return id ? `${name} (${id})` : name;
}

export type FeeStudentSearchSelectProps = {
  value: string | null;
  selectedStudent: StudentFeeSearchRow | null;
  onChange: (
    studentId: string | null,
    student: StudentFeeSearchRow | null,
  ) => void;
  /** When set, search is scoped to college (Angular fee-receipt-update parity). */
  collegeId?: number | null;
  /** Optional course / group filters (Angular allocate-structure-to-student). */
  courseId?: number | null;
  courseGroupId?: number | null;
  /** Hydrate from URL query (studentId / rollNumber / hallTicketNo). */
  searchParams?: URLSearchParams;
  className?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

/**
 * Reusable student typeahead for fee-collection screens (bus / hostel / payment lists).
 * Angular parity: live search after 5+ characters.
 */
export function FeeStudentSearchSelect({
  value,
  selectedStudent,
  onChange,
  collegeId,
  courseId,
  courseGroupId,
  searchParams,
  className,
  label = "Student",
  placeholder = "Search by student name or roll no.",
  required = true,
  clearable = true,
  disabled = false,
}: FeeStudentSearchSelectProps) {
  const appliedQueryKey = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentFeeSearchRow[]>([]);

  const onSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < 5) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const result =
          collegeId != null && collegeId > 0
            ? await searchStudentsInCollege(collegeId, q, {
                courseId: courseId && courseId > 0 ? courseId : undefined,
                courseGroupId:
                  courseGroupId && courseGroupId > 0
                    ? courseGroupId
                    : undefined,
              })
            : await searchStudentsForFeeCollection(q);
        setRows(Array.isArray(result) ? result : []);
      } catch (e) {
        toastError(e, "Student search failed");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [collegeId, courseId, courseGroupId],
  );

  useEffect(() => {
    setRows([]);
  }, [collegeId, courseId, courseGroupId]);

  useEffect(() => {
    if (!searchParams) return;
    const roll = searchParams.get("rollNumber")?.trim() ?? "";
    const hall = searchParams.get("hallTicketNo")?.trim() ?? "";
    const sid = searchParams.get("studentId");
    if (!roll && !hall && !sid) return;

    const key = searchParams.toString();
    if (appliedQueryKey.current === key) return;
    appliedQueryKey.current = key;

    const fromUrl = studentFromPayQueryParams(new URLSearchParams(key));
    if (fromUrl) onChange(String(fromUrl.studentId), fromUrl);

    void (async () => {
      const q = roll.length >= 2 ? roll : hall.length >= 2 ? hall : "";
      if (!q) return;
      setLoading(true);
      try {
        const result = await searchStudentsForFeeCollection(q);
        setRows(result);
        const pick = sid
          ? (result.find((r) => String(r.studentId) === sid) ??
            result[0] ??
            null)
          : (result[0] ?? null);
        if (pick) onChange(String(pick.studentId), pick);
        else if (fromUrl) onChange(String(fromUrl.studentId), fromUrl);
      } catch (e) {
        toastError(e, "Student search failed");
        if (fromUrl) onChange(String(fromUrl.studentId), fromUrl);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, onChange]);

  const options = useMemo(() => {
    const base = rows.map((s) => ({
      value: String(s.studentId),
      label: studentOptionLabel(s),
    }));
    if (value && selectedStudent && !base.some((o) => o.value === value)) {
      return [{ value, label: studentOptionLabel(selectedStudent) }, ...base];
    }
    return base;
  }, [rows, value, selectedStudent]);

  function handleChange(v: string | null) {
    if (!v) {
      onChange(null, null);
      return;
    }
    const row =
      rows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v
        ? selectedStudent
        : null);
    onChange(v, row);
  }

  return (
    <Select
      className={className}
      label={label}
      required={required}
      value={value}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      searchable
      onSearch={(t) => void onSearch(t)}
      isLoading={loading}
      clearable={clearable}
      disabled={disabled}
    />
  );
}
