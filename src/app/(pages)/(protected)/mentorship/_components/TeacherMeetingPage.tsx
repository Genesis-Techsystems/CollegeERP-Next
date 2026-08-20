"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getCounselorActivityById,
  getGeneralDetails,
  updateCounselorActivity,
  type MentorshipRow,
} from "@/services";

const schema = z.object({
  attendeesName: z.string().trim().min(1, "Attendees name is required"),
  relationship: z.string().optional(),
  purpose: z.string().optional(),
  discussionPoints: z.string().optional(),
  summary: z.string().optional(),
  outputFromMeeting: z.string().optional(),
  activityStatusId: z.number().min(1, "Activity status is required"),
  newNextScheduledActivityDate: z.date({
    message: "Next schedule date is required",
  }),
});

type FormValues = z.infer<typeof schema>;

function parseDate(value: string | null): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Angular `staff-mentorship/schedule-ptm/teacher-meeting` — Meeting Summary form. */
export function TeacherMeetingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const counselorActivityId =
    Number(searchParams.get("counselorActivityId") || 0) || 0;
  const studentName = searchParams.get("student") ?? "";
  const studentId = Number(searchParams.get("studentId") || 0) || 0;
  const collegeId = searchParams.get("collegeId") ?? "";
  const fDate = searchParams.get("fDate") ?? "";
  const tDate = searchParams.get("tDate") ?? "";
  const empN = searchParams.get("empN") ?? "";
  const nextScheduledRaw = searchParams.get("nextScheduledActivityDate");

  const [activityDetails, setActivityDetails] = useState<MentorshipRow | null>(
    null,
  );
  const [statuses, setStatuses] = useState<MentorshipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activityDate] = useState(() => new Date());

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendeesName: studentName,
      relationship: "",
      purpose: "",
      discussionPoints: "",
      summary: "",
      outputFromMeeting: "",
      activityStatusId: undefined,
      newNextScheduledActivityDate: parseDate(nextScheduledRaw),
    },
  });

  useEffect(() => {
    reset((prev) => ({
      ...prev,
      attendeesName: studentName || prev.attendeesName,
      newNextScheduledActivityDate: parseDate(nextScheduledRaw),
    }));
  }, [studentName, nextScheduledRaw, reset]);

  useEffect(() => {
    if (!counselorActivityId) return;
    setLoading(true);
    void (async () => {
      try {
        const [activity, statusRows] = await Promise.all([
          getCounselorActivityById(counselorActivityId),
          getGeneralDetails(GM_CODES.COUNSELING_STATUS),
        ]);
        setActivityDetails(activity);
        setStatuses(statusRows as MentorshipRow[]);
      } catch (e) {
        toastError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [counselorActivityId]);

  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        value: String(s.generalDetailId),
        label: String(
          s.generalDetailDisplayName ??
            s.generalDetailCode ??
            s.generalDetailId,
        ),
        // Angular disables SCHEDULED on this form
        disabled: String(s.generalDetailCode ?? "") === "SCHEDULED",
      })),
    [statuses],
  );

  function goBackToSchedule() {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", String(studentId));
    if (empN) params.set("empN", empN);
    if (collegeId) params.set("collegeId", collegeId);
    if (tDate) params.set("tDate", tDate);
    if (fDate) params.set("fDate", fDate);
    const backPath = pathname.includes("schedule-ptm/teacher-meeting")
      ? "/mentorship/schedule-ptm"
      : "/mentorship/teacher-meeting";
    router.push(`${backPath}?${params.toString()}`);
  }

  async function onSave(values: FormValues) {
    if (!activityDetails || !counselorActivityId) {
      toastError("Activity details not loaded");
      return;
    }
    try {
      // Angular teacherMeeting with counselorActivityId: update current activity only
      // (newScheduleActivity push is unused on the update path).
      const updated: MentorshipRow = {
        ...activityDetails,
        attendeesName: values.attendeesName,
        discussionPoints: values.discussionPoints ?? "",
        relationship: values.relationship ?? "",
        summary: values.summary ?? "",
        outputFromMeeting: values.outputFromMeeting ?? "",
        activityStatusId: values.activityStatusId,
        activityDate: new Date().toISOString(),
      };
      await updateCounselorActivity(
        Number(activityDetails.counselorActivityId),
        updated,
      );
      toastSuccess("Meeting saved");
      goBackToSchedule();
    } catch (e) {
      toastError(getErrorMessage(e));
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Meeting Summary" />
      <form
        className="rounded-sm border bg-card p-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSave)();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3 space-y-1.5">
            <Label>Activity Date</Label>
            <DatePicker
              value={activityDate}
              onChange={() => undefined}
              disabled
              clearable={false}
            />
          </div>
          <Controller
            name="attendeesName"
            control={control}
            render={({ field }) => (
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="attendeesName">Attendees Name *</Label>
                <Input
                  id="attendeesName"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Attendees Name"
                />
                {errors.attendeesName ? (
                  <p className="text-xs text-destructive">
                    {errors.attendeesName.message}
                  </p>
                ) : null}
              </div>
            )}
          />
          <Controller
            name="relationship"
            control={control}
            render={({ field }) => (
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Relationship"
                />
              </div>
            )}
          />
        </div>

        <Controller
          name="discussionPoints"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label htmlFor="discussionPoints">Discussion Points</Label>
              <Textarea
                id="discussionPoints"
                rows={5}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Discussion Points"
              />
            </div>
          )}
        />

        <Controller
          name="summary"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                rows={5}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Summary"
              />
            </div>
          )}
        />

        <Controller
          name="outputFromMeeting"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label htmlFor="outputFromMeeting">Suggestions</Label>
              <Textarea
                id="outputFromMeeting"
                rows={5}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Suggestions"
              />
            </div>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Controller
            name="activityStatusId"
            control={control}
            render={({ field }) => (
              <Select
                label="Activity Status *"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={statusOptions}
                searchable
                isLoading={loading}
                error={errors.activityStatusId?.message}
                className="md:col-span-3"
              />
            )}
          />
          <Controller
            name="newNextScheduledActivityDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Next Schedule Date *"
                value={field.value}
                onChange={(d) => field.onChange(d ?? new Date())}
                clearable={false}
                error={errors.newNextScheduledActivityDate?.message}
                className="md:col-span-3"
              />
            )}
          />
          <Controller
            name="purpose"
            control={control}
            render={({ field }) => (
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Purpose"
                />
              </div>
            )}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || loading || !activityDetails}
          >
            {isSubmitting ? "Saving…" : "Save Details"}
          </Button>
          <Button type="button" variant="outline" onClick={goBackToSchedule}>
            Back
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
