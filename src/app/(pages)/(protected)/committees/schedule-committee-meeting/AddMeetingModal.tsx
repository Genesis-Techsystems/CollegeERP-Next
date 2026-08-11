"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select, MultiSelect } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCommitteeMeeting,
  listCommitteeMembers,
  listRooms,
} from "@/services";
import type { UnivCommitteeMember } from "@/types/committees";
import type { Room } from "@/types/room";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  scheduledById: z.string().min(1, "Select who is scheduling this meeting"),
  meetingTitle: z.string().min(1, "Meeting title is required"),
  meetingDate: z.date(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomId: z.string().optional(),
  meetingLocation: z.string().optional(),
  meetingDescription: z.string().optional(),
  zoomLink: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type MeetingFilterContext = {
  univCommitteeId: number;
  universityExamId: number;
  academicYear: string;
  subjectCode: string;
};

type AddMeetingModalProps = {
  open: boolean;
  onClose: () => void;
  filterContext: MeetingFilterContext | null;
  onSaved: () => void;
};

function formatDatePayload(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_VALUES: FormValues = {
  scheduledById: "",
  meetingTitle: "",
  meetingDate: new Date(),
  startTime: "09:00",
  endTime: "12:00",
  roomId: "",
  meetingLocation: "",
  meetingDescription: "",
  zoomLink: "",
};

export function AddMeetingModal({
  open,
  onClose,
  filterContext,
  onSaved,
}: AddMeetingModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [members, setMembers] = useState<UnivCommitteeMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(DEFAULT_VALUES);
    setAttendeeIds([]);
    setSubmitError(null);
  }, [open, reset]);

  // Angular `add-meeting.component.ts` — scheduleByList()/committeeMembers()/roomDetails().
  useEffect(() => {
    if (!open || !filterContext) {
      setMembers([]);
      setRooms([]);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    Promise.all([
      listCommitteeMembers(filterContext.univCommitteeId),
      listRooms(),
    ])
      .then(([memberList, roomList]) => {
        if (cancelled) return;
        setMembers(memberList.filter((m) => m.isActive));
        setRooms(roomList.filter((r) => r.isActive));
      })
      .catch((e) => {
        if (!cancelled)
          toastError(e, "Failed to load committee members / rooms");
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, filterContext]);

  const scheduledByOptions = useMemo(
    () =>
      members.map((m) => ({
        value: String(m.univCommitteeMemberId),
        label:
          m.committeeMemberEmployeeFirstName ??
          `Member #${m.univCommitteeMemberId}`,
      })),
    [members],
  );

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: String(m.univCommitteeMemberId),
        label:
          m.committeeMemberEmployeeFirstName ??
          `Member #${m.univCommitteeMemberId}`,
        description: m.committeePossitoinName ?? m.univCommitteePositionsName,
      })),
    [members],
  );

  const roomOptions = useMemo(
    () =>
      rooms.map((r) => ({
        value: String(r.roomId),
        label: r.roomCode ? `${r.roomCode} — ${r.roomName}` : r.roomName,
      })),
    [rooms],
  );

  async function onSubmit(values: FormValues) {
    if (!filterContext) {
      setSubmitError(
        "Select committee, exam, and subject before adding a meeting.",
      );
      return;
    }
    if (members.length === 0) {
      setSubmitError(
        "This committee has no active members to schedule a meeting for.",
      );
      return;
    }

    setSubmitError(null);
    try {
      const orgId = Number(
        globalThis?.localStorage?.getItem("organizationId") ?? 0,
      );
      const collegeId = Number(
        globalThis?.localStorage?.getItem("collegeId") ?? 0,
      );

      // Angular `add-meeting.component.ts` submit() — univCommitteeMeetingMembersDTOList
      // carries the full committee roster with per-member attendance/optional flags.
      const univCommitteeMeetingMembersDTOList = members.map((m) => ({
        univCommitteeId: m.univCommitteesId,
        univCommitteeMemberId: m.univCommitteeMemberId,
        isOptional: false,
        isAttended: attendeeIds.includes(String(m.univCommitteeMemberId)),
        attendanceMarkedByEmpId: m.committeeMemberEmpId,
        isActive: m.isActive,
      }));

      await createCommitteeMeeting({
        univCommitteesId: filterContext.univCommitteeId,
        academicYear: filterContext.academicYear,
        universityExamId: filterContext.universityExamId,
        subjectCode: filterContext.subjectCode,
        univCommitteeMembersId: Number(values.scheduledById),
        meetingTitle: values.meetingTitle.trim(),
        scheduledDate: formatDatePayload(values.meetingDate),
        meetingtypeCatdetId: 3,
        meetingDescription: values.meetingDescription?.trim() || "",
        meetingOutput: "",
        attendeesNames: "",
        meetingOn: formatDatePayload(values.meetingDate),
        meetingFromTime: `${values.startTime}:00`,
        meetingToTime: `${values.endTime}:00`,
        followupMeetingOn: "",
        followUpPoints: "",
        roomId: values.roomId ? Number(values.roomId) : undefined,
        meetingLocation: values.meetingLocation?.trim() || undefined,
        zoomLink: values.zoomLink?.trim() || undefined,
        isActive: true,
        orgId: orgId || undefined,
        collegeId: collegeId || undefined,
        univCommitteeMeetingMembersDTOList,
      });
      toastSuccess("Meeting scheduled successfully.");
      onSaved();
      onClose();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to schedule meeting.";
      setSubmitError(msg);
      toastError(e, "Failed to schedule meeting");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Committee Meeting"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Meeting Title *</Label>
          <Input className="h-8 text-xs" {...register("meetingTitle")} />
          {errors.meetingTitle && (
            <p className="text-xs text-destructive">
              {errors.meetingTitle.message}
            </p>
          )}
        </div>

        <Controller
          name="scheduledById"
          control={control}
          render={({ field }) => (
            <div className="space-y-0.5">
              <Label className="text-xs">Scheduled By *</Label>
              <Select
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                options={scheduledByOptions}
                placeholder="Select committee member"
                searchable
                clearable
                isLoading={loadingContext}
                disabled={!filterContext}
              />
              {errors.scheduledById && (
                <p className="text-xs text-destructive">
                  {errors.scheduledById.message}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          name="meetingDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Meeting Date *"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? new Date())}
            />
          )}
        />

        <div className="space-y-0.5">
          <Label className="text-xs">Start Time *</Label>
          <Input
            className="h-8 text-xs"
            type="time"
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-xs text-destructive">
              {errors.startTime.message}
            </p>
          )}
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">End Time *</Label>
          <Input className="h-8 text-xs" type="time" {...register("endTime")} />
          {errors.endTime && (
            <p className="text-xs text-destructive">{errors.endTime.message}</p>
          )}
        </div>

        <Controller
          name="roomId"
          control={control}
          render={({ field }) => (
            <div className="space-y-0.5">
              <Label className="text-xs">Room</Label>
              <Select
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                options={roomOptions}
                placeholder="Select room"
                searchable
                clearable
                isLoading={loadingContext}
                disabled={!filterContext}
              />
            </div>
          )}
        />

        <div className="space-y-0.5">
          <Label className="text-xs">Meeting Location</Label>
          <Input className="h-8 text-xs" {...register("meetingLocation")} />
        </div>

        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Meeting Description</Label>
          <Input className="h-8 text-xs" {...register("meetingDescription")} />
        </div>

        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Zoom Link</Label>
          <Input
            className="h-8 text-xs"
            placeholder="https://…"
            {...register("zoomLink")}
          />
        </div>

        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Attending Members</Label>
          <MultiSelect
            value={attendeeIds}
            onChange={setAttendeeIds}
            options={memberOptions}
            placeholder="Select attending committee members"
            searchable
            isLoading={loadingContext}
            disabled={!filterContext}
          />
        </div>
      </div>

      {submitError && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      )}
    </FormModal>
  );
}
