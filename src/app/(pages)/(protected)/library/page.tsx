"use client";

import { BookOpen } from "lucide-react";
import { PageContainer } from "@/components/layout";

/** Bare `/library` — do not auto-open the hub; pick a child from the sidebar. */
export default function LibraryIndexPage() {
  return (
    <PageContainer>
      <div className="app-card px-6 py-16 text-center">
        <BookOpen
          className="mx-auto h-10 w-10 text-[hsl(var(--primary))] opacity-80"
          aria-hidden
        />
        <h1 className="mt-4 text-lg font-semibold text-[hsl(var(--card-title))]">
          Library
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Select a page from the sidebar to continue.
        </p>
      </div>
    </PageContainer>
  );
}
