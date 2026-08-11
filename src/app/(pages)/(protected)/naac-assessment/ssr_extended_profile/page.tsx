"use client";

import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastSuccess } from "@/lib/toast";
import type {
  DocRow,
  MetricBlock,
} from "../../staff-naac/_data/ssr-extended-data";
import type { QifDocRow, QifMetric } from "../../staff-naac/_data/ssr-qif-data";
import {
  naacMatTabListClass,
  naacMatTabTriggerClass,
} from "../ssr_profile/_components/NaacMatAccordion";
import { MatExtendedProfileTab } from "./_components/MatExtendedProfileTab";
import { MatQifTab } from "./_components/MatQifTab";
import { matDocKey } from "./_components/MatDocYear";

/**
 * Angular `naac-assessment/ssr_exteded_profile_page` — Material yellow tabs +
 * accordion Extended Profile / QIF. Demo: local toast only (no portal persist).
 */
export default function NaacAssessmentSsrExtendedProfilePage() {
  const [yearValues, setYearValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const setYearValue = (metricId: string, year: string, value: string) =>
    setYearValues((prev) => ({
      ...prev,
      [metricId]: { ...(prev[metricId] ?? {}), [year]: value },
    }));

  const storeDocName = (
    metricId: string,
    doc: { description: string },
    index: number,
    name: string,
  ) => {
    const key = `${metricId}::${matDocKey(doc, index)}`;
    setDocs((prev) => ({ ...prev, [key]: name }));
  };

  const saveLocal = () =>
    toastSuccess(
      "Saved locally. This naac-assessment demo module does not persist to a backend.",
    );

  const onExtendedFile = (
    metric: MetricBlock,
    doc: DocRow,
    index: number,
    file: File | undefined,
  ) => {
    if (!file) return;
    storeDocName(metric.id, doc, index, file.name);
  };

  const onQifFile = (
    metric: QifMetric,
    doc: QifDocRow,
    index: number,
    file: File | undefined,
  ) => {
    if (!file) return;
    storeDocName(metric.id, doc, index, file.name);
  };

  return (
    <>
      <PageContainer className="pt-5">
        <div className="overflow-hidden rounded border border-[#ddd] bg-[#f5f5f5]">
          <Tabs defaultValue="extended">
            <div className="overflow-x-auto border-b border-[#ddd] bg-white">
              <TabsList className={naacMatTabListClass}>
                <TabsTrigger
                  value="extended"
                  className={naacMatTabTriggerClass}
                >
                  Extended Profile
                </TabsTrigger>
                <TabsTrigger value="qif" className={naacMatTabTriggerClass}>
                  QIF
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="extended" className="m-0 bg-[#f5f5f5]">
              <MatExtendedProfileTab
                yearValues={yearValues}
                singleValues={singleValues}
                docs={docs}
                onYearChange={setYearValue}
                onSingleChange={(id, value) =>
                  setSingleValues((prev) => ({ ...prev, [id]: value }))
                }
                onDocFileChange={onExtendedFile}
                onDocRemove={(metric, doc, index) =>
                  storeDocName(metric.id, doc, index, "")
                }
                onSave={saveLocal}
              />
            </TabsContent>

            <TabsContent value="qif" className="m-0 bg-[#f5f5f5] p-3">
              <MatQifTab
                fieldValues={fieldValues}
                yearValues={yearValues}
                docs={docs}
                links={links}
                onFieldChange={(id, value) =>
                  setFieldValues((prev) => ({ ...prev, [id]: value }))
                }
                onYearChange={setYearValue}
                onDocFileChange={onQifFile}
                onDocRemove={(metric, doc, index) =>
                  storeDocName(metric.id, doc, index, "")
                }
                onLinkChange={(metric, doc, index, value) =>
                  setLinks((prev) => ({
                    ...prev,
                    [`${metric.id}::${matDocKey(doc, index)}`]: value,
                  }))
                }
                onSave={saveLocal}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </>
  );
}
