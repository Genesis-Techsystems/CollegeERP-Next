import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Blue section bar used across Angular SSR Profile / Extended / Executive pages. */
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
        "rounded-t-md bg-[#3b7bbf] px-4 py-2 text-sm font-semibold text-white",
        className,
      )}
    >
      {title}
    </div>
  );
}

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
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card shadow-sm",
        className,
      )}
    >
      <NaacSectionHeader title={title} />
      <div className="p-4">{children}</div>
    </div>
  );
}

export function NaacKeyValueGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2 text-sm">
          <span className="min-w-24 shrink-0 font-medium text-muted-foreground">
            {row.label}:
          </span>
          <span className="text-foreground">{row.value || "—"}</span>
        </div>
      ))}
    </div>
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
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((c) => (
              <th
                key={c.key}
                className="border border-border px-3 py-2 text-left font-semibold"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-background even:bg-muted/20">
              {columns.map((c) => (
                <td key={c.key} className="border border-border px-3 py-2">
                  {row[c.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const naacTabListClass =
  "h-auto w-full flex-wrap justify-start rounded-none border-b border-border bg-transparent p-0";

export const naacTabTriggerClass =
  "rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none";
