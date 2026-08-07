"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Send } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { sendEmailToAdmin, uploadFileForEmail } from "@/services";

/** Angular `readFile` — reject attachments larger than 24MB. */
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

function readStaffEmail(): string {
  if (typeof globalThis.window === "undefined") return "";
  return String(globalThis.localStorage?.getItem("email") ?? "").trim();
}

function readCollegeId(): number {
  if (typeof globalThis.window === "undefined") return 0;
  return Number(globalThis.localStorage?.getItem("collegeId") ?? 0) || 0;
}

/**
 * Angular `principal-staff-to-admin-email` — Subject + optional attachment + Send / Clear.
 * Sends via `sendEmailToAdmin` with `fromEmailId` / `collegeId` from session storage.
 * Mail body editor is commented out in Angular → `mailContent` / `mailContentHtml` stay empty.
 */
export default function PrincipalStaffToAdminEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  function onFileChange() {
    const el = fileRef.current;
    const f = el?.files?.[0];
    if (!f) return;
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toastError("File size should not greater than 24MB");
      el.value = "";
    }
  }

  const clearForm = useCallback(() => {
    setSubject("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  async function handleSend() {
    const staffEmailId = readStaffEmail();
    if (!staffEmailId) {
      toastInfo("Your email not registed");
    }

    const subjectTrimmed = subject.trim();
    if (!subjectTrimmed) {
      toastError("Subject is required");
      return;
    }

    // Angular still posts when the form is valid even if email was missing;
    // only build the payload when staff email exists (matches the fill branch).
    if (!staffEmailId) return;

    const collegeId = readCollegeId();
    const file = fileRef.current?.files?.[0] ?? null;

    // Angular form: collegeId, isEmailAlert, subject + fromEmailId / mail content / optional filePath
    const email: Record<string, unknown> = {
      collegeId: collegeId ? String(collegeId) : "",
      isEmailAlert: true,
      subject: subjectTrimmed,
      fromEmailId: staffEmailId,
      // dataModel — quill editor commented out in Angular
      mailContent: "",
      mailContentHtml: "",
    };

    setSending(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file, file.name);
        email.filePath = await uploadFileForEmail(fd);
      }
      await sendEmailToAdmin(email);
      toastSuccess("Email sent successfully");
      clearForm();
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(subject.trim() && !sending);

  return (
    <PageContainer className="space-y-4">
      <div className="app-card border-t-[3px] border-t-amber-400 overflow-hidden p-0 shadow-sm">
        <div className="border-b border-amber-400/40 bg-card px-4 py-3">
          <h1 className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Send Email To Admin
          </h1>
        </div>
        <div className="space-y-5 bg-muted/20 p-4 sm:p-6">
          <div>
            <label
              htmlFor="psa-subject"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Subject
            </label>
            <input
              id="psa-subject"
              type="text"
              className="app-control flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-[length:var(--app-control-font-size)] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={sending}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={onFileChange}
                disabled={sending}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 sm:shrink-0">
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
                className="border-amber-400 bg-amber-50 px-5 text-amber-950 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/70"
                onClick={clearForm}
                disabled={sending}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
