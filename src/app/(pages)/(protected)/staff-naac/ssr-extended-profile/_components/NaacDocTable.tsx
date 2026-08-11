"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

/** Shared doc-row shape for Extended Profile + QIF file tables. */
export type NaacDocRow = {
  description: string;
  required?: boolean;
  templateLabel?: string;
  templateHref?: string;
  fileName?: string;
  fileHref?: string;
  linkInput?: boolean;
  linkValue?: string;
  otherFilesHeader?: boolean;
  otherFile?: boolean;
  questionnaireId?: string | number;
  fileformatId?: string | number;
  seq?: string | number;
};

type Props = {
  documents: NaacDocRow[];
  fileNames?: Record<string, string>;
  linkValues?: Record<string, string>;
  onFileChange: (doc: NaacDocRow, index: number, file: File | undefined) => void;
  onRemove?: (doc: NaacDocRow, index: number) => void;
  onLinkChange?: (doc: NaacDocRow, index: number, value: string) => void;
};

function docKey(doc: NaacDocRow, index: number) {
  return `${doc.description}::${index}`;
}

function UploadControl({
  doc,
  index,
  onFileChange,
}: {
  doc: NaacDocRow;
  index: number;
  onFileChange: Props["onFileChange"];
}) {
  const inputId = `naac-upload-${docKey(doc, index).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center rounded border border-[#ccc] bg-[#f5f5f5] px-3 py-1 text-sm text-[#333] hover:bg-[#e8e8e8]"
      >
        Upload
      </label>
      <input
        id={inputId}
        type="file"
        className="max-w-[220px] text-xs"
        onChange={(e) => onFileChange(doc, index, e.target.files?.[0])}
      />
      <span title="Only xlsx,xls,doc,docx,pdf files are allowed.">
        <HelpCircle className="h-3.5 w-3.5 text-[#777]" />
      </span>
    </div>
  );
}

/** Angular `file_append_dynamic` — gray header, `#e6f7ff` rows. */
export function NaacDocTable({
  documents,
  fileNames = {},
  linkValues = {},
  onFileChange,
  onRemove,
  onLinkChange,
}: Props) {
  if (documents.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-[96%] max-w-full table-fixed border-collapse border border-[#999] text-sm">
        <tbody>
          <tr className="bg-[#b3b3b3] text-white">
            <td className="border border-[#999] px-3 py-2 text-left font-bold">
              File Description
            </td>
            <td className="border border-[#999] px-3 py-2 text-left font-bold">
              Template
            </td>
            <td
              colSpan={2}
              className="border border-[#999] px-3 py-2 text-left font-bold"
            >
              Documents
            </td>
          </tr>
          {documents.map((doc, index) => {
            const key = docKey(doc, index);

            if (doc.otherFilesHeader) {
              return (
                <tr key={key}>
                  <td
                    colSpan={4}
                    className="border border-[#999] bg-[#b3b3b3] px-3 py-2 text-left font-bold text-white"
                  >
                    Upload Other Files:
                  </td>
                </tr>
              );
            }

            const displayName =
              key in fileNames ? fileNames[key] || undefined : doc.fileName;
            const linkVal = linkValues[key] ?? doc.linkValue ?? "";

            if (doc.otherFile) {
              return (
                <tr key={key} className="bg-[#e6f7ff]">
                  <td
                    colSpan={2}
                    className="border border-[#999] px-3 py-2 align-middle text-[#333]"
                  >
                    {doc.description || String(index)}
                  </td>
                  <td
                    colSpan={2}
                    className="border border-[#999] px-3 py-2 align-middle"
                  >
                    {displayName ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-[#333]">{displayName}</span>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-[#337ab7] px-2.5 text-xs hover:bg-[#286090]"
                          onClick={() => onRemove?.(doc, index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <UploadControl
                        doc={doc}
                        index={index}
                        onFileChange={onFileChange}
                      />
                    )}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={key} className="bg-[#e6f7ff]">
                <td className="border border-[#999] px-3 py-2 align-middle text-[#333]">
                  {doc.description}
                  {doc.required ? (
                    <span className="ml-0.5 text-red-600" aria-hidden>
                      *
                    </span>
                  ) : null}
                </td>
                <td className="border border-[#999] px-3 py-2 align-middle">
                  {doc.templateHref || doc.templateLabel ? (
                    <a
                      href={doc.templateHref ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-black underline-offset-2 hover:underline"
                      title="Please note that it is mandatory to download the NAAC specified template, fill up the data, and upload the data file."
                    >
                      {doc.templateLabel ?? "Data Template"}
                    </a>
                  ) : null}
                </td>
                <td
                  colSpan={2}
                  className="border border-[#999] px-3 py-2 align-middle"
                >
                  {doc.linkInput ? (
                    <Input
                      className="h-9 max-w-xl rounded-sm border-[#ccc] bg-white"
                      value={linkVal}
                      onChange={(e) =>
                        onLinkChange?.(doc, index, e.target.value)
                      }
                    />
                  ) : displayName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {doc.fileHref ? (
                        <a
                          href={doc.fileHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-black underline-offset-2 hover:underline"
                        >
                          {displayName}
                        </a>
                      ) : (
                        <span className="text-sm text-[#333]">{displayName}</span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 bg-[#337ab7] px-2.5 text-xs hover:bg-[#286090]"
                        onClick={() => onRemove?.(doc, index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <UploadControl
                      doc={doc}
                      index={index}
                      onFileChange={onFileChange}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { docKey };
