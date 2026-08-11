"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXTENDED_PROFILE_SECTIONS } from "../../../staff-naac/_data/ssr-extended-data";
import type {
  DocRow,
  MetricBlock,
} from "../../../staff-naac/_data/ssr-extended-data";
import { NaacMatAccordion } from "../../ssr_profile/_components/NaacMatAccordion";
import { MatDocTable, MatYearTable, matDocKey } from "./MatDocYear";

type Props = {
  yearValues: Record<string, Record<string, string>>;
  singleValues: Record<string, string>;
  docs: Record<string, string>;
  onYearChange: (metricId: string, year: string, value: string) => void;
  onSingleChange: (metricId: string, value: string) => void;
  onDocFileChange: (
    metric: MetricBlock,
    doc: DocRow,
    index: number,
    file: File | undefined,
  ) => void;
  onDocRemove: (metric: MetricBlock, doc: DocRow, index: number) => void;
  onSave: () => void;
};

/** Angular `naac-assessment` Extended Profile tab — Material accordion sections. */
export function MatExtendedProfileTab({
  yearValues,
  singleValues,
  docs,
  onYearChange,
  onSingleChange,
  onDocFileChange,
  onDocRemove,
  onSave,
}: Props) {
  return (
    <div className="space-y-1 px-2 py-3 sm:px-6">
      {EXTENDED_PROFILE_SECTIONS.map((section, idx) => (
        <NaacMatAccordion
          key={section.number}
          title={`${section.number}.${section.title}`}
          defaultOpen={idx === 0}
          className="mx-1 sm:mx-4"
        >
          <div className="space-y-8">
            {section.metrics.map((metric) => (
              <div key={metric.id} className="space-y-4">
                {metric.kind === "single" ? (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <h3 className="text-base font-black text-[#0d0d0d] lg:flex-1">
                      {metric.id} {metric.title}
                    </h3>
                    <div className="lg:w-40">
                      <Input
                        className="h-9 rounded-sm border-[#ccc]"
                        value={
                          singleValues[metric.id] ?? metric.singleValue ?? ""
                        }
                        onChange={(e) =>
                          onSingleChange(metric.id, e.target.value)
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-black text-[#0d0d0d]">
                      {metric.id} {metric.title}
                    </h3>
                    <MatYearTable
                      years={metric.years ?? []}
                      values={yearValues[metric.id]}
                      onChange={(year, value) =>
                        onYearChange(metric.id, year, value)
                      }
                    />
                  </>
                )}

                {metric.documents.length > 0 ? (
                  <MatDocTable
                    documents={metric.documents}
                    fileNames={Object.fromEntries(
                      metric.documents.flatMap((doc, index) => {
                        const k = `${metric.id}::${matDocKey(doc, index)}`;
                        return k in docs
                          ? [[matDocKey(doc, index), docs[k]] as const]
                          : [];
                      }),
                    )}
                    onFileChange={(doc, index, file) =>
                      onDocFileChange(metric, doc as DocRow, index, file)
                    }
                    onRemove={(doc, index) =>
                      onDocRemove(metric, doc as DocRow, index)
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </NaacMatAccordion>
      ))}

      <div className="flex justify-end gap-3 px-4 pt-2">
        <Button
          type="button"
          className="w-[150px] bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
          onClick={onSave}
        >
          Save
        </Button>
        <Button type="button" className="w-[150px]" onClick={onSave}>
          Submit and Next
        </Button>
      </div>
    </div>
  );
}
