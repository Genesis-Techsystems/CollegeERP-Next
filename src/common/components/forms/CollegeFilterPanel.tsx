"use client";

/**
 * CollegeFilterPanel — reusable University → Course (→ Regulation) filter panel.
 *
 * Renders the standard filter grid used by grade-setup, max-marks-setup, and
 * similar pages that need college-level cascading filters.
 */

import type { ReactNode } from "react";
import type { CollegeWiseFilterRow, Regulation } from "@/types/exam-master";
import { Building2, GraduationCap, ScrollText } from "lucide-react";
import { Select } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GlobalFilterBar, GlobalFilterBarRow } from "./GlobalFilterBar";
import { GlobalFilterField } from "./GlobalFilterField";

interface CollegeFilterPanelProps {
  /** @deprecated Use PageHeader for the page title — kept for call-site compat */
  title?: string;
  /** @deprecated Ignored */
  description?: string;
  /** @deprecated Ignored */
  titleColorClassName?: string;
  /** @deprecated Filters are always visible */
  collapsible?: boolean;
  /** @deprecated Ignored */
  defaultCollapsed?: boolean;

  universities: CollegeWiseFilterRow[];
  selectedUniversityId: number | null;
  onUniversityChange: (id: number) => void;

  courses: CollegeWiseFilterRow[];
  selectedCourseId: number | null;
  onCourseChange: (id: number) => void;

  regulations?: Regulation[];
  selectedRegulationId?: number | null;
  onRegulationChange?: (id: number) => void;

  isForDisabled?: boolean;
  onIsForDisabledChange?: (checked: boolean) => void;

  isLoading?: boolean;

  children?: ReactNode;
}

export function CollegeFilterPanel({
  title,
  universities,
  selectedUniversityId,
  onUniversityChange,
  courses,
  selectedCourseId,
  onCourseChange,
  regulations,
  selectedRegulationId,
  onRegulationChange,
  isForDisabled,
  onIsForDisabledChange,
  isLoading,
  children,
}: CollegeFilterPanelProps) {
  const inlineActionWithDisabled =
    onIsForDisabledChange !== undefined && children !== undefined;

  return (
    <GlobalFilterBar title={title ?? "Filters"}>
      <GlobalFilterBarRow>
        <GlobalFilterField label="University" icon={Building2}>
          <Select
            value={
              selectedUniversityId != null ? String(selectedUniversityId) : null
            }
            onChange={(v) => v && onUniversityChange(Number(v))}
            options={universities.map((u) => ({
              value: String(u.fk_university_id),
              label: u.university_code ?? u.university_name ?? "",
            }))}
            placeholder={isLoading ? "Loading…" : "All universities"}
            disabled={isLoading}
            isLoading={isLoading}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Course" icon={GraduationCap}>
          <Select
            value={selectedCourseId != null ? String(selectedCourseId) : null}
            onChange={(v) => v && onCourseChange(Number(v))}
            options={courses.map((c) => ({
              value: String(c.fk_course_id),
              label: c.course_code ?? c.course_name ?? "",
            }))}
            placeholder="All courses"
            disabled={courses.length === 0}
          />
        </GlobalFilterField>

        {regulations !== undefined && onRegulationChange !== undefined && (
          <GlobalFilterField label="Regulation" icon={ScrollText}>
            <Select
              value={
                selectedRegulationId != null
                  ? String(selectedRegulationId)
                  : null
              }
              onChange={(v) => v && onRegulationChange(Number(v))}
              options={regulations.map((r) => ({
                value: String(r.regulationId),
                label: r.regulationCode ?? "",
              }))}
              placeholder="All regulations"
              disabled={regulations.length === 0}
            />
          </GlobalFilterField>
        )}

        {onIsForDisabledChange !== undefined && (
          <GlobalFilterField
            label="Options"
            className="global-filter-field--inline global-filter-field--shrink global-filter-field--options"
          >
            <div className="flex flex-nowrap items-center gap-3 min-h-9">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isForDisabledFilter"
                  checked={isForDisabled}
                  onCheckedChange={(v) => onIsForDisabledChange(Boolean(v))}
                />
                <Label
                  htmlFor="isForDisabledFilter"
                  className="cursor-pointer text-[13px] font-medium text-foreground whitespace-nowrap"
                >
                  For Disabled Students
                </Label>
              </div>
              {inlineActionWithDisabled ? children : null}
            </div>
          </GlobalFilterField>
        )}

        {!inlineActionWithDisabled && children ? (
          <GlobalFilterField
            label="Action"
            className="global-filter-field--shrink global-filter-field--action"
          >
            {children}
          </GlobalFilterField>
        ) : null}
      </GlobalFilterBarRow>
    </GlobalFilterBar>
  );
}
