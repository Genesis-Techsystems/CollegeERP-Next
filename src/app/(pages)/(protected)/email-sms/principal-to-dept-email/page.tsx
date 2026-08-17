"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Select, MultiSelect } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getAllRecords,
  sendBulkEmailToEmployeesDepartmentWise,
  uploadFileForEmail,
} from "@/services";

/**
 * Angular `#/principal-communications/email/send-emails`
 * (`principal-to-dpt-email.component`) — FilteredListPage shell (filters + body, no grid).
 */
const FROM_EMAIL_DEFAULT = "dev@gentechsyspro.com";
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

type AnyRow = Record<string, unknown>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

function uniqById(rows: AnyRow[], idKey: string): AnyRow[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[idKey]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function PrincipalToDeptEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([]);
  const [deptRows, setDeptRows] = useState<AnyRow[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [subjectTouched, setSubjectTouched] = useState(false);

  // Angular getFiltersList → s_get_collegewisedetails_bycode (clg_filters,clg_dept_filters)
  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getAllRecords<{ result?: AnyRow[][] }>("s_get_collegewisedetails_bycode", {
      in_flag: "clg_filters,clg_dept_filters",
      in_org_id: orgId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: empId,
      in_loginuser_roleid: 0,
      in_employee: "",
      in_subject: "",
      in_gm_codes: "QUOTA,GENDER",
    })
      .then((data) => {
        const groups = Array.isArray(data?.result) ? data.result : [];
        let collegesRaw: AnyRow[] = [];
        let deptsRaw: AnyRow[] = [];
        for (const arr of groups) {
          if (!Array.isArray(arr) || arr.length === 0) continue;
          const flag = s(arr[0]?.flag).trim().toLowerCase();
          if (flag === "clg_filters") collegesRaw = arr;
          else if (flag === "clg_dept_filters") deptsRaw = arr;
        }
        const colleges = uniqById(collegesRaw, "fk_college_id").sort(
          (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
        );
        setCollegeRows(colleges);
        setDeptRows(deptsRaw);
        if (colleges.length) {
          setCollegeId((prev) => prev ?? n(colleges[0].fk_college_id));
        }
      })
      .catch(() => {
        setCollegeRows([]);
        setDeptRows([]);
      });
  }, []);

  const departments = useMemo(() => {
    if (!collegeId) return [];
    return uniqById(
      deptRows.filter((r) => n(r.fk_college_id) === collegeId),
      "fk_dept_id",
    );
  }, [deptRows, collegeId]);

  const collegeOptions = useMemo(
    () =>
      collegeRows.map((c) => ({
        value: String(n(c.fk_college_id)),
        label: s(c.college_code) || s(c.collegeCode),
      })),
    [collegeRows],
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(n(d.fk_dept_id)),
        label:
          s(d.dept_code) || s(d.deptCode) || s(d.dept_name) || s(d.deptName),
      })),
    [departments],
  );

  // Angular form: collegeId + subject required; mail body editor is commented out (empty).
  const canSend = Boolean(
    collegeId && departmentIds.length > 0 && subject.trim() && !sending,
  );
  const subjectInvalid = subjectTouched && !subject.trim();

  function onFileChange() {
    const el = fileRef.current;
    const f = el?.files?.[0];
    if (!f) return;
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toastError("File size must not exceed 24 MB");
      el.value = "";
    }
  }

  async function resolveFilePath(): Promise<string> {
    const el = fileRef.current;
    const f = el?.files?.[0];
    if (!f) return "";
    const fd = new FormData();
    fd.append("file", f, f.name);
    return uploadFileForEmail(fd);
  }

  const clearForm = useCallback(() => {
    setSubject("");
    setSubjectTouched(false);
    setDepartmentIds([]);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  async function handleSend() {
    setSubjectTouched(true);
    if (!collegeId) {
      toastError("Select a college");
      return;
    }
    if (departmentIds.length === 0) {
      toastError("Select at least one department");
      return;
    }
    if (!subject.trim()) {
      toastError("Subject is required");
      return;
    }
    const file = fileRef.current?.files?.[0] ?? null;
    setSending(true);
    try {
      let filePath = "";
      if (file) filePath = await resolveFilePath();
      // Angular: mailContent / mailContentHtml from dataModel (quill commented out → '')
      await sendBulkEmailToEmployeesDepartmentWise({
        collegeId,
        subject: subject.trim(),
        mailContent: "",
        mailContentHtml: "",
        fromEmailId: FROM_EMAIL_DEFAULT,
        isEmailAlert: true,
        courseYearIds: [],
        departmentIds: departmentIds
          .map((id) => Number(id) || 0)
          .filter((id) => id > 0),
        filePath,
      });
      toastSuccess("Email sent successfully");
      clearForm();
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <FilteredListPage
      title="Send Email"
      filters={
        <div className="space-y-4">
          {/* College + Department */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 sm:max-w-[720px] sm:items-end">
            <Select
              label="College"
              required
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => {
                setCollegeId(v ? Number(v) : null);
                setDepartmentIds([]);
              }}
              options={collegeOptions}
              searchable
              placeholder="College"
            />

            <MultiSelect
              label="Department"
              required
              value={departmentIds}
              onChange={setDepartmentIds}
              options={departmentOptions}
              searchable
              placeholder="Department"
              disabled={!collegeId || departmentOptions.length === 0}
            />
          </div>

          {/* Subject */}
          <div className="w-full sm:w-[80%]">
            <label htmlFor="p2d-subject" className="sr-only">
              Subject
            </label>

            <input
              id="p2d-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setSubjectTouched(true)}
              placeholder="Subject"
              disabled={sending}
              aria-invalid={subjectInvalid}
              className={[
                "app-control flex min-h-[52px] w-full rounded-md border bg-background px-3 py-2 text-[length:var(--app-control-font-size)] ring-offset-background placeholder:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                subjectInvalid ? "border-destructive" : "border-input",
              ].join(" ")}
            />
          </div>

          {/* Choose File */}
          <div className="text-sm sm:w-[25%] sm:min-w-[200px]">
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.doc"
              className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={onFileChange}
              disabled={sending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              className="gap-1 px-5"
              onClick={() => void handleSend()}
              disabled={!canSend}
            >
              <Send className="h-4 w-4" aria-hidden />
              {sending ? "Sending…" : "Send Email"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="border-black-400 bg-white-50 px-5 text-black-950 hover:bg-black-100 dark:border-black-500 dark:bg-black-950/50 dark:text-black-50 dark:hover:bg-black-950/70"
              onClick={clearForm}
              disabled={sending}
            >
              Clear
            </Button>
          </div>
        </div>
      }
    />
  );
}
