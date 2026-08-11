"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LogOut, Menu, Search, X } from "lucide-react";
import { NavItem } from "@/components/layout/NavItem";
import type { NavItem as NavItemType } from "@/types/navigation";
import { useSessionContext } from "@/context/SessionContext";
import { useNavigationStore } from "@/store/navigation-store";
import { cn } from "@/lib/utils";
import smartLogo from "@/assets/images/smart-campus-logo.png";
import { logout } from "@/services/auth";
import { IS_DEBUG_MODE, DebugTrigger, useDebugStore } from "@/debug";

/** Static "Home" entry — always first; href is filled from the role home path. */
function buildHomeNavItem(href: string): NavItemType {
  return {
    id: "static_home",
    label: "Home",
    icon: "home",
    href,
    sortOrder: -1,
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSessionContext();
  const homeHref = user?.defaultDashboardPath || "/dashboard";
  const {
    navItems,
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    sidebarPosition,
    toggleSidebarCollapsed,
    setSidebarHovered,
  } = useNavigationStore();

  // Debug store — only subscribed to when IS_DEBUG_MODE is true
  const debugSettings = useDebugStore((s) => s.settings);

  const navRef = useRef<HTMLElement>(null);
  const savedScrollRef = useRef(0);
  const didInitialAutoScrollRef = useRef(false);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Same mounted guard as AppShell to stay in sync and avoid mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isExpanded = !mounted ? true : !isSidebarCollapsed || isSidebarHovered;

  // Persist rehydrates before React hydration can finish; SSR always uses defaults.
  const collapsedForChrome = mounted && isSidebarCollapsed;
  const isRightPositioned = mounted && sidebarPosition === "right";

  // ── Nav search filter ────────────────────────────────────────────────────
  function filterBySearch(items: NavItemType[], term: string): NavItemType[] {
    const lower = term.toLowerCase();
    return items.reduce<NavItemType[]>((acc, item) => {
      if (item.label.toLowerCase().includes(lower)) {
        acc.push(item);
      } else if (item.children?.length) {
        const matched = filterBySearch(item.children, term);
        if (matched.length) acc.push({ ...item, children: matched });
      }
      return acc;
    }, []);
  }

  // ── Debug visibility filter ──────────────────────────────────────────────
  // Recursively removes items whose IDs are in the debug hidden set.
  // A hidden parent implicitly hides all its children.
  function filterByDebug(
    items: NavItemType[],
    hiddenSet: Set<string>,
  ): NavItemType[] {
    return items.reduce<NavItemType[]>((acc, item) => {
      if (hiddenSet.has(item.id)) return acc;
      acc.push(
        item.children?.length
          ? { ...item, children: filterByDebug(item.children, hiddenSet) }
          : item,
      );
      return acc;
    }, []);
  }

  const displayedItems = useMemo(() => {
    // Home already routes to the role dashboard — drop the redundant API "Dashboard" module.
    const withoutDashboard = navItems.filter((item) => {
      const label = item.label.trim().toLowerCase();
      const href = (item.href ?? "").toLowerCase();
      if (label === "dashboard") return false;
      if (
        href === "/dashboard" ||
        href === "/evaluator" ||
        href === "/student-dashboard" ||
        href.includes("main-dashboard")
      )
        return false;
      return true;
    });
    // Order comes from buildNavTree (Angular parity) — do not re-sort top-level items.
    let items = [buildHomeNavItem(homeHref), ...withoutDashboard];
    if (searchTerm.trim()) items = filterBySearch(items, searchTerm);
    if (IS_DEBUG_MODE && debugSettings.nav.hiddenIds.length > 0) {
      items = filterByDebug(items, new Set(debugSettings.nav.hiddenIds));
    }
    return items;
  }, [navItems, searchTerm, debugSettings.nav.hiddenIds, homeHref]);

  // Scroll nav to top whenever search results change
  useEffect(() => {
    if (searchTerm && navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [searchTerm]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearchTerm("");
    }
  }, [searchOpen]);

  // Preserve nav scroll position across collapse/expand cycles
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (!isExpanded) {
      savedScrollRef.current = nav.scrollTop;
    } else {
      requestAnimationFrame(() => {
        if (navRef.current) navRef.current.scrollTop = savedScrollRef.current;
      });
    }
  }, [isExpanded]);

  // On first load only: scroll the nav so the active item is visible — but only
  // when it is outside the viewport. Always scrolling the active item to the top
  // (e.g. Home on dashboard) pushes the "Main Menu" label up and clips it.
  // Do NOT repeat on every route change; users expect scroll position to stay put.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (didInitialAutoScrollRef.current) return;
    if (navItems.length === 0) return;

    const scroll = () => {
      const target =
        nav.querySelector<HTMLElement>(
          '[data-nav-module][data-active="true"]',
        ) ?? nav.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!target) return;

      const navRect = nav.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const fullyVisible =
        targetRect.top >= navRect.top + 4 &&
        targetRect.bottom <= navRect.bottom - 4;
      if (fullyVisible) return;

      // Keep "Main Menu" (and other section labels) in view when scrolling up.
      const label = nav.querySelector<HTMLElement>(".sidebar-section-label");
      const labelOffset = label ? label.offsetHeight + 4 : 8;
      const newScrollTop =
        nav.scrollTop + (targetRect.top - navRect.top) - labelOffset;
      nav.scrollTo({ top: Math.max(0, newScrollTop), behavior: "instant" });
    };

    // Wait for Collapsible open animations (~150 ms) before measuring
    const timer = setTimeout(scroll, 160);
    didInitialAutoScrollRef.current = true;
    return () => clearTimeout(timer);
  }, [navItems]);

  function handleMouseEnter() {
    clearTimeout(hoverLeaveTimer.current);
    setSidebarHovered(true);
  }

  function handleMouseLeave() {
    clearTimeout(hoverLeaveTimer.current);
    hoverLeaveTimer.current = setTimeout(() => setSidebarHovered(false), 120);
  }

  async function handleLogout() {
    await logout();
    // Full page reload clears the React Query cache (module-level QueryClient singleton),
    // all Zustand in-memory state, and all React component state — prevents previous
    // user's data from leaking into the next session.
    window.location.href = "/login";
  }

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col",
        isSidebarOpen ? "" : "overflow-hidden md:flex",
        isRightPositioned && "order-last",
      )}
      style={{
        background: "#042956",
        boxShadow: "0 2px 8px 0 rgba(0, 0, 0, 0.35)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header — white strip; Smart Campus mark (not college seal) ── */}
      <div
        className={cn(
          "app-sidebar-brand flex shrink-0 items-center",
          isExpanded ? "gap-2.5 px-3" : "justify-center px-2",
        )}
      >
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
          <Image
            src={smartLogo}
            alt="University Campus"
            width={30}
            height={30}
            className="h-[30px] w-[30px] object-contain"
            priority
          />
        </div>
        {isExpanded && (
          <p
            className="min-w-0 flex-1 mr-1 text-[12px] font-medium text-[#042956] leading-[1.2] tracking-tight break-words"
            style={{
              fontFamily: "var(--font-body), Inter, system-ui, sans-serif",
            }}
            title="University Campus"
          >
            University Campus
          </p>
        )}

        {isExpanded && (
          <button
            type="button"
            onClick={() => {
              setSidebarHovered(false);
              toggleSidebarCollapsed();
            }}
            title={collapsedForChrome ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              collapsedForChrome ? "Expand sidebar" : "Collapse sidebar"
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#042956] transition-colors duration-150 hover:bg-black/5"
          >
            <Menu className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Search input ─────────────────────────────────────────────── */}
      {isExpanded && searchOpen && (
        <div className="shrink-0 px-3 pt-3">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground))]"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              placeholder="Search menu…"
              className="h-8 w-full rounded-md bg-[hsl(var(--sidebar-surface))] pl-8 pr-8 text-[13px] text-[hsl(var(--sidebar-foreground-active))] placeholder:text-[hsl(var(--sidebar-foreground))]/60 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sidebar-primary))]/40 focus:bg-[hsl(var(--sidebar-hover-bg))]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-foreground-active))]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar",
          isExpanded ? "py-2 px-2" : "py-2 px-1",
        )}
      >
        {isExpanded && !searchTerm && (
          <div className="sidebar-section-label">Main Menu</div>
        )}
        <ul className="space-y-0">
          {displayedItems.map((item) => (
            <li key={item.id}>
              <NavItem item={item} depth={0} layoutHydrated={mounted} />
            </li>
          ))}
        </ul>
        {searchTerm && displayedItems.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-[hsl(var(--sidebar-foreground))]/70">
            No results
          </p>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 px-2 py-2">
        <div
          className={cn(
            "flex items-center gap-1",
            isExpanded ? "justify-between px-1" : "justify-center",
          )}
        >
          {isExpanded && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                title={searchOpen ? "Close search" : "Search menu"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150",
                  searchOpen
                    ? "bg-white/10 text-[#ffcf46]"
                    : "text-white/80 hover:bg-white/10 hover:text-[#ffcf46]",
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {IS_DEBUG_MODE && <DebugTrigger />}

              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-red-500/20 hover:text-red-300 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
