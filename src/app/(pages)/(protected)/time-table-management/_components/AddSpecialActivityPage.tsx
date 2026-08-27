"use client";

/**
 * Angular `staff-special-activities/special-activities/add-activity`.
 * Reuses domainList / postDetails / listGeneralDetailsByCode / getStaffSubjectsForToday
 * (no new services).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/common/components/date-picker";
import { FormField, TimePicker } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SPECIAL_ACTIVITY_API,
  SUBJECT_API,
  TIMETABLE_MGMT_API,
} from "@/config/constants";
import { GM_CODES } from "@/config/constants/ui";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  buildQuery,
  domainList,
  formatLeaveYmd,
  getDigitalLiveClassEnv,
  getStaffEmployeeDetailsById,
  getStaffSubjectsForToday,
  listAcademicYearsForCollege,
  listActiveRooms,
  listCollegesForTimetable,
  listGeneralDetailsByCode,
  postDetailsEnvelope,
} from "@/services";
import type { SessionUser } from "@/types/user";

type AnyRow = Record<string, unknown>;

type SectionRow = AnyRow & {
  groupSectionId: number;
  checked: boolean;
  spclActivityAttendeesId?: number;
};

type FieldErrors = Partial<
  Record<
    | "spclactityCatdetId"
    | "specialActivityName"
    | "collegeId"
    | "academicYearId"
    | "sections",
    string
  >
>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

/** Angular `dataSecurityLevelPrincipal()` — college disabled for all non-admin users. */
function isCollegeDisabled(user: SessionUser | null): boolean {
  if (user?.isAdmin) return false;
  if (readStorage("isAdmin") === "true") return false;
  return true;
}

/** Angular `dataSecurityLevel()` — academic year disabled for staff (not admin/principal). */
function isAcademicYearDisabled(user: SessionUser | null): boolean {
  if (user?.isAdmin || readStorage("isAdmin") === "true") return false;
  if (
    user?.isPrincipal ||
    readStorage("isPRINCIPAL") === "true" ||
    readStorage("isPrincipal") === "true"
  ) {
    return false;
  }
  return true;
}

function normalizeTime24(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "09:00:00";
  const m = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (!m) return "09:00:00";
  const h = String(Number(m[1])).padStart(2, "0");
  const min = String(Number(m[2])).padStart(2, "0");
  return `${h}:${min}:00`;
}

/** Angular `convert_to_24h` shape: `H:M:00`. */
function toAngularTime(hhmmss: string): string {
  const m = hhmmss.trim().match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return "9:0:00";
  return `${Number(m[1])}:${Number(m[2])}:00`;
}

function liveSchedulePostPath(): string {
  const env = getDigitalLiveClassEnv();
  if (env === "CODIIS") return TIMETABLE_MGMT_API.CODISS_LIVE_CLASS_SCHEDULE;
  if (env === "TEAMS") return TIMETABLE_MGMT_API.TEAM_MEETING_SCHEDULE;
  return TIMETABLE_MGMT_API.LIVE_CLASS_SCHEDULE;
}

export function AddSpecialActivityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const editId = positiveId(searchParams.get("spclActivityId"));
  const isEdit = editId > 0;
  const isCollegeLocked = isCollegeDisabled(user);
  const isAcademicYearLocked = isAcademicYearDisabled(user);

  const sessionCollegeId = positiveId(
    user?.collegeId,
    readStorage("collegeId"),
  );
  const sessionAcademicYearId = positiveId(
    user?.academicYearId,
    readStorage("academicYearId"),
  );
  const employeeId = positiveId(loginEmployeeId, readStorage("employeeId"));
  const userId = positiveId(user?.userId, readStorage("userId"));

  const [activityTypes, setActivityTypes] = useState<AnyRow[]>([]);
  const [scheduleStatuses, setScheduleStatuses] = useState<AnyRow[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [rooms, setRooms] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [existing, setExisting] = useState<AnyRow | null>(null);

  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [spclactityCatdetId, setSpclactityCatdetId] = useState<string | null>(
    null,
  );
  const [specialActivityName, setSpecialActivityName] = useState("");
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [fromTime, setFromTime] = useState("09:00:00");
  const [toTime, setToTime] = useState("10:00:00");
  const [description, setDescription] = useState("");
  const [facilitatorCompanyName, setFacilitatorCompanyName] = useState("");
  const [facilitatorDetails, setFacilitatorDetails] = useState("");
  const [facilitatorNames, setFacilitatorNames] = useState("");
  const [isScheduleLiveClass, setIsScheduleLiveClass] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const activityTypeCode = useMemo(() => {
    const id = Number(spclactityCatdetId ?? 0);
    const row = activityTypes.find((x) => Number(x.generalDetailId) === id);
    return txt(row, ["generalDetailCode"]).toUpperCase();
  }, [activityTypes, spclactityCatdetId]);

  const showFacilitator =
    activityTypeCode === "SEMINAR" || activityTypeCode === "WORKSHOP";

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? ""),
        label: txt(c, ["collegeCode", "collegeName"]),
      })),
    [colleges],
  );

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.academicYearId ?? ""),
        label: txt(y, ["academicYear"]),
      })),
    [academicYears],
  );

  const activityTypeOptions: SelectOption[] = useMemo(
    () =>
      activityTypes.map((t) => ({
        value: String(t.generalDetailId ?? ""),
        label: txt(t, ["generalDetailDisplayName", "generalDetailName"]),
      })),
    [activityTypes],
  );

  const subjectOptions: SelectOption[] = useMemo(
    () =>
      subjects.map((s) => {
        const name = txt(s, ["subjectName"]);
        const code = txt(s, ["subjectCode"]);
        return {
          value: String(s.subjectId ?? ""),
          label: code ? `${name} (${code})` : name,
        };
      }),
    [subjects],
  );

  const roomOptions: SelectOption[] = useMemo(
    () =>
      rooms.map((r) => ({
        value: String(r.roomId ?? ""),
        label: txt(r, ["roomName", "roomCode"]),
      })),
    [rooms],
  );

  const loadSections = useCallback(
    async (cId: number, ayId: number, attendees: AnyRow[] = []) => {
      if (!cId || !ayId) {
        setSections([]);
        return;
      }
      try {
        // Angular: College.collegeId + AcademicYear.academicYearId + isActive
        const list = await domainList<AnyRow>(
          "GroupSection",
          buildQuery({
            "College.collegeId": cId,
            "AcademicYear.academicYearId": ayId,
            isActive: true,
          }),
        );
        const rows = (Array.isArray(list) ? list : []).map((s) => {
          const gsId = num(s, ["groupSectionId"]);
          const match = attendees.find(
            (a) => num(a, ["groupSectionId"]) === gsId,
          );
          return {
            ...s,
            groupSectionId: gsId,
            checked: Boolean(match),
            spclActivityAttendeesId: match
              ? num(match, ["spclActivityAttendeesId"]) || undefined
              : undefined,
          } as SectionRow;
        });
        setSections(rows);
      } catch (e) {
        toastError(e, "Failed to load course sections");
        setSections([]);
      }
    },
    [],
  );

  const loadSubjectsForCollege = useCallback(
    async (cId: number) => {
      if (!cId) {
        setSubjects([]);
        return;
      }
      try {
        if (isAcademicYearLocked && employeeId) {
          const list = await getStaffSubjectsForToday({ employeeId });
          setSubjects(Array.isArray(list) ? list : []);
        } else {
          const list = await domainList<AnyRow>(
            SUBJECT_API.SUBJECT,
            buildQuery({
              "College.collegeId": cId,
              isActive: true,
            }),
          );
          setSubjects(Array.isArray(list) ? list : []);
        }
      } catch {
        setSubjects([]);
      }
    },
    [isAcademicYearLocked, employeeId],
  );

  const onCollegeChange = useCallback(
    async (cIdStr: string | null, attendees: AnyRow[] = []) => {
      setCollegeId(cIdStr);
      setErrors((e) => ({ ...e, collegeId: undefined }));
      const cId = positiveId(cIdStr);
      setAcademicYearId(null);
      setAcademicYears([]);
      setSections([]);
      if (!cId) return;

      await loadSubjectsForCollege(cId);

      try {
        const years = await listAcademicYearsForCollege(cId);
        setAcademicYears(years);
        // Prefer AcademicYear.isDefault === true (Angular current-year flag).
        const defaultYear = years.find((y) => {
          const v = y.isDefault;
          return v === true || v === 1 || v === "true" || v === "1";
        });
        let ay = defaultYear ? num(defaultYear, ["academicYearId"]) : 0;
        if (!ay && isAcademicYearLocked && sessionAcademicYearId) {
          ay = sessionAcademicYearId;
        } else if (!ay && years.length > 0) {
          ay = num(years[0], ["academicYearId"]);
        }
        if (ay) {
          setAcademicYearId(String(ay));
          await loadSections(cId, ay, attendees);
        }
      } catch (e) {
        toastError(e, "Failed to load academic years");
      }
    },
    [
      isAcademicYearLocked,
      sessionAcademicYearId,
      loadSections,
      loadSubjectsForCollege,
    ],
  );

  // Bootstrap masters + edit row
  useEffect(() => {
    if (sessionLoading || isResolving) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [types, statuses, collegeList, roomList, emp] = await Promise.all(
          [
            listGeneralDetailsByCode(GM_CODES.SPECIAL_ACTIVITY),
            listGeneralDetailsByCode(GM_CODES.SCHEDULE_STATUS),
            listCollegesForTimetable(),
            listActiveRooms(),
            employeeId ? getStaffEmployeeDetailsById(employeeId) : null,
          ],
        );
        if (cancelled) return;
        setActivityTypes(Array.isArray(types) ? types : []);
        setScheduleStatuses(Array.isArray(statuses) ? statuses : []);
        setColleges(Array.isArray(collegeList) ? collegeList : []);
        setRooms(Array.isArray(roomList) ? roomList : []);
        if (emp) {
          const name = txt(emp, ["firstName"]);
          const no = txt(emp, ["empNumber"]);
          setEmployeeLabel(no ? `${name} (${no})` : name);
        }

        let editRow: AnyRow | null = null;
        if (isEdit) {
          const list = await domainList<AnyRow>(
            SPECIAL_ACTIVITY_API.CRUD,
            buildQuery({ spclActivityId: editId }),
          );
          editRow = (Array.isArray(list) ? list : [])[0] ?? null;
          setExisting(editRow);
        }

        if (editRow) {
          setSpclactityCatdetId(
            String(editRow.spclactityCatdetId ?? "") || null,
          );
          setSpecialActivityName(txt(editRow, ["specialActivityName"]));
          setDescription(txt(editRow, ["specialActivityDescription"]));
          setSubjectId(
            editRow.subjectId != null ? String(editRow.subjectId) : null,
          );
          setRoomId(editRow.roomId != null ? String(editRow.roomId) : null);
          setFacilitatorCompanyName(txt(editRow, ["facilitatorCompanyName"]));
          setFacilitatorDetails(txt(editRow, ["facilitatorDetails"]));
          setFacilitatorNames(txt(editRow, ["facilitatorNames"]));
          setFromTime(normalizeTime24(editRow.fromTime));
          setToTime(normalizeTime24(editRow.toTime));
          const fd = editRow.fromDate
            ? new Date(String(editRow.fromDate))
            : new Date();
          setFromDate(Number.isNaN(fd.getTime()) ? new Date() : fd);
          const attendees = Array.isArray(editRow.spclActivityAttendeedto)
            ? (editRow.spclActivityAttendeedto as AnyRow[])
            : [];
          const cId = String(editRow.collegeId ?? sessionCollegeId ?? "");
          const ayFromAttendee =
            attendees[0] != null ? num(attendees[0], ["academicYearId"]) : 0;
          await onCollegeChange(cId || null, attendees);
          if (ayFromAttendee) {
            setAcademicYearId(String(ayFromAttendee));
            await loadSections(positiveId(cId), ayFromAttendee, attendees);
          }
        } else if (sessionCollegeId) {
          await onCollegeChange(String(sessionCollegeId));
        }
      } catch (e) {
        toastError(e, "Failed to load form data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    sessionLoading,
    isResolving,
    isEdit,
    editId,
    employeeId,
    sessionCollegeId,
    onCollegeChange,
    loadSections,
  ]);

  async function scheduleLiveClasses(payload: AnyRow, checked: SectionRow[]) {
    const sub = subjects.find(
      (s) => Number(s.subjectId) === Number(payload.subjectId),
    );
    const subjectName = txt(sub, ["subjectName"]);
    const subjectTypeId = num(sub, ["subjectTypeId"]);
    const path = liveSchedulePostPath();
    const env = getDigitalLiveClassEnv();

    for (const section of checked) {
      const body: AnyRow = {
        scheduledOnDate: payload.fromDate,
        fromTime: payload.fromTime,
        toTime: payload.toTime,
        password: "123456789",
        sessionIds: [],
        hostVideo: false,
        isOnetime: false,
        isRecurring: false,
        agenda: subjectName,
        topic: subjectName,
        collegeId: payload.collegeId,
        userId,
        subjecttypeCatdetId: subjectTypeId,
        groupSectionId: section.groupSectionId,
        clsEmpId: payload.employeeId,
        subjectId: payload.subjectId,
        stdbatchId: 18,
        weekdayId: 0,
        classTimingId: 0,
        timetableScheduleId: 0,
      };
      if (env === "CODIIS") body.sessionId = 1;
      try {
        await postDetailsEnvelope(path, body);
      } catch {
        // Angular continues even if one section fails; surface soft toast only
      }
    }
  }

  async function onSave() {
    const next: FieldErrors = {};
    if (!spclactityCatdetId) {
      next.spclactityCatdetId = "Activity Type is required";
    }
    if (!specialActivityName.trim()) {
      next.specialActivityName = "Special Activity Name is required";
    }
    if (!collegeId) next.collegeId = "College is required";
    if (!academicYearId) next.academicYearId = "Academic Year is required";
    const checked = sections.filter((s) => s.checked);
    const attendeesPayload: AnyRow[] = [];
    for (const s of sections) {
      if (s.spclActivityAttendeesId) {
        attendeesPayload.push({
          collegeId: Number(collegeId),
          groupSectionId: s.groupSectionId,
          isActive: Boolean(s.checked),
          spclActivityAttendeesId: s.spclActivityAttendeesId,
        });
      } else if (s.checked) {
        attendeesPayload.push({
          collegeId: Number(collegeId),
          groupSectionId: s.groupSectionId,
          isActive: true,
        });
      }
    }
    if (attendeesPayload.length === 0) {
      next.sections = "Select atleast one course section";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.sections) toastInfo(next.sections);
      return;
    }

    const scheduledStatus = scheduleStatuses.find(
      (x) => txt(x, ["generalDetailCode"]).toUpperCase() === "SCHEDULED",
    );

    const ymd = fromDate
      ? formatLeaveYmd(fromDate)
      : formatLeaveYmd(new Date());
    const payload: AnyRow = {
      spclactityCatdetId: Number(spclactityCatdetId),
      collegeId: Number(collegeId),
      academicYearId: Number(academicYearId),
      specialActivityName: specialActivityName.trim(),
      specialActivityDescription: description.trim() || null,
      employeeId: employeeId || null,
      subjectId: subjectId ? Number(subjectId) : null,
      roomId: roomId ? Number(roomId) : null,
      facilitatorCompanyName: facilitatorCompanyName.trim() || null,
      facilitatorDetails: facilitatorDetails.trim() || null,
      facilitatorNames: facilitatorNames.trim() || null,
      closingComments: null,
      isScheduleLiveClass,
      fromDate: ymd,
      toDate: ymd,
      fromTime: toAngularTime(fromTime),
      toTime: toAngularTime(toTime),
      schedulestatusCatdetId: scheduledStatus
        ? Number(scheduledStatus.generalDetailId)
        : null,
      spclActivityAttendeedto: attendeesPayload,
    };
    if (isEdit) payload.spclActivityId = editId;

    setSaving(true);
    try {
      const result = await postDetailsEnvelope(SPECIAL_ACTIVITY_API.POST, [
        payload,
      ]);
      if (result.success) {
        toastSuccess(result.message || "Saved successfully");
        if (isScheduleLiveClass) {
          await scheduleLiveClasses(payload, checked);
        }
        router.push("/time-table-management/special-activities");
      } else if (result.statusCode === 422) {
        toastError(result.message || "Validation failed");
      } else {
        toastInfo(result.message || "Unable to save");
      }
    } catch (e) {
      toastError(e, "Failed to save special activity");
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? "Edit Special Activity" : "Add Special Activity";

  return (
    <FilteredPage
      title={title}
      filtersCollapsible={false}
      filters={
        <div className="space-y-4">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <DatePicker
                label="Activity Date"
                value={fromDate}
                onChange={setFromDate}
                placeholder="Select date"
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Activity Type"
                required
                value={spclactityCatdetId}
                onChange={(v) => {
                  setSpclactityCatdetId(v);
                  setErrors((e) => ({ ...e, spclactityCatdetId: undefined }));
                }}
                options={activityTypeOptions}
                placeholder="Select activity type"
                searchable
                isLoading={loading}
                error={errors.spclactityCatdetId}
              />
            </div>
            <div className="md:col-span-6">
              <FormField
                label="Special Activity Name"
                required
                error={errors.specialActivityName}
              >
                <Input
                  value={specialActivityName}
                  placeholder="Special Activity Name"
                  onChange={(e) => {
                    setSpecialActivityName(e.target.value);
                    setErrors((er) => ({
                      ...er,
                      specialActivityName: undefined,
                    }));
                  }}
                />
              </FormField>
            </div>
          </div>

          {showFacilitator ? (
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <FormField label="Facilitator Company Name">
                  <Input
                    value={facilitatorCompanyName}
                    placeholder="Facilitator Company Name"
                    onChange={(e) => setFacilitatorCompanyName(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="md:col-span-5">
                <FormField label="Facilitator Details">
                  <Input
                    value={facilitatorDetails}
                    placeholder="Facilitator Details"
                    onChange={(e) => setFacilitatorDetails(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="md:col-span-4">
                <FormField label="Facilitator Names">
                  <Input
                    value={facilitatorNames}
                    placeholder="Facilitator Names"
                    onChange={(e) => setFacilitatorNames(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => void onCollegeChange(v)}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                disabled={isCollegeLocked}
                isLoading={loading}
                error={errors.collegeId}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Academic Year"
                required
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v);
                  setErrors((e) => ({ ...e, academicYearId: undefined }));
                  const ay = positiveId(v);
                  const cId = positiveId(collegeId);
                  const attendees = Array.isArray(
                    existing?.spclActivityAttendeedto,
                  )
                    ? (existing!.spclActivityAttendeedto as AnyRow[])
                    : [];
                  void loadSections(cId, ay, attendees);
                }}
                options={academicYearOptions}
                placeholder="Select academic year"
                searchable
                disabled={isAcademicYearLocked}
                error={errors.academicYearId}
              />
            </div>
            <div className="md:col-span-3">
              <FormField label="Employee">
                <Input
                  value={employeeLabel}
                  disabled
                  placeholder="Employee"
                  readOnly
                />
              </FormField>
            </div>
            <div className="md:col-span-3">
              <Select
                label="Subject"
                value={subjectId}
                onChange={setSubjectId}
                options={subjectOptions}
                placeholder="Select subject"
                searchable
                clearable
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Select
                label="Room"
                value={roomId}
                onChange={setRoomId}
                options={roomOptions}
                placeholder="Select room"
                searchable
                clearable
              />
            </div>
            <div className="md:col-span-3">
              <TimePicker
                label="Start Time"
                value={fromTime}
                onChange={setFromTime}
              />
            </div>
            <div className="md:col-span-3">
              <TimePicker
                label="End Time"
                value={toTime}
                onChange={setToTime}
              />
            </div>
          </div>

          {sections.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-border">
              <h3 className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-destructive">
                Course Sections
              </h3>
              <div className="min-h-[180px] max-h-[280px] overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {sections.map((s, i) => (
                    <label
                      key={s.groupSectionId || i}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={s.checked}
                        onCheckedChange={(v) => {
                          setSections((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, checked: v === true } : row,
                            ),
                          );
                          setErrors((e) => ({ ...e, sections: undefined }));
                        }}
                      />
                      <span>
                        {txt(s, ["groupCode"])} - {txt(s, ["courseYearCode"])} -{" "}
                        {txt(s, ["section"])}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {errors.sections ? (
                <p className="px-3 pb-2 text-xs text-destructive">
                  {errors.sections}
                </p>
              ) : null}
            </div>
          ) : null}

          <FormField label="Description">
            <Textarea
              value={description}
              placeholder="Description"
              rows={4}
              className="resize-y"
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isScheduleLiveClass}
              onCheckedChange={(v) => setIsScheduleLiveClass(v === true)}
            />
            <span>Schedule Live Class</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        </div>
      }
    />
  );
}
