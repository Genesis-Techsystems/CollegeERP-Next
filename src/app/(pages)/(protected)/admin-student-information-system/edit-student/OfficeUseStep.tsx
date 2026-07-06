"use client";

import { Monitor } from "lucide-react";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSectionHeader } from "./FormSectionHeader";
import {
  EDIT_PLACEHOLDERS,
  entityOptions,
  gdOptions,
  parseDate,
  txt,
  type AnyRow,
} from "./edit-student-utils";

export interface OfficeUseStepProps {
  data: AnyRow;
  onChange: (patch: Partial<AnyRow>) => void;
  colleges: AnyRow[];
  academicYears: AnyRow[];
  courses: AnyRow[];
  courseGroups: AnyRow[];
  courseYears: AnyRow[];
  quotas: AnyRow[];
  regulations: AnyRow[];
  batches: AnyRow[];
  studentTypes: AnyRow[];
  onCollegeChange: (collegeId: number | null) => void;
  onCourseChange: (courseId: number | null) => void;
  onCourseGroupChange: (courseGroupId: number | null) => void;
}

export function OfficeUseStep({
  data,
  onChange,
  colleges,
  academicYears,
  courses,
  courseGroups,
  courseYears,
  quotas,
  regulations,
  batches,
  studentTypes,
  onCollegeChange,
  onCourseChange,
  onCourseGroupChange,
}: OfficeUseStepProps) {
  return (
    <div className="space-y-4">
      <FormSectionHeader icon={Monitor} title="For Office Use Only" />

      <div className="space-y-2 px-1">
        <h3 className="text-xs font-semibold text-foreground">
          Select Class Hierarchy <span className="text-destructive">*</span>
        </h3>
        <div className="grid gap-3 rounded-lg border border-sky-200/80 bg-slate-50/80 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="College"
            placeholder={EDIT_PLACEHOLDERS.college}
            value={data.collegeId ? String(data.collegeId) : ""}
            onChange={(v) => onCollegeChange(v ? Number(v) : null)}
            options={entityOptions(
              colleges,
              ["collegeId"],
              ["collegeCode", "collegeName"],
            )}
            searchable
            required
          />
          <Select
            label="Academic Year"
            placeholder={EDIT_PLACEHOLDERS.academicYear}
            value={data.academicYearId ? String(data.academicYearId) : ""}
            onChange={(v) => onChange({ academicYearId: v ? Number(v) : null })}
            options={entityOptions(
              academicYears,
              ["academicYearId"],
              ["academicYear", "academic_year"],
            )}
            searchable
            required
          />
          <Select
            label="Course"
            placeholder={EDIT_PLACEHOLDERS.course}
            value={data.courseId ? String(data.courseId) : ""}
            onChange={(v) => onCourseChange(v ? Number(v) : null)}
            options={entityOptions(
              courses,
              ["courseId"],
              ["courseCode", "courseName"],
            )}
            searchable
            required
          />
          <Select
            label="Course Group"
            placeholder={EDIT_PLACEHOLDERS.courseGroup}
            value={data.courseGroupId ? String(data.courseGroupId) : ""}
            onChange={(v) => onCourseGroupChange(v ? Number(v) : null)}
            options={entityOptions(
              courseGroups,
              ["courseGroupId"],
              ["groupCode", "courseGroupCode"],
            )}
            searchable
            required
          />
          <Select
            label="Course Year"
            placeholder={EDIT_PLACEHOLDERS.courseYear}
            value={data.courseYearId ? String(data.courseYearId) : ""}
            onChange={(v) => onChange({ courseYearId: v ? Number(v) : null })}
            options={entityOptions(
              courseYears,
              ["courseYearId"],
              ["courseYearName", "courseYearCode"],
            )}
            searchable
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Quota"
          placeholder={EDIT_PLACEHOLDERS.quota}
          value={data.quotaId ? String(data.quotaId) : ""}
          onChange={(v) => onChange({ quotaId: v ? Number(v) : null })}
          options={gdOptions(quotas)}
          searchable
          clearable
        />
        <Select
          label="Regulation"
          placeholder={EDIT_PLACEHOLDERS.regulation}
          value={data.regulationId ? String(data.regulationId) : ""}
          onChange={(v) => onChange({ regulationId: v ? Number(v) : null })}
          options={entityOptions(
            regulations,
            ["regulationId"],
            ["regulationName", "regulationCode"],
          )}
          searchable
          clearable
        />
        <Select
          label="Batch"
          placeholder={EDIT_PLACEHOLDERS.batch}
          value={data.batchId ? String(data.batchId) : ""}
          onChange={(v) => onChange({ batchId: v ? Number(v) : null })}
          options={entityOptions(batches, ["batchId"], ["batchName"])}
          searchable
          clearable
        />
        <div className="space-y-1">
          <Label className="text-xs">Application Number</Label>
          <Input value={txt(data, ["applicationNumber"])} disabled readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Reference Application Number</Label>
          <Input
            placeholder={EDIT_PLACEHOLDERS.refApplicationNo}
            value={txt(data, ["refApplicationNo"])}
            onChange={(e) => onChange({ refApplicationNo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Admission Date</Label>
          <DatePicker
            placeholder={EDIT_PLACEHOLDERS.admissionDate}
            value={parseDate(data.adminssionDate ?? data.admissionDate)}
            onChange={(d) => onChange({ adminssionDate: d })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date Of Registration</Label>
          <DatePicker
            placeholder={EDIT_PLACEHOLDERS.registrationDate}
            value={parseDate(data.dateOfRegistration)}
            onChange={(d) => onChange({ dateOfRegistration: d })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Receipt Number</Label>
          <Input
            placeholder={EDIT_PLACEHOLDERS.receiptNo}
            value={txt(data, ["receiptNo"])}
            onChange={(e) => onChange({ receiptNo: e.target.value })}
          />
        </div>
        <Select
          label="Student Types"
          placeholder={EDIT_PLACEHOLDERS.studentType}
          value={data.studentTypeId ? String(data.studentTypeId) : ""}
          onChange={(v) => onChange({ studentTypeId: v ? Number(v) : null })}
          options={gdOptions(studentTypes)}
          searchable
          clearable
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Checkbox
            checked={Boolean(data.isLateral)}
            onCheckedChange={(c) => onChange({ isLateral: c === true })}
          />
          Is Lateral
        </label>
      </div>
    </div>
  );
}
