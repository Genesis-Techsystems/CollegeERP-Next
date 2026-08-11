"use client";

import { ChevronDown } from "lucide-react";
import { RichTextEditor } from "@/common/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CopyTextButton } from "../../_components/NaacSection";
import {
  QIF_CRITERIA,
  type QifDocRow,
  type QifMetric,
} from "../../_data/ssr-qif-data";
import { NaacCaeSection } from "./NaacCaeSection";
import { NaacDocTable, docKey } from "./NaacDocTable";
import { NaacYearTable } from "./NaacYearTable";
import { cn } from "@/lib/utils";

type Props = {
  openCriteria: Record<string, boolean>;
  onOpenChange: (id: string, open: boolean) => void;
  fieldValues: Record<string, string>;
  yearValues: Record<string, Record<string, string>>;
  docs: Record<string, string>;
  links: Record<string, string>;
  onFieldChange: (id: string, value: string) => void;
  onYearChange: (metricId: string, year: string, value: string) => void;
  onDocFileChange: (
    metric: QifMetric,
    doc: QifDocRow,
    index: number,
    file: File | undefined,
  ) => void;
  onDocRemove: (metric: QifMetric, doc: QifDocRow, index: number) => void;
  onLinkChange: (
    metric: QifMetric,
    doc: QifDocRow,
    index: number,
    value: string,
  ) => void;
  onSaveCriterion: (criterionId: string) => void;
  /** Angular `naac-assessment` demo shows Material "Copy text" under Quill. */
  showCopyText?: boolean;
};

function RelatedInputPanel({
  related,
}: {
  related: NonNullable<QifMetric["relatedInput"]>;
}) {
  return (
    <div className="rounded border border-[#ddd] bg-[#eff3f6] p-3">
      <p className="mb-2 text-sm font-bold text-[#333]">Related Input</p>
      <p className="mb-2 text-sm text-[#333]">{related.label}</p>
      <table className="mx-auto border-collapse border border-[#999] text-sm">
        <tbody>
          <tr>
            {related.years.map((y) => (
              <td
                key={y.year}
                className="border border-[#999] px-3 py-1 text-center font-bold"
              >
                {y.year}
              </td>
            ))}
          </tr>
          <tr>
            {related.years.map((y) => (
              <td
                key={`v-${y.year}`}
                className="border border-[#999] px-3 py-1 text-center"
              >
                {y.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MetricFields({
  metric,
  fieldValues,
  yearValues,
  docs,
  links,
  onFieldChange,
  onYearChange,
  onDocFileChange,
  onDocRemove,
  onLinkChange,
  showCopyText,
}: {
  metric: QifMetric;
} & Omit<Props, "openCriteria" | "onOpenChange" | "onSaveCriterion">) {
  const isWide =
    metric.kind === "richtext" ||
    metric.kind === "textarea" ||
    metric.kind === "radio";
  const value = fieldValues[metric.id] ?? metric.defaultValue ?? "";

  const fieldRow = (
    <div
      className={cn(
        "flex flex-col gap-3",
        !isWide && "lg:flex-row lg:items-start",
      )}
    >
      <div
        className={cn(
          "text-sm text-[#1a3a6b]",
          isWide ? "w-full" : "lg:w-[42%]",
        )}
      >
        <b>{metric.id}:</b>{" "}
        <strong className="font-semibold">{metric.title}</strong>
      </div>

      {metric.kind === "richtext" ? (
        <div className="w-full max-w-[80%] space-y-1">
          <RichTextEditor
            value={value}
            onChange={(html) => onFieldChange(metric.id, html)}
            toolbarVariant="full"
            minHeight={160}
            placeholder="Enter response…"
          />
          {metric.hint ? (
            <p className="text-[15px] font-bold text-[#FFA500]">{metric.hint}</p>
          ) : null}
          {showCopyText ? (
            <div className="flex justify-end pt-1">
              <CopyTextButton text={value} />
            </div>
          ) : null}
        </div>
      ) : null}

      {metric.kind === "textarea" ? (
        <div className="w-full max-w-[80%] space-y-1">
          <Textarea
            rows={6}
            className="rounded-sm border-[#ccc] bg-white"
            value={value}
            onChange={(e) => onFieldChange(metric.id, e.target.value)}
          />
          {showCopyText ? (
            <div className="flex justify-end pt-1">
              <CopyTextButton text={value} />
            </div>
          ) : null}
        </div>
      ) : null}

      {metric.kind === "numeric" ? (
        <div className="flex items-center gap-2 lg:w-[42%]">
          <Input
            className="h-9 max-w-md rounded-sm border-[#ccc] bg-white disabled:bg-[#eee]"
            value={value}
            disabled={metric.disabled}
            onChange={(e) => onFieldChange(metric.id, e.target.value)}
          />
          {metric.suffix ? (
            <span className="text-sm text-[#333]">{metric.suffix}</span>
          ) : null}
        </div>
      ) : null}

      {metric.kind === "years" ? (
        <div className="lg:w-[42%]">
          <NaacYearTable
            years={metric.years ?? []}
            values={yearValues[metric.id]}
            onChange={(year, v) => onYearChange(metric.id, year, v)}
          />
        </div>
      ) : null}

      {metric.kind === "radio" ? (
        <div className="w-full space-y-2 lg:w-[58%]">
          {(metric.options ?? []).map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 text-sm text-[#333]"
            >
              <input
                type="radio"
                className="mt-1"
                name={`qif-${metric.id}`}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onFieldChange(metric.id, opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {metric.nestedPanel ? (
        <div className="rounded border border-[#ddd] bg-[#d2d6de] p-3">
          {fieldRow}
        </div>
      ) : (
        <div className="rounded border border-[#ddd] bg-white p-3">{fieldRow}</div>
      )}

      {metric.relatedInput ? (
        <RelatedInputPanel related={metric.relatedInput} />
      ) : null}

      {(metric.documents?.length ?? 0) > 0 ? (
        <NaacDocTable
          documents={metric.documents ?? []}
          fileNames={Object.fromEntries(
            (metric.documents ?? []).flatMap((doc, index) => {
              const k = `${metric.id}::${docKey(doc, index)}`;
              return k in docs
                ? [[docKey(doc, index), docs[k]] as const]
                : [];
            }),
          )}
          linkValues={Object.fromEntries(
            (metric.documents ?? []).flatMap((doc, index) => {
              const k = `${metric.id}::${docKey(doc, index)}`;
              return k in links
                ? [[docKey(doc, index), links[k]] as const]
                : [];
            }),
          )}
          onFileChange={(doc, index, file) =>
            onDocFileChange(metric, doc, index, file)
          }
          onRemove={(doc, index) => onDocRemove(metric, doc, index)}
          onLinkChange={(doc, index, v) =>
            onLinkChange(metric, doc, index, v)
          }
        />
      ) : null}
    </div>
  );
}

export function QifTab({
  openCriteria,
  onOpenChange,
  fieldValues,
  yearValues,
  docs,
  links,
  onFieldChange,
  onYearChange,
  onDocFileChange,
  onDocRemove,
  onLinkChange,
  onSaveCriterion,
  showCopyText = false,
}: Props) {
  return (
    <div className="space-y-3 p-4">
      {QIF_CRITERIA.map((criterion) => {
        const open = openCriteria[criterion.id] ?? criterion.id === "1";
        return (
          <Collapsible
            key={criterion.id}
            open={open}
            onOpenChange={(next) => onOpenChange(criterion.id, next)}
            className="overflow-hidden rounded border border-[#ddd] bg-white shadow-sm"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-t-2 border-[#f0ad4e] bg-white px-4 py-3 text-left hover:bg-[#fafafa]"
              >
                <span className="text-[15px] font-medium text-[#333]">
                  {criterion.id}.{criterion.title}
                </span>
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{criterion.answeredLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 border-t border-[#eee] p-3">
                {criterion.subMetrics.map((sub) => (
                  <NaacCaeSection
                    key={sub.id}
                    titleHtml={
                      <>
                        <b>{sub.id}</b>: {sub.title}
                      </>
                    }
                  >
                    <div className="space-y-3">
                      {sub.metrics.map((metric) => (
                        <MetricFields
                          key={metric.id}
                          metric={metric}
                          fieldValues={fieldValues}
                          yearValues={yearValues}
                          docs={docs}
                          links={links}
                          onFieldChange={onFieldChange}
                          onYearChange={onYearChange}
                          onDocFileChange={onDocFileChange}
                          onDocRemove={onDocRemove}
                          onLinkChange={onLinkChange}
                          showCopyText={showCopyText}
                        />
                      ))}
                    </div>
                  </NaacCaeSection>
                ))}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-[#337ab7] hover:bg-[#286090]"
                    onClick={() => onSaveCriterion(criterion.id)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
