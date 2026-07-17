"use client";

import Link from "next/link";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { AFFILIATED_HUB_CARDS } from "../_lib/route-config";

export default function CollegeBulkUploadsPage() {
  return (
    <FilteredPage
      title="Affiliated College Bulk Uploads"
      filtersCollapsible={false}
      filters={
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {AFFILIATED_HUB_CARDS.map((card) => (
            <div
              key={card.step}
              className="rounded-lg border bg-card p-4 flex flex-col gap-2 min-h-[140px]"
            >
              <h3 className="font-semibold text-sm">
                {card.step}. {card.title}
              </h3>
              <p className="text-sm text-muted-foreground flex-1">
                {card.description}
              </p>
              <Button asChild className="w-fit">
                <Link href={card.href}>{card.title}</Link>
              </Button>
            </div>
          ))}
        </div>
      }
    />
  );
}
