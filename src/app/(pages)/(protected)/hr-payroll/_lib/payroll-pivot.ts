type AnyRow = Record<string, unknown>;

export type PayrollPivotCategory = {
  payroll_category_code: string;
  payroll_category_name: string;
  PayMonth: unknown;
  payroll_category_type: string;
};

export type PayrollPivotAmountCell = {
  payroll_category_code: string;
  payroll_category_name: string;
  amt: string | number;
  payroll_category_type: string;
};

export type PayrollPivotRow = {
  fk_emp_id: number;
  PayMonth: unknown;
  Faculty: string;
  Emp_Designation: string;
  Emp_Department: string;
  gross_pay: unknown;
  net_pay: unknown;
  bank_acc_no: unknown;
  gd_code: unknown;
  SNo: unknown;
  emp_number: unknown;
  subjectTimetable: PayrollPivotAmountCell[];
};

function normKey(key: string): string {
  return key.toLowerCase().replace(/_/g, "");
}

/** Read snake_case or camelCase API fields (0 is valid). */
function pickField(row: AnyRow, ...names: string[]): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) {
      const v = row[name];
      if (v !== undefined && v !== null && v !== "") return v;
      if (typeof v === "number" && v === 0) return 0;
    }
  }
  const byNorm = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    byNorm.set(normKey(k), v);
  }
  for (const name of names) {
    const v = byNorm.get(normKey(name));
    if (v !== undefined && v !== null && v !== "") return v;
    if (typeof v === "number" && v === 0) return 0;
  }
  return undefined;
}

function isBlankPay(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function isNumericZero(value: unknown): boolean {
  return value === 0 || value === "0";
}

/**
 * Pay fields sometimes appear as `gross_pay: 0` on one alias and a real
 * value on another (`grossPay`). Prefer the first non-zero candidate.
 */
function pickPayField(row: AnyRow, ...names: string[]): unknown {
  let fallback: unknown = undefined;
  const take = (v: unknown): unknown | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (!isNumericZero(v) && !Number.isNaN(Number(v))) return v;
    if (fallback === undefined) fallback = v;
    return undefined;
  };

  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) {
      const hit = take(row[name]);
      if (hit !== undefined) return hit;
    }
  }
  const byNorm = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    byNorm.set(normKey(k), v);
  }
  for (const name of names) {
    const hit = take(byNorm.get(normKey(name)));
    if (hit !== undefined) return hit;
  }
  return fallback;
}

/** Prefer a later category-line pay value when the first line was blank/zero. */
function preferPayValue(current: unknown, incoming: unknown): unknown {
  if (isBlankPay(incoming)) return current;
  if (isBlankPay(current)) return incoming;
  if (isNumericZero(current) && !isNumericZero(incoming)) return incoming;
  return current;
}

/** Angular compares == 'E' | 'D' | 'M'; also accept full words from some payloads. */
export function normalizePayrollType(raw: unknown): string {
  const t = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!t) return "";
  if (t === "E" || t.startsWith("EARN")) return "E";
  if (t === "D" || t.startsWith("DED")) return "D";
  if (t === "M" || t.startsWith("MAN")) return "M";
  return t;
}

/** Angular pre-payroll / monthly payroll pivot builder. */
export function buildPayrollPivotRows(rawRows: AnyRow[]): {
  keys: PayrollPivotCategory[];
  pivotRows: PayrollPivotRow[];
} {
  const keys: PayrollPivotCategory[] = [];
  for (const row of rawRows) {
    const name = String(
      pickField(row, "payroll_category_name", "payrollCategoryName") ?? "",
    );
    const month = pickField(row, "PayMonth", "payMonth");
    const type = normalizePayrollType(
      pickField(row, "payroll_category_type", "payrollCategoryType"),
    );
    const exists = keys.some(
      (k) =>
        k.payroll_category_name === name &&
        k.PayMonth === month &&
        k.payroll_category_type === type,
    );
    if (!exists) {
      keys.push({
        payroll_category_code: String(
          pickField(row, "payroll_category_code", "payrollCategoryCode") ?? "",
        ),
        payroll_category_name: name,
        PayMonth: month,
        payroll_category_type: type,
      });
    }
  }

  const pivotRows: PayrollPivotRow[] = [];

  for (const row of rawRows) {
    const empId = Number(pickField(row, "fk_emp_id", "fkEmpId") ?? 0);
    const catName = String(
      pickField(row, "payroll_category_name", "payrollCategoryName") ?? "",
    );
    const catType = normalizePayrollType(
      pickField(row, "payroll_category_type", "payrollCategoryType"),
    );
    let pivot = pivotRows.find((p) => p.fk_emp_id === empId);

    if (!pivot) {
      pivot = {
        fk_emp_id: empId,
        PayMonth: pickField(row, "PayMonth", "payMonth"),
        Faculty: String(
          pickField(row, "Emp_Name", "emp_name", "EmpName") ?? "",
        ),
        Emp_Designation: String(
          pickField(
            row,
            "Emp_Designation",
            "emp_designation",
            "EmpDesignation",
          ) ?? "",
        ),
        Emp_Department: String(
          pickField(row, "Emp_Department", "emp_department", "EmpDepartment") ??
            "",
        ),
        gross_pay: pickPayField(row, "gross_pay", "grossPay", "Gross_Pay"),
        net_pay: pickPayField(row, "net_pay", "netPay", "Net_Pay"),
        bank_acc_no: pickField(row, "bank_acc_no", "bankAccNo", "bank_ac_no"),
        gd_code: pickField(row, "gd_code", "gdCode"),
        SNo: pickField(row, "SNo", "sno", "sNo"),
        emp_number: pickField(row, "emp_number", "empNumber"),
        subjectTimetable: keys.map((k) => ({
          payroll_category_code: k.payroll_category_code,
          payroll_category_name: k.payroll_category_name,
          amt: "-",
          payroll_category_type: k.payroll_category_type,
        })),
      };
      pivotRows.push(pivot);
    } else {
      // Category lines often repeat pay totals; keep first non-zero (Angular
      // only reads the first emp line, but some payloads put 0 on that line).
      pivot.gross_pay = preferPayValue(
        pivot.gross_pay,
        pickPayField(row, "gross_pay", "grossPay", "Gross_Pay"),
      );
      pivot.net_pay = preferPayValue(
        pivot.net_pay,
        pickPayField(row, "net_pay", "netPay", "Net_Pay"),
      );
      if (isBlankPay(pivot.bank_acc_no)) {
        const bank = pickField(row, "bank_acc_no", "bankAccNo", "bank_ac_no");
        if (!isBlankPay(bank)) pivot.bank_acc_no = bank;
      }
    }

    // Angular always assigns `amount` (including 0).
    const amount = pickField(row, "amount", "Amount", "amt");
    const cell = pivot.subjectTimetable.find(
      (c) =>
        c.payroll_category_name === catName &&
        c.payroll_category_type === catType,
    );
    if (cell && amount !== undefined) {
      cell.amt = amount as string | number;
    }
  }

  return { keys, pivotRows };
}

export function splitPivotCategoryColumns(
  keys: PayrollPivotCategory[],
  basicCode = "BASIC",
) {
  const basic = basicCode.toUpperCase();
  const earnings = keys.filter(
    (k) =>
      normalizePayrollType(k.payroll_category_type) === "E" &&
      String(k.payroll_category_code).toUpperCase() !== basic,
  );
  const deductions = keys.filter(
    (k) => normalizePayrollType(k.payroll_category_type) === "D",
  );
  const management = keys.filter(
    (k) => normalizePayrollType(k.payroll_category_type) === "M",
  );
  return { earnings, deductions, management };
}

/** Stable AG Grid field for a pivot category amount cell. */
export function payrollCategoryField(
  type: string,
  code: string,
  name: string,
): string {
  const safe = `${code || name}`.replace(/[^\w]+/g, "_");
  return `cat_${normalizePayrollType(type) || type}_${safe}`;
}

function formatAmt(value: unknown): string {
  // Angular templates bind raw values (no toFixed).
  if (value == null || value === "") return "";
  if (value === "-") return "-";
  return String(value);
}

/** Angular `{{ gross_pay - net_pay }}` — JS coerces null/undefined to 0. */
function angularTotalDed(gross: unknown, net: unknown): string {
  if (isBlankPay(gross) && isBlankPay(net)) return "";
  const g = Number(gross ?? 0);
  const n = Number(net ?? 0);
  if (Number.isNaN(g) || Number.isNaN(n)) return "";
  return String(g - n);
}

/**
 * Flatten Angular pivot rows into AG Grid-friendly records
 * (one field per category amount + basic / totals).
 */
export function flattenPayrollPivotRows(
  rows: PayrollPivotRow[],
  basicCode = "BASIC",
): AnyRow[] {
  return rows.map((row, index) => {
    const flat: AnyRow = {
      fk_emp_id: row.fk_emp_id,
      SNo: row.SNo ?? index + 1,
      emp_number: row.emp_number ?? "",
      Faculty: row.Faculty ?? "",
      Emp_Designation: row.Emp_Designation ?? "",
      Emp_Department: row.Emp_Department ?? "",
      gd_code: row.gd_code ?? "",
      bank_acc_no: formatAmt(row.bank_acc_no),
      gross_pay: formatAmt(row.gross_pay),
      net_pay: formatAmt(row.net_pay),
      total_ded: angularTotalDed(row.gross_pay, row.net_pay),
      basic: "",
    };

    for (const cell of row.subjectTimetable) {
      const type = normalizePayrollType(cell.payroll_category_type);
      const code = String(cell.payroll_category_code ?? "").toUpperCase();
      const field = payrollCategoryField(
        type,
        cell.payroll_category_code,
        cell.payroll_category_name,
      );
      flat[field] = formatAmt(cell.amt);
      if (type === "E" && code === basicCode.toUpperCase()) {
        flat.basic = formatAmt(cell.amt);
      }
    }
    return flat;
  });
}
