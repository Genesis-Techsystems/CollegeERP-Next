import type { SelectOption } from "@/common/components/select";

export const DEFAULT_EMPLOYEE_PHOTO =
  "/assets/images/avatars/default_Student.png";

type EmpRow = Record<string, unknown>;

/** Angular mat-select-trigger — `Ramya Sree ( AMS-10582023227 )`. */
export function staffDiaryEmployeeTriggerLabel(row: EmpRow): string {
  const name = String(row.firstName ?? row.employee_name ?? "").trim();
  const num = String(row.empNumber ?? row.emp_number ?? "").trim();
  if (name && num) return `${name} ( ${num} )`;
  return name || num || String(row.employeeId ?? row.employee_id ?? "");
}

function staffDiaryEmployeeMeta(row: EmpRow): string {
  const college = row.collegeCode ?? row.college_code;
  if (college == null || String(college).trim() === "") return "";
  const dept = String(
    row.empDeptName ?? row.deptName ?? row.dept_name ?? "",
  ).trim();
  const designation = String(
    row.designation ?? row.designationName ?? row.designation_name ?? "",
  ).trim();
  return [String(college), dept, designation].filter(Boolean).join(" / ");
}

/** Angular employee-list / ngx-mat-select-search option row. */
export function staffDiaryEmployeeSelectOption(row: EmpRow): SelectOption {
  const inactive =
    String(row.empStatus ?? row.emp_status ?? "").toUpperCase() === "INACTV";
  const firstName = String(row.firstName ?? row.employee_name ?? "").trim();
  const empNumber = String(row.empNumber ?? row.emp_number ?? "").trim();
  const meta = staffDiaryEmployeeMeta(row);
  const employeeId = Number(
    row.employeeId ?? row.employee_id ?? row.fk_emp_id ?? row.id ?? 0,
  );

  return {
    value: String(employeeId),
    label: staffDiaryEmployeeTriggerLabel(row),
    labelNode: (
      <>
        <span className="font-medium text-[#3d3de3]">{firstName}</span>
        {empNumber ? (
          <span className="font-medium text-blue-600"> ( {empNumber})</span>
        ) : null}
      </>
    ),
    description: meta || undefined,
    image: {
      src:
        String(row.photoPath ?? row.photo_path ?? "").trim() ||
        DEFAULT_EMPLOYEE_PHOTO,
      fallbackSrc: DEFAULT_EMPLOYEE_PHOTO,
      className: inactive
        ? "!h-[60px] !w-[60px] border-2 border-[#f44336]"
        : "!h-[60px] !w-[60px] border-2 border-[#34e834]",
    },
  };
}
