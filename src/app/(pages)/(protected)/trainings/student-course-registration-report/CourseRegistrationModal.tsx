"use client";

import { useEffect, useMemo, useState } from "react";
import { formatISO } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Table, type TableColumn } from "@/common/components/table";
import { GM_CODES, SUBJECT_REGISTRATION_API } from "@/config/constants";
import { toastError } from "@/lib/toast";
import { listGeneralDetailsByCode, postDetails } from "@/services";

type AnyRow = Record<string, unknown>;

export type StdSubRegDetail = {
  subjectCode?: string;
  subjectName?: string;
  subjecttypeCatCode?: string;
  subjectcategoryCatCode?: string;
  courseYearName?: string;
  shortName?: string;
  isPrerequisite?: boolean;
};

export type StdSubRegistrationRow = {
  stdName?: string;
  rollNumber?: string;
  collegeCode?: string;
  academicYear?: string;
  groupName?: string;
  courseYearName?: string;
  subregStatusCatId?: number;
  reason?: string;
  stdSubRegDetailDTOs?: StdSubRegDetail[];
  [key: string]: unknown;
};

interface CourseRegistrationModalProps {
  row: StdSubRegistrationRow | null;
  employeeId: number;
  isHod: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function pickId(row: AnyRow): number {
  const n = Number(row.generalDetailId ?? row.generalDetailid ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickCode(row: AnyRow): string {
  return String(row.generalDetailCode ?? row.generalDetailcode ?? "").trim();
}

function pickLabel(row: AnyRow): string {
  return String(
    row.generalDetailDisplayName ??
      row.generalDetaildisplayName ??
      row.generalDetailCode ??
      "",
  ).trim();
}

export function CourseRegistrationModal({
  row,
  employeeId,
  isHod,
  onClose,
  onSaved,
}: Readonly<CourseRegistrationModalProps>) {
  const open = row !== null;
  const subjects = row?.stdSubRegDetailDTOs ?? [];

  const [statusOptions, setStatusOptions] = useState<AnyRow[]>([]);
  const [statusId, setStatusId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    let cancelled = false;

    setStatusId(String(row.subregStatusCatId ?? ""));
    setReason(String(row.reason ?? ""));
    setShowReason(false);
    setLoadingOptions(true);

    void listGeneralDetailsByCode(GM_CODES.SUBJECT_REGISTRATION_STATUS)
      .then((rows) => {
        if (cancelled) return;
        let options = rows;
        if (!isHod) {
          options = rows.filter((r) => pickCode(r) !== "APPROVED");
        }
        setStatusOptions(options);
        const currentId = pickId(
          options.find((r) => pickId(r) === Number(row.subregStatusCatId)) ??
            ({} as AnyRow),
        );
        if (currentId > 0) {
          const code = pickCode(
            options.find((r) => pickId(r) === currentId) ?? ({} as AnyRow),
          );
          setShowReason(code === "REJECT");
        }
      })
      .catch((err) => toastError(err, "Failed to load registration statuses"))
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, row, isHod]);

  const subjectColumns = useMemo<TableColumn<StdSubRegDetail>[]>(
    () => [
      {
        id: "si",
        label: "No.",
        width: 8,
        render: (_, index) => index + 1,
      },
      {
        id: "subjectName",
        label: "Subject Name",
        width: 30,
        render: (s) => (
          <span>
            <span className="text-[#1e88e5]">({s.subjectCode})</span>{" "}
            {s.subjectName}
          </span>
        ),
      },
      {
        id: "subjecttypeCatCode",
        label: "Subject Type",
        width: 15,
        render: (s) => s.subjecttypeCatCode ?? "—",
      },
      {
        id: "courseYearName",
        label: "Course Year",
        width: 15,
        render: (s) => s.courseYearName ?? "—",
      },
      {
        id: "subjectcategoryCatCode",
        label: "Subject Category",
        width: 17,
        render: (s) => s.subjectcategoryCatCode ?? "—",
      },
      {
        id: "isPrerequisite",
        label: "CBSC Subjects",
        width: 15,
        type: "status",
        render: (s) => (
          <span
            className={
              s.isPrerequisite
                ? "text-xs font-medium text-green-700"
                : "text-xs font-medium text-red-600"
            }
          >
            {s.isPrerequisite ? "Yes" : "No"}
          </span>
        ),
      },
    ],
    [],
  );

  function handleStatusChange(value: string | null) {
    if (!value) return;
    setStatusId(value);
    const selected = statusOptions.find((r) => String(pickId(r)) === value);
    setShowReason(pickCode(selected ?? {}) === "REJECT");
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!row || !statusId) return;

    const payload: StdSubRegistrationRow = {
      ...row,
      fromStdSubRegWfCatId: row.subregStatusCatId,
      subregStatusCatId: Number(statusId),
      toStdSubRegWfCatId: Number(statusId),
      reason,
      statusDate: formatISO(new Date()),
      employeeId,
    };

    setSaving(true);
    try {
      await postDetails(
        SUBJECT_REGISTRATION_API.STD_SUB_REGISTRATION_POST,
        payload,
      );
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, "Failed to save registration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Register Subject"
      size="xl"
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel="Save"
      cancelLabel="Close"
    >
      <div className="space-y-4">
        <div className="rounded-md border divide-y text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_3fr] gap-2 px-3 py-2">
            <span className="text-muted-foreground">Student</span>
            <span className="text-[#0d29ff] font-medium">
              {row?.stdName}
              {row?.rollNumber ? (
                <span className="text-muted-foreground font-normal ml-1">
                  ({row.rollNumber})
                </span>
              ) : null}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_3fr] gap-2 px-3 py-2">
            <span className="text-muted-foreground">College</span>
            <span className="text-[#0d29ff] font-medium">
              {row?.collegeCode} / {row?.academicYear}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_3fr] gap-2 px-3 py-2">
            <span className="text-muted-foreground">Course</span>
            <span className="text-[#0d29ff] font-medium">
              {row?.groupName} / {row?.courseYearName}
            </span>
          </div>
        </div>

        <Table
          rows={subjects}
          columns={subjectColumns}
          density="compact"
          pageSize={0}
          emptyText="No subjects registered."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Subject Registration Status"
            value={statusId || null}
            onChange={handleStatusChange}
            options={statusOptions.map((r) => ({
              value: String(pickId(r)),
              label: pickLabel(r),
            }))}
            placeholder="Select status"
            isLoading={loadingOptions}
            searchable={false}
          />
          {showReason ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Reason
              </span>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                placeholder="Reason"
              />
            </label>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
