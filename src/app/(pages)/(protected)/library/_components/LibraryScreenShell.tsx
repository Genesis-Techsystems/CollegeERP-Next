"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout";

type LibraryScreenShellProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  showHeader?: boolean;
};

/** Standard library page chrome — title card matching author / library-details. */
export function LibraryScreenShell({
  title,
  children,
  action,
  showHeader = true,
}: Readonly<LibraryScreenShellProps>) {
  return (
    <PageContainer className="space-y-5">
      {showHeader ? (
        <div className="app-card flex items-center justify-between gap-3 overflow-hidden px-4 py-3">
          <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
            {title}
          </h1>
          {action}
        </div>
      ) : null}
      {children}
    </PageContainer>
  );
}
