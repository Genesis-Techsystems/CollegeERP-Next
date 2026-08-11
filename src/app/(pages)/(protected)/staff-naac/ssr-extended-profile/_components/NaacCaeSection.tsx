import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Angular Extended/QIF panel with `#cae7ff` heading bar. */
export function NaacCaeSection({
  title,
  children,
  titleHtml,
  className,
}: {
  title?: ReactNode;
  /** When title needs bold metric id: e.g. `<b>1.1</b>: …` */
  titleHtml?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-[#cae7ff] bg-white",
        className,
      )}
    >
      <div className="bg-[#cae7ff] px-4 py-2.5 text-[15px] font-normal text-[#333]">
        {titleHtml ?? title}
      </div>
      <div className="space-y-4 p-3 pt-4">{children}</div>
    </div>
  );
}
