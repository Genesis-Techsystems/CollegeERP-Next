import type { CompleteStdFeeRawRow } from "@/services";

export type YearFeeAmounts = {
  year_name: string;
  gross_amount: number;
  discount_amount: number;
  college_fee: number;
  Scholarship_Hold_Amount: number;
  scholarship_amount: number;
  paid_amount: number;
  balance_amount: number;
};

export type CompleteFeeDueRow = {
  rollNumber: string;
  firstName: string;
  Batch: string;
  student_quota: string;
  Student_Mobile: string;
  hallticket_number: string;
  feeAmountsByYear: YearFeeAmounts[];
  amounts: number[];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyYear(yearName: string): YearFeeAmounts {
  return {
    year_name: yearName,
    gross_amount: 0,
    discount_amount: 0,
    college_fee: 0,
    Scholarship_Hold_Amount: 0,
    scholarship_amount: 0,
    paid_amount: 0,
    balance_amount: 0,
  };
}

function emptyStudent(raw: CompleteStdFeeRawRow): CompleteFeeDueRow {
  return {
    rollNumber: String(raw.hallticket_number ?? ""),
    firstName: String(raw.Student_Name ?? ""),
    Batch: String(raw.Batch ?? ""),
    student_quota: String(raw.student_quota ?? ""),
    Student_Mobile: String(raw.Student_Mobile ?? ""),
    hallticket_number: String(raw.hallticket_number ?? ""),
    feeAmountsByYear: [
      emptyYear("1"),
      emptyYear("2"),
      emptyYear("3"),
      emptyYear("4"),
    ],
    amounts: [],
  };
}

function applyYearAmounts(year: YearFeeAmounts, raw: CompleteStdFeeRawRow) {
  year.gross_amount += num(raw.gross_amount);
  year.discount_amount += num(raw.discount_amount);
  year.college_fee += num(raw.college_fee);
  year.Scholarship_Hold_Amount += num(raw.Scholarship_Hold_Amount);
  year.scholarship_amount += num(raw.scholarship_amount);
  year.paid_amount += num(raw.paid_amount);
  year.balance_amount += num(raw.balance_amount);
}

function flattenAmounts(row: CompleteFeeDueRow): number[] {
  const amounts: number[] = [];
  for (const y of row.feeAmountsByYear) {
    amounts.push(
      y.gross_amount,
      y.discount_amount,
      y.college_fee,
      y.Scholarship_Hold_Amount,
      y.scholarship_amount,
      y.paid_amount,
      y.balance_amount,
    );
  }
  return amounts;
}

/**
 * Angular student-complete-fee-details pivot: one row per hallticket with
 * year_name 1–4 amount buckets flattened to `amounts`.
 */
export function buildCompleteFeeDueList(
  rawRows: CompleteStdFeeRawRow[],
): CompleteFeeDueRow[] {
  const byRoll = new Map<string, CompleteFeeDueRow>();

  for (const raw of rawRows) {
    const roll = String(raw.hallticket_number ?? "");
    let student = byRoll.get(roll);
    if (!student) {
      student = emptyStudent(raw);
      byRoll.set(roll, student);
    }
    const yearName = String(raw.year_name ?? "");
    const year = student.feeAmountsByYear.find((y) => y.year_name === yearName);
    if (year) applyYearAmounts(year, raw);
  }

  return Array.from(byRoll.values()).map((row) => ({
    ...row,
    amounts: flattenAmounts(row),
  }));
}

export function formatFeeAmt(value: number): string {
  if (!value) return "-";
  return value.toFixed(2);
}
