"use client";

import type { SelectOption } from "./Select";

/** Same default avatar Angular uses for employee typeahead (`onerror`). */
export const DEFAULT_EMPLOYEE_PHOTO =
  "/assets/images/avatars/default_Student.png";

type AnyRow = Record<string, unknown>;

export type EmployeeSearchOptionLayout = "name-first" | "number-first";

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "")
      return String(value).trim();
  }
  return "";
}

function pickEmployeeId(row: AnyRow): string {
  for (const key of ["employeeId", "empId", "fk_employee_id"]) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return String(n);
  }
  return pickText(row, ["employeeId", "empId"]);
}

function employeeMetaLine(row: AnyRow): string {
  return [
    pickText(row, ["collegeCode"]),
    pickText(row, ["empDeptName", "deptName", "departmentName"]),
    pickText(row, ["designation", "designationName"]),
  ]
    .filter(Boolean)
    .join(" / ");
}

function empStateClass(state: string): string {
  switch (state.toUpperCase()) {
    case "INCOLLEGE":
      return "font-bold text-green-600";
    case "RESIGN":
    case "DTND":
    case "DISCONTINUED":
      return "font-bold text-red-600";
    case "PASSEDOUT":
      return "font-bold text-[#461eb6]";
    case "DETAINRECOMMENDED":
      return "font-bold text-orange-600";
    default:
      return "font-medium text-blue-600";
  }
}

/** Closed-select text: `P Priyanka (EMPN1008)`. */
export function employeeSearchTriggerLabel(row: AnyRow): string {
  const name = pickText(row, ["firstName", "employeeName", "empName"]);
  const number = pickText(row, ["empNumber"]);
  if (name && number) return `${name} (${number})`;
  return name || number || pickEmployeeId(row);
}

/**
 * Angular employee typeahead option: photo + green/red ring, name / emp number,
 * then `college / dept / designation` (and optional empState).
 */
export function toEmployeeSearchSelectOption(
  row: AnyRow,
  overrides?: Partial<Pick<SelectOption, "value" | "disabled">> & {
    /** `number-first` matches Faculty Performance Assessment Angular template. */
    layout?: EmployeeSearchOptionLayout;
    triggerLabel?: string;
  },
): SelectOption | null {
  const value = overrides?.value ?? pickEmployeeId(row);
  if (!value) return null;

  const name = pickText(row, ["firstName", "employeeName", "empName"]);
  const number = pickText(row, ["empNumber"]);
  const inactive = pickText(row, ["empStatus"]).toUpperCase() === "INACTV";
  const photo = pickText(row, [
    "photoPath",
    "empPhotoPath",
    "employeePhotoPath",
  ]);
  const description = employeeMetaLine(row);
  const empState = pickText(row, ["empState"]);
  const label = overrides?.triggerLabel ?? employeeSearchTriggerLabel(row);
  const layout = overrides?.layout ?? "name-first";

  const labelNode =
    layout === "number-first" ? (
      <>
        <span className="font-medium text-[#042956]">{number || label}</span>
        {name ? (
          <span className="font-medium text-[#042956]"> ( {name} )</span>
        ) : null}
      </>
    ) : (
      <>
        <span className="font-medium text-[#042956]">{name || label}</span>
        {number ? (
          <span className="font-medium text-[#042956]"> ( {number} )</span>
        ) : null}
      </>
    );

  return {
    value,
    label,
    title: [label, description, empState].filter(Boolean).join(" — "),
    disabled: overrides?.disabled,
    labelNode,
    description:
      description || empState ? (
        <>
          {description ? (
            <span className="font-medium text-[#7b7b7b]">{description}</span>
          ) : null}
          {description && empState ? " " : null}
          {empState ? (
            <span className={empStateClass(empState)}>{empState}</span>
          ) : null}
        </>
      ) : undefined,
    image: {
      src: photo || DEFAULT_EMPLOYEE_PHOTO,
      fallbackSrc: DEFAULT_EMPLOYEE_PHOTO,
      className: inactive
        ? "h-[60px] w-[60px] border-2 border-[#f44336]"
        : "h-[60px] w-[60px] border-2 border-[#34e834]",
    },
  };
}

export function toEmployeeSearchSelectOptions(
  rows: Array<AnyRow | null | undefined> | unknown[],
  overrides?: Parameters<typeof toEmployeeSearchSelectOption>[1],
): SelectOption[] {
  const out: SelectOption[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const option = toEmployeeSearchSelectOption(row as AnyRow, overrides);
    if (option) out.push(option);
  }
  return out;
}
