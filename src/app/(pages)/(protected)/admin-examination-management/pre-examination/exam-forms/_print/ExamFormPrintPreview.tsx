"use client";

import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";

type AnyRow = Record<string, any>;

export type ExamFormPreviewMeta = {
  courseYear: string;
  logoUrl?: string;
  groupName?: string;
};

const g = (r: AnyRow | undefined, keys: string[]): string => {
  if (!r) return "";
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

function fmtDate(v: unknown): string {
  const s = v ? String(v).slice(0, 10) : "";
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(v ?? "");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function ExamFormPrintPreview({
  students,
  meta,
  orgCode,
}: {
  students: AnyRow[];
  meta: ExamFormPreviewMeta;
  orgCode: string;
}) {
  const head = students[0] ?? {};
  const logoSrc = meta.logoUrl || DEFAULT_COLLEGE_LOGO;
  const collegeName = g(head, ["college_name", "collegeName"]);
  const groupCode =
    g(head, ["group_code", "groupCode"]) || meta.groupName || "";
  const subjectName = g(head, ["subject_name", "subjectName"]);
  const subjectCode = g(head, ["subject_code", "subjectCode"]);
  const examDate = head.exam_date ?? head.examDate;

  if (orgCode === "SUK") {
    return null;
  }

  return (
    <div className="mx-auto w-[990px] max-w-full bg-white p-2 font-sans text-black">
      <div className="flex items-start justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          className="h-20 w-20 shrink-0 object-contain"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.src = DEFAULT_COLLEGE_LOGO;
          }}
        />
        <div className="flex-1 text-center">
          <p className="mt-2 text-[23px] font-semibold leading-tight">
            {collegeName}
          </p>
          <p className="pt-2 text-[23px] font-semibold">EXAM FORM</p>
        </div>
      </div>

      <div className="mx-auto mt-5 w-[90%]">
        <table className="mb-5 w-full border-collapse border border-black text-center text-[14px]">
          <tbody>
            <tr>
              <th className="border border-black p-2 font-bold">COURSE:</th>
              <td className="border border-black p-2">{groupCode}</td>
              <th className="border border-black p-2 font-bold">SEMESTER:</th>
              <td className="border border-black p-2">{meta.courseYear}</td>
            </tr>
            <tr>
              <th className="border border-black p-2 font-bold">SUBJECT:</th>
              <td className="border border-black p-2">
                {subjectName}&nbsp;({subjectCode})
              </td>
              <th className="border border-black p-2 font-bold">PAPER CODE:</th>
              <td className="border border-black p-2" />
            </tr>
            <tr>
              <th className="border border-black p-2 font-bold">
                EXAM DATE &amp; TIME:
              </th>
              <td className="border border-black p-2">{fmtDate(examDate)}</td>
              <th className="border border-black p-2 font-bold">SCHEME:</th>
              <td className="border border-black p-2" />
            </tr>
          </tbody>
        </table>

        <table className="mb-5 w-full border-collapse border border-black text-center text-[14px]">
          <thead>
            <tr>
              <th className="border border-black p-2">S.No</th>
              <th className="border border-black p-2">Hall Ticket Number</th>
              <th className="border border-black p-2">Student Name</th>
              <th className="border border-black p-2">
                Answer Book Serial Number
              </th>
              <th className="border border-black p-2">Signature</th>
              <th className="border border-black p-2" colSpan={2}>
                Record Attendence for Absent and Malpractice Only
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((d, i) => (
              <tr key={`row-${i}`}>
                <td className="border border-black p-2">{i + 1}</td>
                <td className="border border-black p-2">
                  {g(d, ["hallticket_number", "hallticketNumber"])}
                </td>
                <td className="border border-black p-2">
                  {g(d, ["student_name", "studentName", "StudentName"])}
                </td>
                <td className="border border-black p-2">
                  {g(d, ["omr_serial_no", "omrSerialNo"])}
                </td>
                <td className="border border-black p-2" />
                <td className="border border-black p-2 text-left">
                  <label className="inline-flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name={`status-${i}`}
                      value="absent"
                      defaultChecked={
                        d.is_present === false || d.isPresent === false
                      }
                    />
                    Absent
                  </label>
                </td>
                <td className="border border-black p-2 text-left">
                  <label className="inline-flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name={`status-${i}`}
                      value="malpractice"
                      defaultChecked={Boolean(d.isUfm ?? d.is_ufm)}
                    />
                    Malpractice
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="my-2 text-[14px]">
          Please darken the circle Absent or Malpractice again Hall ticket
          number, if any.
        </p>

        <table className="mb-4 w-full border-none text-[14px]">
          <tbody>
            <tr>
              <td className="border-none p-1">
                Total no. of students in this sheet:{" "}
              </td>
              <td className="border-none p-1">
                Total no. of Malpractice cases in this sheet:
              </td>
            </tr>
            <tr>
              <td className="border-none p-1">
                Total no. of Absent students in this sheet:
              </td>
              <td className="border-none p-1">
                Total no. of Malpractice cases in this sheet:
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mt-2 w-full border-none text-[14px]">
          <tbody>
            <tr>
              <td className="border-none p-1">Signature of Invigilator</td>
              <td className="border-none p-1 text-end">
                Signature of Exam Superintendent with seal
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
