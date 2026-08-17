"use client";

import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { useNavigationStore } from "@/store/navigation-store";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/navigation";
import { IS_DEBUG_MODE, DebugPanel } from "@/debug";
import { useTheme } from "@/common/components/theme-setting-modal";
import { Breadcrumb, useBreadcrumb } from "@/common/components/breadcrumb";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/config/constants/app";

function navSignature(items: NavItem[]): string {
  return items
    .map((item) => `${item.id}:${item.children?.length ?? 0}`)
    .join("|");
}

interface AppShellProps {
  children: ReactNode;
  initialNavItems: NavItem[];
  /** Logged-in user id — re-seeds the sidebar when the account changes. */
  navUserId?: number;
}

export function AppShell({
  children,
  initialNavItems,
  navUserId = 0,
}: Readonly<AppShellProps>) {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    autoCollapse,
    setNavItems,
    resetNavItems,
    setSidebarCollapsed,
  } = useNavigationStore();

  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const prevNavUserId = useRef<number | null>(null);
  const initialNavRef = useRef(initialNavItems);
  initialNavRef.current = initialNavItems;
  const navTreeSignature = navSignature(initialNavItems);

  // Global page-header card — page name + breadcrumb trail, rendered above
  // each page's filter card. The dashboard renders its own breadcrumb, so it
  // is skipped here.
  const breadcrumbItems = useBreadcrumb();
  const pageTitle = breadcrumbItems[breadcrumbItems.length - 1]?.label ?? "";
  // Hide the trail on each role's home dashboard (admin / evaluator / student).
  // Angular Fuse `navbar/toolbar hidden` on pay-status after gateway return.
  const hideChrome =
    pathname === "/apps/payment-status" || pathname === "/pages/payment-status";

  const showBreadcrumb =
    !hideChrome &&
    pathname !== "/dashboard" &&
    pathname !== "/evaluator" &&
    pathname !== "/student-dashboard" &&
    pathname !== "/hr-payroll/service-book/service-book-entries" &&
    pathname !== "/hr-payroll/service-book/employee-wallet" &&
    pathname !== "/hr-payroll/employee/id-cards" &&
    pathname !== "/finance/journal-book" &&
    pathname !== "/finance/bank-book" &&
    pathname !== "/finance/cash-book";

  useEffect(() => {
    if (!pageTitle) return;
    document.title = `${pageTitle} | ${APP_CONFIG.APP_NAME}`;
    return () => {
      document.title = APP_CONFIG.APP_NAME;
    };
  }, [pageTitle]);

  // The page's first card renders this as its header row (globals.css
  // `[data-page-first-card] … ::before`) — page name + accent underline inside
  // the filters card without touching every page. Named --page-name because
  // --page-title is an existing color token in the design system.
  const cssPageName = `"${pageTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  // Prevents hydration mismatch: Zustand persist reads localStorage on client but
  // server has no access to it. Render with default (expanded) state until mounted,
  // then apply real persisted value — the CSS transition handles the visual change.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Tag the page's first card-looking element so the CSS above has a simple,
  // reliable hook. Done in JS because Lightning CSS mis-compiles the
  // `:not(.app-card ~ .app-card)` first-of-class selector chain, and cards
  // often mount after async data loads (hence the MutationObserver).
  const pageContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Before `mounted`, AppShell renders the placeholder frame — the ref is
    // null on the first pass, so this effect must re-run when `mounted` flips.
    const root = pageContentRef.current;
    if (!root) return;

    let cancelled = false;
    let tagTimer: ReturnType<typeof setTimeout> | undefined;

    const isCardShell = (el: Element) => {
      const cls = typeof el.className === "string" ? el.className : "";
      if (el.classList.contains("app-card")) return true;
      return (
        /rounded/.test(cls) &&
        /border/.test(cls) &&
        /bg-card|bg-white/.test(cls) &&
        !/animate-pulse|print/.test(cls)
      );
    };

    const tag = () => {
      if (cancelled) return;
      const candidates = root.querySelectorAll(
        ":scope > *:not([data-breadcrumb-card]) > div, :scope > *:not([data-breadcrumb-card]) > * > div",
      );
      const first =
        Array.from(candidates).find(
          (el) => isCardShell(el) && !el.hasAttribute("data-no-page-name"),
        ) ?? null;
      if (first && !first.hasAttribute("data-page-first-card")) {
        root
          .querySelectorAll("[data-page-first-card]")
          .forEach((el) => el.removeAttribute("data-page-first-card"));
        first.setAttribute("data-page-first-card", "");
      } else if (!first) {
        root
          .querySelectorAll("[data-page-first-card]")
          .forEach((el) => el.removeAttribute("data-page-first-card"));
      }
    };

    // Defer imperative attribute writes until after React hydration. The
    // MutationObserver fires synchronously when Suspense/streamed children
    // mount; setAttribute before hydrate causes mismatches on Client Components.
    const scheduleTag = () => {
      clearTimeout(tagTimer);
      tagTimer = setTimeout(tag, 0);
    };

    scheduleTag();
    // Cards frequently mount after data fetches; keep the tag on the first one.
    const observer = new MutationObserver(scheduleTag);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      {
        cancelled = true;
        clearTimeout(tagTimer);
        observer.disconnect();
      }
    };
  }, [pathname, mounted]);

  // Accordion behavior for filters cards: clicking anywhere on a card header
  // row that hosts an `.app-card-title` forwards the click to the page's own
  // filter toggle button (identified by its funnel/chevron icon — NOTE:
  // lucide-react aliases Filter → Funnel, so the svg class is `lucide-funnel`).
  // Pages keep owning the open/close state — no per-page changes needed.
  function handlePageContentClick(e: ReactMouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    // Direct interactions (links, inputs, other buttons) work natively. The
    // filter button itself has pointer-events: none, so it never matches here.
    if (
      target.closest(
        'button, a, input, select, textarea, label, [role="combobox"]',
      )
    )
      return;
    const headerRow = target.closest<HTMLElement>(".app-card > div");
    if (!headerRow || !headerRow.querySelector(".app-card-title")) return;
    const toggle = headerRow.querySelector<HTMLButtonElement>(
      'button:has(svg[class*="lucide-funnel"]), button:has(svg[class*="lucide-filter"]), button:has(svg[class*="lucide-chevron-down"])',
    );
    if (!toggle) {
      const card = headerRow.closest<HTMLElement>(".app-card");
      if (!card) return;
      // Only treat it like a filter card when it contains dropdowns and does not contain a table.
      if (
        !card.querySelector(
          '[role="combobox"], button[data-slot="popover-trigger"]',
        )
      )
        return;
      if (
        card.querySelector(
          '.app-data-table, .app-data-table-card, [role="grid"]',
        )
      )
        return;
      const isCollapsed =
        card.getAttribute("data-filters-collapsed") === "true";
      const next = !isCollapsed;
      card.setAttribute("data-filters-collapsed", next ? "true" : "false");
      return;
    }
    // Pages unmount the panel conditionally, so closing can't be CSS-animated.
    // A View Transition snapshots before/after and cross-fades the change
    // (no-op in browsers without support).
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (doc.startViewTransition) {
      doc.startViewTransition(() => toggle.click());
    } else {
      toggle.click();
    }
  }

  // Apply the persisted theme (primary + sidebar palette) on every app load.
  useTheme();

  useEffect(() => {
    if (prevNavUserId.current !== navUserId) {
      resetNavItems();
      prevNavUserId.current = navUserId;
    }
    setNavItems(initialNavRef.current);
    // Re-bind when the logged-in user or authorization tree changes so the
    // sidebar is never leftover from a previous account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navUserId, navTreeSignature]);

  // Auto-collapse only fires when sidebar was manually expanded and user opted in.
  // Hover-expanded state is excluded — hover collapse happens naturally on mouse-leave.
  useEffect(() => {
    if (
      prevPathname.current !== pathname &&
      autoCollapse &&
      !isSidebarHovered
    ) {
      setSidebarCollapsed(true);
    }
    prevPathname.current = pathname;
  }, [pathname, autoCollapse, isSidebarHovered, setSidebarCollapsed]);

  // Zustand persist rehydrates after mount. Until then keep the SSR default
  // (expanded) so width matches server HTML — no empty gray placeholder flash.
  const sidebarIsExpanded = !mounted || !isSidebarCollapsed || isSidebarHovered;

  return (
    <div
      data-app-shell
      className="flex h-screen overflow-hidden bg-[hsl(var(--background))]"
    >
      {IS_DEBUG_MODE && <DebugPanel />}
      {/* Mobile overlay when sidebar is open */}
      {!hideChrome && isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* -- Sidebar --------------------------------------------------------- */}
      {/* data-print-hide on the wrapper too — hiding <aside> alone leaves a
          280px / 64px gutter on the printed sheet because this wrapper div
          carries the width. */}
      {hideChrome ? null : (
        <div
          data-print-hide
          className={cn(
            "relative z-30 shrink-0 transition-all duration-200 ease-in-out",
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0",
            // Angular Fuse sidebar: 280px expanded / 64px folded
            sidebarIsExpanded ? "w-[280px]" : "w-[64px]",
          )}
          style={{
            height: "100vh",
            position: "sticky",
            top: 0,
            // Angular fuse-sidebar shadow — keep below dialogs (z-1100)
            boxShadow: "0 2px 8px 0 rgba(0, 0, 0, 0.35)",
            zIndex: 30,
          }}
        >
          <Sidebar />
        </div>
      )}

      {/* -- Main content area ---------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {hideChrome ? null : (
          <div data-print-hide className="sticky top-0 z-20">
            <Topbar />
          </div>
        )}

        <main
          key={pathname}
          className="flex flex-1 flex-col overflow-y-auto scrollbar-thin animate-fade-up bg-[hsl(var(--background))]"
        >
          {/* Page container without outer card; sections control their own surfaces. */}
          <div
            ref={pageContentRef}
            className="mx-auto w-full max-w-none flex-1 px-0 py-0"
            data-page-content
            onClick={handlePageContentClick}
            style={
              showBreadcrumb && pageTitle
                ? ({ "--page-name": cssPageName } as CSSProperties)
                : undefined
            }
          >
            {/* ── Breadcrumb card — page location, above the filters card ── */}
            {showBreadcrumb && (
              <div
                data-print-hide
                data-breadcrumb-card
                className="link-header-wrap px-[var(--spacing-page-x)] pt-2.5 pb-1"
              >
                <Breadcrumb items={breadcrumbItems} maxItems={5} />
              </div>
            )}
            {children}
          </div>
          {hideChrome ? null : <AppFooter />}
        </main>
      </div>

      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
