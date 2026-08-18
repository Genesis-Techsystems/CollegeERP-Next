"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  loadDynamicQuestionnaire,
  saveDynamicQuestionnaire,
  saveQifSsrHome,
  uploadExtendedQuestionnaireFile,
} from "@/services";
import {
  EXTENDED_PROFILE_SECTIONS,
  type DocRow,
  type MetricBlock,
} from "../_data/ssr-extended-data";
import {
  QIF_CRITERIA,
  type QifDocRow,
  type QifMetric,
} from "../_data/ssr-qif-data";
import { naacTabListClass } from "../_components/NaacSection";
import { ExtendedProfileTab } from "./_components/ExtendedProfileTab";
import { QifTab } from "./_components/QifTab";
import { docKey } from "./_components/NaacDocTable";
import { cn } from "@/lib/utils";

/** Angular Material tab: yellow underline on active. */
const tabTriggerClass = cn(
  "rounded-none border-0 border-b-2 border-transparent bg-transparent px-5 py-2.5 text-sm font-medium text-[#333] shadow-none",
  "data-[state=active]:border-[#f0ad4e] data-[state=active]:bg-white data-[state=active]:text-[#333] data-[state=active]:shadow-none",
);

/**
 * Angular `staff-naac/ssr-extended-profile` —
 * `#dynamicQuestionnaire` (Extended Profile) + `#preparessr` (QIF).
 */
export default function SsrExtendedProfilePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(
    searchParams.get("tab") === "qif" ? "qif" : "extended",
  );
  const [yearValues, setYearValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [openCriteria, setOpenCriteria] = useState<Record<string, boolean>>({
    "1": true,
  });
  const [portalNote, setPortalNote] = useState<string | null>(null);

  const setYearValue = (metricId: string, year: string, value: string) =>
    setYearValues((prev) => ({
      ...prev,
      [metricId]: { ...(prev[metricId] ?? {}), [year]: value },
    }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadDynamicQuestionnaire();
        if (cancelled || !data) return;
        if (typeof data === "string" && data.trim()) {
          setPortalNote(
            "Loaded the latest Extended Profile questionnaire from the NAAC portal. Values below reflect the local snapshot; Save posts your edits back to the portal.",
          );
        }
      } catch {
        // Portal unreachable / no active session — keep the local snapshot form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveExtended = async () => {
    const questionnaireInputs: Record<string, unknown> = {};
    for (const section of EXTENDED_PROFILE_SECTIONS) {
      for (const metric of section.metrics) {
        if (metric.kind === "single") {
          questionnaireInputs[metric.id] =
            singleValues[metric.id] ?? metric.singleValue ?? "";
          continue;
        }
        for (const y of metric.years ?? []) {
          questionnaireInputs[`${metric.id}_${y.year}`] =
            yearValues[metric.id]?.[y.year] ?? y.value;
        }
      }
    }
    try {
      await saveDynamicQuestionnaire(questionnaireInputs, "0");
      toastSuccess("Extended Profile saved.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleSaveCriterion = async (criterionId: string) => {
    const criterion = QIF_CRITERIA.find((c) => c.id === criterionId);
    if (!criterion) return;
    const ssrInputs: Record<string, unknown> = {};
    for (const sub of criterion.subMetrics) {
      for (const metric of sub.metrics) {
        if (metric.kind === "years") {
          for (const y of metric.years ?? []) {
            ssrInputs[`${metric.id}_${y.year}`] =
              yearValues[metric.id]?.[y.year] ?? y.value;
          }
        } else {
          ssrInputs[metric.id] =
            fieldValues[metric.id] ?? metric.defaultValue ?? "";
        }
      }
    }
    try {
      await saveQifSsrHome({ ssrInputs, criteriaId: criterion.id });
      toastSuccess(`Criterion ${criterion.id} saved.`);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const storeDocName = (
    metricId: string,
    doc: { description: string },
    index: number,
    name: string,
  ) => {
    const key = `${metricId}::${docKey(doc as DocRow, index)}`;
    setDocs((prev) => ({ ...prev, [key]: name }));
  };

  const handleExtendedDocFile = async (
    metric: MetricBlock,
    doc: DocRow,
    index: number,
    file: File | undefined,
  ) => {
    if (!file) return;
    storeDocName(metric.id, doc, index, file.name);
    if (doc.questionnaireId == null || doc.fileformatId == null) {
      toastInfo(
        `Selected ${file.name}. This metric doesn't have a portal upload id yet, so it wasn't sent to NAAC.`,
      );
      return;
    }
    try {
      await uploadExtendedQuestionnaireFile(file, {
        questionnaire_id: doc.questionnaireId,
        fileformat_id: doc.fileformatId,
        seq: doc.seq ?? 1,
      });
      toastSuccess(`${doc.description} uploaded.`);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleQifDocFile = async (
    metric: QifMetric,
    doc: QifDocRow,
    index: number,
    file: File | undefined,
  ) => {
    if (!file) return;
    storeDocName(metric.id, doc, index, file.name);
    if (doc.questionnaireId == null || doc.fileformatId == null) {
      toastInfo(
        `Selected ${file.name}. This metric doesn't have a portal upload id yet, so it wasn't sent to NAAC.`,
      );
      return;
    }
    try {
      await uploadExtendedQuestionnaireFile(file, {
        questionnaire_id: doc.questionnaireId,
        fileformat_id: doc.fileformatId,
        seq: doc.seq ?? 1,
      });
      toastSuccess(`${doc.description} uploaded.`);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  return (
    <>
      <PageContainer className="pt-5">
        <div className="overflow-hidden rounded border border-border bg-white">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto border-b border-border bg-[#f0f0f0]">
              <TabsList className={naacTabListClass}>
                <TabsTrigger value="extended" className={tabTriggerClass}>
                  Extended Profile
                </TabsTrigger>
                <TabsTrigger value="qif" className={tabTriggerClass}>
                  QIF
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="extended" className="m-0">
              <ExtendedProfileTab
                portalNote={portalNote}
                yearValues={yearValues}
                singleValues={singleValues}
                docs={docs}
                onYearChange={setYearValue}
                onSingleChange={(id, value) =>
                  setSingleValues((prev) => ({ ...prev, [id]: value }))
                }
                onDocFileChange={handleExtendedDocFile}
                onDocRemove={(metric, doc, index) =>
                  storeDocName(metric.id, doc, index, "")
                }
                onSave={handleSaveExtended}
              />
            </TabsContent>

            <TabsContent value="qif" className="m-0">
              <QifTab
                openCriteria={openCriteria}
                onOpenChange={(id, open) =>
                  setOpenCriteria((prev) => ({ ...prev, [id]: open }))
                }
                fieldValues={fieldValues}
                yearValues={yearValues}
                docs={docs}
                links={links}
                onFieldChange={(id, value) =>
                  setFieldValues((prev) => ({ ...prev, [id]: value }))
                }
                onYearChange={setYearValue}
                onDocFileChange={handleQifDocFile}
                onDocRemove={(metric, doc, index) =>
                  storeDocName(metric.id, doc, index, "")
                }
                onLinkChange={(metric, doc, index, value) =>
                  setLinks((prev) => ({
                    ...prev,
                    [`${metric.id}::${docKey(doc, index)}`]: value,
                  }))
                }
                onSaveCriterion={handleSaveCriterion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </>
  );
}
