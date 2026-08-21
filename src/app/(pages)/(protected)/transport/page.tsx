"use client";

import { Bus } from "lucide-react";
import { PageContainer } from "@/components/layout";

/** Bare `/transport` — do not auto-open the hub; pick a child from the sidebar. */
export default function TransportIndexPage() {
  return (
    <PageContainer>
      <div className="app-card px-6 py-16 text-center">
        <Bus
          className="mx-auto h-10 w-10 text-[hsl(var(--primary))] opacity-80"
          aria-hidden
        />
        <h1 className="mt-4 text-lg font-semibold text-[hsl(var(--card-title))]">
          Transport
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Select a page from the sidebar to continue.
        </p>
      </div>
    </PageContainer>
  );
}
