"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  LogOut,
  User,
  Bell,
  LayoutGrid,
  HelpCircle,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionContext } from "@/context/SessionContext";
import { useNavigationStore } from "@/store/navigation-store";
import { cn } from "@/lib/utils";
import { flattenNavItemsForSearch, normalizePageHref } from "@/lib/navigation";
import { logout } from "@/services/auth";
import { ThemeSwitcher } from "@/common/components/theme-setting-modal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleAvatarStyle: Record<string, string> = {
  ADMIN: "bg-red-100    text-red-700",
  PRINCIPAL: "bg-red-100    text-red-700",
  STAFF: "bg-blue-100   text-blue-700",
  STUDENT: "bg-emerald-100 text-emerald-700",
  PARENT: "bg-purple-100 text-purple-700",
};

const MAX_SEARCH_RESULTS = 8;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Topbar() {
  const router = useRouter();
  const { user } = useSessionContext();
  const { toggleSidebar, navItems } = useNavigationStore();

  const pages = useMemo(() => flattenNavItemsForSearch(navItems), [navItems]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pagesLoading = navItems.length === 0;

  // ── Close search dropdown on outside click ──────────────────────────────
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
        setActiveResultIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // ── Global ⌘K / Ctrl+K shortcut ───────────────────────────────────────
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        if (searchTerm.trim().length > 0) setIsSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchTerm]);

  const filteredPages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length === 0) return [];

    return pages
      .filter((page) => page.displayName.toLowerCase().includes(term))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [pages, searchTerm]);

  const showSearchDropdown = isSearchOpen && searchTerm.trim().length > 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      setActiveResultIndex(-1);
      setIsSearchOpen(value.trim().length > 0);
    },
    [],
  );

  const navigateTo = useCallback(
    (url: string, displayName?: string) => {
      // Re-resolve on click: search list may still hold stale DB hrefs;
      // label pins + legacy slug rewrites live in normalizePageHref.
      const resolved = normalizePageHref(url, displayName ?? "");
      router.push(resolved);
      setSearchTerm("");
      setIsSearchOpen(false);
      setActiveResultIndex(-1);
      searchInputRef.current?.blur();
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSearchDropdown) {
        if (e.key === "Escape") {
          setSearchTerm("");
          setIsSearchOpen(false);
        }
        return;
      }

      if (filteredPages.length === 0) {
        if (e.key === "Escape") {
          setSearchTerm("");
          setIsSearchOpen(false);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveResultIndex((prev) =>
            prev < filteredPages.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveResultIndex((prev) =>
            prev > 0 ? prev - 1 : filteredPages.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeResultIndex >= 0 && filteredPages[activeResultIndex]) {
            const page = filteredPages[activeResultIndex];
            navigateTo(page.url, page.displayName);
          } else if (filteredPages[0]) {
            navigateTo(filteredPages[0].url, filteredPages[0].displayName);
          }
          break;
        case "Escape":
          setIsSearchOpen(false);
          setActiveResultIndex(-1);
          break;
      }
    },
    [activeResultIndex, filteredPages, navigateTo, showSearchDropdown],
  );

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const avatarStyle =
    roleAvatarStyle[user?.userRole ?? ""] ?? "bg-cyan-100 text-cyan-700";

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-5">
      {/* ── Mobile hamburger ─────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle navigation sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* ── Search — left side ─────────────────────────────────────── */}
      <div
        ref={searchContainerRef}
        className="relative flex min-w-0 flex-1 items-center sm:max-w-md lg:max-w-lg xl:max-w-xl"
        role="combobox"
        aria-expanded={showSearchDropdown && filteredPages.length > 0}
        aria-haspopup="listbox"
        aria-owns="search-results-listbox"
      >
        {pagesLoading ? (
          <Loader2
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 animate-spin text-primary"
            aria-hidden="true"
          />
        ) : (
          <Sparkles
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-primary"
            aria-hidden="true"
          />
        )}
        <input
          ref={searchInputRef}
          type="search"
          role="searchbox"
          aria-label="Search pages"
          aria-autocomplete="list"
          aria-controls="search-results-listbox"
          aria-activedescendant={
            activeResultIndex >= 0
              ? `search-result-${activeResultIndex}`
              : undefined
          }
          placeholder="Search pages…"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchTerm.trim().length > 0) setIsSearchOpen(true);
          }}
          className={cn(
            "h-9 w-full rounded-full border border-input bg-[hsl(var(--background))]",
            "pl-10 pr-14 text-[13px] text-foreground placeholder:text-muted-foreground",
            "focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15",
            "transition-all duration-150",
          )}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>

        {showSearchDropdown && (
          <div
            id="search-results-listbox"
            role="listbox"
            aria-label="Search results"
            className="absolute top-full left-0 z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
          >
            {filteredPages.length > 0 ? (
              filteredPages.map((page, index) => (
                <button
                  key={page.url}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeResultIndex}
                  type="button"
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    index === activeResultIndex && "bg-accent",
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => navigateTo(page.url, page.displayName)}
                >
                  {page.displayName}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No pages found
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Right side — actions & profile ───────────────────────────── */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeSwitcher />

        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"
            aria-hidden="true"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          aria-label="All apps"
        >
          <LayoutGrid className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          aria-label="Help"
        >
          <HelpCircle className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        <div
          className="mx-1 hidden h-6 w-px bg-border sm:block"
          aria-hidden="true"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="User menu"
            >
              <div className="hidden text-right md:block">
                <p className="text-[13px] font-semibold leading-tight tracking-tight text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {user?.roleName ?? user?.userRole ?? "User"}
                </p>
              </div>

              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                <AvatarFallback
                  className={cn("text-[12px] font-semibold", avatarStyle)}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <ChevronDown
                className="hidden h-3.5 w-3.5 text-muted-foreground md:block"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-1">
              <p className="text-[13px] font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] font-normal text-muted-foreground">
                {user?.roleName}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled
              className="cursor-not-allowed opacity-60"
            >
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
