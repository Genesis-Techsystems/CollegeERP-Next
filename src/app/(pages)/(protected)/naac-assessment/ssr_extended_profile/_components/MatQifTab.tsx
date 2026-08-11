"use client";

import { RichTextEditor } from "@/common/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyTextButton } from "../../../staff-naac/_components/NaacSection";
import {
  QIF_CRITERIA,
  type QifDocRow,
  type QifMetric,
} from "../../../staff-naac/_data/ssr-qif-data";
import { NaacMatAccordion } from "../../ssr_profile/_components/NaacMatAccordion";
import { MatDocTable, MatYearTable, matDocKey } from "./MatDocYear";
import { cn } from "@/lib/utils";

type Props = {
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
  onSave: () => void;
};

function RelatedInput({
  related,
}: {
  related: NonNullable<QifMetric["relatedInput"]>;
}) {
  return (
    <div className="rounded border border-[#ddd] bg-[#eff3f6] p-3">
      <p className="mb-2 text-sm font-bold">Related Input</p>
      <p className="mb-2 text-sm">{related.label}</p>
      <table className="mx-auto border-collapse border border-[#999] text-sm">
        <tbody>
          <tr>
            {related.years.map((y) => (
              <td
                key={y.year}
                className="border border-[#999] bg-[#ffcf46] px-3 py-1 text-center font-bold"
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

function MetricBlock({
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
}: {
  metric: QifMetric;
} & Omit<Props, "onSave">) {
  const value = fieldValues[metric.id] ?? metric.defaultValue ?? "";
  const isWide =
    metric.kind === "richtext" ||
    metric.kind === "textarea" ||
    metric.kind === "radio";

  const field = (
    <div
      className={cn(
        "flex flex-col gap-3",
        !isWide && "lg:flex-row lg:items-start",
      )}
    >
      <h5
        className={cn(
          "text-sm font-bold text-[#0d0d0d]",
          isWide ? "w-full" : "lg:w-[45%]",
        )}
      >
        {metric.id}: {metric.title}
      </h5>

      {metric.kind === "richtext" ? (
        <div className="mx-auto w-full max-w-[90%] space-y-2">
          <RichTextEditor
            value={value}
            onChange={(html) => onFieldChange(metric.id, html)}
            toolbarVariant="quill"
            minHeight={160}
            placeholder="Enter text here.."
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-[15px] text-[#FFA500]">
              *Atleast 1 characters and within 500 words
            </span>
            <CopyTextButton text={value} />
          </div>
        </div>
      ) : null}

      {metric.kind === "textarea" ? (
        <div className="mx-auto w-full max-w-[90%] space-y-2">
          <Textarea
            rows={5}
            value={value}
            onChange={(e) => onFieldChange(metric.id, e.target.value)}
          />
          <div className="flex justify-center">
            <CopyTextButton text={value} />
          </div>
        </div>
      ) : null}

      {metric.kind === "numeric" ? (
        <div className="flex items-center gap-2 lg:w-[40%]">
          <Input
            className="h-9 rounded-sm border-[#ccc] disabled:bg-[#eee]"
            value={value}
            disabled={metric.disabled}
            onChange={(e) => onFieldChange(metric.id, e.target.value)}
          />
          {metric.suffix ? <span>{metric.suffix}</span> : null}
        </div>
      ) : null}

      {metric.kind === "years" ? (
        <div className="lg:w-[50%]">
          <MatYearTable
            years={metric.years ?? []}
            values={yearValues[metric.id]}
            onChange={(year, v) => onYearChange(metric.id, year, v)}
          />
        </div>
      ) : null}

      {metric.kind === "radio" ? (
        <div className="w-full space-y-2 lg:w-[55%]">
          {(metric.options ?? []).map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                type="radio"
                className="mt-1"
                name={`mat-qif-${metric.id}`}
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
          {field}
        </div>
      ) : (
        field
      )}

      {metric.relatedInput ? (
        <RelatedInput related={metric.relatedInput} />
      ) : null}

      {(metric.documents?.length ?? 0) > 0 ? (
        <MatDocTable
          documents={metric.documents ?? []}
          fileNames={Object.fromEntries(
            (metric.documents ?? []).flatMap((doc, index) => {
              const k = `${metric.id}::${matDocKey(doc, index)}`;
              return k in docs
                ? [[matDocKey(doc, index), docs[k]] as const]
                : [];
            }),
          )}
          linkValues={Object.fromEntries(
            (metric.documents ?? []).flatMap((doc, index) => {
              const k = `${metric.id}::${matDocKey(doc, index)}`;
              return k in links
                ? [[matDocKey(doc, index), links[k]] as const]
                : [];
            }),
          )}
          onFileChange={(doc, index, file) =>
            onDocFileChange(metric, doc as QifDocRow, index, file)
          }
          onRemove={(doc, index) =>
            onDocRemove(metric, doc as QifDocRow, index)
          }
          onLinkChange={(doc, index, v) =>
            onLinkChange(metric, doc as QifDocRow, index, v)
          }
        />
      ) : null}
    </div>
  );
}

/** Angular `naac-assessment` QIF tab — Criteria's bar + Material criterion accordion. */
export function MatQifTab({
  fieldValues,
  yearValues,
  docs,
  links,
  onFieldChange,
  onYearChange,
  onDocFileChange,
  onDocRemove,
  onLinkChange,
  onSave,
}: Props) {
  return (
    <div className="mt-2 overflow-hidden rounded bg-white shadow">
      <p className="m-0 border-b-2 border-[#ffcf46] bg-white px-3 py-2 text-[19px] font-semibold">
        Criteria&apos;s
      </p>

      <div className="space-y-1 px-2 py-3 sm:px-4">
        {QIF_CRITERIA.map((criterion, idx) => (
          <NaacMatAccordion
            key={criterion.id}
            title={`${criterion.id}.${criterion.title}`}
            defaultOpen={idx === 0}
            className="mx-1 sm:mx-4"
          >
            <div className="space-y-8">
              {criterion.subMetrics.map((sub) => (
                <div key={sub.id} className="space-y-4">
                  <h3 className="text-base font-black text-[#0d0d0d]">
                    <b>
                      {sub.id}: {sub.title}
                    </b>
                  </h3>
                  {sub.metrics.map((metric) => (
                    <MetricBlock
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
                    />
                  ))}
                </div>
              ))}
              <div className="flex justify-end">
                <Button type="button" onClick={onSave}>
                  Save
                </Button>
              </div>
            </div>
          </NaacMatAccordion>
        ))}
      </div>
    </div>
  );
}
