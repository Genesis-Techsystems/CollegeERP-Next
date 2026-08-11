"use client";

import { Input } from "@/components/ui/input";
import { Copy, XCircle } from "lucide-react";
import { toastSuccess } from "@/lib/toast";
import type { DocRow } from "../../../staff-naac/_data/ssr-extended-data";
import type { QifDocRow } from "../../../staff-naac/_data/ssr-qif-data";
import {
  NaacMatTable,
  NaacMatTd,
  NaacYellowTh,
} from "../../ssr_profile/_components/NaacMatAccordion";

export type MatDoc = DocRow | QifDocRow;

export function matDocKey(doc: { description: string }, index: number) {
  return `${doc.description}::${index}`;
}

/** Angular year grid — gold header row, inputs below. */
export function MatYearTable({
  years,
  values,
  onChange,
}: {
  years: { year: string; value: string }[];
  values?: Record<string, string>;
  onChange: (year: string, value: string) => void;
}) {
  return (
    <NaacMatTable className="text-center">
      <tbody>
        <tr>
          {years.map((y) => (
            <NaacYellowTh key={y.year} className="text-center font-normal">
              {y.year}
            </NaacYellowTh>
          ))}
        </tr>
        <tr>
          {years.map((y) => (
            <NaacMatTd key={`v-${y.year}`} className="p-1">
              <Input
                className="h-9 rounded-sm border-[#ccc] bg-white text-center"
                value={values?.[y.year] ?? y.value}
                onChange={(e) => onChange(y.year, e.target.value)}
              />
            </NaacMatTd>
          ))}
        </tr>
      </tbody>
    </NaacMatTable>
  );
}

function ChooseFilesControl({
  inputId,
  onFileChange,
}: {
  inputId: string;
  onFileChange: (file: File | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center rounded bg-[#111F65] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0d184f]"
      >
        Choose files
      </label>
      <input
        id={inputId}
        type="file"
        className="max-w-[200px] text-xs text-[#666]"
        onChange={(e) => onFileChange(e.target.files?.[0])}
      />
    </div>
  );
}

function UploadedRow({
  name,
  href,
  onRemove,
}: {
  name: string;
  href?: string;
  onRemove: () => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href || name);
      toastSuccess("Successfully Copied");
    } catch {
      // ignore
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          {name}
        </a>
      ) : (
        <span className="text-sm">{name}</span>
      )}
      <button
        type="button"
        title="Remove"
        className="text-red-600"
        onClick={onRemove}
      >
        <XCircle className="h-5 w-5" />
      </button>
      <button
        type="button"
        title="Copy"
        className="text-[#111F65]"
        onClick={copy}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Angular Material Extended/QIF doc table — `#ffcf46` header, Choose files. */
export function MatDocTable({
  documents,
  fileNames = {},
  linkValues = {},
  onFileChange,
  onRemove,
  onLinkChange,
}: {
  documents: MatDoc[];
  fileNames?: Record<string, string>;
  linkValues?: Record<string, string>;
  onFileChange: (doc: MatDoc, index: number, file: File | undefined) => void;
  onRemove?: (doc: MatDoc, index: number) => void;
  onLinkChange?: (doc: MatDoc, index: number, value: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <NaacMatTable className="mx-auto max-w-4xl table-fixed">
      <tbody>
        <tr>
          <NaacYellowTh>
            <b>File Description</b>
          </NaacYellowTh>
          <NaacYellowTh>
            <b>Template</b>
          </NaacYellowTh>
          <NaacYellowTh>
            <b>Documents</b>
          </NaacYellowTh>
        </tr>
        {documents.map((doc, index) => {
          const key = matDocKey(doc, index);
          if ("otherFilesHeader" in doc && doc.otherFilesHeader) {
            return (
              <tr key={key}>
                <NaacYellowTh colSpan={3}>
                  <b>Upload Other Files:</b>
                </NaacYellowTh>
              </tr>
            );
          }

          const displayName =
            key in fileNames ? fileNames[key] || undefined : undefined;
          const linkVal = linkValues[key] ?? doc.linkValue ?? "";
          const inputId = `mat-doc-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          const isOther = "otherFile" in doc && doc.otherFile;

          if (isOther) {
            return (
              <tr key={key}>
                <NaacMatTd>{doc.description || String(index)}</NaacMatTd>
                <NaacMatTd colSpan={2}>
                  {displayName ? (
                    <UploadedRow
                      name={displayName}
                      onRemove={() => onRemove?.(doc, index)}
                    />
                  ) : (
                    <ChooseFilesControl
                      inputId={inputId}
                      onFileChange={(f) => onFileChange(doc, index, f)}
                    />
                  )}
                </NaacMatTd>
              </tr>
            );
          }

          return (
            <tr key={key}>
              <NaacMatTd>
                {doc.description}
                {doc.required ? (
                  <span className="ml-0.5 text-red-600">*</span>
                ) : null}
              </NaacMatTd>
              <NaacMatTd>
                {doc.templateHref || doc.templateLabel ? (
                  <a
                    href={doc.templateHref ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1565c0] underline-offset-2 hover:underline"
                  >
                    {doc.templateLabel ?? "Data Template"}
                  </a>
                ) : null}
              </NaacMatTd>
              <NaacMatTd>
                {doc.linkInput ? (
                  <Input
                    className="h-9 rounded-sm border-[#ccc]"
                    value={linkVal}
                    onChange={(e) => onLinkChange?.(doc, index, e.target.value)}
                  />
                ) : displayName ? (
                  <UploadedRow
                    name={displayName}
                    onRemove={() => onRemove?.(doc, index)}
                  />
                ) : (
                  <ChooseFilesControl
                    inputId={inputId}
                    onFileChange={(f) => onFileChange(doc, index, f)}
                  />
                )}
              </NaacMatTd>
            </tr>
          );
        })}
      </tbody>
    </NaacMatTable>
  );
}
