"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** Angular Material `mat-expansion-panel` used on naac-assessment SSR Profile. */
export function NaacMatAccordion({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        "mb-3 overflow-hidden rounded bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#fafafa]">
        <strong className="text-[15px] font-semibold text-[#1565c0]">
          {title}
        </strong>
        <ChevronDown className="h-5 w-5 shrink-0 text-[#666] transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-[#eee] px-3 py-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Angular `#ffcf46` table header row helpers. */
export function NaacYellowTh({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border border-[#333] bg-[#ffcf46] px-2 py-2 text-left text-sm font-normal text-black",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function NaacMatTd({
  children,
  className,
  colSpan,
  value = false,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  value?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border border-[#333] px-2 py-2 align-middle text-sm",
        value && "text-[#5b2c6f]",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function NaacMatTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse border border-[#333] text-sm",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

/** Angular Material tab: active = yellow fill (screenshot). */
export const naacMatTabListClass =
  "inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none bg-transparent p-0";

export const naacMatTabTriggerClass = cn(
  "rounded-none border-0 bg-transparent px-4 py-2.5 text-sm font-medium text-[#333] shadow-none",
  "data-[state=active]:bg-[#ffcf46] data-[state=active]:font-bold data-[state=active]:text-black data-[state=active]:shadow-none",
);
