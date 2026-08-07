import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getCollegeById } from "@/services";
import {
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";

const LOGO_FILTER_KEYS = [
  "logo_filename",
  "logoFilename",
  "logo",
  "clg_logo",
  "college_logo",
  "logo_path",
  "logoPath",
];

export function isDefaultLogoUrl(url: string): boolean {
  return /default_logo\.png/i.test(url);
}

export function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return origin ? `${origin}${raw}` : raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  return fallback;
}

export async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return abs;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? abs));
      reader.onerror = () => resolve(abs);
      reader.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

/** Resolve college logo for attendance report print iframes. */
export async function resolveAttendancePrintLogo(
  filterRow: FilterRow | null,
  collegeId: number,
  liveLogo: string,
): Promise<string> {
  const fromFilter = pickText(filterRow, LOGO_FILTER_KEYS);
  const fromHook =
    liveLogo && !isDefaultLogoUrl(liveLogo) ? liveLogo : "";
  let fromCollege = "";
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      fromCollege = college?.logo ? String(college.logo) : "";
    } catch {
      fromCollege = "";
    }
  }
  for (const candidate of [fromCollege, fromFilter, fromHook, liveLogo]) {
    if (!candidate) continue;
    const url = toPrintLogoUrl(candidate);
    if (!isDefaultLogoUrl(url)) return logoToDataUrl(url);
  }
  return logoToDataUrl(DEFAULT_COLLEGE_LOGO);
}

export function attendancePrintShell(args: {
  title: string;
  logoSrc: string;
  fallbackLogo: string;
  collegeName: string;
  dataDetails?: string;
  tableHtml: string;
  textAlign?: "left" | "center";
}): string {
  const align = args.textAlign ?? "left";
  const details = args.dataDetails
    ? `<p class="title-2">${args.dataDetails}</p>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${args.title}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1;text-align:${align}}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title-2{font-size:19px;font-weight:550;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2}
</style></head><body>
<div class="header">
  <img src="${args.logoSrc}" alt="College Logo"
    onerror="this.onerror=null;this.src='${args.fallbackLogo}'" />
  <div class="header-text">
    <p class="collegeName">${args.collegeName}</p>
    ${details}
    <p class="title">${args.title}</p>
  </div>
</div>
${args.tableHtml}
</body></html>`;
}
