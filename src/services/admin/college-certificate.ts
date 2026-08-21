import { ENTITIES } from "@/config/constants/entities";
import type { Campus } from "@/types/campus";
import type { College } from "@/types/college";
import type { CollegeCertificate } from "@/types/college-certificate";
import { buildQuery, domainCreate, domainList, domainUpdate } from "../crud";

export async function listCollegeCertificates(): Promise<CollegeCertificate[]> {
  // Angular listAllDetails uses order(createdDt=desc) (lowercase)
  const rows = await domainList<CollegeCertificate>(
    ENTITIES.COLLEGE_CERTIFICATE.name,
    "order(createdDt=desc)",
  );
  return rows.map(normalizeCollegeCertificate);
}

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function nestedString(
  row: Record<string, unknown>,
  rel: string,
  key: string,
): string {
  const relObj = row[rel];
  if (!relObj || typeof relObj !== "object") return "";
  return readString((relObj as Record<string, unknown>)[key]);
}

function normalizeCollegeCertificate(
  row: CollegeCertificate,
): CollegeCertificate {
  const raw = row as CollegeCertificate & Record<string, unknown>;
  return {
    ...row,
    certificateName:
      readString(raw.certificateName) ||
      readString(raw.certifcateName) ||
      readString(raw.name) ||
      nestedString(raw, "certificate", "name") ||
      nestedString(raw, "Certificate", "certificateName") ||
      row.certificateName,
    certifcateCode:
      readString(raw.certifcateCode) ||
      readString(raw.certificateCode) ||
      row.certifcateCode,
    collegeCode:
      readString(raw.collegeCode) ||
      nestedString(raw, "college", "collegeCode") ||
      nestedString(raw, "College", "collegeCode") ||
      row.collegeCode,
    campusCode:
      readString(raw.campusCode) ||
      nestedString(raw, "campus", "campusCode") ||
      nestedString(raw, "Campus", "campusCode") ||
      row.campusCode,
  };
}

export async function createCollegeCertificate(
  data: Omit<CollegeCertificate, "collegeCertificateId">,
): Promise<CollegeCertificate> {
  const payloads = buildCollegeCertificatePayloads(data);
  for (const payload of payloads) {
    try {
      return await domainCreate<CollegeCertificate>(
        ENTITIES.COLLEGE_CERTIFICATE.name,
        payload,
      );
    } catch {
      // Try next payload shape for backend compatibility.
    }
  }
  return domainCreate<CollegeCertificate>(
    ENTITIES.COLLEGE_CERTIFICATE.name,
    data,
  );
}

export async function updateCollegeCertificate(
  collegeCertificateId: number,
  data: Partial<Omit<CollegeCertificate, "collegeCertificateId">>,
): Promise<CollegeCertificate> {
  const payloads = buildCollegeCertificatePayloads(data).map((payload) => ({
    collegeCertificateId,
    ...payload,
  }));
  for (const payload of payloads) {
    try {
      return await domainUpdate<CollegeCertificate>(
        ENTITIES.COLLEGE_CERTIFICATE.name,
        ENTITIES.COLLEGE_CERTIFICATE.pk,
        collegeCertificateId,
        payload,
      );
    } catch {
      // Try next payload shape for backend compatibility.
    }
  }
  return domainUpdate<CollegeCertificate>(
    ENTITIES.COLLEGE_CERTIFICATE.name,
    ENTITIES.COLLEGE_CERTIFICATE.pk,
    collegeCertificateId,
    { collegeCertificateId, ...data },
  );
}

export async function listActiveCampusesForCollegeCertificates(): Promise<
  Campus[]
> {
  return domainList<Campus>(
    ENTITIES.CAMPUS.name,
    buildQuery({ isActive: true }),
  );
}

export async function listActiveCollegesForCollegeCertificates(): Promise<
  College[]
> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ isActive: true }),
  );
}

function buildCollegeCertificatePayloads(
  data: Partial<Omit<CollegeCertificate, "collegeCertificateId">>,
): Array<Record<string, unknown>> {
  const base = { ...data } as Record<string, unknown>;
  const readString = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  };
  const campusId = Number(base.campusId ?? 0);
  const collegeId = Number(base.collegeId ?? 0);
  const organizationId = Number(base.organizationId ?? 0);
  const certCode =
    readString(base.certifcateCode) || readString(base.certificateCode);
  const duplicateAmount =
    base.duplicateCertificateAmount ?? base.duplicateAmount ?? 0;
  const isApproval = Boolean(
    base.isApprovalReq ?? base.isApprovalRequired ?? false,
  );
  const fromDate = readString(base.fromDate) || readString(base.fromDt);
  const toDate = readString(base.toDate) || readString(base.toDt);
  const fromDateStr = readString(base.fromDateStr);
  const toDateStr = readString(base.toDateStr);

  return [
    { ...base },
    {
      ...base,
      certificateCode: certCode,
      duplicateAmount,
      isApprovalRequired: isApproval,
      fk_campus_id: campusId,
      fk_college_id: collegeId,
      fk_organization_id: organizationId,
      fromDt: fromDate,
      toDt: toDate,
    },
    {
      ...base,
      certifcateCode: certCode,
      duplicateCertificateAmount: duplicateAmount,
      isApprovalReq: isApproval,
      "Campus.campusId": campusId,
      "College.collegeId": collegeId,
      "Organization.organizationId": organizationId,
    },
    {
      ...base,
      certificateCode: certCode,
      duplicateAmount,
      approvalRequired: isApproval,
      campus: { campusId },
      college: { collegeId },
      organization: { organizationId },
      fromDate: fromDateStr || fromDate,
      toDate: toDateStr || toDate,
    },
    {
      ...base,
      certifcateCode: certCode,
      duplicateCertificateAmount: duplicateAmount,
      isApprovalReq: isApproval ? "true" : "false",
      isActive: base.isActive === false ? "false" : "true",
      campusId,
      collegeId,
      organizationId,
      fromDate: fromDateStr || fromDate,
      toDate: toDateStr || toDate,
    },
  ];
}
