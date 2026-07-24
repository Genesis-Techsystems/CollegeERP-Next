/** Angular `CONSTANTS.certificateFor`. */
export const CERTIFICATE_FOR_OPTIONS = [
  { value: "Train Pass.", label: "Train Pass" },
  { value: "Bus Pass.", label: "Bus Pass" },
  { value: "Bank Loan.", label: "Bank Loan" },
  { value: "Scholarship.", label: "Scholarship" },
  { value: "Conduct.", label: "Conduct" },
  { value: "Higher Education.", label: "Higher Education" },
  { value: "Job Purpose.", label: "Job Purpose" },
  { value: "VISA Purpose.", label: "VISA Purpose" },
  { value: "SI Events.", label: "SI Events" },
  { value: "Constable Events.", label: "Constable Events" },
  { value: "Job In Revenue Department.", label: "Job In Revenue Department" },
  {
    value: "Job In Electrical Department.",
    label: "Job In Electrical Department",
  },
  { value: "E-Litmus Exam.", label: "E-Litmus Exam" },
  { value: "Army Rally.", label: "Army Rally" },
  { value: "Sports.", label: "Sports" },
  { value: "Passport.", label: "Passport" },
  { value: "Internship.", label: "Internship" },
  { value: "OTHER", label: "Other" },
] as const;

export const COURSE_COMPLETION_FOR_OPTIONS = [
  { value: "Higher Studies", label: "Higher Studies" },
  { value: "Job", label: "Job" },
] as const;

export const PASSOUT_MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((month) => ({ value: month, label: month }));

export function buildPassoutYearOptions(): { value: string; label: string }[] {
  const max = new Date().getFullYear();
  const min = max - 9;
  const years: { value: string; label: string }[] = [];
  for (let year = max; year >= min; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}

export const CUSTODIAN_COLLEGE_OPTIONS = [
  { value: "1", label: "Degree" },
  { value: "2", label: "B.Tech" },
] as const;
