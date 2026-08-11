"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EXTENDED_PROFILE_SECTIONS,
  type DocRow,
  type MetricBlock,
} from "../../_data/ssr-extended-data";
import { NaacCaeSection } from "./NaacCaeSection";
import { NaacDocTable, docKey } from "./NaacDocTable";
import { NaacYearTable } from "./NaacYearTable";

type Props = {
  portalNote: string | null;
  yearValues: Record<string, Record<string, string>>;
  singleValues: Record<string, string>;
  docs: Record<string, string>;
  onYearChange: (metricId: string, year: string, value: string) => void;
  onSingleChange: (metricId: string, value: string) => void;
  onDocFileChange: (metric: MetricBlock, doc: DocRow, index: number, file: File | undefined) => void;
  onDocRemove: (metric: MetricBlock, doc: DocRow, index: number) => void;
  onSave: () => void;
};

export function ExtendedProfileTab({
  portalNote,
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
    <div className="space-y-5 p-4">
      {portalNote ? (
        <div className="rounded border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">
          {portalNote}
        </div>
      ) : null}

      {EXTENDED_PROFILE_SECTIONS.map((section) => (
        <NaacCaeSection
          key={section.number}
          title={`${section.number} . ${section.title}`}
        >
          {section.metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded border border-[#ddd] bg-white p-3"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="text-sm text-[#333] lg:w-1/2">
                  {metric.id} . {metric.title}
                </div>
                <div className="lg:w-[42%]">
                  {metric.kind === "single" ? (
                    <Input
                      className="h-9 max-w-md rounded-sm border-[#ccc] bg-white"
                      value={singleValues[metric.id] ?? metric.singleValue ?? ""}
                      onChange={(e) => onSingleChange(metric.id, e.target.value)}
                    />
                  ) : (
                    <NaacYearTable
                      years={metric.years ?? []}
                      values={yearValues[metric.id]}
                      onChange={(year, value) =>
                        onYearChange(metric.id, year, value)
                      }
                    />
                  )}
                </div>
              </div>

              {metric.documents.length > 0 ? (
                <div className="mt-4">
                  <NaacDocTable
                    documents={metric.documents}
                    fileNames={Object.fromEntries(
                      metric.documents.flatMap((doc, index) => {
                        const k = `${metric.id}::${docKey(doc, index)}`;
                        return k in docs
                          ? [[docKey(doc, index), docs[k]] as const]
                          : [];
                      }),
                    )}
                    onFileChange={(doc, index, file) =>
                      onDocFileChange(metric, doc, index, file)
                    }
                    onRemove={(doc, index) => onDocRemove(metric, doc, index)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </NaacCaeSection>
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-[#337ab7] hover:bg-[#286090]"
          onClick={onSave}
        >
          Save and Next
        </Button>
      </div>
    </div>
  );
}
