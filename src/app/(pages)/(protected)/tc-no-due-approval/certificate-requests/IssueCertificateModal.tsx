"use client";

import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCertificateIssueStatuses } from "@/services";
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";
import type { GeneralDetail } from "@/types/exam-master";
import { toastError } from "@/lib/toast";

interface IssueCertificateModalProps {
  open: boolean;
  onClose: () => void;
  row: FeeCertificateIssueRow | null;
  defaultAmount?: number;
  onSubmit: (payload: FeeCertificateIssueRow) => void;
}

function pickDto(row: FeeCertificateIssueRow | null) {
  return row?.studentDetailListDTO ?? {};
}

export function IssueCertificateModal({
  open,
  onClose,
  row,
  defaultAmount,
  onSubmit,
}: Readonly<IssueCertificateModalProps>) {
  const [statuses, setStatuses] = useState<GeneralDetail[]>([]);
  const [applicationStatusId, setApplicationStatusId] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("0");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!open) return;
    void listCertificateIssueStatuses()
      .then((list) => {
        const code = (row?.certifcateCode ?? "").toUpperCase();
        const filtered =
          code === "TC"
            ? list.filter((s) => s.generalDetailCode !== "TCISSUED")
            : list.filter((s) => s.generalDetailCode !== "CLEARED");
        setStatuses(filtered);
      })
      .catch((e) => toastError(e, "Failed to load statuses"));
  }, [open, row?.certifcateCode]);

  useEffect(() => {
    if (!open || !row) return;
    setApplicationStatusId(String(row.applicationStatusId ?? ""));
    setCollectedAmount(String(row.collectedAmount ?? defaultAmount ?? 0));
    setRemarks(String(row.remarks ?? ""));
  }, [open, row, defaultAmount]);

  const selectedStatusCode = useMemo(() => {
    const match = statuses.find(
      (s) => String(s.generalDetailId) === applicationStatusId,
    );
    return String(match?.generalDetailCode ?? "").toUpperCase();
  }, [statuses, applicationStatusId]);

  const showRemarks =
    selectedStatusCode === "REJECTED" || selectedStatusCode === "CLEARED";

  const statusOptions = statuses.map((s) => ({
    value: String(s.generalDetailId),
    label: String(
      s.generalDetailDisplayName ??
        s.generalDetailName ??
        s.generalDetailCode ??
        s.generalDetailId,
    ),
  }));

  const dto = pickDto(row);

  function handleSave(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!row || !applicationStatusId) return;
    onSubmit({
      ...row,
      applicationStatusId: Number(applicationStatusId),
      collectedAmount: Number(collectedAmount) || 0,
      remarks: showRemarks ? remarks : row.remarks,
    });
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Issue Certificate"
      onSubmit={handleSave}
      submitLabel="Issue"
    >
      <div className="space-y-4">
        {row ? (
          <div className="rounded-sm border-4 border-[#c3d9ff] bg-white px-4 py-3">
            <div className="flex flex-col gap-4 sm:flex-row">
              <img
                src={
                  String(dto.studentPhotoPath ?? "") ||
                  "/assets/images/avatars/default_Student.png"
                }
                alt=""
                className="h-28 max-w-[120px] rounded border-4 border-[#c3d9ff] bg-[#c3d9ff] object-cover p-1.5"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.includes("default_Student.png")) {
                    img.src = "/assets/images/avatars/default_Student.png";
                  }
                }}
              />
              <div className="space-y-1 py-2 text-sm font-medium">
                <p>
                  {dto.firstName ?? row.firstName ?? "Student"} (
                  <span className="text-blue-600">
                    {dto.quotaDisplayName ?? ""}
                  </span>
                  )
                </p>
                <p className="text-[#8c8c8c]">{dto.rollNumber ?? "—"}</p>
                <p className="text-[#8c8c8c]">
                  {dto.collegeCode ?? "—"} / {dto.academicYear ?? "—"} /{" "}
                  {dto.courseCode ?? "—"} / {dto.groupCode ?? "—"} /{" "}
                  {dto.courseYearName ?? "—"} / Section {dto.section ?? "—"}
                </p>
                <p className="text-[#8c8c8c]">{dto.mobile ?? "—"}</p>
                <p className="text-blue-600">
                  {row.certificateName}
                  {row.certificateNumber ? ` ${row.certificateNumber}` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0}
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Application Status *</Label>
            <Select
              value={applicationStatusId || null}
              onChange={(v) => setApplicationStatusId(v ?? "")}
              options={statusOptions}
              placeholder="Select status"
            />
          </div>
        </div>

        {showRemarks ? (
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
