"use client";

import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  loadExecutiveSummaryEdit,
  saveExecutiveSummaryCreate,
  saveExecutiveSummaryUpdate,
} from "@/services";
import {
  NaacSectionCard,
  naacTabListClass,
  naacTabTriggerClass,
} from "../_components/NaacSection";
import {
  SSR_CONCLUSION_DEFAULTS,
  SSR_CRITERIA_SUMMARY,
  SSR_INTRO_DEFAULTS,
  SSR_SWOC_DEFAULTS,
} from "../_data/ssr-executive-summary-data";

type TabId = "intro" | "criteria" | "swoc" | "conclusion";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "intro", label: "Introductory Note" },
  { id: "criteria", label: "Criterion-wise Summary" },
  { id: "swoc", label: "SWOC" },
  { id: "conclusion", label: "Conclusion" },
];

/**
 * Angular `staff-naac/ssr-executive-summary` scrape defaults — `ass_id=11926`,
 * `profile_id=7396` — used when the NAAC portal session hasn't cached its own
 * assessment/profile id in localStorage yet (`naacAssId` / `naacProfileId`).
 */
const DEFAULT_ASS_ID = 11926;
const DEFAULT_PROFILE_ID = 7396;

function readStoredId(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Defensive parse — the portal edit payload shape isn't strongly typed upstream. */
function pickString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** Angular `staff-naac/ssr-executive-summary` — CKEditor fields become plain
 * textareas (Quill is not installed). Loads existing content from the
 * external NAAC HEI Assessment Online portal (`/hei/executivesummary`) on
 * mount, then POSTs (create) or PUTs (update) per tab via
 * `src/services/naac-portal.ts`, mirroring the old jQuery AJAX calls. */
export default function SsrExecutiveSummaryPage() {
  const [intro, setIntro] = useState(SSR_INTRO_DEFAULTS);
  const [swoc, setSwoc] = useState(SSR_SWOC_DEFAULTS);
  const [conclusion, setConclusion] = useState(SSR_CONCLUSION_DEFAULTS);
  const [criteria, setCriteria] = useState<Record<string, string>>(
    Object.fromEntries(SSR_CRITERIA_SUMMARY.map((c) => [c.id, c.defaultText])),
  );
  const [assId] = useState(() => readStoredId("naacAssId", DEFAULT_ASS_ID));
  const [profileId] = useState(() => readStoredId("naacProfileId", DEFAULT_PROFILE_ID));
  /** Angular tracks create vs update per-record after the first successful load/save. */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadExecutiveSummaryEdit(assId);
        if (cancelled || !data) return;

        setIntro((prev) => ({
          introduction: pickString(data, "introduction") ?? prev.introduction,
          vision: pickString(data, "vision") ?? prev.vision,
          mission: pickString(data, "mission") ?? prev.mission,
        }));
        setSwoc((prev) => ({
          strength: pickString(data, "Institutional_Strength") ?? prev.strength,
          weakness: pickString(data, "Institutional_Weakness") ?? prev.weakness,
          opportunities: pickString(data, "Institutional_Opportunities") ?? prev.opportunities,
          challenges: pickString(data, "Institutional_Challenges") ?? prev.challenges,
        }));
        setConclusion((prev) => ({
          additionalInfo: pickString(data, "additional_info") ?? prev.additionalInfo,
          conclusion: pickString(data, "conclusion") ?? prev.conclusion,
        }));
        setCriteria((prev) => {
          const next = { ...prev };
          for (const c of SSR_CRITERIA_SUMMARY) {
            const v = pickString(data, c.id);
            if (v) next[c.id] = v;
          }
          return next;
        });
        setLoaded(true);
      } catch {
        // No existing summary on the portal yet (or portal unreachable) — stay in create mode.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assId]);

  const handleSave = async (
    btnid: "introsave" | "criteriaSave" | "swocsave" | "conclusionsave",
    updateMode: 1 | 2 | 3 | 4,
    fields: Record<string, string | number>,
    label: string,
  ) => {
    try {
      if (loaded) {
        await saveExecutiveSummaryUpdate(assId, updateMode, {
          ...fields,
          profile_id: profileId,
        });
      } else {
        await saveExecutiveSummaryCreate(btnid, {
          ...fields,
          ass_id: assId,
          profile_id: profileId,
        });
        setLoaded(true);
      }
      toastSuccess(`${label} saved.`);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleSaveIntro = () =>
    handleSave(
      "introsave",
      1,
      { introduction: intro.introduction, vision: intro.vision, mission: intro.mission },
      "Introductory Note",
    );

  const handleSaveCriteria = () => handleSave("criteriaSave", 4, { ...criteria }, "Criterion-wise Summary");

  const handleSaveSwoc = () =>
    handleSave(
      "swocsave",
      2,
      {
        Institutional_Strength: swoc.strength,
        Institutional_Weakness: swoc.weakness,
        Institutional_Opportunities: swoc.opportunities,
        Institutional_Challenges: swoc.challenges,
      },
      "SWOC",
    );

  const handleSaveConclusion = () =>
    handleSave(
      "conclusionsave",
      3,
      { additional_info: conclusion.additionalInfo, conclusion: conclusion.conclusion },
      "Conclusion",
    );

  return (
    <>
      <PageContainer>
        <PageHeader title="SSR Executive Summary" subtitle="NAAC" />
      </PageContainer>
      <PageContainer className="pt-0">
        <div className="app-card overflow-hidden">
          <Tabs defaultValue="intro">
            <div className="overflow-x-auto border-b border-border bg-muted/20">
              <TabsList className={naacTabListClass}>
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className={naacTabTriggerClass}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="intro" className="m-0 p-4">
              <NaacSectionCard title="Introductory Note">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Introduction</label>
                    <Textarea
                      rows={6}
                      maxLength={550}
                      value={intro.introduction}
                      onChange={(e) => setIntro((s) => ({ ...s, introduction: e.target.value }))}
                    />
                    <p className="text-xs text-red-600">*Maximum word limit 350</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Vision</label>
                    <Textarea
                      rows={6}
                      maxLength={550}
                      value={intro.vision}
                      onChange={(e) => setIntro((s) => ({ ...s, vision: e.target.value }))}
                    />
                    <p className="text-xs text-red-600">*Maximum word limit 350</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Mission</label>
                    <Textarea
                      rows={6}
                      maxLength={550}
                      value={intro.mission}
                      onChange={(e) => setIntro((s) => ({ ...s, mission: e.target.value }))}
                    />
                    <p className="text-xs text-red-600">*Maximum word limit 350</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveIntro}>Save And Next</Button>
                  </div>
                </div>
              </NaacSectionCard>
            </TabsContent>

            <TabsContent value="criteria" className="m-0 p-4">
              <NaacSectionCard title="Criteria-Wise Summary">
                <div className="space-y-5">
                  {SSR_CRITERIA_SUMMARY.map((c) => (
                    <div key={c.id} className="space-y-1.5">
                      <label className="text-sm font-medium">{c.title}</label>
                      <Textarea
                        rows={4}
                        maxLength={550}
                        value={criteria[c.id] ?? ""}
                        onChange={(e) =>
                          setCriteria((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                      />
                      <p className="text-xs text-red-600">*Maximum word limit 350</p>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={handleSaveCriteria}>Save And Next</Button>
                  </div>
                </div>
              </NaacSectionCard>
            </TabsContent>

            <TabsContent value="swoc" className="m-0 p-4">
              <NaacSectionCard title="SWOC">
                <div className="space-y-5">
                  {(
                    [
                      ["strength", "Institutional Strength"],
                      ["weakness", "Weakness"],
                      ["opportunities", "Opportunities"],
                      ["challenges", "Challenges"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium">{label}</label>
                      <Textarea
                        rows={4}
                        maxLength={550}
                        value={swoc[key]}
                        onChange={(e) => setSwoc((s) => ({ ...s, [key]: e.target.value }))}
                      />
                      <p className="text-xs text-red-600">*Maximum word limit 350</p>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={handleSaveSwoc}>Save And Next</Button>
                  </div>
                </div>
              </NaacSectionCard>
            </TabsContent>

            <TabsContent value="conclusion" className="m-0 p-4">
              <NaacSectionCard title="Conclusions">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Additional Information</label>
                    <Textarea
                      rows={8}
                      maxLength={550}
                      value={conclusion.additionalInfo}
                      onChange={(e) =>
                        setConclusion((s) => ({ ...s, additionalInfo: e.target.value }))
                      }
                    />
                    <p className="text-xs text-red-600">*Maximum word limit 350</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Conclusion</label>
                    <Textarea
                      rows={4}
                      maxLength={550}
                      value={conclusion.conclusion}
                      onChange={(e) => setConclusion((s) => ({ ...s, conclusion: e.target.value }))}
                    />
                    <p className="text-xs text-red-600">*Maximum word limit 350</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveConclusion}>Save And Next</Button>
                  </div>
                </div>
              </NaacSectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </>
  );
}
