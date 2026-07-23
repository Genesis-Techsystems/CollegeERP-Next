"use client";

/**
 * Angular parity: company-placements-requirements (View Details dialog)
 * Read-only; no print.
 */

import { FormModal } from "@/common/components/feedback";
import type { Campus } from "@/types/campus";
import type { Company, Placement, PlacementCompany } from "@/types/placements";

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value?: string | null }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm sm:grid-cols-[9rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span>
        :{" "}
        <span className="font-medium text-foreground">
          {value?.trim() ? value : ""}
        </span>
      </span>
    </div>
  );
}

function MetricCell({
  label,
  value,
  suffix,
}: Readonly<{
  label: string;
  value?: string | number | null;
  suffix?: string;
}>) {
  const display =
    value != null && String(value).trim() !== ""
      ? `${value}${suffix ?? ""}`
      : "-";
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{display}</span>
    </div>
  );
}

export interface CompanyPlacementsRequirementsModalProps {
  open: boolean;
  onClose: () => void;
  data: PlacementCompany | null;
  campus: Campus | null;
  placement: Placement | null;
  company: Company | null;
}

export function CompanyPlacementsRequirementsModal({
  open,
  onClose,
  data,
  campus,
  placement,
  company,
}: Readonly<CompanyPlacementsRequirementsModalProps>) {
  if (!data) return null;

  const placementTitle =
    data.placementTitle ??
    data.plaecmentTitle ??
    placement?.plaecmentTitle ??
    "";
  const companyName =
    data.companyName ?? data.companyname ?? company?.companyname ?? "";

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="View Details"
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
      submitLabel="Close"
      showCancelButton={false}
      size="xl"
    >
      <div className="space-y-4">
        <div className="space-y-1 rounded-md border border-border p-3">
          {campus ? (
            <DetailRow
              label="Campus"
              value={`${campus.campusName} - ${campus.orgCode}`}
            />
          ) : null}
          <DetailRow label="Placement" value={placementTitle} />
          <DetailRow label="Company" value={companyName} />
          {data.contactDetails ? (
            <DetailRow label="Contact Person" value={data.contactDetails} />
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="bg-[hsl(var(--primary))] px-3 py-2">
            <p className="text-sm font-semibold text-primary-foreground">
              Comapny Placement Requirement
            </p>
          </div>
          <div className="space-y-3 p-3">
            <div>
              <p className="mb-1 text-sm font-semibold">Placement</p>
              <p className="text-sm">{placementTitle || "-"}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Education</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricCell label="SSC Grade" value={data.sscGrade} />
                <MetricCell
                  label="SSC Percentage"
                  value={data.sscPercentage}
                  suffix=" %"
                />
                <MetricCell label="Diploma Grade" value={data.diplomaGrade} />
                <MetricCell
                  label="Diploma Percentage"
                  value={data.diplomaPercentage}
                  suffix=" %"
                />
                <MetricCell label="Inter Grade" value={data.interGrade} />
                <MetricCell
                  label="Inter Percentage"
                  value={data.interPercentage}
                  suffix=" %"
                />
                <MetricCell label="UG Grade" value={data.ugGrade} />
                <MetricCell
                  label="Ug Percentage"
                  value={data.ugPercentage}
                  suffix=" %"
                />
                <MetricCell label="PG Grade" value={data.pgGrade} />
                <MetricCell
                  label="PG Percentage"
                  value={data.pgPercentage}
                  suffix=" %"
                />
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold">Skills</p>
              <p className="text-sm">{data.skillSetIds || "-"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Requirement</p>
              <p className="text-sm">{data.comapanyRequirements || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
