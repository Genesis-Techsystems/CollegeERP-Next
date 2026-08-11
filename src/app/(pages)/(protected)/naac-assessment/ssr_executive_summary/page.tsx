"use client";

import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastSuccess } from "@/lib/toast";
import {
  CopyTextButton,
  NaacSectionCard,
  naacTabListClass,
  naacTabTriggerClass,
} from "../../staff-naac/_components/NaacSection";
import {
  SSR_CONCLUSION_DEFAULTS,
  SSR_CRITERIA_SUMMARY,
  SSR_INTRO_DEFAULTS,
  SSR_SWOC_DEFAULTS,
} from "../../staff-naac/_data/ssr-executive-summary-data";

/**
 * Angular `naac-assessment/ssr_executive_summary` — same scraped content as
 * `staff-naac/ssr-executive-summary` (Angular's `SsrExecutiveSummuryPageComponent`
 * hardcodes identical `text1..text16` demo values), rendered with Material-style
 * "Copy text" buttons instead of Bootstrap tabs. No backend persist.
 */
export default function NaacAssessmentSsrExecutiveSummaryPage() {
  const [intro, setIntro] = useState(SSR_INTRO_DEFAULTS);
  const [swoc, setSwoc] = useState(SSR_SWOC_DEFAULTS);
  const [conclusion, setConclusion] = useState(SSR_CONCLUSION_DEFAULTS);
  const [criteria, setCriteria] = useState<Record<string, string>>(
    Object.fromEntries(SSR_CRITERIA_SUMMARY.map((c) => [c.id, c.defaultText])),
  );

  const saveLocal = () =>
    toastSuccess(
      "Saved locally. This naac-assessment demo module does not persist to a backend.",
    );

  return (
    <>
      <PageContainer>
        <PageHeader
          title="SSR Executive Summary (NAAC Assessment)"
          subtitle="NAAC"
        />
      </PageContainer>
      <PageContainer className="pt-0">
        <div className="app-card overflow-hidden">
          <Tabs defaultValue="intro">
            <div className="overflow-x-auto border-b border-border bg-muted/20">
              <TabsList className={naacTabListClass}>
                <TabsTrigger value="intro" className={naacTabTriggerClass}>
                  Introductory Note
                </TabsTrigger>
                <TabsTrigger value="criteria" className={naacTabTriggerClass}>
                  Criterion-wise Summary
                </TabsTrigger>
                <TabsTrigger value="swoc" className={naacTabTriggerClass}>
                  SWOC
                </TabsTrigger>
                <TabsTrigger value="conclusion" className={naacTabTriggerClass}>
                  Conclusion
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="intro" className="m-0 p-4">
              <NaacSectionCard title="Introductory Note">
                <div className="space-y-5">
                  {(
                    [
                      ["introduction", "Introduction"],
                      ["vision", "Vision"],
                      ["mission", "Mission"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium">{label}</label>
                      <Textarea
                        rows={6}
                        value={intro[key]}
                        onChange={(e) =>
                          setIntro((s) => ({ ...s, [key]: e.target.value }))
                        }
                      />
                      <div className="flex justify-end">
                        <CopyTextButton text={intro[key]} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={saveLocal}>Save And Next</Button>
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
                        value={criteria[c.id] ?? ""}
                        onChange={(e) =>
                          setCriteria((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex justify-end">
                        <CopyTextButton text={criteria[c.id] ?? ""} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={saveLocal}>Save And Next</Button>
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
                        value={swoc[key]}
                        onChange={(e) =>
                          setSwoc((s) => ({ ...s, [key]: e.target.value }))
                        }
                      />
                      <div className="flex justify-end">
                        <CopyTextButton text={swoc[key]} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={saveLocal}>Save And Next</Button>
                  </div>
                </div>
              </NaacSectionCard>
            </TabsContent>

            <TabsContent value="conclusion" className="m-0 p-4">
              <NaacSectionCard title="Conclusions">
                <div className="space-y-5">
                  {(
                    [
                      ["additionalInfo", "Additional Information"],
                      ["conclusion", "Conclusion"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-sm font-medium">{label}</label>
                      <Textarea
                        rows={6}
                        value={conclusion[key]}
                        onChange={(e) =>
                          setConclusion((s) => ({
                            ...s,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex justify-end">
                        <CopyTextButton text={conclusion[key]} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={saveLocal}>Save And Next</Button>
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
