/**
 * External NAAC HEI Assessment Online portal client.
 *
 * Angular `staff-naac` SSR pages POST to `{APP_URL}/hei/*` via jQuery — NOT Spring CMS.
 * APP_URL in Angular scrapes is typically `https://localhost/public/index.php`
 * (or assessmentonline.naac.gov.in). Configure:
 *   NEXT_PUBLIC_NAAC_APP_URL=https://localhost/public/index.php
 *
 * Requires an active HEI portal session cookie (credentials: include). Not proxied via /api/proxy.
 */

import { AppError } from "@/lib/errors";

/** Angular inline `APP_URL` default from `ssr-extended-profile` scrape. */
export const NAAC_APP_URL = (
  process.env.NEXT_PUBLIC_NAAC_APP_URL ?? "https://localhost/public/index.php"
).replace(/\/$/, "");

function naacUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${NAAC_APP_URL}${p}`;
}

function encodeForm(
  data: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  return params.toString();
}

async function parsePortalResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new AppError("NAAC_PORTAL", `NAAC portal error (${res.status})`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Angular jQuery `$.ajax` POST application/x-www-form-urlencoded with credentials. */
export async function naacPortalPost(
  path: string,
  body: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  const res = await fetch(naacUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: encodeForm(body),
  });
  return parsePortalResponse(res);
}

/** Angular jQuery GET with credentials. */
export async function naacPortalGet(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  const qs = query ? `?${encodeForm(query)}` : "";
  const res = await fetch(`${naacUrl(path)}${qs}`, {
    method: "GET",
    credentials: "include",
  });
  return parsePortalResponse(res);
}

/** Angular jQuery PUT (executive summary updates). */
export async function naacPortalPut(
  path: string,
  body: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  const res = await fetch(naacUrl(path), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: encodeForm(body),
  });
  return parsePortalResponse(res);
}

/** Angular multipart FormData upload (`processData:false`, `contentType:false`). */
export async function naacPortalUpload(
  path: string,
  formData: FormData,
): Promise<unknown> {
  const res = await fetch(naacUrl(path), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return parsePortalResponse(res);
}

/** Angular DELETE with form body (jQuery allows data on DELETE). */
export async function naacPortalDelete(
  path: string,
  body: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  const res = await fetch(naacUrl(path), {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: encodeForm(body),
  });
  return parsePortalResponse(res);
}

// ─── SSR Profile (`ssrprof_nepsave` / literacy / dept1) ───────────────────────

/** Angular `ssrprof_nepsave` → POST /hei/dept1 `btnid=ssr_clg_nepsave`. */
export async function saveSsrNepFields(fields: {
  nep_multi: string;
  nep_abc: string;
  nep_skill: string;
  nep_iks: string;
  nep_obe: string;
  nep_distant: string;
}): Promise<unknown> {
  return naacPortalPost("/hei/dept1", { btnid: "ssr_clg_nepsave", ...fields });
}

/** Angular `ssrprof_literacysave` → POST /hei/dept1 `btnid=ssr_clg_literacysave`. */
export async function saveSsrLiteracyFields(fields: {
  literacy1: string;
  literacy2: string;
  literacy3: string;
  literacy4: string;
  literacy5: string;
}): Promise<unknown> {
  return naacPortalPost("/hei/dept1", {
    btnid: "ssr_clg_literacysave",
    ...fields,
  });
}

/**
 * Angular `basic_info_colg_save` — serializes `#form1` + `btnid` + academic year count.
 * Callers pass the full form field map (names must match portal input `name` attrs).
 */
export async function saveSsrBasicInfoColg(
  formFields: Record<string, string | number | boolean | null | undefined>,
  btnid: string,
  noOfAcademicYear: number,
): Promise<unknown> {
  return naacPortalPost("/hei/dept1", {
    ...formFields,
    btnid,
    no_of_academic_year: noOfAcademicYear,
  });
}

/** Angular academic tab save — `button=ssr_clg_sav1&updtab2=1`. */
export async function saveSsrAcademicInfo(
  formFields: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  return naacPortalPost("/hei/dept1", {
    ...formFields,
    button: "ssr_clg_sav1",
    updtab2: 1,
    st_gen: formFields.st_gen ?? "",
    st_dist: formFields.st_dist ?? "",
  });
}

export async function uploadSsrProfileFile(
  file: File,
  btnid: string,
  extra: Record<string, string | number> = {},
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("btnid", btnid);
  for (const [k, v] of Object.entries(extra)) fd.append(k, String(v));
  return naacPortalUpload("/hei/dept1", fd);
}

// ─── Executive Summary ───────────────────────────────────────────────────────

/** Angular GET `/hei/executivesummary/{ass_id}/edit?edit_btn=1`. */
export async function loadExecutiveSummaryEdit(
  assId: number,
): Promise<unknown> {
  return naacPortalGet(`/hei/executivesummary/${assId}/edit`, { edit_btn: 1 });
}

/** Angular create flows — POST `/hei/executivesummary` + `btnid`. */
export async function saveExecutiveSummaryCreate(
  btnid: "introsave" | "criteriaSave" | "swocsave" | "conclusionsave",
  formFields: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  return naacPortalPost("/hei/executivesummary", { ...formFields, btnid });
}

/** Angular update flows — PUT `/hei/executivesummary/{ass_id}` + `assid` mode 1–4. */
export async function saveExecutiveSummaryUpdate(
  assId: number,
  assidMode: 1 | 2 | 3 | 4,
  formFields: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  return naacPortalPut(`/hei/executivesummary/${assId}`, {
    ...formFields,
    assid: assidMode,
  });
}

// ─── Extended Profile / QIF ──────────────────────────────────────────────────

/** Angular GET `/hei/dynamic_questionnaire` — returns portal HTML fragment. */
export async function loadDynamicQuestionnaire(): Promise<unknown> {
  return naacPortalGet("/hei/dynamic_questionnaire");
}

/** Angular `saveDynamicQuestions` — POST questionnaire_inputs JSON string. */
export async function saveDynamicQuestionnaire(
  questionnaireInputs: Record<string, unknown>,
  allSubmit: "0" | "1" = "0",
): Promise<unknown> {
  return naacPortalPost("/hei/dynamic_questionnaire", {
    questionnaire_inputs: JSON.stringify(questionnaireInputs),
    all_submit: allSubmit,
  });
}

/** Angular QIF save — POST `/hei/ssrhome` with `ssr_inputs` JSON. */
export async function saveQifSsrHome(payload: {
  ssrInputs: Record<string, unknown>;
  allSubmit?: "0" | "1";
  finalSubmit?: "0" | "1";
  criteriaId: string | number;
}): Promise<unknown> {
  return naacPortalPost("/hei/ssrhome", {
    ssr_inputs: JSON.stringify(payload.ssrInputs),
    all_submit: payload.allSubmit ?? "0",
    final_submit: payload.finalSubmit ?? "0",
    criteria_id: payload.criteriaId,
  });
}

export async function uploadExtendedQuestionnaireFile(
  file: File,
  fields: {
    questionnaire_id: string | number;
    fileformat_id: string | number;
    seq: string | number;
  },
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("questionnaire_id", String(fields.questionnaire_id));
  fd.append("fileformat_id", String(fields.fileformat_id));
  fd.append("seq", String(fields.seq));
  fd.append("button_id", "1");
  return naacPortalUpload("/hei/dynamic_questionnaire", fd);
}

export async function uploadQifSsrFile(
  file: File,
  fields: {
    ssr_indicator_id: string | number;
    fileformat_id: string | number;
    seq: string | number;
  },
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("ssr_indicator_id", String(fields.ssr_indicator_id));
  fd.append("fileformat_id", String(fields.fileformat_id));
  fd.append("seq", String(fields.seq));
  fd.append("button_id", "1");
  return naacPortalUpload("/hei/ssrhome", fd);
}
