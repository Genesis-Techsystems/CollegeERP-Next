import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";

/** Angular Bootstrap `panel-primary` heading (blue bar). */
export function NaacPrimaryPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#337ab7] bg-white shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="bg-[#337ab7] px-4 py-2.5 text-[15px] font-semibold text-white">
          {title}
        </div>
      ) : null}
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

/**
 * Angular Bootstrap `panel-default` — gray heading + bordered body.
 * Used for inner sections inside Basic / Academic tabs.
 */
export function NaacDefaultPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#ddd] bg-white",
        className,
      )}
    >
      <div className="border-b border-[#ddd] bg-[#f5f5f5] px-4 py-2 text-sm font-bold text-[#333]">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/** @deprecated Prefer NaacDefaultPanel for Angular staff-naac parity. */
export function NaacSectionHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-t-md bg-[#337ab7] px-4 py-2 text-sm font-semibold text-white",
        className,
      )}
    >
      {title}
    </div>
  );
}

/** @deprecated Prefer NaacDefaultPanel (gray) inside NaacPrimaryPanel (blue). */
export function NaacSectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <NaacDefaultPanel title={title} className={className}>
      {children}
    </NaacDefaultPanel>
  );
}

/** Angular `td_style` purple value text. */
export const naacTdValueClass = "text-[#5b2c6f]";

/** Bordered label/value table matching Angular `table table-bordered`. */
export function NaacBorderedTable({
  children,
  className,
  fixed = true,
}: {
  children: ReactNode;
  className?: string;
  fixed?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse border border-[#ddd] text-sm",
          fixed && "table-fixed",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function NaacTd({
  children,
  className,
  colSpan,
  value = false,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  /** Apply Angular purple value colour. */
  value?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border border-[#ddd] px-3 py-2 align-middle",
        value && naacTdValueClass,
        className,
      )}
    >
      {children}
    </td>
  );
}

export function NaacTh({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border border-[#ddd] bg-[#DCDCDC] px-3 py-2 text-left font-semibold text-[#333]",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Two-column label | value row. */
export function NaacLabelValueRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr>
      <NaacTd className="w-[35%] bg-white font-normal text-[#333]">
        {label}
      </NaacTd>
      <NaacTd value>{children}</NaacTd>
    </tr>
  );
}

export function NaacKeyValueGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <NaacBorderedTable>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <NaacTd className="w-[30%]">{row.label}</NaacTd>
            <NaacTd value colSpan={3}>
              {row.value || ""}
            </NaacTd>
          </tr>
        ))}
      </tbody>
    </NaacBorderedTable>
  );
}

export function NaacSimpleTable({
  columns,
  rows,
}: {
  columns: { key: string; header: string }[];
  rows: Record<string, string | number | undefined>[];
}) {
  return (
    <NaacBorderedTable fixed={false}>
      <thead>
        <tr>
          {columns.map((c) => (
            <NaacTh key={c.key}>{c.header}</NaacTh>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <NaacTd key={c.key} value>
                {row[c.key] ?? ""}
              </NaacTd>
            ))}
          </tr>
        ))}
      </tbody>
    </NaacBorderedTable>
  );
}

/** Browser-default Choose file / No file chosen (Angular staff-naac native `<input type="file">`). */
export const naacNativeFileClass =
  "h-auto w-auto max-w-full cursor-pointer border-0 bg-transparent p-0 text-[13px] font-normal text-black shadow-none [appearance:auto] file:me-2 file:inline-block file:h-auto file:cursor-pointer file:rounded-[2px] file:border file:border-solid file:border-[#767676] file:bg-[#efefef] file:px-2.5 file:py-[3px] file:text-[13px] file:font-normal file:text-black file:shadow-none";

export function NaacNativeFileInput({
  id,
  name,
  onChange,
}: {
  id?: string;
  name?: string;
  onChange?: (file: File | undefined) => void;
}) {
  return (
    <input
      id={id}
      name={name}
      type="file"
      className={naacNativeFileClass}
      onChange={(e) => onChange?.(e.target.files?.[0])}
    />
  );
}

/** Angular `naac-assessment` `copyToClipboard(textN)` — Material "Copy text" button. */
export function CopyTextButton({ text }: { text: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Successfully Copied");
    } catch {
      // Angular silently swallows clipboard failures too.
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      <Copy className="mr-1.5 h-3.5 w-3.5" />
      Copy text
    </Button>
  );
}

export const naacTabListClass =
  "inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none bg-transparent p-0";

export const naacTabTriggerClass =
  "rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-[#337ab7] data-[state=active]:bg-transparent data-[state=active]:text-[#337ab7] data-[state=active]:shadow-none";
