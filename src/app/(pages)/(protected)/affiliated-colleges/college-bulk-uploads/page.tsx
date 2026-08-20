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
      showFilterLabel={false}
      filters={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
          {AFFILIATED_HUB_CARDS.map((card) => (
            <div
              key={card.step}
              className="flex flex-col bg-white"
              style={{
                border: "2px solid #89c5ff",
                borderRadius: 4,
                padding: 16,
                minHeight: 168,
              }}
            >
              <h3
                className="m-0"
                style={{
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: "28px",
                  color: "rgba(0,0,0,.87)",
                }}
              >
                {card.step}. {card.title}
              </h3>
              <p
                className="m-0"
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  lineHeight: "24px",
                  fontWeight: 400,
                  color: "rgba(0,0,0,.87)",
                }}
              >
                {card.description}
              </p>
              <div
                className="mt-auto flex justify-end"
                style={{ paddingTop: 16 }}
              >
                <Button
                  asChild
                  className="!m-0 !h-[40px] !min-h-[40px] !rounded-[4px] !px-4 !text-[13px] !font-medium !leading-none"
                >
                  <Link href={card.href}>{card.title}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
