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
import { getCollegeById } from "@/services";
import { MINIO_URL } from "@/config/constants/api";
import { IS_DEBUG_MODE, DebugTrigger, useDebugStore } from "@/debug";

/** Static "Home" entry — always first, routes to the dashboard. */
const HOME_NAV_ITEM: NavItemType = {
  id: "static_home",
  label: "Home",
  icon: "home",
  href: "/dashboard",
  sortOrder: -1,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSessionContext();
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

  // ── Dynamic college logo ──────────────────────────────────────────────────
  // Primary source: the login DTO's collegeLogo (Angular navbar binds
  // `loginUser.collegeLogo` directly). Fallback: the College record's `logo`
  // path on MinIO for sessions created before collegeLogo was stored.
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string | null>(null);
  const [collegeLogoFailed, setCollegeLogoFailed] = useState(false);

  const toLogoUrl = (path: string) =>
    /^(https?:\/\/|data:)/i.test(path)
      ? path
      : `${MINIO_URL}${path.replace(/^\/+/, "")}`;

  useEffect(() => {
    if (user?.collegeLogo) {
      setCollegeLogoUrl(toLogoUrl(user.collegeLogo));
      setCollegeLogoFailed(false);
      return;
    }
    if (!user?.collegeId) return;
    let cancelled = false;
    getCollegeById(user.collegeId)
      .then((college) => {
        if (!cancelled && college?.logo) {
          setCollegeLogoUrl(toLogoUrl(college.logo));
          setCollegeLogoFailed(false);
        }
      })
      .catch(() => {
        // Keep the static fallback logo when the lookup fails.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.collegeId, user?.collegeLogo]);

  const showCollegeLogo = !!collegeLogoUrl && !collegeLogoFailed;

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
    // Home already routes to /dashboard — drop the redundant API "Dashboard" module.
    const withoutDashboard = navItems.filter((item) => {
      const label = item.label.trim().toLowerCase();
      const href = (item.href ?? "").toLowerCase();
      if (label === "dashboard") return false;
      if (href === "/dashboard" || href.includes("main-dashboard"))
        return false;
      return true;
    });
    let items = [
      HOME_NAV_ITEM,
      ...withoutDashboard.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    ];
    if (searchTerm.trim()) items = filterBySearch(items, searchTerm);
    if (IS_DEBUG_MODE && debugSettings.nav.hiddenIds.length > 0) {
      items = filterByDebug(items, new Set(debugSettings.nav.hiddenIds));
    }
    return items;
  }, [navItems, searchTerm, debugSettings.nav.hiddenIds]);

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

  // On first load only: scroll the nav container so the active item is visible.
  // Do NOT repeat on every route change; users expect the sidebar scroll position
  // to stay fixed while navigating.
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

      const navTop = nav.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const newScrollTop = nav.scrollTop + (targetTop - navTop) - 8; // 8px breathing room
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
        "flex h-full w-full flex-col border-r border-[hsl(var(--sidebar-border))]",
        isSidebarOpen ? "" : "overflow-hidden md:flex",
        isRightPositioned && "order-last",
      )}
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--sidebar-background)), hsl(var(--sidebar-background-end)))",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header — min-h-14 matches the Topbar height ── */}
      <div
        className={cn(
          "flex min-h-14 shrink-0 items-center py-1.5",
          isExpanded ? "gap-2.5 px-3" : "justify-center px-2",
        )}
      >
        {showCollegeLogo ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-white/30">
            {/* Minio-hosted dynamic logo — plain <img> like the other MINIO_URL usages */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={collegeLogoUrl ?? ""}
              alt={user?.collegeName ?? "College logo"}
              className="h-full w-full object-contain p-0.5"
              onError={() => setCollegeLogoFailed(true)}
            />
          </span>
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Image
              src={smartLogo}
              alt="Smart Campus"
              width={20}
              height={20}
              className="h-5 w-5 object-contain brightness-0 invert"
            />
          </div>
        )}
        {isExpanded && (
          <p
            className="min-w-0 flex-1 mr-1 text-[12.5px] font-bold text-[hsl(var(--sidebar-foreground-active))] leading-[1.2] tracking-tight break-words"
            style={{
              fontFamily: "var(--font-heading), Sora, system-ui, sans-serif",
            }}
            title={user?.collegeName ?? "Smart Campus"}
          >
            {user?.collegeName ?? "Smart Campus"}
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground-active))] transition-colors duration-150 hover:bg-[hsl(var(--sidebar-hover-bg))]"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
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
        <ul className="space-y-1">
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
      <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] px-2 py-2">
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
                    ? "bg-[hsl(var(--sidebar-hover-bg))] text-[hsl(var(--sidebar-foreground-active))]"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]",
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {IS_DEBUG_MODE && <DebugTrigger />}

              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))] hover:bg-red-500/15 hover:text-red-400 transition-colors duration-150"
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
