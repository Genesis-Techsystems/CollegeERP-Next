import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  getCollegeById,
  listActiveCollegesForGeneralSettings,
} from "@/services";
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

/** Angular-style college logo URL: absolute as-is, else `MINIO_URL + path`. */
export function toCollegeLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  if (raw.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}${raw}` : raw;
  }
  return raw;
}

export function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  const collegeUrl = toCollegeLogoUrl(raw);
  if (collegeUrl) {
    if (/^(https?:\/\/|data:|blob:)/i.test(collegeUrl)) return collegeUrl;
    if (collegeUrl.startsWith("/") && origin) return `${origin}${collegeUrl}`;
    return collegeUrl;
  }
  return fallback;
}

export async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;

  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.type.startsWith("image/")) {
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? abs));
          reader.onerror = () => resolve(abs);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch {
    /* try Image/canvas below */
  }

  // Fallback when fetch is CORS-blocked but <img> can still paint the logo
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx || !canvas.width || !canvas.height) {
            reject(new Error("canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("img"));
      img.src = abs;
    });
    if (dataUrl.startsWith("data:image")) return dataUrl;
  } catch {
    /* keep absolute URL */
  }

  return abs;
}

/**
 * Resolve college logo for print iframes.
 * Prefer a successful `data:image` embed so the iframe does not depend on
 * MinIO CORS. Candidate order mirrors Angular getColleges + live hook URL.
 */
export async function resolveAttendancePrintLogo(
  filterRow: FilterRow | null,
  collegeId: number,
  liveLogo: string,
): Promise<string> {
  const fromFilter = pickText(filterRow, LOGO_FILTER_KEYS);
  const fromHook = liveLogo && !isDefaultLogoUrl(liveLogo) ? liveLogo : "";

  let fromCollege = "";
  if (collegeId > 0) {
    // Angular getColleges: listDetailsById(College, isActive) then filter collegeId
    try {
      const list = await listActiveCollegesForGeneralSettings();
      const match = list.find((c) => Number(c.collegeId) === collegeId);
      fromCollege = match?.logo ? String(match.logo) : "";
    } catch {
      fromCollege = "";
    }
    if (!fromCollege) {
      try {
        const college = await getCollegeById(collegeId);
        fromCollege = college?.logo ? String(college.logo) : "";
      } catch {
        fromCollege = "";
      }
    }
  }

  // Prefer hook (already resolved in UI) before raw DB paths that may 404.
  const candidates = [fromHook, fromCollege, fromFilter, liveLogo].filter(
    (c): c is string => Boolean(c && String(c).trim()),
  );

  let firstNonDefault = "";
  for (const candidate of candidates) {
    const url = toPrintLogoUrl(candidate);
    if (isDefaultLogoUrl(url)) continue;
    const embedded = await logoToDataUrl(url);
    if (embedded.startsWith("data:image")) return embedded;
    if (!firstNonDefault) firstNonDefault = embedded || url;
  }

  if (firstNonDefault) return firstNonDefault;
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
