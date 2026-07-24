"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import {
  listActiveOrganizations,
  listCollegesByOrganization,
  listComplaintTypesByCategory,
  listComplaintWorkflowStages,
  listDepartmentsByCollege,
  listGrievanceCategories,
  listGrievanceCommittees,
  listGrievanceHierarchyCats,
} from "@/services";

type AnyRow = Record<string, unknown>;

type Props = {
  open: boolean;
  onClose: () => void;
  studentId: number;
  organizationId: number;
  collegeId: number;
  isSubmitting?: boolean;
  onSubmit: (payload: AnyRow, file: File | null) => void | Promise<void>;
};

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

export function AddGrievanceModal({
  open,
  onClose,
  studentId,
  organizationId,
  collegeId,
  isSubmitting,
  onSubmit,
}: Props) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [complaintListId, setComplaintListId] = useState<string | null>(null);
  const [grvCommitteeId, setGrvCommitteeId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(
    organizationId ? String(organizationId) : null,
  );
  const [clgId, setClgId] = useState<string | null>(
    collegeId ? String(collegeId) : null,
  );
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [incident, setIncident] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [complaintDate, setComplaintDate] = useState<Date>(new Date());
  const [durationOfIncident, setDurationOfIncident] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [hierarchyLevel, setHierarchyLevel] = useState(0);

  const lookupQuery = useQuery({
    queryKey: QK.studentGrievances.lookup(),
    queryFn: async () => {
      const [orgs, categories, committees, stages, hierarchyCats] =
        await Promise.all([
          listActiveOrganizations(),
          listGrievanceCategories(),
          listGrievanceCommittees(),
          listComplaintWorkflowStages(),
          listGrievanceHierarchyCats(),
        ]);
      return { orgs, categories, committees, stages, hierarchyCats };
    },
    enabled: open,
  });

  const typesQuery = useQuery({
    queryKey: [...QK.studentGrievances.all, "types", categoryId],
    queryFn: () => listComplaintTypesByCategory(Number(categoryId)),
    enabled: open && !!categoryId,
  });

  const collegesQuery = useQuery({
    queryKey: [...QK.studentGrievances.all, "colleges", orgId],
    queryFn: () => listCollegesByOrganization(Number(orgId)),
    enabled: open && !!orgId && hierarchyLevel >= 2,
  });

  const deptsQuery = useQuery({
    queryKey: [...QK.studentGrievances.all, "depts", clgId],
    queryFn: () => listDepartmentsByCollege(Number(clgId)),
    enabled: open && !!clgId && hierarchyLevel >= 3,
  });

  useEffect(() => {
    if (!open) return;
    setCategoryId(null);
    setComplaintListId(null);
    setGrvCommitteeId(null);
    setOrgId(organizationId ? String(organizationId) : null);
    setClgId(collegeId ? String(collegeId) : null);
    setDepartmentId(null);
    setIncident("");
    setIncidentDescription("");
    setComplaintDate(new Date());
    setDurationOfIncident(new Date());
    setFile(null);
    setFileTooLarge(false);
    setHierarchyLevel(0);
  }, [open, organizationId, collegeId]);

  const orgOptions = useMemo(
    () =>
      (lookupQuery.data?.orgs ?? []).map((o) => ({
        value: String(o.organizationId),
        label: String(o.orgCode || o.organizationId),
      })),
    [lookupQuery.data?.orgs],
  );

  const categoryOptions = useMemo(
    () =>
      (lookupQuery.data?.categories ?? []).map((c) => ({
        value: String(c.categoryId),
        label: txt(c, ["grievanceCategoryCode", "categoryName", "categoryCode"]),
      })),
    [lookupQuery.data?.categories],
  );

  const typeOptions = useMemo(
    () =>
      (typesQuery.data ?? []).map((t) => ({
        value: String(t.complaintListId),
        label: txt(t, ["complaintShortDesc", "complaintDesc"]),
      })),
    [typesQuery.data],
  );

  const committeeOptions = useMemo(
    () =>
      (lookupQuery.data?.committees ?? []).map((c) => ({
        value: String(c.grvCommitteeId),
        label: `${txt(c, ["committeeName"])} (${txt(c, ["committeeCode"])})`,
      })),
    [lookupQuery.data?.committees],
  );

  const collegeOptions = useMemo(
    () =>
      (collegesQuery.data ?? []).map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode || c.collegeName || c.collegeId),
      })),
    [collegesQuery.data],
  );

  const deptOptions = useMemo(
    () =>
      (deptsQuery.data ?? []).map((d) => ({
        value: String(d.departmentId),
        label: String(d.deptCode || d.departmentId),
      })),
    [deptsQuery.data],
  );

  function onCommitteeChange(value: string | null) {
    setGrvCommitteeId(value);
    const committees = lookupQuery.data?.committees ?? [];
    const match = committees.find(
      (c) => String(c.grvCommitteeId) === String(value),
    );
    setHierarchyLevel(positiveId(match?.hierarchyLevel));
  }

  function onFileChange(selected: File | null) {
    if (selected && selected.size > 24_000_000) {
      setFileTooLarge(true);
      setFile(null);
      return;
    }
    setFileTooLarge(false);
    setFile(selected);
  }

  async function handleSubmit() {
    if (!categoryId || !complaintListId || !grvCommitteeId || !orgId) {
      toastError("Please fill all required fields");
      return;
    }
    if (!incident.trim() || !incidentDescription.trim()) {
      toastError("Incident and description are required");
      return;
    }
    if (!studentId) {
      toastError("Student session not found");
      return;
    }

    const hierarchyCats = lookupQuery.data?.hierarchyCats ?? [];
    const stages = lookupQuery.data?.stages ?? [];
    const payload: AnyRow = {
      categoryId: Number(categoryId),
      complaintListId: Number(complaintListId),
      grvCommitteeId: Number(grvCommitteeId),
      organizationId: Number(orgId),
      collegeId: clgId ? Number(clgId) : null,
      departmentId: departmentId ? Number(departmentId) : null,
      incident: incident.trim(),
      incidentDescription: incidentDescription.trim(),
      isAcknowledged: false,
      complaintDate: complaintDate.toISOString(),
      durationOfIncident: durationOfIncident.toISOString(),
      comments: null,
      causOfDissatisfaction: null,
      areaOfGrievance: null,
      isAlreadyReported: false,
      existingComplaint: null,
      isActive: true,
      reason: "active",
      grvOnResourse: null,
      studentId,
    };

    if (hierarchyLevel === 1) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "UNVSR");
      if (cat) payload.grvOnCatdetId = cat.generalDetailId;
      payload.grvOnResourse = Number(orgId);
    } else if (hierarchyLevel === 2) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "CLG");
      if (cat) payload.grvOnCatdetId = cat.generalDetailId;
      payload.grvOnResourse = clgId ? Number(clgId) : null;
    } else if (hierarchyLevel === 3) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "DEPT");
      if (cat) payload.grvOnCatdetId = cat.generalDetailId;
      payload.grvOnResourse = departmentId ? Number(departmentId) : null;
    }

    // Angular submit overwrites grvOnResourse to null after hierarchy assignment
    payload.grvOnResourse = null;

    const openStage = stages.find((s) => s.wfCode === "OPEN");
    if (openStage) payload.workflowStageId = openStage.workflowStageId;

    await onSubmit(payload, file);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="New Grievance"
      size="lg"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Date of Grievance</Label>
          <DatePicker value={complaintDate} onChange={(d) => d && setComplaintDate(d)} />
        </div>
        <div className="space-y-1.5">
          <Label>Date of Problem or Incident</Label>
          <DatePicker
            value={durationOfIncident}
            onChange={(d) => d && setDurationOfIncident(d)}
          />
        </div>
        <Select
          label="Grievance Category"
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setComplaintListId(null);
          }}
          options={categoryOptions}
          placeholder="Select category"
          isLoading={lookupQuery.isLoading}
        />
        <Select
          label="Grievance Type"
          value={complaintListId}
          onChange={setComplaintListId}
          options={typeOptions}
          placeholder="Select type"
          disabled={!categoryId}
          isLoading={typesQuery.isLoading}
        />
        <div className="sm:col-span-2">
          <Select
            label="Committee"
            value={grvCommitteeId}
            onChange={onCommitteeChange}
            options={committeeOptions}
            placeholder="Select committee"
            isLoading={lookupQuery.isLoading}
          />
        </div>
        {hierarchyLevel >= 1 ? (
          <Select
            label="Organization"
            value={orgId}
            onChange={(v) => {
              setOrgId(v);
              setClgId(null);
              setDepartmentId(null);
            }}
            options={orgOptions}
            disabled
          />
        ) : null}
        {hierarchyLevel >= 2 ? (
          <Select
            label="College"
            value={clgId}
            onChange={(v) => {
              setClgId(v);
              setDepartmentId(null);
            }}
            options={collegeOptions}
            disabled
            isLoading={collegesQuery.isLoading}
          />
        ) : null}
        {hierarchyLevel >= 3 ? (
          <Select
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={deptOptions}
            placeholder="Select department"
            isLoading={deptsQuery.isLoading}
          />
        ) : null}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Incident</Label>
          <Input
            value={incident}
            onChange={(e) => setIncident(e.target.value)}
            placeholder="Incident"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description of the Problem / Incident</Label>
          <Textarea
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
            rows={8}
            className="min-h-[160px]"
            placeholder="Description of the Problem / Incident"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Document</Label>
          <Input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.doc"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="h-9 cursor-pointer py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-[length:var(--app-control-font-size)] file:font-medium file:text-foreground"
          />
          {file ? (
            <p className="truncate text-xs text-muted-foreground">{file.name}</p>
          ) : null}
          <p
            className={
              fileTooLarge
                ? "text-xs font-semibold text-orange-600"
                : "text-xs font-semibold text-green-700"
            }
          >
            {fileTooLarge
              ? "File size is greater than 24MB"
              : "File size should not greater than 24MB"}
          </p>
        </div>
      </div>
    </FormModal>
  );
}
